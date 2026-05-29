import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { cloneSalesOrders } from '@/mock/salesOrders'

const STORAGE_KEY = 'i_doms_sales_orders'
let orderSeq = 3
let deliverySeq = 113

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: salesOrderState.orders }))
}

export function generateSalesOrderNo() {
  orderSeq += 1
  return `XSDD${dayjs().format('YYYYMM')}${String(orderSeq).padStart(4, '0')}`
}

export function generateDeliveryCode() {
  deliverySeq += 1
  return `SH${dayjs().format('YYYYMMDD')}${String(deliverySeq).padStart(3, '0')}`
}

export const salesOrderState = reactive({
  orders: loadFromStorage() || cloneSalesOrders(),
})

watch(
  () => salesOrderState.orders,
  () => persist(),
  { deep: true },
)

export function addSalesOrder(order) {
  salesOrderState.orders.unshift(order)
}

export function updateSalesOrder(id, patch) {
  const idx = salesOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(salesOrderState.orders[idx], patch)
  recalcOrderAmounts(salesOrderState.orders[idx])
  return salesOrderState.orders[idx]
}

export function deleteSalesOrder(id) {
  const idx = salesOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  salesOrderState.orders.splice(idx, 1)
  return true
}

export function recalcOrderAmounts(order) {
  const lineItems = order.lineItems || []
  order.totalQty = lineItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)
  order.amountExTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0)
  order.amountInTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0)
  order.orderAmount = order.amountInTax
}
