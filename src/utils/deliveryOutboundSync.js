import { deliveryOrderState, updateDeliveryOrder } from '@/store/deliveryOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { findLinkedSalesOutbound, sumOutboundLineQty } from '@/utils/deliveryOutbound'
import { calcApplyShipQty } from '@/utils/deliveryOrder'
import { sumSelectedShipQty } from '@/utils/shipEbom'

function outboundQtyByItemCode(outbound) {
  const map = new Map()
  for (const ol of outbound?.lineItems || []) {
    const code = String(ol.itemCode || ol.productCode || '')
    if (!code) continue
    map.set(code, (map.get(code) || 0) + (Number(ol.shipQty) || 0))
  }
  return map
}

/** 将出库实发数量回写到发货申请/发货单明细（支持部分出库后释放差额） */
function writeActualQtyToDeliveryLines(delivery, outbound) {
  if (!delivery || !outbound) return
  const qtyMap = outboundQtyByItemCode(outbound)
  const used = new Map()

  const takeQty = (code, applyQty) => {
    const key = String(code || '')
    if (!key || !qtyMap.has(key)) return Number(applyQty) || 0
    const remain = Math.max(0, (qtyMap.get(key) || 0) - (used.get(key) || 0))
    const actual = Math.min(Number(applyQty) || 0, remain)
    used.set(key, (used.get(key) || 0) + actual)
    return actual
  }

  for (const li of delivery.lineItems || []) {
    const code = li.productCode || li.itemCode || ''
    const applyQty = Number(li.shipQty) || 0
    li.actualShipQty = takeQty(code, applyQty)
  }

  for (const ship of delivery.scatterShipments || []) {
    let shipActual = 0
    for (const pick of ship.materialPicks || []) {
      if (pick.selected === false) continue
      const code = pick.code || pick.materialCode || pick.itemCode || ''
      const applyQty = Number(pick.shipQty) || 0
      if (applyQty <= 0) continue
      pick.actualShipQty = takeQty(code, applyQty)
      shipActual += pick.actualShipQty
    }
    ship.actualShipQty =
      shipActual || takeQty(ship.productCode || ship.itemCode, sumSelectedShipQty(ship))
  }

  for (const att of delivery.shipAttachments || []) {
    if (att.selected === false) continue
    const code = att.materialCode || ''
    const applyQty = Number(att.shipQty) || 0
    if (applyQty <= 0) continue
    att.actualShipQty = takeQty(code, applyQty)
  }
}

/** 销售出库确认后：发货单 → 已发货，回写实际出库数量，同步销售订单发货申请 */
export function syncDeliveryAfterOutboundConfirm(outbound) {
  if (!outbound || outbound.outboundType !== '销售出库') return

  const delivery =
    deliveryOrderState.orders.find((o) => o.id === outbound.linkedDeliveryId) ||
    deliveryOrderState.orders.find((o) => o.deliveryCode === outbound.sourceOrderNo) ||
    deliveryOrderState.orders.find((o) => o.deliveryCode === outbound.linkedDeliveryCode)

  if (!delivery) return

  writeActualQtyToDeliveryLines(delivery, outbound)

  const actualQty = sumOutboundLineQty(outbound)
  // 明细 actualShipQty 已原地写回；此处只更新状态，避免「已出库不可改数量」拦截
  delivery.deliveryStatus = '已发货'
  delivery.actualOutboundQty = actualQty
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
    app.lineItems = JSON.parse(JSON.stringify(delivery.lineItems || []))
    app.scatterShipments = JSON.parse(JSON.stringify(delivery.scatterShipments || []))
    app.shipAttachments = JSON.parse(JSON.stringify(delivery.shipAttachments || []))
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
