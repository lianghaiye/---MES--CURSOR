/**
 * 盘点过账编排：按差异生成盘点入库 / 盘点出库并入账。
 * 盘盈进自由备货；盘亏优先自由可用（自由−软锁），不足可 force。
 */

import dayjs from 'dayjs'
import { OUTBOUND_SOURCE } from '@/mock/outboundOptions'
import { INBOUND_SOURCE } from '@/mock/inboundOptions'
import { addOutboundOrder, confirmOutbound } from '@/store/outboundStore'
import { addInboundOrder, confirmInboundOrders } from '@/store/inboundOrderStore'
import { createOutboundLine } from '@/mock/outboundOrders'
import { createInboundLine } from '@/mock/inboundOrders'
import { getBatchById, sumFreeQty } from '@/store/stockBatchStore'
import { getTransferSoftLockedQty } from '@/store/transferSoftLockStore'
import { getWarehouseStockQty } from '@/utils/inboundLineHelpers'

/** 过账生成范围 */
export const STOCKTAKE_POST_MODE = {
  GAIN: 'gain',
  LOSS: 'loss',
  BOTH: 'both',
}

export const STOCKTAKE_POST_MODE_OPTIONS = [
  { label: '生成盘盈单', value: STOCKTAKE_POST_MODE.GAIN },
  { label: '生成盘亏单', value: STOCKTAKE_POST_MODE.LOSS },
  { label: '同时生成盘盈盘亏单', value: STOCKTAKE_POST_MODE.BOTH },
]

export function stocktakePostModeLabel(mode) {
  return STOCKTAKE_POST_MODE_OPTIONS.find((o) => o.value === mode)?.label || '同时生成盘盈盘亏单'
}

function genDocNo(prefix) {
  return `${prefix}${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function normalizePostMode(mode) {
  if (mode === STOCKTAKE_POST_MODE.GAIN || mode === STOCKTAKE_POST_MODE.LOSS) return mode
  return STOCKTAKE_POST_MODE.BOTH
}

export function isDedicatedStocktakeLine(line) {
  return Boolean(line?.salesOrderId || line?.salesOrderNo || (line?.batchId && line?.dedicated))
}

/** 刷新账面（批次优先；自由汇总行用自由合计） */
export function resolveStocktakeBookQty(line, warehouse) {
  if (line?.batchId) {
    const b = getBatchById(line.batchId)
    if (b && b.status === '在库') return Number(b.currentLength) || 0
    return 0
  }
  if (isDedicatedStocktakeLine(line)) {
    return getWarehouseStockQty(warehouse, line?.itemCode) || 0
  }
  const free = sumFreeQty({ warehouse, itemCode: line?.itemCode })
  if (free > 0) return free
  return getWarehouseStockQty(warehouse, line?.itemCode) || 0
}

function resolveAvailableFree(line, warehouse) {
  const book = resolveStocktakeBookQty(line, warehouse)
  const locked = getTransferSoftLockedQty({
    warehouse,
    itemCode: line.itemCode,
    batchId: line.batchId || undefined,
  })
  return Math.max(0, round4(book - locked))
}

/**
 * 过账前全量校验（先校验再生成，避免半截单据）
 * @returns {{ ok: boolean, errors: Array<{ lineId, itemCode, message, needForce?: boolean }> }}
 */
export function validateStocktakePosting(
  stocktakeOrder,
  { force = false, mode = STOCKTAKE_POST_MODE.BOTH } = {},
) {
  const postMode = normalizePostMode(mode)
  const errors = []
  const warehouse = String(stocktakeOrder?.warehouse || '').trim()
  if (!warehouse) {
    return { ok: false, errors: [{ lineId: '', itemCode: '', message: '请填写盘点仓库' }] }
  }
  const lines = stocktakeOrder?.lineItems || []
  if (!lines.length) {
    return { ok: false, errors: [{ lineId: '', itemCode: '', message: '无盘点明细' }] }
  }

  lines.forEach((line) => {
    const actualQty = Number(line.actualQty)
    if (!Number.isFinite(actualQty) || actualQty < 0) {
      errors.push({
        lineId: line.id,
        itemCode: line.itemCode,
        message: '请填写有效实盘数量',
      })
      return
    }
    const bookQty = resolveStocktakeBookQty(line, warehouse)
    const diffQty = round4(actualQty - bookQty)
    line.bookQty = bookQty
    line.diffQty = diffQty
    if (!(diffQty < 0)) return
    if (postMode === STOCKTAKE_POST_MODE.GAIN) return
    if (line.linkedOutboundId) return

    const lossQty = Math.abs(diffQty)
    if (isDedicatedStocktakeLine(line)) {
      if (line.batchId) {
        const b = getBatchById(line.batchId)
        const batQty = b && b.status === '在库' ? Number(b.currentLength) || 0 : 0
        if (lossQty > batQty + 1e-9) {
          errors.push({
            lineId: line.id,
            itemCode: line.itemCode,
            message: `按单批次可扣 ${batQty}，盘亏 ${lossQty}`,
            needForce: true,
          })
        }
      }
      return
    }

    const available = resolveAvailableFree(line, warehouse)
    if (lossQty > available + 1e-9 && !force) {
      const locked = getTransferSoftLockedQty({
        warehouse,
        itemCode: line.itemCode,
        batchId: line.batchId || undefined,
      })
      errors.push({
        lineId: line.id,
        itemCode: line.itemCode,
        message:
          locked > 0
            ? `自由可用 ${available}（含软锁 ${locked}），盘亏 ${lossQty}，需强制盘亏`
            : `自由可用 ${available}，盘亏 ${lossQty}，可能需动用按单在库`,
        needForce: true,
      })
    }
  })

  return { ok: errors.length === 0, errors }
}

function postGainLine(stocktakeOrder, line, diffQty, operator) {
  const warehouse = stocktakeOrder.warehouse
  const inbound = addInboundOrder({
    docNo: genDocNo('PDYK'),
    inboundType: '盘点入库',
    status: '待入库',
    warehouse,
    sourceChannel: INBOUND_SOURCE.BUSINESS,
    sourceOrderNo: stocktakeOrder.docNo,
    sourceType: '库存盘点',
    handler: operator,
    creator: operator,
    remark: `由盘点单 ${stocktakeOrder.docNo} 盘盈生成（入自由备货）`,
    stocktakeOrderId: stocktakeOrder.id,
    stocktakeDocNo: stocktakeOrder.docNo,
    lineItems: [
      createInboundLine({
        itemCode: line.itemCode,
        itemName: line.itemName,
        itemType: line.itemType || '物料',
        specModel: line.specModel,
        material: line.material,
        qty: diffQty,
        unit: line.unit || '件',
        warehouse,
        lineSource: '盘点',
        lineStatus: '待入库',
        stocktakeLineId: line.id,
        // 盘盈不挂销售单
        salesOrderId: '',
        salesOrderNo: '',
        salesLineId: '',
      }),
    ],
  })
  const res = confirmInboundOrders([inbound.id], operator)
  if (res.blocked?.length) {
    return { ok: false, message: res.blocked.map((b) => b.message).join('；') || '盘盈入库失败' }
  }
  return { ok: true, inboundOrder: inbound, outbound: null }
}

function postLossLine(stocktakeOrder, line, lossQty, operator) {
  const warehouse = stocktakeOrder.warehouse
  const obLine = createOutboundLine({
    itemCode: line.itemCode,
    itemName: line.itemName,
    itemType: line.itemType || '物料',
    specModel: line.specModel,
    material: line.material,
    unit: line.unit || '件',
    shipQty: lossQty,
    shipWarehouse: warehouse,
    lineStatus: '待出库',
    sourceDocNo: stocktakeOrder.docNo,
    stocktakeLineId: line.id,
  })
  if (line.batchId) {
    obLine.manualBatchPick = true
    obLine.outboundIssueRule = 'manual'
    obLine.batchAllocations = [
      {
        batchId: line.batchId,
        batchNo: line.batchNo || '',
        qty: lossQty,
        unit: line.unit || '件',
      },
    ]
    obLine.manualPickBatchIds = [line.batchId]
  }

  const obRes = addOutboundOrder({
    docNo: genDocNo('PDKK'),
    outboundType: '盘点出库',
    status: '待出库',
    warehouse,
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: stocktakeOrder.docNo,
    sourceType: '库存盘点',
    handler: operator,
    creator: operator,
    remark: `由盘点单 ${stocktakeOrder.docNo} 盘亏生成`,
    stocktakeOrderId: stocktakeOrder.id,
    stocktakeDocNo: stocktakeOrder.docNo,
    lineItems: [obLine],
  })
  if (!obRes.ok) return { ok: false, message: obRes.message || '生成盘点出库单失败' }

  const confirmRes = confirmOutbound([obRes.order.id], { operator })
  if (confirmRes.blocked?.length) {
    return {
      ok: false,
      message: confirmRes.blocked.map((b) => b.message).join('；') || '盘亏出库确认失败',
    }
  }
  return { ok: true, outbound: obRes.order, inboundOrder: null }
}

/**
 * 单行过账（内部用）；调用前应已 validate
 */
export function postStocktakeLine(
  stocktakeOrder,
  line,
  { operator = 'admin1', mode = STOCKTAKE_POST_MODE.BOTH } = {},
) {
  if (!stocktakeOrder || !line) return { ok: false, message: '盘点明细不存在' }
  const warehouse = String(stocktakeOrder.warehouse || '').trim()
  if (!warehouse) return { ok: false, message: '请填写盘点仓库' }
  const postMode = normalizePostMode(mode)

  const bookQty = resolveStocktakeBookQty(line, warehouse)
  const actualQty = Number(line.actualQty)
  if (!Number.isFinite(actualQty) || actualQty < 0) {
    return { ok: false, message: '请填写有效实盘数量' }
  }
  const diffQty = round4(actualQty - bookQty)
  line.bookQty = bookQty
  line.diffQty = diffQty

  if (diffQty === 0) {
    return { ok: true, diffQty: 0, outbound: null, inboundOrder: null, skipped: true }
  }
  if (diffQty > 0) {
    if (postMode === STOCKTAKE_POST_MODE.LOSS) {
      return { ok: true, diffQty, outbound: null, inboundOrder: null, skipped: true }
    }
    if (line.linkedInboundId) {
      return { ok: true, diffQty, outbound: null, inboundOrder: null, skipped: true }
    }
    return postGainLine(stocktakeOrder, line, diffQty, operator)
  }
  if (postMode === STOCKTAKE_POST_MODE.GAIN) {
    return { ok: true, diffQty, outbound: null, inboundOrder: null, skipped: true }
  }
  if (line.linkedOutboundId) {
    return { ok: true, diffQty, outbound: null, inboundOrder: null, skipped: true }
  }
  return postLossLine(stocktakeOrder, line, Math.abs(diffQty), operator)
}

/** 是否仍有未生成的盘盈/盘亏差异行（以落库 diff + 关联单为准，避免入账后账面回算把差异抹掉） */
export function hasUnpostedStocktakeDiff(stocktakeOrder) {
  const warehouse = String(stocktakeOrder?.warehouse || '').trim()
  return (stocktakeOrder?.lineItems || []).some((line) => {
    let diffQty = Number(line.diffQty)
    if (!Number.isFinite(diffQty)) {
      const actualQty = Number(line.actualQty)
      if (!Number.isFinite(actualQty)) return false
      const bookQty = Number.isFinite(Number(line.bookQty))
        ? Number(line.bookQty)
        : resolveStocktakeBookQty(line, warehouse)
      diffQty = round4(actualQty - bookQty)
    }
    if (diffQty > 1e-9 && !line.linkedInboundId) return true
    if (diffQty < -1e-9 && !line.linkedOutboundId) return true
    return false
  })
}

/**
 * 整单过账：先校验，再逐行生成
 */
export function postStocktakeOrder(
  stocktakeOrder,
  { operator = 'admin1', force = false, mode = STOCKTAKE_POST_MODE.BOTH } = {},
) {
  const postMode = normalizePostMode(mode)
  const check = validateStocktakePosting(stocktakeOrder, { force, mode: postMode })
  if (!check.ok) {
    return {
      ok: false,
      message: check.errors
        .map((e) => `${e.itemCode || ''}${e.itemCode ? ': ' : ''}${e.message}`)
        .join('；'),
      errors: check.errors,
    }
  }

  const linkedInboundIds = []
  const linkedInboundDocNos = []
  const linkedOutboundIds = []
  const linkedOutboundDocNos = []
  let generated = 0

  for (const line of stocktakeOrder.lineItems || []) {
    const res = postStocktakeLine(stocktakeOrder, line, { operator, mode: postMode })
    if (!res.ok) {
      return { ok: false, message: `${line.itemCode || line.id}: ${res.message}`, errors: [] }
    }
    if (res.inboundOrder?.id) {
      generated += 1
      linkedInboundIds.push(res.inboundOrder.id)
      if (res.inboundOrder.docNo) linkedInboundDocNos.push(res.inboundOrder.docNo)
      line.linkedInboundId = res.inboundOrder.id
      line.linkedInboundDocNo = res.inboundOrder.docNo
    }
    if (res.outbound?.id) {
      generated += 1
      linkedOutboundIds.push(res.outbound.id)
      if (res.outbound.docNo) linkedOutboundDocNos.push(res.outbound.docNo)
      line.linkedOutboundId = res.outbound.id
      line.linkedOutboundDocNo = res.outbound.docNo
    }
  }

  if (!generated) {
    return {
      ok: false,
      message:
        postMode === STOCKTAKE_POST_MODE.GAIN
          ? '没有可生成的盘盈差异'
          : postMode === STOCKTAKE_POST_MODE.LOSS
            ? '没有可生成的盘亏差异'
            : '没有可过账的盘点差异',
      errors: [],
    }
  }

  const partial = hasUnpostedStocktakeDiff(stocktakeOrder)

  return {
    ok: true,
    mode: postMode,
    // 只生成一侧时：只要另一侧差异仍未挂单，一律部分过账
    partial:
      partial ||
      (postMode === STOCKTAKE_POST_MODE.GAIN &&
        (stocktakeOrder.lineItems || []).some(
          (l) => Number(l.diffQty) < -1e-9 && !l.linkedOutboundId,
        )) ||
      (postMode === STOCKTAKE_POST_MODE.LOSS &&
        (stocktakeOrder.lineItems || []).some(
          (l) => Number(l.diffQty) > 1e-9 && !l.linkedInboundId,
        )),
    linkedInboundIds,
    linkedInboundDocNos,
    linkedOutboundIds,
    linkedOutboundDocNos,
  }
}
