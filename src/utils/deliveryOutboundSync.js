import { deliveryOrderState, updateDeliveryOrder } from '@/store/deliveryOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { findLinkedSalesOutbound, sumOutboundLineQty } from '@/utils/deliveryOutbound'
import { calcApplyShipQty } from '@/utils/deliveryOrder'

/** 销售出库确认后：发货单 → 已发货，回写实际出库数量，同步销售订单发货申请 */
export function syncDeliveryAfterOutboundConfirm(outbound) {
  if (!outbound || outbound.outboundType !== '销售出库') return

  const delivery =
    deliveryOrderState.orders.find((o) => o.id === outbound.linkedDeliveryId) ||
    deliveryOrderState.orders.find((o) => o.deliveryCode === outbound.sourceOrderNo) ||
    deliveryOrderState.orders.find((o) => o.deliveryCode === outbound.linkedDeliveryCode)

  if (!delivery) return

  const actualQty = sumOutboundLineQty(outbound)
  updateDeliveryOrder(delivery.id, {
    deliveryStatus: '已发货',
    actualOutboundQty: actualQty,
  })

  const so = salesOrderState.orders.find(
    (o) => o.id === delivery.salesOrderId || o.orderNo === delivery.salesOrderNo,
  )
  if (!so) return

  const app = (so.deliveryApplications || []).find(
    (a) => a.deliveryCode === delivery.deliveryCode || a.id === delivery.id,
  )
  if (app) {
    app.status = '已发货'
    app.actualShipQty = actualQty
    app.totalShipQty = calcApplyShipQty(app)
  }

  const issued = actualQty
  if (issued > 0) {
    const totalOrderQty = (so.lineItems || []).reduce(
      (s, l) => s + (Number(l.qty ?? l.salesQty) || 0),
      0,
    )
    so.totalIssuedQty = Math.min(
      totalOrderQty,
      (so.deliveryApplications || []).reduce((s, a) => s + (Number(a.actualShipQty) || 0), 0),
    )
    if (so.totalIssuedQty >= totalOrderQty && totalOrderQty > 0) {
      so.deliveryStatus = '已发货'
    } else if (so.totalIssuedQty > 0) {
      so.deliveryStatus = '部分发货'
    }
  }
}

export function refreshDeliveryMetrics(row) {
  const ob = findLinkedSalesOutbound(row)
  if (ob?.status === '已出库') {
    row.actualOutboundQty = sumOutboundLineQty(ob)
    row.deliveryStatus = '已发货'
  } else if (row.applyOutbound && ob) {
    row.deliveryStatus = '待出库'
  } else {
    row.deliveryStatus = row.deliveryStatus === '已发货' ? '已发货' : '待发货'
  }
}
