import { outboundState } from '@/store/outboundStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { productionPlanState } from '@/store/productionPlanStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { mockOutsourcingOrders } from '@/mock/outsourcingOrders'
import { getDeliveryOrderByCode } from '@/store/deliveryOrderStore'

function matchesOrderNo(value, orderNo) {
  if (!value || !orderNo) return false
  const v = String(value)
  return v === orderNo || v.includes(orderNo)
}

export function getSalesOrderById(id) {
  return salesOrderState.orders.find((o) => o.id === id) || null
}

export function getSalesOrderByNo(orderNo) {
  return salesOrderState.orders.find((o) => o.orderNo === orderNo) || null
}

/** 汇总销售订单关联业务单据 */
export function resolveSalesOrderRelations(order) {
  if (!order) {
    return {
      deliveryApplications: [],
      outboundOrders: [],
      purchaseRequisitions: [],
      purchaseOrders: [],
      productionPlans: [],
      workOrders: [],
      assemblyWorkOrders: [],
      outsourcingOrders: [],
      attachments: [],
    }
  }

  const orderNo = order.orderNo

  const purchaseRequisitions = (purchaseRequisitionState.requisitions || []).filter(
    (r) => r.id === order.purchaseRequisitionId || matchesOrderNo(r.salesOrderNo, orderNo),
  )

  return {
    deliveryApplications: (order.deliveryApplications || []).map((app) => {
      const linked = getDeliveryOrderByCode(app.deliveryCode)
      return linked ? { ...app, deliveryOrderId: linked.id } : app
    }),
    outboundOrders: (outboundState.orders || []).filter(
      (o) => matchesOrderNo(o.salesOrderNo, orderNo) || matchesOrderNo(o.sourceOrderNo, orderNo),
    ),
    purchaseRequisitions,
    purchaseOrders: (purchaseOrderState.orders || []).filter((po) =>
      matchesOrderNo(po.salesOrderNo, orderNo),
    ),
    productionPlans: (productionPlanState.plans || []).filter(
      (p) => p.salesOrderNo === orderNo || p.orderNo === orderNo,
    ),
    workOrders: (workOrderState.orders || []).filter((wo) =>
      matchesOrderNo(wo.sourceOrderNo, orderNo),
    ),
    assemblyWorkOrders: (assemblyWorkOrderState.orders || []).filter((wo) =>
      matchesOrderNo(wo.sourceOrderNo, orderNo),
    ),
    outsourcingOrders: mockOutsourcingOrders.filter((o) => o.salesOrderNo === orderNo),
    attachments: order.attachments || [],
  }
}
