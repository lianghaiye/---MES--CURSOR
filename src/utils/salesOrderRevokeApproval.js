import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

export const SALES_ORDER_REVOKE_BLOCKED_MESSAGE =
  '该销售订单已下达工单、采购申请或外协订单，不可反审。如需继续操作，请先处理关联单据。'

function matchesSalesOrderNo(value, orderNo) {
  if (!value || !orderNo) return false
  const v = String(value)
  return v === orderNo || v.includes(orderNo)
}

/** 工单是否已下发（非待下发/新建） */
export function isWorkOrderDispatched(status) {
  const s = String(status || '').trim()
  return Boolean(s && s !== '待下发' && s !== '新建')
}

/** 查找销售订单关联的生产/外协/维修工单与总装工单 */
export function findWorkOrdersForSalesOrder(order) {
  if (!order) {
    return { production: [], assembly: [], all: [] }
  }

  const orderNo = order.orderNo
  const orderId = order.id

  const production = (workOrderState.orders || []).filter(
    (wo) => wo.salesOrderId === orderId || matchesSalesOrderNo(wo.sourceOrderNo, orderNo),
  )

  const assembly = (assemblyWorkOrderState.orders || []).filter(
    (wo) =>
      matchesSalesOrderNo(wo.sourceOrderNo, orderNo) ||
      matchesSalesOrderNo(wo.salesOrderNo, orderNo),
  )

  return {
    production,
    assembly,
    all: [...production, ...assembly],
  }
}

/** 已下发的关联工单 */
export function getDispatchedWorkOrdersForSalesOrder(order) {
  return findWorkOrdersForSalesOrder(order).all.filter((wo) => isWorkOrderDispatched(wo.status))
}

export function hasDispatchedWorkOrdersForSalesOrder(order) {
  return getDispatchedWorkOrdersForSalesOrder(order).length > 0
}

/** 关联采购申请 */
export function findPurchaseRequisitionsForSalesOrder(order) {
  if (!order) return []
  const orderNo = order.orderNo
  const orderId = order.id
  return (purchaseRequisitionState.requisitions || []).filter((r) => {
    if (order.purchaseRequisitionId && r.id === order.purchaseRequisitionId) return true
    if (order.purchaseRequisitionNo && r.reqNo === order.purchaseRequisitionNo) return true
    if (r.sourceSalesOrderId && r.sourceSalesOrderId === orderId) return true
    return matchesSalesOrderNo(r.salesOrderNo, orderNo)
  })
}

/** 关联外协订单（采购外协） */
export function findOutsourcingOrdersForSalesOrder(order) {
  if (!order) return []
  const orderNo = order.orderNo
  const orderId = order.id
  return (outsourcingOrderState.orders || []).filter(
    (o) => o.salesOrderId === orderId || matchesSalesOrderNo(o.salesOrderNo, orderNo),
  )
}

/** 反审拦截：存在任意工单 / 采购申请 / 外协订单则不可反审 */
export function getSalesOrderRevokeBlockers(order) {
  const workOrders = findWorkOrdersForSalesOrder(order).all
  const purchaseRequisitions = findPurchaseRequisitionsForSalesOrder(order)
  const outsourcingOrders = findOutsourcingOrdersForSalesOrder(order)
  return { workOrders, purchaseRequisitions, outsourcingOrders }
}

export function canRevokeSalesOrderByLinks(order) {
  const blockers = getSalesOrderRevokeBlockers(order)
  return (
    blockers.workOrders.length === 0 &&
    blockers.purchaseRequisitions.length === 0 &&
    blockers.outsourcingOrders.length === 0
  )
}

export function hasSalesOrderRevokeBlockers(order) {
  return !canRevokeSalesOrderByLinks(order)
}
