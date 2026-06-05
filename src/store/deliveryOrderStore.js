import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { salesOrderState } from '@/store/salesOrderStore'
import {
  calcApplyShipQty,
  calcDeliveryAmountExTax,
  calcShipWeight,
  mapApplicationToDeliveryOrder,
} from '@/utils/deliveryOrder'
import { buildDeliveryOrderSeed } from '@/mock/deliveryOrderSeed'
import {
  deleteLinkedSalesOutbound,
  findLinkedSalesOutbound,
  hasLinkedSalesOutbound,
  upsertSalesOutboundFromDelivery,
} from '@/utils/deliveryOutbound'
import { refreshDeliveryMetrics } from '@/utils/deliveryOutboundSync'

const STORAGE_KEY = 'i_doms_delivery_orders'
const DATA_VERSION = 2

function migrateOrders(orders) {
  return (orders || []).map((o) => {
    const row = { ...o }
    if (row.deliveryStatus === '已出库' || row.deliveryStatus === '部分出库') {
      row.deliveryStatus = '已发货'
    }
    refreshDeliveryMetrics(row)
    row.actualOutboundQty = row.actualOutboundQty ?? 0
    const linked = findLinkedSalesOutbound(row)
    if (linked) row.outboundOrderId = linked.id
    return row
  })
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.orders)) {
        return migrateOrders(parsed.orders)
      }
      if (Array.isArray(parsed.orders)) {
        return migrateOrders(parsed.orders)
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, orders: deliveryOrderState.orders }),
  )
}

export const deliveryOrderState = reactive({
  orders: loadFromStorage() || migrateOrders(buildDeliveryOrderSeed()),
})

function refreshRowMetrics(row) {
  refreshDeliveryMetrics(row)
  const linked = findLinkedSalesOutbound(row)
  row.outboundOrderId = linked?.id || ''
  if (linked?.status === '已出库') {
    row.actualOutboundQty =
      (linked.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0) || 0
  }
}

export function refreshOutboundQtyAll() {
  deliveryOrderState.orders.forEach(refreshRowMetrics)
}

export function getDeliveryOrderById(id) {
  return deliveryOrderState.orders.find((o) => o.id === id) || null
}

export function getDeliveryOrderByCode(code) {
  if (!code) return null
  return deliveryOrderState.orders.find((o) => o.deliveryCode === code) || null
}

/** 从销售订单同步尚未登记的发货申请 */
export function syncFromSalesOrders() {
  const ids = new Set(deliveryOrderState.orders.map((o) => o.id))
  const added = []
  for (const so of salesOrderState.orders) {
    for (const app of so.deliveryApplications || []) {
      const id = app.id || `da-${so.id}-${app.deliveryCode}`
      if (ids.has(id)) continue
      added.push(mapApplicationToDeliveryOrder({ ...app, id, salesOrderId: so.id }, so))
      ids.add(id)
    }
  }
  if (added.length) {
    deliveryOrderState.orders.unshift(...added)
  }
  refreshOutboundQtyAll()
}

watch(
  () => deliveryOrderState.orders,
  () => persist(),
  { deep: true },
)

export function registerDeliveryFromApplication(orderId, application) {
  const so = salesOrderState.orders.find((o) => o.id === orderId)
  const row = mapApplicationToDeliveryOrder(
    {
      ...application,
      id: application.id || `da-${Date.now()}`,
      salesOrderId: orderId,
      salesOrderNo: so?.orderNo || application.salesOrderNo,
    },
    so,
  )
  const idx = deliveryOrderState.orders.findIndex((o) => o.id === row.id)
  if (idx === -1) {
    deliveryOrderState.orders.unshift(row)
    refreshRowMetrics(deliveryOrderState.orders[0])
  } else {
    Object.assign(deliveryOrderState.orders[idx], row)
    refreshRowMetrics(deliveryOrderState.orders[idx])
  }
  const target = deliveryOrderState.orders.find((o) => o.id === row.id)
  if (application.applyOutbound && target) {
    tryCreateOutboundForDelivery(target)
  }
  return target
}

export function tryCreateOutboundForDelivery(delivery) {
  if (!delivery?.applyOutbound) return { ok: false, message: '未勾选申请出库' }
  if (hasLinkedSalesOutbound(delivery)) {
    return { ok: false, message: '已存在关联出库单' }
  }
  const res = upsertSalesOutboundFromDelivery(delivery)
  if (res.ok && res.outbound) {
    delivery.deliveryStatus = '待出库'
    delivery.outboundOrderId = res.outbound.id
  }
  return res
}

export function generateOutboundForDelivery(id) {
  const row = getDeliveryOrderById(id)
  if (!row) return { ok: false, message: '发货单不存在' }
  if (row.deliveryStatus !== '待发货') {
    return { ok: false, message: '仅待发货状态可生成出库单' }
  }
  if (hasLinkedSalesOutbound(row)) {
    return { ok: false, message: '已关联出库单' }
  }
  row.applyOutbound = true
  const res = upsertSalesOutboundFromDelivery(row)
  if (res.ok) {
    row.deliveryStatus = '待出库'
    row.outboundOrderId = res.outbound.id
  }
  return res
}

function nextDeliveryCode() {
  const n = deliveryOrderState.orders.length + 1
  return `SH${dayjs().format('YYYYMMDD')}${String(n).padStart(3, '0')}`
}

/** 手工新增发货单 */
export function createDeliveryOrder(payload) {
  const so = salesOrderState.orders.find(
    (o) => o.id === payload.salesOrderId || o.orderNo === payload.salesOrderNo,
  )
  const row = mapApplicationToDeliveryOrder(
    {
      id: `do-${Date.now()}`,
      deliveryCode: payload.deliveryCode || nextDeliveryCode(),
      deliveryDate: payload.documentDate || dayjs().format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      customerName: payload.customerName || so?.customerName,
      shipmentMethod: payload.shipmentMethod || '物流',
      logisticsNo: payload.logisticsNo || '',
      contactPerson: payload.contactPerson || so?.contactPerson || '',
      contactPhone: payload.contactPhone || so?.contactPhone || '',
      deliveryAddress: payload.deliveryAddress || so?.deliveryAddress || '',
      driverName: payload.driverName || '',
      driverPhone: payload.driverPhone || '',
      plateNo: payload.plateNo || '',
      applyOutbound: Boolean(payload.applyOutbound),
      outboundWarehouse: payload.outboundWarehouse || '成品仓',
      remark: payload.remark || '',
      lineItems: payload.lineItems || [],
      scatterShipments: payload.scatterShipments || [],
      salesOrderId: so?.id || payload.salesOrderId,
    },
    so,
  )
  deliveryOrderState.orders.unshift(row)
  if (payload.applyOutbound) {
    tryCreateOutboundForDelivery(row)
  }
  return row
}

export function updateDeliveryOrder(id, patch) {
  const idx = deliveryOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  const prev = deliveryOrderState.orders[idx]
  Object.assign(deliveryOrderState.orders[idx], patch)
  const row = deliveryOrderState.orders[idx]
  row.applyShipQty = calcApplyShipQty(row)
  row.totalAmountExTax = calcDeliveryAmountExTax(row)
  row.shipWeight = patch.shipWeight ?? calcShipWeight(row)
  refreshRowMetrics(row)
  const editable = prev.deliveryStatus === '待发货' || prev.deliveryStatus === '待出库'
  if (editable && hasLinkedSalesOutbound(row)) {
    upsertSalesOutboundFromDelivery(row)
    row.deliveryStatus = '待出库'
  } else if (row.applyOutbound && !hasLinkedSalesOutbound(row)) {
    tryCreateOutboundForDelivery(row)
  }
  return row
}

export function deleteDeliveryOrder(id) {
  const idx = deliveryOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  const row = deliveryOrderState.orders[idx]
  deleteLinkedSalesOutbound(row)
  deliveryOrderState.orders.splice(idx, 1)
  return true
}

export function canEditDeliveryOrder(row) {
  return row?.deliveryStatus === '待发货' || row?.deliveryStatus === '待出库'
}

export function canDeleteDeliveryOrder(row) {
  return row?.deliveryStatus === '待发货'
}

refreshOutboundQtyAll()
