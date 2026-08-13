import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { cloneOutboundOrders, createOutboundLine, createOutboundOrder } from '@/mock/outboundOrders'
import { ensureCrossDemoOutboundOrders } from '@/mock/crossModuleDemoSeed'
import { needsOutboundApproval } from '@/mock/outboundOptions'
import {
  createFactoryQcFromOutbound,
  getFactoryQcById,
  qcResultBlocksOutbound,
  QC_RESULT_PASS,
} from '@/store/factoryQcStore'
import { applyOutboundToStock } from '@/store/stockStore'
import { releaseAllocationOnShip } from '@/store/salesStockAllocationStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { issueBatchQty, getBatchById } from '@/store/stockBatchStore'
import {
  getOutboundIssueRule,
  isPartialDualUnitIssue,
  OUTBOUND_ISSUE_RULES,
} from '@/store/functionParamStore'
import {
  allocateOutboundBatches,
  getLineBatchAllocations,
  getOutboundAvailableBatchQty,
  isLineManualBatchPick,
  validateManualBatchAllocations,
} from '@/utils/outboundBatchAllocate'
import { formatBatchAttrsText } from '@/utils/outboundLineColumns'
import { transferOutboundToReceiveWarehouse } from '@/utils/outboundReceiveTransfer'

const STORAGE_KEY = 'i_doms_outbound_orders'
const SEED_VERSION_KEY = 'i_doms_outbound_orders_seed_v'
/** v3：跨模块演示领料出库（工单已领冲减占用） */
const CURRENT_SEED_VERSION = '3'

/** 领料/发料出库不再审批：历史「待处理」升为「待出库」 */
function migrateSkipApprovalStatuses(orders) {
  const skipTypes = new Set(['领料出库', '发料出库'])
  return (orders || []).map((o) => {
    if (skipTypes.has(o.outboundType) && o.status === '待处理') {
      return { ...o, status: '待出库' }
    }
    return o
  })
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return migrateSkipApprovalStatuses(parsed.orders)
    }
  } catch {
    /* ignore */
  }
  const legacy = localStorage.getItem('i_doms_sales_outbound')
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed.orders)) {
        return migrateSkipApprovalStatuses(
          parsed.orders.map((o) => ({
            ...o,
            outboundType: o.docType || o.outboundType || '销售出库',
            warehouse: o.warehouse || '成品仓',
            handler: o.handler || 'admin1',
            sourceOrderNo: o.sourceOrderNo || o.salesOrderNo || '',
            creator: o.creator || 'admin1',
            createdAt: o.outboundDate || o.createdAt,
            workshop: o.workshop || '默认工厂',
            warehouseKeeper: o.warehouseKeeper || 'admin1',
          })),
        )
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: outboundState.orders }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function shouldReseedOutbound() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function initOutboundOrders() {
  const base = shouldReseedOutbound()
    ? cloneOutboundOrders()
    : loadFromStorage() || cloneOutboundOrders()
  return ensureCrossDemoOutboundOrders(migrateSkipApprovalStatuses(base))
}

export function generateOutboundNo() {
  const seq = outboundState.orders.length + 1
  return `OUT${dayjs().format('YYYYMMDD')}${String(seq).padStart(4, '0')}`
}

export const outboundState = reactive({
  orders: initOutboundOrders(),
})

watch(
  () => outboundState.orders,
  () => persist(),
  { deep: true },
)

export function getOutboundOrderById(id) {
  if (!id) return null
  return outboundState.orders.find((o) => o.id === id) || null
}

export function getOutboundOrderByDocNo(docNo) {
  if (!docNo) return null
  return outboundState.orders.find((o) => o.docNo === docNo) || null
}

export function deleteOutboundOrder(id) {
  const idx = outboundState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  outboundState.orders.splice(idx, 1)
  return true
}

export function canEditOutbound(order) {
  return ['待处理', '待出库', '部分出库'].includes(order?.status)
}

export function canDeleteOutbound(order) {
  return ['待处理', '待出库'].includes(order?.status)
}

export function canApproveOutbound(order) {
  return order?.status === '待处理' && needsOutboundApproval(order.outboundType)
}

/** 新建出库单初始状态：需审批类型为待处理，其余（含领料/发料）直接待出库 */
export function resolveOutboundInitialStatus(outboundType, explicitStatus) {
  if (explicitStatus) return explicitStatus
  if (needsOutboundApproval(outboundType)) return '待处理'
  return '待出库'
}

function buildLineItems(payload) {
  return payload.lineItems.map((line) =>
    createOutboundLine({
      ...line,
      itemType: line.itemType || payload.itemType || '物料',
      shipWarehouse: line.shipWarehouse || payload.warehouse || '',
    }),
  )
}

function applyOutboundHeaderFields(order, payload) {
  const lineItems = buildLineItems(payload)
  const headerWarehouse =
    payload.warehouse || lineItems.find((line) => line.shipWarehouse)?.shipWarehouse || ''
  Object.assign(order, {
    ...payload,
    warehouse: headerWarehouse,
    lineItems,
    warehouseKeeper:
      payload.warehouseKeeper || payload.handler || order.warehouseKeeper || 'admin1',
    workshop: payload.workshop || payload.requisitionDept || order.workshop || '默认工厂',
    outboundTime:
      payload.outboundTime || order.outboundTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    remark: payload.remark?.trim?.() ?? payload.remark ?? order.remark,
  })
  return order
}

export function appendOutboundOrder(payload) {
  if (!payload.outboundType) {
    return { ok: false, message: '请选择出库类型' }
  }
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条明细' }
  }

  const docNo = String(payload.docNo || '').trim() || generateOutboundNo()
  if (getOutboundOrderByDocNo(docNo)) {
    return { ok: false, message: '出库单号已存在' }
  }

  const lineItems = buildLineItems(payload)
  const headerWarehouse =
    payload.warehouse || lineItems.find((line) => line.shipWarehouse)?.shipWarehouse || ''

  const row = createOutboundOrder({
    ...payload,
    id: payload.id || `ob-${Date.now()}`,
    docNo,
    warehouse: headerWarehouse,
    lineItems,
    status: resolveOutboundInitialStatus(payload.outboundType, payload.status),
    createdAt: payload.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    outboundTime: payload.outboundTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    creator: payload.creator || 'admin1',
    warehouseKeeper: payload.warehouseKeeper || payload.handler || 'admin1',
    workshop: payload.workshop || payload.requisitionDept || '默认工厂',
    sourceChannel: payload.sourceChannel || 'web',
  })
  outboundState.orders.unshift(row)
  return { ok: true, order: row }
}

export function addOutboundOrder(payload) {
  const docNo = String(payload.docNo || '').trim()
  if (!docNo) {
    return { ok: false, message: '请输入出库单号' }
  }
  return appendOutboundOrder({ ...payload, docNo })
}

export function updateOutboundOrder(id, payload) {
  const order = getOutboundOrderById(id)
  if (!order) {
    return { ok: false, message: '出库单不存在' }
  }
  if (!canEditOutbound(order)) {
    return { ok: false, message: '当前状态不可编辑' }
  }
  const docNo = String(payload.docNo || order.docNo || '').trim()
  if (!docNo) {
    return { ok: false, message: '请输入出库单号' }
  }
  const duplicate = getOutboundOrderByDocNo(docNo)
  if (duplicate && duplicate.id !== id) {
    return { ok: false, message: '出库单号已存在' }
  }
  if (!payload.outboundType) {
    return { ok: false, message: '请选择出库类型' }
  }
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条明细' }
  }
  applyOutboundHeaderFields(order, { ...payload, docNo })
  return { ok: true, order }
}

export function approveOutboundOrder(id, operator = 'admin1') {
  const order = getOutboundOrderById(id)
  if (!order) {
    return { ok: false, message: '出库单不存在' }
  }
  if (!canApproveOutbound(order)) {
    return { ok: false, message: '当前出库单不可审批' }
  }
  order.status = '待出库'
  order.auditor = operator
  order.auditDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, order }
}

export function confirmOutbound(ids) {
  const blocked = []
  let count = 0
  ids.forEach((id) => {
    const order = outboundState.orders.find((o) => o.id === id)
    const check = validateOutboundForConfirm(order)
    if (!check.ok) {
      if (check.code !== 'already_done') {
        blocked.push({
          docNo: order?.docNo || id,
          message: check.message,
          qcBlocked: check.qcBlocked,
        })
      }
      return
    }

    const pendingIds = (order.lineItems || [])
      .filter((l) => (l.lineStatus || '待出库') !== '已出库')
      .map((l) => l.id)
    if (!pendingIds.length) {
      order.status = '已出库'
      order.completedAt = dayjs().format('YYYY-MM-DD')
      count += 1
      return
    }

    const stockCheck = applyOutboundStockMovements(order, { lineIds: pendingIds })
    if (!stockCheck.ok) {
      blocked.push({ docNo: order.docNo, message: stockCheck.message })
      return
    }

    pendingIds.forEach((lineId) => {
      const line = order.lineItems.find((l) => l.id === lineId)
      if (line) line.lineStatus = '已出库'
    })

    const transfer = transferOutboundToReceiveWarehouse(order, { lineIds: pendingIds })
    if (!transfer.ok) {
      blocked.push({ docNo: order.docNo, message: transfer.message || '领入仓调入失败' })
      return
    }

    recomputeOutboundOrderStatus(order)
    if (order.outboundType === '销售出库' && order.status === '已出库') {
      import('@/utils/deliveryOutboundSync').then(({ syncDeliveryAfterOutboundConfirm }) => {
        syncDeliveryAfterOutboundConfirm(order)
      })
    }
    count += 1
  })
  return { count, blocked }
}

/** 按明细确认出库 */
export function confirmOutboundLine(orderId, lineId) {
  const order = outboundState.orders.find((o) => o.id === orderId)
  const check = validateOutboundForConfirm(order)
  if (!check.ok) return { ok: false, message: check.message, qcBlocked: check.qcBlocked }
  const line = (order.lineItems || []).find((l) => l.id === lineId)
  if (!line) return { ok: false, message: '明细不存在' }
  if ((line.lineStatus || '待出库') === '已出库') {
    return { ok: false, message: '该明细已出库' }
  }

  const stockCheck = applyOutboundStockMovements(order, { lineIds: [lineId] })
  if (!stockCheck.ok) return stockCheck

  line.lineStatus = '已出库'
  const transfer = transferOutboundToReceiveWarehouse(order, { lineIds: [lineId] })
  if (!transfer.ok) {
    return { ok: false, message: transfer.message || '领入仓调入失败' }
  }

  recomputeOutboundOrderStatus(order)
  if (order.outboundType === '销售出库' && order.status === '已出库') {
    import('@/utils/deliveryOutboundSync').then(({ syncDeliveryAfterOutboundConfirm }) => {
      syncDeliveryAfterOutboundConfirm(order)
    })
  }
  return { ok: true, order, line }
}

export function recomputeOutboundOrderStatus(order) {
  if (!order) return
  const lines = order.lineItems || []
  if (!lines.length) {
    if (order.status === '部分出库') order.status = '待出库'
    return
  }
  const done = lines.filter((l) => (l.lineStatus || '待出库') === '已出库').length
  if (done === 0) {
    if (order.status === '部分出库' || order.status === '已出库') order.status = '待出库'
    return
  }
  if (done === lines.length) {
    order.status = '已出库'
    order.completedAt = order.completedAt || dayjs().format('YYYY-MM-DD')
    if (!order.auditDate) order.auditDate = order.completedAt
    return
  }
  order.status = '部分出库'
  order.completedAt = ''
}

function writeIssuedBatchFields(line, issuedAllocations, { rule, demandQty, dualUnit }) {
  const issuedNos = issuedAllocations.map((a) => a.batchNo).filter(Boolean)
  const issuedTotal =
    Math.round(issuedAllocations.reduce((s, a) => s + (Number(a.qty) || 0), 0) * 10000) / 10000
  const issuedSerials = []
  const remnantSerials = []
  issuedAllocations.forEach((a) => {
    ;(a.pieceSerialNos || []).forEach((s) => issuedSerials.push(s))
    ;(a.remnantSerialNos || []).forEach((s) => remnantSerials.push(s))
  })
  line.batchAllocations = issuedAllocations
  line.outboundIssueRule = rule
  if (dualUnit) {
    if (!isPartialDualUnitIssue()) {
      if (!(Number(line.demandMeters) > 0)) line.demandMeters = demandQty
      line.dualUnitIssueStrategy = 'whole_with_remnant'
    } else {
      line.dualUnitIssueStrategy = 'partial'
    }
  }
  line.shipQty = issuedTotal
  line.issuedBatchNo = issuedNos.join('、')
  line.issuedPieceSerialNos = issuedSerials
  line.remnantPieceSerialNos = remnantSerials
  line.pickedBatchId = issuedAllocations[0]?.batchId
  line.pickedBatchNo = issuedAllocations[0]?.batchNo
  line.pickedLength = issuedTotal
  line.barcodeBatchNo = line.issuedBatchNo
  line.batchFullyIssued = issuedAllocations.every((a) => {
    const b = getBatchById(a.batchId)
    return !b || b.status === '已出库' || !(Number(b.currentLength) > 0)
  })
  const texts = []
  const seen = new Set()
  issuedAllocations.forEach((a) => {
    const t = formatBatchAttrsText(getBatchById(a.batchId)?.attrs)
    if (t && !seen.has(t)) {
      seen.add(t)
      texts.push(t)
    }
  })
  const firstBatch = getBatchById(issuedAllocations[0]?.batchId)
  line.batchAttrs = firstBatch?.attrs ? { ...firstBatch.attrs } : undefined
  line.batchAttrsText = texts.join(' | ')
}

function applyOutboundStockMovements(order, { lineIds } = {}) {
  const lines = (order.lineItems || []).filter((line) => {
    if ((line.lineStatus || '待出库') === '已出库') return false
    if (lineIds?.length && !lineIds.includes(line.id)) return false
    return true
  })
  const rule = getOutboundIssueRule()

  for (const line of lines) {
    const meta = {
      sourceDocNo: order.docNo,
      workOrderNo: line.workOrderNo || line.sourceDocNo || order.sourceOrderNo || '',
    }
    const lineManual = isLineManualBatchPick(line)
    const warehouse = line.shipWarehouse || order.warehouse
    const batchAvail = getOutboundAvailableBatchQty(warehouse, line.itemCode)
    const hasAlloc = getLineBatchAllocations(line).length > 0
    const dualUnit = Boolean(line.isVariableLength)

    // 自主拣选：单/双单位均按所选批次扣账
    if (lineManual) {
      const demandQty = Number(line.demandMeters ?? line.shipQty) || 0
      const check = validateManualBatchAllocations(line)
      if (!check.ok) {
        return {
          ok: false,
          message: `「${line.itemName || line.itemCode}」${check.message}`,
        }
      }
      const issuedAllocations = []
      for (const a of check.allocations) {
        const res = issueBatchQty(a.batchId, a.qty, {
          ...meta,
          pieceIds: a.pieceIds,
          pieceSplit: a.pieceSplit,
        })
        if (!res.ok) {
          return { ok: false, message: res.message }
        }
        issuedAllocations.push({
          batchId: a.batchId,
          batchNo: res.batch?.batchNo || a.batchNo,
          qty: res.issuedLength,
          unit: a.unit || line.unit || '',
          pieceIds: a.pieceIds,
          pieceSerialNos: res.issuedSerialNos || a.pieceSerialNos,
          pieceSplit: Boolean(res.pieceSplit || a.pieceSplit),
          remnantSerialNos: res.remnantSerialNos || [],
        })
      }
      line.manualBatchPick = true
      writeIssuedBatchFields(line, issuedAllocations, {
        rule: OUTBOUND_ISSUE_RULES.MANUAL,
        demandQty,
        dualUnit,
      })
      continue
    }

    // 自动 FIFO：双单位必走批次；单单位有批次库存时走批次，否则留给汇总库存扣减
    if (dualUnit || batchAvail > 0) {
      if (!(Number(line.shipQty) > 0)) {
        return {
          ok: false,
          message: `「${line.itemName || line.itemCode}」请填写出库数量`,
        }
      }
      const demandQty = Number(line.demandMeters ?? line.shipQty) || 0
      const alloc = allocateOutboundBatches({
        warehouse,
        itemCode: line.itemCode,
        demandQty: line.shipQty,
        rule,
      })
      if (!alloc.ok) {
        return {
          ok: false,
          message: `「${line.itemName || line.itemCode}」${alloc.message}`,
        }
      }
      const issuedAllocations = []
      for (const a of alloc.allocations) {
        const res = issueBatchQty(a.batchId, a.qty, {
          ...meta,
          pieceIds: a.pieceIds,
          pieceSplit: a.pieceSplit,
        })
        if (!res.ok) {
          return { ok: false, message: res.message }
        }
        issuedAllocations.push({
          batchId: a.batchId,
          batchNo: res.batch?.batchNo || a.batchNo,
          qty: res.issuedLength,
          unit: a.unit || line.unit || '',
          pieceIds: a.pieceIds,
          pieceSerialNos: res.issuedSerialNos || a.pieceSerialNos,
          pieceSplit: Boolean(res.pieceSplit || a.pieceSplit),
          remnantSerialNos: res.remnantSerialNos || [],
        })
      }
      writeIssuedBatchFields(line, issuedAllocations, { rule, demandQty, dualUnit })
      continue
    }

    // 兼容：仅 pickedBatchId / 已有分配且无库存批次账
    if (!line.pickedBatchId && !hasAlloc) continue
    const legacyAlloc = getLineBatchAllocations(line)
    if (legacyAlloc.length) {
      for (const a of legacyAlloc) {
        const res = issueBatchQty(a.batchId, a.qty, meta)
        if (!res.ok) return { ok: false, message: res.message }
      }
      continue
    }
    if (!line.pickedBatchId) continue
    const res = issueBatchQty(line.pickedBatchId, line.shipQty, meta)
    if (!res.ok) {
      return { ok: false, message: res.message }
    }
    line.pickedLength = res.issuedLength
    line.shipQty = res.issuedLength
    line.issuedBatchNo = res.batch?.batchNo || line.pickedBatchNo
    line.barcodeBatchNo = line.issuedBatchNo
    line.batchFullyIssued = Boolean(res.whole)
    line.issuedPieceSerialNos = res.issuedSerialNos || []
    line.remnantPieceSerialNos = res.remnantSerialNos || []
    line.batchAllocations = [
      {
        batchId: line.pickedBatchId,
        batchNo: line.issuedBatchNo,
        qty: res.issuedLength,
        unit: line.unit || '',
        pieceSplit: Boolean(res.pieceSplit),
        remnantSerialNos: res.remnantSerialNos || [],
      },
    ]
    line.outboundIssueRule = OUTBOUND_ISSUE_RULES.MANUAL
  }
  applyOutboundToStock(order, { lineIds: lines.map((l) => l.id) })
  if (order.outboundType === '销售出库') {
    const so =
      salesOrderState.orders.find(
        (o) => o.id === order.salesOrderId || o.orderNo === order.salesOrderNo,
      ) || null
    lines.forEach((line) => {
      const shipQty = Number(line.shipQty ?? line.qty) || 0
      const lineId = line.salesLineId || line.id
      if (!so?.id || !lineId || shipQty <= 0) return
      releaseAllocationOnShip(so.id, lineId, shipQty)
    })
  }
  return { ok: true }
}

/** 校验是否可确认出库 */
export function validateOutboundForConfirm(order) {
  if (!order) return { ok: false, message: '出库单不存在' }
  if (order.status === '已出库') return { ok: false, code: 'already_done', message: '已出库' }
  if (order.status !== '待出库' && order.status !== '部分出库') {
    return { ok: false, message: '仅「待出库 / 部分出库」状态可确认出库' }
  }

  if (order.outboundType !== '销售出库') {
    return { ok: true }
  }

  // 未发起出厂质检：无需校验，可直接确认出库
  if (!order.factoryQcId) {
    return { ok: true }
  }

  const qc = getFactoryQcById(order.factoryQcId)
  if (!qc) {
    return { ok: true }
  }

  if (qc.qcStatus === '待质检') {
    return { ok: false, message: '出厂质检尚未完成，请先完成质检' }
  }

  if (qcResultBlocksOutbound(qc.qcResult)) {
    return {
      ok: false,
      qcBlocked: true,
      message: '出厂质检结果不符合出库要求，请重新发起出厂质检',
    }
  }

  if (qc.qcResult !== QC_RESULT_PASS) {
    return { ok: false, message: '出厂质检未通过，无法确认出库' }
  }

  return { ok: true }
}

export function linkOutboundToQc(outboundId, qcId) {
  const order = outboundState.orders.find((o) => o.id === outboundId)
  if (order) order.factoryQcId = qcId
}

export function canInitiateFactoryQc(record) {
  if (record?.outboundType !== '销售出库' || record?.status !== '待出库') {
    return false
  }
  if (!record.factoryQcId) {
    return true
  }
  const qc = getFactoryQcById(record.factoryQcId)
  if (!qc) {
    return true
  }
  if (qc.qcStatus === '待质检') {
    return false
  }
  if (qc.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return true
  }
  return false
}

/** 发起出厂质检（仅销售出库 + 待出库） */
export function initiateFactoryQcFromOutbound(outboundId) {
  const outbound = outboundState.orders.find((o) => o.id === outboundId)
  if (!outbound) return { ok: false, message: '出库单不存在' }
  if (outbound.outboundType !== '销售出库') {
    return { ok: false, message: '仅「销售出库」类型可发起出厂质检' }
  }
  if (outbound.status !== '待出库') {
    return { ok: false, message: '仅「待出库」状态的销售出库单可发起出厂质检' }
  }
  if (!canInitiateFactoryQc(outbound)) {
    const qc = getFactoryQcById(outbound.factoryQcId)
    if (qc?.qcStatus === '待质检') {
      return { ok: false, message: '该出库单已有进行中的出厂质检任务' }
    }
    if (qc?.qcResult === QC_RESULT_PASS) {
      return { ok: false, message: '出厂质检已通过，请直接确认出库' }
    }
    return { ok: false, message: '当前状态不可发起出厂质检' }
  }
  if (!outbound.lineItems?.length) {
    return { ok: false, message: '出库单无明细，无法发起出厂质检' }
  }

  const previousQc = outbound.factoryQcId ? getFactoryQcById(outbound.factoryQcId) : null
  const isRetry = previousQc?.qcStatus === '已完成' && qcResultBlocksOutbound(previousQc.qcResult)

  const payload = {
    ...outbound,
    docType: outbound.outboundType,
    salesOrderNo: outbound.salesOrderNo || outbound.sourceOrderNo,
  }
  const result = createFactoryQcFromOutbound(payload, {
    retryFromQc: isRetry ? previousQc : null,
  })
  if (result.ok && result.record) {
    linkOutboundToQc(outboundId, result.record.id)
  }
  return result
}

// 兼容旧引用
export const salesOutboundState = outboundState
