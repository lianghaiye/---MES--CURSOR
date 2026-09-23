import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  cloneOutsourcingOrders,
  computeOutsourcingOverdueStatus,
  createOutsourcingOrder,
  generateOutsourcingOrderNo,
  recalcOutsourcingTotals,
} from '@/mock/outsourcingOrders'
import {
  calcWxHeaderIssueStatus,
  calcWxHeaderReturnStatus,
  calcWxLineAppliedIssueQty,
  calcWxLineReceivedQty,
  calcWxLineRemainInboundQty,
  calcWxLineRemainIssueQty,
} from '@/utils/outsourcingInbound'
import { addOutsourcingReceipt } from '@/store/outsourcingReceiptStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { normalizeOutsourceMode } from '@/utils/outsourcingMode'
import { persistJson, safeSetItem } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_outsourcing_orders'
const SEED_VERSION_KEY = 'i_doms_outsourcing_orders_seed_v'
/** v10：工序外协发料无投料时取工单 EBOM 下级物料 */
const CURRENT_SEED_VERSION = '9'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders.map(normalizeOrder)
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
  persistJson(STORAGE_KEY, { orders: outsourcingOrderState.orders })
  safeSetItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export function syncOutsourcingReturnStatus(orderOrId) {
  const order =
    typeof orderOrId === 'string'
      ? outsourcingOrderState.orders.find((o) => o.id === orderOrId)
      : orderOrId
  if (!order) return order
  order.returnStatus = calcWxHeaderReturnStatus(order)
  order.issueStatus = calcWxHeaderIssueStatus(order)
  order.overdueStatus = computeOutsourcingOverdueStatus(order)
  // 关联入库已全部入库 → 自动已完成
  if (order.status === '进行中' && order.returnStatus === '已入库') {
    order.status = '已完成'
  }
  return order
}

function normalizeOrder(row) {
  const o = { ...row }
  if (!Array.isArray(o.lineItems)) o.lineItems = []
  if (!Array.isArray(o.approvalRecords)) o.approvalRecords = []
  if (!Array.isArray(o.issueOrders)) o.issueOrders = []
  if (!o.planEndDate && o.planDate) o.planEndDate = o.planDate
  if (!o.planStartDate && o.planEndDate) o.planStartDate = o.planEndDate
  if (!o.planDate && o.planEndDate) o.planDate = o.planEndDate
  if (!o.creator) o.creator = 'admin1'
  if (!o.updater) o.updater = o.creator
  if (!o.updatedAt) o.updatedAt = o.createdAt || nowText()
  if (!o.issueStatus) o.issueStatus = '待出库'
  if (!o.returnStatus) o.returnStatus = '待入库'
  o.outsourceMode = normalizeOutsourceMode(o.outsourceMode)
  if (!o.sourceProcessId) o.sourceProcessId = ''
  if (!o.sourceProcessCode) o.sourceProcessCode = ''
  if (!o.sourceProcessName) o.sourceProcessName = ''
  if (o.sourceProcessIndex == null) o.sourceProcessIndex = null
  o.lineItems.forEach((line) => {
    if (line.appliedIssueQty == null) {
      line.appliedIssueQty = Number(line.issuedQty) || 0
    }
  })
  recalcOutsourcingTotals(o)
  syncOutsourcingReturnStatus(o)
  return o
}

function initOrders() {
  const list = shouldReseed()
    ? cloneOutsourcingOrders()
    : loadFromStorage() || cloneOutsourcingOrders()
  return list.map(normalizeOrder)
}

export const outsourcingOrderState = reactive({
  orders: initOrders(),
})

watch(
  () => outsourcingOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getOutsourcingOrderById(id) {
  return outsourcingOrderState.orders.find((o) => o.id === id) || null
}

export function getOutsourcingOrdersByIds(ids = []) {
  return outsourcingOrderState.orders.filter((o) => ids.includes(o.id))
}

export function canEditOutsourcingOrder(order) {
  return order?.status === '待提交' || order?.status === '已拒绝'
}

export function canSubmitOutsourcingOrder(order) {
  return order?.status === '待提交'
}

export function canWithdrawOutsourcingOrder(order) {
  return order?.status === '待审核'
}

export function canResubmitOutsourcingOrder(order) {
  return order?.status === '已拒绝'
}

export function canApproveOutsourcingOrder(order) {
  return order?.status === '待审核'
}

export function canVoidOutsourcingOrder(order) {
  return order?.status === '待提交'
}

export function canGenerateOutsourcingReceipt(order) {
  if (order?.status !== '进行中') return false
  return (order.lineItems || []).some((line) => calcWxLineRemainInboundQty(order, line) > 1e-9)
}

export function canGenerateOutsourcingInbound(order) {
  return canGenerateOutsourcingReceipt(order)
}

export function canCompleteOutsourcingOrder(order) {
  return order?.status === '进行中' && order?.returnStatus === '已入库'
}

/** 外协行是否已自然结清：已入库数量 ≥ 计划数量 */
export function isOutsourcingLineNaturallySettled(order, line) {
  if (line?.cancelled) return true
  const planQty = Number(line?.planQty) || 0
  if (planQty <= 0) return true
  const received = calcWxLineReceivedQty(order, line)
  return received >= planQty - 1e-9
}

export function isOutsourcingOrderNaturallySettled(order) {
  const lines = (order?.lineItems || []).filter((l) => !l.cancelled)
  if (!lines.length) return true
  return lines.every((line) => isOutsourcingLineNaturallySettled(order, line))
}

/** 关联未完成收货单（新建/进行中） */
export function listUnfinishedReceiptsForOutsourcingOrder(order) {
  if (!order) return []
  // eslint-disable-next-line global-require
  const { outsourcingReceiptState } = require('@/store/outsourcingReceiptStore')
  return (outsourcingReceiptState.receipts || []).filter((r) => {
    if (!r) return false
    const st = r.receiptStatus || ''
    if (st !== '新建' && st !== '进行中') return false
    return (
      r.outsourcingOrderId === order.id ||
      r.outsourcingOrderNo === order.orderNo ||
      r.purchaseOrderId === order.id ||
      r.purchaseOrderNo === order.orderNo
    )
  })
}

/** 关联未完成外协回货检 */
export function listUnfinishedQcTasksForOutsourcingOrder(order) {
  if (!order) return []
  // eslint-disable-next-line global-require
  const { QC_TASK_STATUS, listQcTasks } = require('@/store/qcTaskStore')
  // eslint-disable-next-line global-require
  const { outsourcingReceiptState } = require('@/store/outsourcingReceiptStore')
  const receiptIds = new Set()
  const receiptNos = new Set()
  ;(outsourcingReceiptState.receipts || []).forEach((r) => {
    if (!r) return
    if (
      r.outsourcingOrderId !== order.id &&
      r.outsourcingOrderNo !== order.orderNo &&
      r.purchaseOrderId !== order.id &&
      r.purchaseOrderNo !== order.orderNo
    ) {
      return
    }
    if (r.receiptStatus === '作废' || r.receiptStatus === '已作废') return
    if (r.id) receiptIds.add(r.id)
    if (r.receiptNo) receiptNos.add(String(r.receiptNo).trim())
  })

  return listQcTasks({ bizScope: '外协回货检' }).filter((t) => {
    if (!t || t.qcStatus === QC_TASK_STATUS.COMPLETED || t.qcStatus === QC_TASK_STATUS.CANCELLED) {
      return false
    }
    if (t.sourceDocId && receiptIds.has(t.sourceDocId)) return true
    const srcNo = String(t.sourceDocNo || '').trim()
    if (srcNo && receiptNos.has(srcNo)) return true
    if (t.outsourcingOrderId && t.outsourcingOrderId === order.id) return true
    if (t.outsourcingOrderNo && t.outsourcingOrderNo === order.orderNo) return true
    return false
  })
}

/** 关联未确认外协入库单 */
export function listUnfinishedInboundOrdersForOutsourcingOrder(order) {
  if (!order) return []
  // eslint-disable-next-line global-require
  const { inboundOrderState } = require('@/store/inboundOrderStore')
  return (inboundOrderState?.orders || []).filter((o) => {
    if (!o) return false
    if (
      !(
        o.outsourcingOrderId === order.id ||
        o.outsourcingOrderNo === order.orderNo ||
        o.purchaseOrderId === order.id ||
        o.sourceOrderNo === order.orderNo
      )
    ) {
      return false
    }
    const st = o.status || ''
    if (st === '已作废' || st === '已取消') return false
    if (st === '已完成' || st === '已入库' || st === '已确认') return false
    return true
  })
}

/** 关联未完成外协异常处理单（新建/进行中） */
export function listUnfinishedReturnsForOutsourcingOrder(order) {
  if (!order) return []
  // eslint-disable-next-line global-require
  const { outsourcingReturnState } = require('@/store/outsourcingReturnStore')
  return (outsourcingReturnState?.returns || []).filter((r) => {
    if (!r) return false
    if (
      !(
        r.outsourcingOrderId === order.id ||
        r.outsourcingOrderNo === order.orderNo ||
        r.purchaseOrderId === order.id
      )
    ) {
      return false
    }
    const st = r.status || ''
    return st === '新建' || st === '进行中'
  })
}

export function getOutsourcingOrderUnfinishedRelatedDocs(order) {
  // eslint-disable-next-line global-require
  const { getPendingOutsourcingPriceChange } = require('@/store/outsourcingPriceChangeStore')
  return {
    receipts: listUnfinishedReceiptsForOutsourcingOrder(order),
    qcTasks: listUnfinishedQcTasksForOutsourcingOrder(order),
    inboundOrders: listUnfinishedInboundOrdersForOutsourcingOrder(order),
    returns: listUnfinishedReturnsForOutsourcingOrder(order),
    pendingPriceChange: getPendingOutsourcingPriceChange(order?.id) || null,
  }
}

function formatOutsourcingUnfinishedRelatedMessage(unfinished = {}) {
  const parts = []
  if (unfinished.pendingPriceChange) {
    parts.push(
      `待审核订单变更：${unfinished.pendingPriceChange.changeNo || unfinished.pendingPriceChange.id}`,
    )
  }
  const receiptNos = (unfinished.receipts || []).map((r) => r.receiptNo || r.id).filter(Boolean)
  if (receiptNos.length) parts.push(`未完成收货单：${receiptNos.join('、')}`)
  const qcNos = (unfinished.qcTasks || []).map((t) => t.qcNo || t.id).filter(Boolean)
  if (qcNos.length) parts.push(`未完成质检单：${qcNos.join('、')}`)
  const inboundNos = (unfinished.inboundOrders || []).map((o) => o.docNo || o.id).filter(Boolean)
  if (inboundNos.length) parts.push(`未完成入库单：${inboundNos.join('、')}`)
  const returnNos = (unfinished.returns || []).map((r) => r.returnNo || r.id).filter(Boolean)
  if (returnNos.length) parts.push(`未完成异常处理单：${returnNos.join('、')}`)
  return parts
}

/**
 * 评估终结：进行中 + 数量未结清 + 无未结清关联单。
 * 与「完成」区别：完成要求回货已入库；终结用于中途不再继续，且不进入结算。
 */
export function evaluateOutsourcingOrderTerminate(order) {
  if (!order) return { ok: false, message: '未找到外协订单' }
  if (order.status !== '进行中') {
    return { ok: false, message: '仅「进行中」的外协订单可终结' }
  }
  if (isOutsourcingOrderNaturallySettled(order)) {
    return {
      ok: false,
      code: 'ALREADY_SETTLED',
      message: '订单回货数量已结清，请使用「完成」归档，无需终结',
    }
  }
  const unfinished = getOutsourcingOrderUnfinishedRelatedDocs(order)
  const parts = formatOutsourcingUnfinishedRelatedMessage(unfinished)
  if (parts.length) {
    return {
      ok: false,
      code: 'HAS_UNFINISHED_RELATED',
      message: '有关联的未完成单据，请完成、作废/终结这些单据后再终结。\n' + parts.join('\n'),
      unfinished,
    }
  }
  return {
    ok: true,
    message:
      '终结后订单不再继续外协回货，入库数量将锁定且不可再更改，且该订单不进入结算。确认终结吗？',
  }
}

export function canTerminateOutsourcingOrder(order) {
  return evaluateOutsourcingOrderTerminate(order).ok
}

function pushApprovalRecord(order, { result, opinion }) {
  if (!Array.isArray(order.approvalRecords)) order.approvalRecords = []
  order.approvalRecords.unshift({
    name: 'admin1',
    role: '外协审核',
    result,
    time: dayjs().format('YYYY-MM-DD HH:mm'),
    opinion: String(opinion || '').trim(),
  })
}

export function addOutsourcingOrder(partial = {}) {
  const orderNo =
    String(partial.orderNo || '').trim() || generateOutsourcingOrderNo(outsourcingOrderState.orders)
  const row = createOutsourcingOrder({
    ...partial,
    orderNo,
    status: partial.status || '待提交',
    createdAt: nowText(),
    updatedAt: nowText(),
  })
  outsourcingOrderState.orders.unshift(normalizeOrder(row))
  return outsourcingOrderState.orders[0]
}

export function updateOutsourcingOrder(id, patch = {}) {
  const idx = outsourcingOrderState.orders.findIndex((o) => o.id === id)
  if (idx < 0) return null
  Object.assign(outsourcingOrderState.orders[idx], patch, {
    updater: patch.updater || 'admin1',
    updatedAt: nowText(),
  })
  outsourcingOrderState.orders[idx] = normalizeOrder(outsourcingOrderState.orders[idx])
  return outsourcingOrderState.orders[idx]
}

export function submitOutsourcingOrderForApprove(id) {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canSubmitOutsourcingOrder(order)) {
    return { ok: false, message: '仅「待提交」状态可提交审核' }
  }
  order.status = '待审核'
  order.approvalResult = '待审核'
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return { ok: true, message: `外协订单「${order.orderNo}」已提交审核` }
}

export function withdrawOutsourcingOrder(id) {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canWithdrawOutsourcingOrder(order)) {
    return { ok: false, message: '仅「待审核」状态可撤回' }
  }
  order.status = '待提交'
  order.approvalResult = '—'
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return { ok: true, message: `外协订单「${order.orderNo}」已撤回` }
}

export function resubmitOutsourcingOrder(id) {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canResubmitOutsourcingOrder(order)) {
    return { ok: false, message: '仅「已拒绝」状态可重新提交' }
  }
  order.status = '待审核'
  order.approvalResult = '待审核'
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return { ok: true, message: `外协订单「${order.orderNo}」已重新提交审核` }
}

export function approveOutsourcingOrder(id, opinion = '') {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canApproveOutsourcingOrder(order)) {
    return { ok: false, message: `外协订单「${order.orderNo}」不可审核` }
  }
  order.status = '进行中'
  order.approvalResult = '审核通过'
  order.approverName = 'admin1'
  pushApprovalRecord(order, { result: '已通过', opinion })
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return { ok: true, message: `外协订单「${order.orderNo}」审核通过` }
}

export function rejectOutsourcingOrder(id, opinion = '') {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canApproveOutsourcingOrder(order)) {
    return { ok: false, message: `外协订单「${order.orderNo}」不可审核` }
  }
  order.status = '已拒绝'
  order.approvalResult = '已拒绝'
  order.approverName = 'admin1'
  pushApprovalRecord(order, { result: '已驳回', opinion })
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return { ok: true, message: `外协订单「${order.orderNo}」已拒绝` }
}

export function voidOutsourcingOrder(id) {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canVoidOutsourcingOrder(order)) {
    return { ok: false, message: '仅「待提交」状态可作废' }
  }
  order.status = '已作废'
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return { ok: true, message: `外协订单「${order.orderNo}」已作废` }
}

export function completeOutsourcingOrder(id) {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canCompleteOutsourcingOrder(order)) {
    return { ok: false, message: `外协订单「${order.orderNo}」需回货入库完成后才可完成` }
  }
  order.status = '已完成'
  order.completeMode = '正常结案'
  order.completedAt = nowText()
  order.terminatedAt = ''
  order.overdueStatus = '未逾期'
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return { ok: true, message: `外协订单「${order.orderNo}」已完成` }
}

/**
 * 终结外协订单：进行中因故不再继续，可能已有部分回货入库。
 * 与完成区别：终结后不进入结算。
 */
export function terminateOutsourcingOrder(id, { confirmTerminate = false } = {}) {
  const order = getOutsourcingOrderById(id)
  if (!order) return { ok: false, message: '外协订单不存在' }

  const gate = evaluateOutsourcingOrderTerminate(order)
  if (!gate.ok) return gate

  if (!confirmTerminate) {
    return {
      ok: false,
      code: 'NEED_TERMINATE_CONFIRM',
      message: gate.message,
    }
  }

  order.status = '已终结'
  order.completeMode = '终结'
  order.terminatedAt = nowText()
  order.overdueStatus = '未逾期'
  order.updater = 'admin1'
  order.updatedAt = nowText()
  return {
    ok: true,
    message: `外协订单「${order.orderNo}」已终结，不进入结算`,
  }
}

/** 生成收货：创建收货单并占用 appliedReceiptQty */
export function submitOutsourcingReceipt(orderId, lines = [], extra = {}) {
  const order = getOutsourcingOrderById(orderId)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canGenerateOutsourcingReceipt(order)) {
    return { ok: false, message: '当前外协订单不可生成收货单' }
  }
  const submitLines = (lines || []).filter((item) => (Number(item.receiptQty) || 0) > 0)
  if (!submitLines.length) return { ok: false, message: '没有可收货的明细' }

  for (const item of submitLines) {
    const line = (order.lineItems || []).find((l) => l.id === item.lineId || l.id === item.poLineId)
    if (!line) return { ok: false, message: '存在无效的外协明细行' }
    const qty = Number(item.receiptQty) || 0
    if (!String(item.receivingWarehouse || '').trim()) {
      return {
        ok: false,
        message: `请为「${line.productName || line.itemName || '明细'}」选择收货仓库`,
      }
    }
    const remain = calcWxLineRemainInboundQty(order, line)
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `物料「${line.productName || line.productName || line.productCode}」可收货数量不足（剩余 ${remain}）`,
      }
    }
  }

  const lineItems = submitLines.map((item) => {
    const line = (order.lineItems || []).find((l) => l.id === item.lineId || l.id === item.poLineId)
    return {
      id: `wxrct-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      wxLineId: line?.id || item.lineId,
      poLineId: line?.id || item.lineId,
      itemName: line?.productName || line?.itemName || '',
      itemCode: line?.productCode || line?.itemCode || '',
      productName: line?.productName || line?.itemName || '',
      productCode: line?.productCode || line?.itemCode || '',
      specModel: line?.specModel || '',
      material: line?.material || '',
      variantSummary: line?.variantSummary || '',
      drawingNo: line?.drawingNo || '',
      planQty: Number(line?.planQty) || 0,
      purchaseQty: Number(line?.planQty) || 0,
      unit: line?.unit || '',
      settleUnit: item.settleUnit || line?.settleUnit || '',
      settleQty: item.settleQty,
      receivingWarehouse: item.receivingWarehouse || '',
      receiptQty: Number(item.receiptQty) || 0,
      inboundQcRequirement: String(item.inboundQcRequirement || '').trim(),
      remark: item.remark || '',
    }
  })

  submitLines.forEach((item) => {
    const line = (order.lineItems || []).find((l) => l.id === item.lineId || l.id === item.poLineId)
    if (!line) return
    const qty = Number(item.receiptQty) || 0
    if (qty <= 0) return
    line.appliedReceiptQty = (Number(line.appliedReceiptQty) || 0) + qty
  })

  const receipt = addOutsourcingReceipt({
    receiptNo: String(extra.receiptNo || '').trim() || undefined,
    outsourcingOrderNo: order.orderNo,
    outsourcingOrderId: order.id,
    supplier: order.supplier,
    contactPerson: order.contactPerson || order.creator,
    purchaser: order.creator || 'admin1',
    qcStatus: '未质检',
    receiptStatus: '新建',
    inboundStatus: '待入库',
    remark: extra.remark || '',
    lineItems,
    creator: 'admin1',
  })

  order.remark = extra.remark != null ? extra.remark : order.remark
  order.updater = 'admin1'
  order.updatedAt = nowText()
  syncOutsourcingReturnStatus(order)
  return {
    ok: true,
    message: `已生成收货单「${receipt.receiptNo}」`,
    receipt,
  }
}

/** 生成入库：增加 receivedQty，并回写状态（全部入库→已完成） */
export function submitOutsourcingInbound(orderId, lines = []) {
  const order = getOutsourcingOrderById(orderId)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (!canGenerateOutsourcingInbound(order)) {
    return { ok: false, message: '当前外协订单不可生成入库单' }
  }
  lines.forEach((item) => {
    const line = (order.lineItems || []).find((l) => l.id === item.poLineId || l.id === item.lineId)
    if (!line) return
    const qty = Number(item.qty) || Number(item.purchaseQty) || 0
    if (qty <= 0) return
    line.receivedQty = (Number(line.receivedQty) || 0) + qty
    line.appliedReceiptQty = Math.max(
      Number(line.appliedReceiptQty) || 0,
      Number(line.receivedQty) || 0,
    )
  })
  order.updater = 'admin1'
  order.updatedAt = nowText()
  syncOutsourcingReturnStatus(order)
  return { ok: true, message: '已生成外协入库单' }
}

function nextIssueOrderSeq(existingNos = []) {
  let max = 0
  existingNos.forEach((no) => {
    const m = String(no || '').match(/-(\d{3})$/)
    if (m) max = Math.max(max, Number(m[1]) || 0)
  })
  return max
}

/**
 * 生成发料出库单：
 * - productSets：按套数占用外协产品 appliedIssueQty
 * - materialLines：按仓库拆分写入 issueOrders（BOM 下级物料）
 * 兼容旧调用：第二参为数组时，按「明细行=产品行」旧逻辑处理
 */
export function submitOutsourcingIssue(orderId, payload = [], extra = {}) {
  const order = getOutsourcingOrderById(orderId)
  if (!order) return { ok: false, message: '外协订单不存在' }
  if (order.status !== '进行中') {
    return { ok: false, message: '仅进行中的外协订单可生成发料出库单' }
  }
  const shipDate = String(extra.shipDate || '').trim()
  if (!shipDate) return { ok: false, message: '请选择出货日期' }

  const isLegacy = Array.isArray(payload)
  const productSets = isLegacy
    ? (payload || [])
        .filter((item) => (Number(item.issueQty) || 0) > 0)
        .map((item) => ({ lineId: item.lineId, setQty: item.issueQty }))
    : (payload.productSets || []).filter((item) => (Number(item.setQty) || 0) > 0)
  const materialLines = isLegacy
    ? (payload || []).filter((item) => (Number(item.issueQty) || 0) > 0)
    : (payload.materialLines || []).filter((item) => (Number(item.issueQty) || 0) > 0)

  if (!productSets.length) {
    return { ok: false, message: '请至少选择一个产品并填写本次套数' }
  }
  if (!materialLines.length) {
    return { ok: false, message: '请至少填写一行物料出库数量' }
  }

  for (const item of productSets) {
    const line = (order.lineItems || []).find((l) => l.id === item.lineId)
    if (!line) return { ok: false, message: '存在无效的外协产品行' }
    const qty = Number(item.setQty) || 0
    const remain = calcWxLineRemainIssueQty(order, line)
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `产品「${line.productName || line.productCode}」可发套数不足（剩余 ${remain}）`,
      }
    }
  }

  for (const item of materialLines) {
    if (!String(item.shipWarehouse || '').trim()) {
      return {
        ok: false,
        message: `请为「${item.productName || item.itemName || item.itemCode || '物料'}」选择出库仓库`,
      }
    }
  }

  if (!Array.isArray(order.issueOrders)) order.issueOrders = []
  const stamp = dayjs().format('YYMMDD')
  let seq = nextIssueOrderSeq(
    outsourcingOrderState.orders.flatMap((o) => (o.issueOrders || []).map((io) => io.issueOrderNo)),
  )
  const now = nowText()
  const groups = new Map()

  productSets.forEach((item) => {
    const line = (order.lineItems || []).find((l) => l.id === item.lineId)
    if (!line) return
    const qty = Number(item.setQty) || 0
    line.appliedIssueQty = calcWxLineAppliedIssueQty(order, line) + qty
  })

  materialLines.forEach((item) => {
    const qty = Number(item.issueQty) || 0
    const name = item.productName || item.itemName || ''
    const code = item.productCode || item.itemCode || ''
    const sourceLineIds = item.sourceProductLineIds || item.sourceLineIds || []
    const primaryLineId = item.lineId || sourceLineIds[0] || ''
    const wh = String(item.shipWarehouse || '未指定仓库').trim() || '未指定仓库'
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push({
      id: `wx-issue-line-${code || primaryLineId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      lineId: primaryLineId,
      sourceProductLineIds: sourceLineIds,
      sourceProductText: item.sourceProductText || '',
      productName: name,
      productCode: code,
      specModel: item.specModel || '',
      material: item.material || '',
      drawingNo: item.drawingNo || '',
      applyQty: qty,
      actualQty: 0,
      issueQty: qty,
      unit: item.unit || '',
      unitUsage: Number(item.unitUsage) || 0,
      remark: item.remark || '',
      barcodeType: item.barcodeType || '',
      blankSizeText: item.blankSizeText || '',
      shipWarehouse: wh,
    })
  })

  let orderCount = 0
  const productSetSnapshots = (productSets || []).map((p) => ({
    lineId: p.lineId,
    setQty: Number(p.setQty) || 0,
  }))

  groups.forEach((groupLines, warehouse) => {
    seq += 1
    orderCount += 1
    order.issueOrders.push({
      id: `wx-issue-${order.id}-${seq}-${Date.now().toString(36)}`,
      issueOrderNo: `CKWX-${stamp}-${String(seq).padStart(3, '0')}`,
      outsourcingOrderId: order.id,
      outsourcingOrderNo: order.orderNo || '',
      supplier: order.supplier || '',
      workOrderName: order.workOrderName || '',
      shipWarehouse: warehouse,
      shipDate,
      remark: extra.remark || '',
      outboundStatus: '出库中',
      creator: 'admin1',
      createdAt: now,
      confirmer: '',
      confirmedAt: '',
      productSets: productSetSnapshots,
      lineItems: groupLines,
      lineIds: groupLines.map((l) => l.lineId).filter(Boolean),
    })
  })

  if (extra.remark != null) order.remark = extra.remark
  order.updater = 'admin1'
  order.updatedAt = now
  syncOutsourcingReturnStatus(order)
  return {
    ok: true,
    message: `已生成 ${orderCount} 张发料出库单（${materialLines.length} 行物料，${productSets.length} 个产品）`,
  }
}

/** @deprecated 请使用 submitOutsourcingIssue；保留兼容旧批量入口 */
export function generateOutsourcingIssueOrders(ids = []) {
  const targets = getOutsourcingOrdersByIds(ids).filter((o) => o.status === '进行中')
  if (!targets.length) {
    return { ok: false, message: '请选择「进行中」的外协订单' }
  }
  if (targets.length > 1) {
    return { ok: false, message: '请一次选择一条外协订单生成发料出库单' }
  }
  const order = targets[0]
  const lines = (order.lineItems || [])
    .map((line) => {
      const remain = calcWxLineRemainIssueQty(order, line)
      if (remain <= 0) return null
      return {
        lineId: line.id,
        issueQty: remain,
        shipWarehouse: line.shipWarehouse || '',
      }
    })
    .filter(Boolean)
  return submitOutsourcingIssue(order.id, lines, {
    shipDate: dayjs().format('YYYY-MM-DD'),
    remark: order.remark || '',
  })
}

export function listOutsourcingOperators() {
  const set = new Set()
  outsourcingOrderState.orders.forEach((r) => {
    ;[r.creator, r.updater].filter(Boolean).forEach((n) => set.add(n))
  })
  if (!set.size) {
    ;['admin1', '张三', '李四'].forEach((n) => set.add(n))
  }
  return [...set].map((v) => ({ label: v, value: v }))
}

/** 映射为采购收货/入库弹窗可用的 PO 形态 */
export function toPurchaseOrderShape(order) {
  if (!order) return null
  return {
    ...order,
    orderNo: order.orderNo,
    purchaser: order.creator || 'admin1',
    receivingWarehouse: order.lineItems?.[0]?.shipWarehouse || '',
    inboundStatus: order.returnStatus,
    lineItems: (order.lineItems || []).map((l) => ({
      ...l,
      purchaseQty: Number(l.planQty) || 0,
      itemName: l.productName || l.itemName,
      itemCode: l.productCode || l.itemCode,
      productName: l.productName || l.itemName,
      productCode: l.productCode || l.itemCode,
      receivingWarehouse: l.shipWarehouse || '',
      receivedQty: Number(l.receivedQty) || 0,
    })),
  }
}

/** 批量提交审核（含待提交 / 已拒绝重新提交） */
export function batchSubmitOutsourcingOrders(ids = []) {
  let ok = 0
  const errors = []
  for (const id of ids) {
    const order = getOutsourcingOrderById(id)
    if (!order) {
      errors.push('存在无效外协订单')
      continue
    }
    let result
    if (canSubmitOutsourcingOrder(order)) {
      result = submitOutsourcingOrderForApprove(id)
    } else if (canResubmitOutsourcingOrder(order)) {
      result = resubmitOutsourcingOrder(id)
    } else {
      errors.push(`「${order.orderNo}」不可提交（仅待提交/已拒绝）`)
      continue
    }
    if (result.ok) ok += 1
    else errors.push(result.message || `「${order.orderNo}」提交失败`)
  }
  return { ok, fail: errors.length, errors }
}

function buildDefaultWxReceiptLines(order) {
  return (order.lineItems || [])
    .filter((line) => !line.cancelled && (Number(line.planQty) || 0) > 0)
    .map((line) => {
      const remainingQty = calcWxLineRemainInboundQty(order, line)
      if (remainingQty <= 1e-9) return null
      const warehouse =
        line.shipWarehouse ||
        resolveDefaultWarehouseByMaterialCode(line.productCode || line.itemCode) ||
        ''
      return {
        lineId: line.id,
        poLineId: line.id,
        receivingWarehouse: warehouse,
        receiptQty: remainingQty,
        remark: '',
      }
    })
    .filter(Boolean)
}

function buildDefaultWxInboundLines(order) {
  return (order.lineItems || [])
    .filter((line) => !line.cancelled && (Number(line.planQty) || 0) > 0)
    .map((line) => {
      const remainingQty = calcWxLineRemainInboundQty(order, line)
      if (remainingQty <= 1e-9) return null
      const warehouse =
        line.shipWarehouse ||
        resolveDefaultWarehouseByMaterialCode(line.productCode || line.itemCode) ||
        ''
      return {
        lineId: line.id,
        poLineId: line.id,
        qty: remainingQty,
        warehouse,
      }
    })
    .filter(Boolean)
}

/** 批量生成外协收货单 */
export function batchGenerateOutsourcingReceipts(ids = []) {
  let ok = 0
  const errors = []
  const receipts = []
  for (const id of ids) {
    const order = getOutsourcingOrderById(id)
    if (!order) {
      errors.push('存在无效外协订单')
      continue
    }
    if (!canGenerateOutsourcingReceipt(order)) {
      errors.push(`「${order.orderNo}」不可生成收货单`)
      continue
    }
    const lines = buildDefaultWxReceiptLines(order)
    if (!lines.length) {
      errors.push(`「${order.orderNo}」没有可收货明细`)
      continue
    }
    const missingWh = lines.find((l) => !String(l.receivingWarehouse || '').trim())
    if (missingWh) {
      errors.push(`「${order.orderNo}」存在缺少收货仓库的明细`)
      continue
    }
    const result = submitOutsourcingReceipt(order.id, lines, {
      remark: `批量生成（外协单 ${order.orderNo}）`,
    })
    if (result.ok) {
      ok += 1
      if (result.receipt) receipts.push(result.receipt)
    } else {
      errors.push(result.message || `「${order.orderNo}」生成收货单失败`)
    }
  }
  return { ok, fail: errors.length, errors, receipts }
}

/** 批量生成外协入库（按剩余可入库量） */
export function batchGenerateOutsourcingInbounds(ids = []) {
  let ok = 0
  const errors = []
  for (const id of ids) {
    const order = getOutsourcingOrderById(id)
    if (!order) {
      errors.push('存在无效外协订单')
      continue
    }
    if (!canGenerateOutsourcingInbound(order)) {
      errors.push(`「${order.orderNo}」不可生成入库单`)
      continue
    }
    const lines = buildDefaultWxInboundLines(order)
    if (!lines.length) {
      errors.push(`「${order.orderNo}」没有可入库明细`)
      continue
    }
    const missingWh = lines.find((l) => !String(l.warehouse || '').trim())
    if (missingWh) {
      errors.push(`「${order.orderNo}」存在缺少入库仓库的明细`)
      continue
    }
    const result = submitOutsourcingInbound(order.id, lines)
    if (result.ok) ok += 1
    else errors.push(result.message || `「${order.orderNo}」生成入库单失败`)
  }
  return { ok, fail: errors.length, errors }
}
