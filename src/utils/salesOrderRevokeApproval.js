import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'

export const SALES_ORDER_REVOKE_BLOCKED_MESSAGE =
  '该销售订单已下发工单，继续操作将影响已下发的工单，如需要继续操作，请联系车间负责人手动终止生产计划与已下发的工单。'

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
