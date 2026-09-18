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

function genDocNo(prefix) {
  return `${prefix}${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
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
export function validateStocktakePosting(stocktakeOrder, { force = false } = {}) {
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
export function postStocktakeLine(stocktakeOrder, line, { operator = 'admin1' } = {}) {
  if (!stocktakeOrder || !line) return { ok: false, message: '盘点明细不存在' }
  const warehouse = String(stocktakeOrder.warehouse || '').trim()
  if (!warehouse) return { ok: false, message: '请填写盘点仓库' }

  const bookQty = resolveStocktakeBookQty(line, warehouse)
  const actualQty = Number(line.actualQty)
  if (!Number.isFinite(actualQty) || actualQty < 0) {
    return { ok: false, message: '请填写有效实盘数量' }
  }
  const diffQty = round4(actualQty - bookQty)
  line.bookQty = bookQty
  line.diffQty = diffQty

  if (diffQty === 0) {
    return { ok: true, diffQty: 0, outbound: null, inboundOrder: null }
  }
  if (diffQty > 0) return postGainLine(stocktakeOrder, line, diffQty, operator)
  return postLossLine(stocktakeOrder, line, Math.abs(diffQty), operator)
}

/**
 * 整单过账：先校验，再逐行生成
 */
export function postStocktakeOrder(stocktakeOrder, { operator = 'admin1', force = false } = {}) {
  const check = validateStocktakePosting(stocktakeOrder, { force })
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

  for (const line of stocktakeOrder.lineItems || []) {
    if (line.linkedInboundId || line.linkedOutboundId) continue
    const res = postStocktakeLine(stocktakeOrder, line, { operator })
    if (!res.ok) {
      return { ok: false, message: `${line.itemCode || line.id}: ${res.message}`, errors: [] }
    }
    if (res.inboundOrder?.id) {
      linkedInboundIds.push(res.inboundOrder.id)
      if (res.inboundOrder.docNo) linkedInboundDocNos.push(res.inboundOrder.docNo)
      line.linkedInboundId = res.inboundOrder.id
      line.linkedInboundDocNo = res.inboundOrder.docNo
    }
    if (res.outbound?.id) {
      linkedOutboundIds.push(res.outbound.id)
      if (res.outbound.docNo) linkedOutboundDocNos.push(res.outbound.docNo)
      line.linkedOutboundId = res.outbound.id
      line.linkedOutboundDocNo = res.outbound.docNo
    }
  }

  return {
    ok: true,
    linkedInboundIds,
    linkedInboundDocNos,
    linkedOutboundIds,
    linkedOutboundDocNos,
  }
}
