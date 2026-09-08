/**
 * 工单转采购 / 转外协数量占用（扣减待排产）
 * 独立模块，避免与 workOrderStatus / workOrderRelatedInfo 循环依赖
 */
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

function matchesWorkOrderSource(row, workOrder) {
  if (!row || !workOrder) return false
  const id = String(workOrder.id || '').trim()
  const code = String(workOrder.code || '').trim()
  if (id && String(row.sourceWorkOrderId || '').trim() === id) return true
  if (code) {
    const nos = [row.sourceWorkOrderNo, row.sourceOrderNo]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
    if (nos.includes(code)) return true
  }
  return false
}

function purchaseReqQty(row) {
  if (row?.plannedQty != null && row.plannedQty !== '') return Number(row.plannedQty) || 0
  return (row?.lineItems || []).reduce(
    (s, l) => s + (Number(l.planQty ?? l.purchaseQty ?? l.qty) || 0),
    0,
  )
}

function outsourcingOrderQty(row) {
  if (row?.outsourceQty != null && row.outsourceQty !== '') return Number(row.outsourceQty) || 0
  if (row?.totalQty != null && row.totalQty !== '') return Number(row.totalQty) || 0
  return (row?.lineItems || []).reduce((s, l) => s + (Number(l.planQty ?? l.outsourceQty) || 0), 0)
}

export function listWorkOrderPurchaseRequisitions(workOrder) {
  if (!workOrder) return []
  return (purchaseRequisitionState.requisitions || []).filter((r) => {
    if (!matchesWorkOrderSource(r, workOrder)) return false
    const st = String(r.docStatus || r.status || '')
    return st !== '已作废'
  })
}

export function listWorkOrderOutsourcingOrders(workOrder) {
  if (!workOrder) return []
  return (outsourcingOrderState.orders || []).filter((o) => {
    if (!matchesWorkOrderSource(o, workOrder)) return false
    const st = String(o.status || '')
    return st !== '已作废' && st !== '已关闭'
  })
}

export function getWorkOrderConvertedPurchaseQty(workOrder) {
  return listWorkOrderPurchaseRequisitions(workOrder).reduce((s, r) => s + purchaseReqQty(r), 0)
}

export function getWorkOrderConvertedOutsourceQty(workOrder) {
  return listWorkOrderOutsourcingOrders(workOrder).reduce((s, o) => s + outsourcingOrderQty(o), 0)
}

export function getWorkOrderConvertOccupyQty(workOrder) {
  return getWorkOrderConvertedPurchaseQty(workOrder) + getWorkOrderConvertedOutsourceQty(workOrder)
}

/**
 * 转出旁显：部分转出 / 已转出（无转出返回空串）
 * - 转出数 > 0 且 < 计划 → 部分转出
 * - 转出数 ≥ 计划 → 已转出
 */
export function getWorkOrderConvertSideLabel(workOrder) {
  const occupy = getWorkOrderConvertOccupyQty(workOrder)
  if (occupy <= 0) return ''
  const plan = Math.max(0, Number(workOrder?.planQty) || 0)
  if (plan > 0 && occupy >= plan) return '已转出'
  if (plan <= 0) return '已转出'
  return '部分转出'
}

export function getWorkOrderConvertSideTagColor(label) {
  if (label === '已转出') return 'default'
  if (label === '部分转出') return 'cyan'
  return 'default'
}
