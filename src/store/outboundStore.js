import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { cloneOutboundOrders, createOutboundLine, createOutboundOrder } from '@/mock/outboundOrders'
import { ensureCrossDemoOutboundOrders } from '@/mock/crossModuleDemoSeed'
import { ensureMaterialReqOutboundOrders } from '@/mock/materialReqOutboundSeed'
import { ensureMultiUnitFlowOutboundOrders } from '@/mock/multiUnitFlowDemoSeed'
import { ensureOneItemOneCodeInventoryOutboundOrders } from '@/mock/oneItemOneCodeInventoryDemoSeed'
import {
  needsOutboundApproval,
  normalizeOutboundStatus,
  resolveOutboundSourceChannel,
  OUTBOUND_SOURCE,
} from '@/mock/outboundOptions'
import {
  createFactoryQcFromOutbound,
  getFactoryQcById,
  qcResultBlocksOutbound,
  QC_RESULT_PASS,
} from '@/store/factoryQcStore'
import { evaluateOutboundQcGate } from '@/utils/qcGateEnforceService'
import { applyOutboundToStock } from '@/store/stockStore'
import { releaseAllocationOnShip } from '@/store/salesStockAllocationStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { issueBatchQty, getBatchById } from '@/store/stockBatchStore'
import {
  getOutboundIssueRule,
  isSalesOutboundByOrder,
  OUTBOUND_ISSUE_RULES,
} from '@/store/functionParamStore'
import {
  allocateOutboundBatches,
  getLineBatchAllocations,
  getOutboundAvailableBatchQty,
  isLineManualBatchPick,
  resolveLineBatchIssueStrategy,
  validateManualBatchAllocations,
} from '@/utils/outboundBatchAllocate'
import { formatBatchAttrsText } from '@/utils/outboundLineColumns'
import { transferOutboundToReceiveWarehouse } from '@/utils/outboundReceiveTransfer'
import { preallocateDeliveryBatches } from '@/utils/salesOrderDedicatedStock'
import { persistJson, safeSetItem } from '@/utils/safeStorage'
import {
  appendOutboundOperationLog,
  backfillOutboundOperationLogs,
  summarizeOutboundLines,
} from '@/utils/outboundOperationLog'

const STORAGE_KEY = 'i_doms_outbound_orders'
const SEED_VERSION_KEY = 'i_doms_outbound_orders_seed_v'
/** v13：去掉出库类型「退货出库」 */
const CURRENT_SEED_VERSION = '13'

/** 领料/发料出库不再审批：历史「待处理」升为「待出库」；拒绝领料→已拒绝；来源归一 */
function migrateSkipApprovalStatuses(orders) {
  return (orders || []).map((o) => {
    const next = { ...o }
    next.status = normalizeOutboundStatus(next.status)
    next.sourceChannel = resolveOutboundSourceChannel(next)
    if (!next.refuseReason) next.refuseReason = ''
    backfillOutboundOperationLogs(next)
    return next
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
  persistJson(STORAGE_KEY, { orders: outboundState.orders })
  safeSetItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function shouldReseedOutbound() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function initOutboundOrders() {
  const base = shouldReseedOutbound()
    ? cloneOutboundOrders()
    : loadFromStorage() || cloneOutboundOrders()
  return ensureOneItemOneCodeInventoryOutboundOrders(
    ensureMultiUnitFlowOutboundOrders(
      ensureMaterialReqOutboundOrders(
        ensureCrossDemoOutboundOrders(migrateSkipApprovalStatuses(base)),
      ),
    ),
  )
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
  const order = getOutboundOrderById(id)
  if (!canDeleteOutbound(order)) return false
  const idx = outboundState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  outboundState.orders.splice(idx, 1)
  return true
}

export function canEditOutbound(order) {
  const status = normalizeOutboundStatus(order?.status)
  return ['待出库', '部分出库'].includes(status)
}

/** 仅「新增」来源且待出库可删；业务来源不支持删除 */
export function canDeleteOutbound(order) {
  if (!order) return false
  if (resolveOutboundSourceChannel(order) === OUTBOUND_SOURCE.BUSINESS) return false
  return normalizeOutboundStatus(order.status) === '待出库'
}

export function canApproveOutbound(order) {
  return (
    normalizeOutboundStatus(order?.status) === '待出库' && needsOutboundApproval(order.outboundType)
  )
}

/** 待出库可整单拒绝出库（未实际扣账前） */
export function canRefuseOutbound(order) {
  if (!order || normalizeOutboundStatus(order.status) !== '待出库') return false
  const lines = order.lineItems || []
  if (!lines.length) return true
  return lines.every((l) => {
    const st = l.lineStatus || '待出库'
    return st !== '已出库'
  })
}

/** 明细行是否可拒绝出库 */
export function canRefuseOutboundLine(order, line) {
  if (!order || !line) return false
  const head = normalizeOutboundStatus(order.status)
  if (head !== '待出库' && head !== '部分出库') return false
  const st = line.lineStatus || '待出库'
  return st !== '已出库' && st !== '已拒绝'
}

/** 新建出库单初始状态：需审批类型为待出库（审批能力已关闭时同样待出库） */
export function resolveOutboundInitialStatus(outboundType, explicitStatus) {
  if (explicitStatus) return normalizeOutboundStatus(explicitStatus)
  if (needsOutboundApproval(outboundType)) return '待出库'
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
  order.sourceChannel = resolveOutboundSourceChannel({
    ...order,
    sourceChannel: payload.sourceChannel ?? order.sourceChannel,
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
    sourceChannel: resolveOutboundSourceChannel(payload),
  })
  appendOutboundOperationLog(row, {
    action: '创建',
    operator: row.creator || 'admin1',
    operatedAt: row.createdAt,
    remark: `创建出库单 ${row.docNo}，类型 ${row.outboundType}`,
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
  appendOutboundOperationLog(order, {
    action: '编辑',
    operator: payload.handler || payload.creator || order.creator || 'admin1',
    remark: `保存出库单，明细 ${(order.lineItems || []).length} 行`,
  })
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
  appendOutboundOperationLog(order, {
    action: '审批',
    operator,
    remark: '审批通过，状态变为待出库',
  })
  return { ok: true, order }
}

function resolveRefuseStatus() {
  return '已拒绝'
}

function syncMaterialReqAfterRefuse(order) {
  if (!order || order.outboundType !== '领料出库') return
  // 运行时加载，避免与 mobileMaterialReqStore 循环依赖
  import('@/store/mobileMaterialReqStore')
    .then(({ syncMaterialReqOnOutboundRefuse }) => {
      syncMaterialReqOnOutboundRefuse(order)
    })
    .catch(() => {})
}

/** 拒绝出库：未扣账单据置为已拒绝；领料出库同步回写申请单 */
export function refuseOutbound(ids, { reason = '', operator = 'admin1' } = {}) {
  const blocked = []
  const refused = []
  let count = 0
  ;(ids || []).forEach((id) => {
    const order = outboundState.orders.find((o) => o.id === id)
    if (!canRefuseOutbound(order)) {
      blocked.push({
        docNo: order?.docNo || id,
        message: '当前状态不可拒绝出库',
      })
      return
    }
    const reasonText = String(reason || '').trim()
    if (!reasonText) {
      blocked.push({
        docNo: order?.docNo || id,
        message: '请填写拒绝理由',
      })
      return
    }
    order.status = resolveRefuseStatus()
    order.refuseReason = reasonText
    order.refusedBy = operator
    order.refusedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendOutboundOperationLog(order, {
      action: '拒绝出库',
      operator,
      remark: `拒绝理由：${reasonText}`,
    })
    syncMaterialReqAfterRefuse(order)
    refused.push(order)
    count += 1
  })
  return { count, blocked, refused }
}

/**
 * 按明细拒绝出库（未扣账行）；已出库行不可拒
 */
export function refuseOutboundLine(orderId, lineId, { reason = '', operator = 'admin1' } = {}) {
  const order = outboundState.orders.find((o) => o.id === orderId)
  const line = (order?.lineItems || []).find((l) => l.id === lineId)
  if (!canRefuseOutboundLine(order, line)) {
    return { ok: false, message: '当前明细不可拒绝出库' }
  }
  const reasonText = String(reason || '').trim()
  if (!reasonText) return { ok: false, message: '请填写拒绝理由' }

  line.lineStatus = '已拒绝'
  line.refuseReason = reasonText
  line.refusedBy = operator
  line.refusedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')

  recomputeOutboundOrderStatus(order)
  order.refuseReason = reasonText
  order.refusedBy = operator
  order.refusedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  appendOutboundOperationLog(order, {
    action: '部分拒绝出库',
    operator,
    remark: `拒绝明细：${summarizeOutboundLines([line])}；理由：${reasonText}`,
  })
  syncMaterialReqAfterRefuse(order)
  return { ok: true, order, line }
}

export function confirmOutbound(ids, { operator = 'admin1' } = {}) {
  const blocked = []
  const warnings = []
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
    if (check.warnings?.length) {
      warnings.push(...check.warnings.map((w) => `${order?.docNo || id}：${w}`))
    }

    const pendingLines = (order.lineItems || []).filter((l) => {
      const st = l.lineStatus || '待出库'
      return st !== '已出库' && st !== '已拒绝'
    })
    const pendingIds = pendingLines.map((l) => l.id)
    if (!pendingIds.length) {
      recomputeOutboundOrderStatus(order)
      order.auditor = operator
      order.auditDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
      appendOutboundOperationLog(order, {
        action: '整单确认出库',
        operator,
        remark: '无待出库明细',
      })
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

    const transfer = transferOutboundToReceiveWarehouse(order, { lineIds: pendingIds, operator })
    if (!transfer.ok) {
      blocked.push({ docNo: order.docNo, message: transfer.message || '领入仓调入失败' })
      return
    }

    recomputeOutboundOrderStatus(order)
    order.auditor = operator
    order.auditDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const action = order.status === '部分出库' ? '部分确认出库' : '整单确认出库'
    const inboundRemark = transfer.inboundOrder?.docNo
      ? `；生成领料入库单 ${transfer.inboundOrder.docNo}`
      : ''
    appendOutboundOperationLog(order, {
      action,
      operator,
      remark:
        action === '部分确认出库'
          ? `部分确认 ${pendingLines.length} 行：${summarizeOutboundLines(pendingLines)}${inboundRemark}`
          : `整单确认出库，本次 ${pendingLines.length} 行${inboundRemark}`,
    })
    if (order.outboundType === '销售出库' && order.status === '已出库') {
      import('@/utils/deliveryOutboundSync').then(({ syncDeliveryAfterOutboundConfirm }) => {
        syncDeliveryAfterOutboundConfirm(order)
      })
    }
    count += 1
  })
  return { count, blocked, warnings }
}

/** 按明细确认出库 */
export function confirmOutboundLine(orderId, lineId, { operator = 'admin1' } = {}) {
  const order = outboundState.orders.find((o) => o.id === orderId)
  const check = validateOutboundForConfirm(order)
  if (!check.ok) return { ok: false, message: check.message, qcBlocked: check.qcBlocked }
  const line = (order.lineItems || []).find((l) => l.id === lineId)
  if (!line) return { ok: false, message: '明细不存在' }
  if ((line.lineStatus || '待出库') === '已出库') {
    return { ok: false, message: '该明细已出库' }
  }
  if ((line.lineStatus || '待出库') === '已拒绝') {
    return { ok: false, message: '该明细已拒绝出库' }
  }

  const stockCheck = applyOutboundStockMovements(order, { lineIds: [lineId] })
  if (!stockCheck.ok) return stockCheck

  line.lineStatus = '已出库'
  const transfer = transferOutboundToReceiveWarehouse(order, { lineIds: [lineId], operator })
  if (!transfer.ok) {
    return { ok: false, message: transfer.message || '领入仓调入失败' }
  }

  recomputeOutboundOrderStatus(order)
  order.auditor = operator
  order.auditDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const action = order.status === '部分出库' ? '部分确认出库' : '整单确认出库'
  const inboundRemark = transfer.inboundOrder?.docNo
    ? `；生成领料入库单 ${transfer.inboundOrder.docNo}`
    : ''
  appendOutboundOperationLog(order, {
    action,
    operator,
    remark: `确认明细：${summarizeOutboundLines([line])}${inboundRemark}`,
  })
  if (order.outboundType === '销售出库' && order.status === '已出库') {
    import('@/utils/deliveryOutboundSync').then(({ syncDeliveryAfterOutboundConfirm }) => {
      syncDeliveryAfterOutboundConfirm(order)
    })
  }
  return {
    ok: true,
    order,
    line,
    warnings: check.warnings || [],
    inboundOrder: transfer.inboundOrder || null,
  }
}

export function recomputeOutboundOrderStatus(order) {
  if (!order) return
  const lines = order.lineItems || []
  if (!lines.length) {
    if (order.status === '部分出库') order.status = '待出库'
    return
  }
  const shipped = lines.filter((l) => (l.lineStatus || '待出库') === '已出库').length
  const refused = lines.filter((l) => (l.lineStatus || '待出库') === '已拒绝').length
  const pending = lines.length - shipped - refused

  if (shipped === 0 && pending === 0) {
    // 全部拒绝（或无可出明细）
    order.status = '已拒绝'
    order.completedAt = ''
    return
  }
  if (shipped === 0 && pending > 0) {
    if (order.status === '部分出库' || order.status === '已出库' || order.status === '已拒绝') {
      order.status = '待出库'
    }
    return
  }
  if (pending === 0 && shipped === lines.length) {
    order.status = '已出库'
    order.completedAt = order.completedAt || dayjs().format('YYYY-MM-DD')
    if (!order.auditDate) order.auditDate = order.completedAt
    return
  }
  // 有已出行，且仍有待出或有拒绝行
  order.status = '部分出库'
  order.completedAt = ''
}

function writeIssuedBatchFields(line, issuedAllocations, { rule, demandQty }) {
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
  const strategy = resolveLineBatchIssueStrategy(line)
  line.dualUnitIssueStrategy = strategy
  // 出库数量一律保持单据填写值，禁止因整批多扣把 shipQty 抬高
  if (!(Number(line.demandMeters) > 0) && Number(demandQty) > 0) {
    line.demandMeters = demandQty
  }
  line.shipQty = Number(demandQty) > 0 ? demandQty : issuedTotal
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
      // 一律按出库数量扣；件长大于出库量时允许仓内拆件留余
      allowPieceSplit: true,
    }
    const lineManual = isLineManualBatchPick(line)
    const warehouse = line.shipWarehouse || order.warehouse
    const batchAvail = getOutboundAvailableBatchQty(warehouse, line.itemCode)
    const hasAlloc = getLineBatchAllocations(line).length > 0

    // 自主拣选：有批次即可（与是否双单位无关）
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
      })
      continue
    }

    // 销售出库：按单发货时禁止全仓 FIFO；无预锁批时按销售单履约方式再分配（本单按单 → 自由备货）
    if (order.outboundType === '销售出库' && isSalesOutboundByOrder()) {
      if (!(Number(line.shipQty) > 0)) {
        return {
          ok: false,
          message: `「${line.itemName || line.itemCode}」请填写出库数量`,
        }
      }
      const so =
        salesOrderState.orders.find(
          (o) =>
            o.id === (order.salesOrderId || line.salesOrderId) ||
            o.orderNo === (order.salesOrderNo || line.salesOrderNo),
        ) || null
      const salesLine =
        (so?.lineItems || []).find((l) => l.id === line.salesLineId) ||
        (so?.lineItems || []).find((l) => l.productCode === line.itemCode)
      const dedicated = preallocateDeliveryBatches({
        salesOrder: so,
        salesLine,
        itemCode: line.itemCode,
        warehouse,
        shipQty: line.shipQty,
        stockFulfillmentMode: salesLine?.stockFulfillmentMode,
      })
      if (!dedicated.ok) {
        return {
          ok: false,
          message: `「${line.itemName || line.itemCode}」${dedicated.message}`,
        }
      }
      const demandQty = Number(line.demandMeters ?? line.shipQty) || 0
      const issuedAllocations = []
      for (const a of dedicated.allocations) {
        const res = issueBatchQty(a.batchId, a.qty, meta)
        if (!res.ok) return { ok: false, message: res.message }
        issuedAllocations.push({
          batchId: a.batchId,
          batchNo: res.batch?.batchNo || a.batchNo,
          qty: res.issuedLength,
          unit: a.unit || line.unit || '',
          pieceSerialNos: res.issuedSerialNos || [],
          pieceSplit: Boolean(res.pieceSplit),
          remnantSerialNos: res.remnantSerialNos || [],
        })
      }
      line.manualBatchPick = true
      writeIssuedBatchFields(line, issuedAllocations, {
        rule: OUTBOUND_ISSUE_RULES.MANUAL,
        demandQty,
      })
      continue
    }

    // 自动 FIFO：有批次库存则走批次（单/双单位均可）；无批次则留给汇总库存扣减
    if (batchAvail > 0) {
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
        line,
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
      writeIssuedBatchFields(line, issuedAllocations, { rule, demandQty })
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
    line.dualUnitIssueStrategy = resolveLineBatchIssueStrategy(line)
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

/** 校验是否可确认出库（出厂质检门控读取功能参数：弱预警 / 强阻断） */
export function validateOutboundForConfirm(order) {
  if (!order) return { ok: false, message: '出库单不存在' }
  if (order.status === '已出库') return { ok: false, code: 'already_done', message: '已出库' }
  if (order.status !== '待出库' && order.status !== '部分出库') {
    return { ok: false, message: '仅「待出库 / 部分出库」状态可确认出库' }
  }

  if (order.outboundType !== '销售出库') {
    return { ok: true, warnings: [] }
  }

  const gate = evaluateOutboundQcGate(order)
  if (gate.blocked) {
    return {
      ok: false,
      qcBlocked: Boolean(gate.qcBlocked),
      message: gate.message || '出厂质检未通过，无法确认出库',
      warnings: gate.warnings || [],
    }
  }
  return { ok: true, warnings: gate.warnings || [] }
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
    appendOutboundOperationLog(outbound, {
      action: isRetry ? '重新发起出厂质检' : '发起出厂质检',
      remark: result.record.qcNo ? `质检单 ${result.record.qcNo}` : '',
    })
  }
  return result
}

// 兼容旧引用
export const salesOutboundState = outboundState
