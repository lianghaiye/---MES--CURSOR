import { outboundState } from '@/store/outboundStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { productionPlanState } from '@/store/productionPlanStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { mockOutsourcingOrders } from '@/mock/outsourcingOrders'
import { getDeliveryOrderByCode } from '@/store/deliveryOrderStore'
import {
  calcApplyShipQty,
  calcDeliveryAmountExTax,
  calcShipWeight,
} from '@/utils/deliveryOrder'

/** 销售订单详情 — 发货申请行（合并关联发货单指标） */
export function enrichDeliveryApplicationRow(app = {}) {
  const linked = getDeliveryOrderByCode(app.deliveryCode)
  if (linked) {
    return {
      ...app,
      deliveryOrderId: linked.id,
      deliveryStatus: linked.deliveryStatus,
      applyShipQty: linked.applyShipQty ?? calcApplyShipQty(app),
      actualOutboundQty: linked.actualOutboundQty ?? 0,
      shipWeight: linked.shipWeight ?? calcShipWeight(app),
      totalAmountExTax: linked.totalAmountExTax ?? calcDeliveryAmountExTax(app),
      shipmentMethod: linked.shipmentMethod || app.shipmentMethod || '',
      logisticsNo: linked.logisticsNo || app.logisticsNo || '',
      contactPerson: linked.contactPerson || app.contactPerson || '',
      contactPhone: linked.contactPhone || app.contactPhone || '',
      deliveryAddress: linked.deliveryAddress || app.deliveryAddress || '',
      driverName: linked.driverName || app.driverName || '',
      driverPhone: linked.driverPhone || app.driverPhone || '',
      plateNo: linked.plateNo || app.plateNo || '',
    }
  }
  return {
    ...app,
    deliveryStatus: app.deliveryStatus || (app.status === '已提交' ? '待发货' : app.status || '待发货'),
    applyShipQty: calcApplyShipQty(app),
    actualOutboundQty: Number(app.actualOutboundQty) || 0,
    shipWeight: calcShipWeight(app),
    totalAmountExTax: calcDeliveryAmountExTax(app),
    shipmentMethod: app.shipmentMethod || '',
    logisticsNo: app.logisticsNo || '',
    contactPerson: app.contactPerson || '',
    contactPhone: app.contactPhone || '',
    deliveryAddress: app.deliveryAddress || '',
    driverName: app.driverName || '',
    driverPhone: app.driverPhone || '',
    plateNo: app.plateNo || '',
  }
}

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
    deliveryApplications: (order.deliveryApplications || []).map(enrichDeliveryApplicationRow),
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
