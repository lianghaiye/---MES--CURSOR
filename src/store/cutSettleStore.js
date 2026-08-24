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
import {
  getCutSettleCandidateLines,
  isOutboundEligibleForCutSettle,
} from '@/utils/workOrderBlanking'

const STORAGE_KEY = 'i_doms_cut_settle_records'
const SEED_VERSION_KEY = 'i_doms_cut_settle_seed_v'
/** v2：明细列表字段（规格/图号/材质/出库仓/出库时间） */
const CURRENT_SEED_VERSION = '2'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.records)) return parsed.records
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

function initRecords() {
  if (shouldReseed() || !loadFromStorage()?.length) {
    return createCutSettleSeed()
  }
  return loadFromStorage()
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
    // 拣出量：优先拣批长度/实发；单单位用出库数量
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
  }
  cutSettleState.records.unshift(row)
  return { ok: true, record: row }
}

/** 从领入仓（B）扣掉整段领入量：优先扣领入批次，否则扣汇总 */
function consumeFromReceiveWarehouse(line, meta = {}) {
  const wh = line.warehouse
  const picked = roundMeters(Number(line.pickedLength) || 0)
  if (!wh || !(picked > 0)) return { ok: true }

  const receiveIds = Array.isArray(line.receiveBatchIds) ? line.receiveBatchIds.filter(Boolean) : []
  if (receiveIds.length) {
    for (const id of receiveIds) {
      const batch = getBatchById(id)
      if (!batch || batch.status !== BATCH_STATUS.IN_STOCK) continue
      const res = issueBatchQty(id, null, meta)
      if (!res.ok) return res
    }
    return { ok: true }
  }

  // 回退：按汇总从领入仓扣（演示种子线边批可直接 issue 上面分支）
  const batch = getBatchById(line.pickedBatchId)
  if (batch && batch.warehouse === wh && batch.status === BATCH_STATUS.IN_STOCK) {
    return issueBatchQty(line.pickedBatchId, picked, meta)
  }

  return adjustStockQty({
    warehouse: wh,
    itemCode: line.itemCode,
    itemName: line.itemName,
    unit: line.unit || '米',
    delta: -picked,
  })
}

export function confirmCutSettle(id, operator = 'admin1') {
  const row = getCutSettleById(id)
  if (!row) return { ok: false, message: '结算单不存在' }
  if (row.status === '已确认') return { ok: false, message: '已确认，请勿重复操作' }

  const remnantLines = []
  for (const line of row.lines || []) {
    const consumeRes = consumeFromReceiveWarehouse(line, {
      sourceDocNo: row.docNo,
      workOrderNo: line.workOrderNo || '',
    })
    if (!consumeRes.ok) return { ok: false, message: consumeRes.message }

    const remnant = roundMeters(Number(line.remnantLength))
    if (remnant > 0) {
      const returnWh = line.remnantReturnWarehouse || line.warehouse || row.receiveWarehouse || ''
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
      remnantLines.push({
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
    }
  }

  if (remnantLines.length) {
    const inbound = addInboundOrder({
      inboundType: '余料入库',
      status: '已完成',
      warehouse: remnantLines[0].warehouse,
      sourceOrderNo: row.docNo,
      sourceType: '下料结算',
      itemType: '物料',
      handler: operator,
      creator: operator,
      confirmer: operator,
      confirmedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      remark: `下料结算余料回仓 ${row.docNo}`,
      inboundDate: dayjs().format('YYYY-MM-DD'),
      docNo: generateInboundNo(),
      lineItems: remnantLines,
    })
    row.remnantInboundDocNo = inbound.docNo
    row.remnantInboundId = inbound.id
  }

  row.status = '已确认'
  row.confirmer = operator
  row.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, record: row }
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
