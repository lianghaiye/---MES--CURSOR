import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { roundMeters } from '@/utils/variableLengthMaterial'
import { getBatchById, receiveRemnantBatch, BATCH_STATUS } from '@/store/stockBatchStore'
import { getOutboundOrderById } from '@/store/outboundStore'
import { addInboundOrder, generateInboundNo } from '@/store/inboundOrderStore'

const STORAGE_KEY = 'i_doms_cut_settle_records'

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
  return []
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: cutSettleState.records }))
}

export const cutSettleState = reactive({
  records: loadFromStorage(),
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

/** 从已出库的领料出库单生成下料结算草稿行 */
export function buildCutSettleDraftFromOutbound(outboundId) {
  const order = getOutboundOrderById(outboundId)
  if (!order) return { ok: false, message: '出库单不存在' }
  if (order.status !== '已出库') {
    return { ok: false, message: '仅已出库的领料出库单可下料结算' }
  }
  const vlLines = (order.lineItems || []).filter((l) => {
    if (!l.isVariableLength) return false
    if (l.pickedBatchId) return true
    const allocs = Array.isArray(l.batchAllocations) ? l.batchAllocations : []
    return allocs.some((a) => a?.batchId && Number(a.qty) > 0)
  })
  if (!vlLines.length) {
    return { ok: false, message: '该出库单无可结算的双物料单位行' }
  }
  const lines = vlLines.map((line) => {
    const demand = Number(line.demandMeters ?? line.shipQty) || 0
    const allocSum = (Array.isArray(line.batchAllocations) ? line.batchAllocations : []).reduce(
      (s, a) => s + (Number(a.qty) || 0),
      0,
    )
    // 整出+余料回：实发量（shipQty/分配合计）作拣出量；需求量作默认耗用
    const picked = Number(line.pickedLength) || Number(line.shipQty) || allocSum || 0
    const firstAlloc = (line.batchAllocations || [])[0]
    return {
      id: `csl-${line.id || Date.now()}`,
      itemCode: line.itemCode,
      itemName: line.itemName,
      warehouse: line.shipWarehouse || order.warehouse,
      pickedBatchId: line.pickedBatchId || firstAlloc?.batchId,
      pickedBatchNo: line.pickedBatchNo || line.issuedBatchNo || firstAlloc?.batchNo || '',
      pickedLength: picked,
      demandMeters: demand,
      actualConsumeMeters: demand,
      remnantLength: roundMeters(Math.max(0, picked - demand)),
      workOrderNo: line.workOrderNo || line.sourceDocNo || order.sourceOrderNo || '',
      dualUnitIssueStrategy: line.dualUnitIssueStrategy || '',
    }
  })
  return {
    ok: true,
    draft: {
      outboundId: order.id,
      outboundDocNo: order.docNo,
      sourceOrderNo: order.sourceOrderNo || '',
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
      return { ok: false, message: `「${line.itemName || line.itemCode}」耗用长度须大于 0` }
    }
    if (line.actualConsumeMeters > line.pickedLength) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」耗用不可超过出库长度 ${line.pickedLength} 米`,
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

export function confirmCutSettle(id, operator = 'admin1') {
  const row = getCutSettleById(id)
  if (!row) return { ok: false, message: '结算单不存在' }
  if (row.status === '已确认') return { ok: false, message: '已确认，请勿重复操作' }

  const remnantLines = []
  for (const line of row.lines || []) {
    const batch = getBatchById(line.pickedBatchId)
    if (batch && batch.status !== BATCH_STATUS.ISSUED) {
      // 允许已出库；若状态异常仍尝试余料
    }
    const remnant = roundMeters(Number(line.remnantLength))
    if (remnant > 0) {
      const res = receiveRemnantBatch({
        sourceBatchId: line.pickedBatchId,
        remnantLength: remnant,
        warehouse: line.warehouse,
        sourceDocNo: row.docNo,
        sourceType: '余料入库',
      })
      if (!res.ok) return { ok: false, message: res.message }
      line.remnantBatchId = res.batch.id
      line.remnantBatchNo = res.batch.batchNo
      remnantLines.push({
        itemCode: line.itemCode,
        itemName: line.itemName,
        warehouse: line.warehouse,
        qty: remnant,
        unit: '米',
        isVariableLength: true,
        pieceLengths: [remnant],
        purchaseQty: 1,
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
    // 余料已在 receiveRemnantBatch 写入库存；入库单仅留痕，避免再走 applyInboundToStock 双计
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
