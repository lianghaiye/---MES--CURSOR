import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { roundMeters } from '@/utils/variableLengthMaterial'
import {
  getBatchById,
  receiveRemnantBatch,
  issueBatchQty,
  BATCH_STATUS,
} from '@/store/stockBatchStore'
import { adjustStockQty } from '@/store/stockStore'
import { getOutboundOrderById } from '@/store/outboundStore'
import { addInboundOrder, generateInboundNo } from '@/store/inboundOrderStore'
import { createCutSettleSeed } from '@/mock/cutSettleSeed'
import { ensureMultiUnitFlowCutSettleRecords } from '@/mock/multiUnitFlowDemoSeed'
import { ensureOneItemOneCodeInventoryCutSettles } from '@/mock/oneItemOneCodeInventoryDemoSeed'
import {
  getCutSettleCandidateLines,
  isOutboundEligibleForCutSettle,
} from '@/utils/workOrderBlanking'

const STORAGE_KEY = 'i_doms_cut_settle_records'
const SEED_VERSION_KEY = 'i_doms_cut_settle_seed_v'
/** v6：结算余料可留线边 / 退发料仓，支持事后余料退回 */
const CURRENT_SEED_VERSION = '6'

/** 结算确认时余料处置 */
export const CUT_SETTLE_REMNANT_DISPOSITION = {
  /** 主路径：只扣实耗，余料仍在线边，可供后续工单继续用 */
  KEEP_LINE_SIDE: 'keep_line_side',
  /** 收口：实耗扣线边，余料退回发料仓 */
  RETURN_TO_SHIP: 'return_to_ship',
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.records)) return parsed.records.map(normalizeCutSettleRecord)
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: cutSettleState.records }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function normalizeCutSettleRecord(row) {
  if (!row) return row
  const lines = (row.lines || []).map((l) => ({
    ...l,
    remnantDisposition: l.remnantDisposition || row.remnantDisposition || '',
    remnantPendingReturn:
      l.remnantPendingReturn != null
        ? Boolean(l.remnantPendingReturn)
        : Boolean(
            row.status === '已确认' &&
            (l.remnantDisposition || row.remnantDisposition) ===
              CUT_SETTLE_REMNANT_DISPOSITION.KEEP_LINE_SIDE &&
            Number(l.remnantLength) > 0 &&
            !l.remnantReturnedAt,
          ),
  }))
  return { ...row, lines }
}

function initRecords() {
  if (shouldReseed() || !loadFromStorage()?.length) {
    return ensureOneItemOneCodeInventoryCutSettles(
      ensureMultiUnitFlowCutSettleRecords(createCutSettleSeed()),
    ).map(normalizeCutSettleRecord)
  }
  return ensureOneItemOneCodeInventoryCutSettles(
    ensureMultiUnitFlowCutSettleRecords(loadFromStorage()),
  ).map(normalizeCutSettleRecord)
}

export const cutSettleState = reactive({
  records: initRecords(),
})

watch(
  () => cutSettleState.records,
  () => persist(),
  { deep: true },
)

export function generateCutSettleNo() {
  const ymd = dayjs().format('YYYYMMDD')
  const prefix = `CS${ymd}`
  const max = cutSettleState.records.reduce((m, r) => {
    const str = String(r.docNo || '')
    if (!str.startsWith(prefix)) return m
    const seq = Number(str.slice(prefix.length)) || 0
    return Math.max(m, seq)
  }, 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export function getCutSettleById(id) {
  return cutSettleState.records.find((r) => r.id === id) || null
}

/** 从已出库的领料/发料出库单生成下料结算草稿行（认工单下料工序，不强制双单位） */
export function buildCutSettleDraftFromOutbound(outboundId) {
  const order = getOutboundOrderById(outboundId)
  if (!order) return { ok: false, message: '出库单不存在' }
  if (order.status !== '已出库') {
    return { ok: false, message: '仅已出库的领料出库单可下料结算' }
  }
  if (order.outboundType !== '领料出库' && order.outboundType !== '发料出库') {
    return { ok: false, message: '仅领料/发料出库单可下料结算' }
  }
  if (!isOutboundEligibleForCutSettle(order)) {
    return {
      ok: false,
      message:
        '该出库单不可结算：关联工单需含「下料工序」且物料勾选「需要下料结算」，或存在已拣批的双单位行（兼容）',
    }
  }
  const settleLines = getCutSettleCandidateLines(order)
  if (!settleLines.length) {
    return {
      ok: false,
      message:
        '该出库单无可结算的物料行（需已出库，且物料主数据勾选「需要下料结算」；兼容路径为双单位已拣批）',
    }
  }
  const receiveWh = String(order.receiveWarehouse || '').trim()
  const shipHeader = order.warehouse || ''
  const outboundTime = order.outboundTime || order.completedAt || order.createdAt || ''
  const lines = settleLines.map((line) => {
    const unit = line.unit || line.stockUnit || (line.isVariableLength ? '米' : '件')
    const demand = Number(line.demandMeters ?? line.shipQty) || 0
    const allocSum = (Array.isArray(line.batchAllocations) ? line.batchAllocations : []).reduce(
      (s, a) => s + (Number(a.qty) || 0),
      0,
    )
    const picked = Number(line.pickedLength) || Number(line.shipQty) || allocSum || 0
    const firstAlloc = (line.batchAllocations || [])[0]
    const shipWh = line.shipWarehouse || shipHeader
    const consumeWh = line.receiveWarehouse || receiveWh || shipWh
    const remnantReturnWh = receiveWh || line.receiveWarehouse ? shipWh : consumeWh
    const defaultConsume = demand > 0 ? demand : picked
    return {
      id: `csl-${line.id || Date.now()}`,
      itemCode: line.itemCode,
      itemName: line.itemName,
      specModel: line.specModel || '',
      drawingNo: line.drawingNo || '',
      material: line.material || '',
      unit,
      isVariableLength: Boolean(line.isVariableLength),
      shipWarehouse: shipWh,
      warehouse: consumeWh,
      remnantReturnWarehouse: remnantReturnWh,
      pickedBatchId: line.pickedBatchId || firstAlloc?.batchId,
      pickedBatchNo: line.pickedBatchNo || line.issuedBatchNo || firstAlloc?.batchNo || '',
      receiveBatchIds: Array.isArray(line.receiveBatchIds) ? [...line.receiveBatchIds] : [],
      pickedLength: picked,
      demandMeters: demand,
      actualConsumeMeters: defaultConsume,
      remnantLength: roundMeters(Math.max(0, picked - defaultConsume)),
      workOrderNo: line.workOrderNo || line.sourceDocNo || order.sourceOrderNo || '',
      dualUnitIssueStrategy: line.dualUnitIssueStrategy || '',
      blankSize: line.blankSize || null,
      blankSizeText: line.blankSizeText || '',
      blankSizeMode: line.blankSizeMode || '',
    }
  })
  return {
    ok: true,
    draft: {
      outboundId: order.id,
      outboundDocNo: order.docNo,
      sourceOrderNo: order.sourceOrderNo || '',
      receiveWarehouse: receiveWh,
      shipWarehouse: shipHeader,
      outboundTime,
      lines,
    },
  }
}

export function createCutSettleRecord(payload) {
  const lines = (payload.lines || []).map((line) => {
    const picked = Number(line.pickedLength) || 0
    const consume = Number(line.actualConsumeMeters) || 0
    return {
      ...line,
      actualConsumeMeters: consume,
      remnantLength: roundMeters(Math.max(0, picked - consume)),
    }
  })
  for (const line of lines) {
    if (line.actualConsumeMeters <= 0) {
      return { ok: false, message: `「${line.itemName || line.itemCode}」实耗数量须大于 0` }
    }
    if (line.actualConsumeMeters > line.pickedLength) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」实耗不可超过出库数量 ${line.pickedLength}${line.unit ? line.unit : ''}`,
      }
    }
  }

  const row = {
    id: payload.id || `cs-${Date.now()}`,
    docNo: payload.docNo || generateCutSettleNo(),
    status: '待确认',
    outboundId: payload.outboundId || '',
    outboundDocNo: payload.outboundDocNo || '',
    sourceOrderNo: payload.sourceOrderNo || '',
    receiveWarehouse: payload.receiveWarehouse || '',
    shipWarehouse: payload.shipWarehouse || '',
    outboundTime: payload.outboundTime || '',
    remark: payload.remark || '',
    lines,
    creator: payload.creator || 'admin1',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    confirmedAt: '',
    confirmer: '',
    remnantInboundDocNo: '',
    remnantDisposition: '',
  }
  cutSettleState.records.unshift(row)
  return { ok: true, record: row }
}

/**
 * 从领入仓（线边）按数量扣减：优先领入批次 FIFO，否则 pickedBatchId / 汇总库存
 */
function consumeQtyFromReceiveWarehouse(line, qty, meta = {}) {
  const wh = line.warehouse
  let left = roundMeters(Number(qty) || 0)
  if (!wh || !(left > 0)) return { ok: true }

  const receiveIds = Array.isArray(line.receiveBatchIds) ? line.receiveBatchIds.filter(Boolean) : []
  for (const id of receiveIds) {
    if (!(left > 0)) break
    const batch = getBatchById(id)
    if (!batch || batch.status !== BATCH_STATUS.IN_STOCK) continue
    const avail = roundMeters(Number(batch.currentLength) || 0)
    if (!(avail > 0)) continue
    const take = roundMeters(Math.min(avail, left))
    const res = issueBatchQty(id, take, { ...meta, allowPieceSplit: true })
    if (!res.ok) return res
    left = roundMeters(left - take)
  }
  if (!(left > 0)) return { ok: true }

  const batch = getBatchById(line.pickedBatchId)
  if (batch && batch.warehouse === wh && batch.status === BATCH_STATUS.IN_STOCK) {
    const avail = roundMeters(Number(batch.currentLength) || 0)
    const take = roundMeters(Math.min(avail, left))
    if (take > 0) {
      const res = issueBatchQty(line.pickedBatchId, take, { ...meta, allowPieceSplit: true })
      if (!res.ok) return res
      left = roundMeters(left - take)
    }
  }
  if (!(left > 0)) return { ok: true }

  return adjustStockQty({
    warehouse: wh,
    itemCode: line.itemCode,
    itemName: line.itemName,
    unit: line.unit || '米',
    delta: -left,
  })
}

function resolveShipReturnWarehouse(line, row) {
  return (
    line.remnantReturnWarehouse ||
    line.shipWarehouse ||
    row.shipWarehouse ||
    line.warehouse ||
    row.receiveWarehouse ||
    ''
  )
}

function buildRemnantInboundLines(row, remnantMoves, operator) {
  if (!remnantMoves.length) return null
  return addInboundOrder({
    inboundType: '余料入库',
    status: '已完成',
    warehouse: remnantMoves[0].warehouse,
    sourceOrderNo: row.docNo,
    sourceType: '下料结算',
    itemType: '物料',
    handler: operator,
    creator: operator,
    confirmer: operator,
    confirmedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    remark: `下料结算余料退回发料仓 ${row.docNo}`,
    inboundDate: dayjs().format('YYYY-MM-DD'),
    docNo: generateInboundNo(),
    lineItems: remnantMoves,
  })
}

/**
 * 确认下料结算
 * @param {string} id
 * @param {{ remnantDisposition?: string, operator?: string }} [options]
 * - keep_line_side：只扣实耗，余料留线边（主按钮）
 * - return_to_ship：扣实耗并将余料退回发料仓
 */
export function confirmCutSettle(id, options = {}) {
  const operator = options.operator || 'admin1'
  const remnantDisposition =
    options.remnantDisposition || CUT_SETTLE_REMNANT_DISPOSITION.KEEP_LINE_SIDE
  const row = getCutSettleById(id)
  if (!row) return { ok: false, message: '结算单不存在' }
  if (row.status === '已确认') return { ok: false, message: '已确认，请勿重复操作' }

  const keepLineSide = remnantDisposition === CUT_SETTLE_REMNANT_DISPOSITION.KEEP_LINE_SIDE
  const remnantMoves = []

  for (const line of row.lines || []) {
    const consume = roundMeters(Number(line.actualConsumeMeters) || 0)
    const remnant = roundMeters(Math.max(0, (Number(line.pickedLength) || 0) - consume))
    line.remnantLength = remnant

    const consumeRes = consumeQtyFromReceiveWarehouse(line, consume, {
      sourceDocNo: row.docNo,
      workOrderNo: line.workOrderNo || '',
    })
    if (!consumeRes.ok) return { ok: false, message: consumeRes.message }

    line.remnantDisposition = remnantDisposition

    if (keepLineSide) {
      line.remnantPendingReturn = remnant > 0
      line.lineSideRemnantQty = remnant
      line.remnantBatchId = ''
      line.remnantBatchNo = ''
      continue
    }

    if (remnant > 0) {
      const moveRes = consumeQtyFromReceiveWarehouse(line, remnant, {
        sourceDocNo: row.docNo,
        workOrderNo: line.workOrderNo || '',
      })
      if (!moveRes.ok) return { ok: false, message: moveRes.message }

      const returnWh = resolveShipReturnWarehouse(line, row)
      const sourceBatchId =
        (Array.isArray(line.receiveBatchIds) && line.receiveBatchIds[0]) || line.pickedBatchId
      const res = receiveRemnantBatch({
        sourceBatchId,
        remnantLength: remnant,
        warehouse: returnWh,
        sourceDocNo: row.docNo,
        sourceType: '余料入库',
      })
      if (!res.ok) return { ok: false, message: res.message }
      line.remnantBatchId = res.batch.id
      line.remnantBatchNo = res.batch.batchNo
      line.remnantPendingReturn = false
      line.remnantReturnedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
      line.lineSideRemnantQty = 0
      remnantMoves.push({
        itemCode: line.itemCode,
        itemName: line.itemName,
        warehouse: returnWh,
        qty: remnant,
        unit: line.unit || '米',
        isVariableLength: Boolean(line.isVariableLength),
        pieceLengths: line.isVariableLength ? [remnant] : undefined,
        purchaseQty: line.isVariableLength ? 1 : undefined,
        stockQty: remnant,
        remark: `余料来自 ${line.pickedBatchNo}，结算单 ${row.docNo}`,
      })
    } else {
      line.remnantPendingReturn = false
      line.lineSideRemnantQty = 0
    }
  }

  if (remnantMoves.length) {
    const inbound = buildRemnantInboundLines(row, remnantMoves, operator)
    if (inbound) {
      row.remnantInboundDocNo = inbound.docNo
      row.remnantInboundId = inbound.id
    }
  }

  row.remnantDisposition = remnantDisposition
  row.status = '已确认'
  row.confirmer = operator
  row.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, record: row }
}

/** 单据是否还有「留在线边、可退回发料仓」的余料 */
export function hasCutSettleRemnantPendingReturn(record) {
  if (!record || record.status !== '已确认') return false
  return (record.lines || []).some(
    (l) =>
      l.remnantPendingReturn &&
      Number(l.remnantLength || l.lineSideRemnantQty) > 0 &&
      !l.remnantReturnedAt,
  )
}

/**
 * 将此前「留线边」的余料退回发料仓（结算后的收口动作）
 */
export function returnCutSettleRemnantToShip(id, { operator = 'admin1', lineIds } = {}) {
  const row = getCutSettleById(id)
  if (!row) return { ok: false, message: '结算单不存在' }
  if (row.status !== '已确认') return { ok: false, message: '仅已确认结算单可退回余料' }

  const targets = (row.lines || []).filter((l) => {
    if (lineIds?.length && !lineIds.includes(l.id)) return false
    return (
      l.remnantPendingReturn &&
      Number(l.remnantLength || l.lineSideRemnantQty) > 0 &&
      !l.remnantReturnedAt
    )
  })
  if (!targets.length) {
    return { ok: false, message: '没有可退回发料仓的线边余料' }
  }

  const remnantMoves = []
  for (const line of targets) {
    const remnant = roundMeters(Number(line.lineSideRemnantQty || line.remnantLength) || 0)
    if (!(remnant > 0)) continue

    const moveRes = consumeQtyFromReceiveWarehouse(line, remnant, {
      sourceDocNo: row.docNo,
      workOrderNo: line.workOrderNo || '',
    })
    if (!moveRes.ok) return { ok: false, message: moveRes.message }

    const returnWh = resolveShipReturnWarehouse(line, row)
    const sourceBatchId =
      (Array.isArray(line.receiveBatchIds) && line.receiveBatchIds[0]) || line.pickedBatchId
    const res = receiveRemnantBatch({
      sourceBatchId,
      remnantLength: remnant,
      warehouse: returnWh,
      sourceDocNo: row.docNo,
      sourceType: '余料入库',
    })
    if (!res.ok) return { ok: false, message: res.message }

    line.remnantBatchId = res.batch.id
    line.remnantBatchNo = res.batch.batchNo
    line.remnantPendingReturn = false
    line.remnantReturnedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    line.lineSideRemnantQty = 0
    remnantMoves.push({
      itemCode: line.itemCode,
      itemName: line.itemName,
      warehouse: returnWh,
      qty: remnant,
      unit: line.unit || '米',
      isVariableLength: Boolean(line.isVariableLength),
      pieceLengths: line.isVariableLength ? [remnant] : undefined,
      purchaseQty: line.isVariableLength ? 1 : undefined,
      stockQty: remnant,
      remark: `线边余料退回，来自 ${line.pickedBatchNo}，结算单 ${row.docNo}`,
    })
  }

  if (!remnantMoves.length) {
    return { ok: false, message: '没有可退回发料仓的线边余料' }
  }

  const inbound = buildRemnantInboundLines(row, remnantMoves, operator)
  if (inbound) {
    row.remnantInboundDocNo = [row.remnantInboundDocNo, inbound.docNo].filter(Boolean).join('、')
    row.remnantInboundId = inbound.id
    row.remnantReturnInboundDocNo = inbound.docNo
  }
  row.remnantReturnedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  row.remnantReturnOperator = operator
  return { ok: true, record: row, inboundDocNo: inbound?.docNo || '' }
}

export function deleteCutSettle(id) {
  const idx = cutSettleState.records.findIndex((r) => r.id === id)
  if (idx === -1) return false
  if (cutSettleState.records[idx].status === '已确认') return false
  cutSettleState.records.splice(idx, 1)
  return true
}

export function listCutSettleRecords() {
  return cutSettleState.records
}
