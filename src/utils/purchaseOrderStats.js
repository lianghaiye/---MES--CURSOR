/**
 * 采购订单列表顶部统计（与列表筛选独立）
 */
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { computePurchaseOrderOverdueStatus } from '@/mock/purchaseOrders'
import { calcPoLineReceivedQty } from '@/utils/purchaseLineInbound'
import { getPeriodRange, getPreviousPeriodRange, STAT_PERIOD_OPTIONS } from '@/utils/deliveryStats'

export { STAT_PERIOD_OPTIONS }

const EXCLUDED_STATUSES = new Set(['草稿', '作废', '已作废'])

function inRange(dateStr, start, end) {
  if (!dateStr) return false
  const d = String(dateStr).slice(0, 10)
  return d >= start && d <= end
}

function isStatOrder(order) {
  return order && !EXCLUDED_STATUSES.has(order.status)
}

function orderDate(order) {
  return order.documentDate || order.createdAt
}

function roundQty(n) {
  const v = Number(n) || 0
  return Math.round(v * 10000) / 10000
}

function sumPurchaseMetrics(orders, start, end) {
  let orderCount = 0
  let purchaseQty = 0
  let inboundQty = 0
  let amountExTax = 0
  let overdueCount = 0

  for (const order of orders || []) {
    if (!isStatOrder(order)) continue
    if (!inRange(orderDate(order), start, end)) continue

    orderCount += 1
    amountExTax += Number(order.amountExTax) || 0

    let orderPurchase = 0
    let orderInbound = 0
    for (const line of order.lineItems || []) {
      const pq = Number(line.purchaseQty) || 0
      orderPurchase += pq
      orderInbound += calcPoLineReceivedQty(order, line)
    }
    purchaseQty += orderPurchase
    inboundQty += orderInbound

    const overdue = order.overdueStatus || computePurchaseOrderOverdueStatus(order)
    if (order.status === '进行中' && order.inboundStatus !== '已入库' && overdue === '已逾期') {
      overdueCount += 1
    }
  }

  return {
    orderCount,
    purchaseQty: roundQty(purchaseQty),
    inboundQty: roundQty(inboundQty),
    pendingInboundQty: roundQty(Math.max(0, purchaseQty - inboundQty)),
    amountExTax: Math.round(amountExTax * 100) / 100,
    overdueCount,
  }
}

function diffMetrics(cur, prev) {
  return {
    orderCount: cur.orderCount - prev.orderCount,
    inboundQty: roundQty(cur.inboundQty - prev.inboundQty),
    pendingInboundQty: roundQty(cur.pendingInboundQty - prev.pendingInboundQty),
    amountExTax: Math.round((cur.amountExTax - prev.amountExTax) * 100) / 100,
    overdueCount: cur.overdueCount - prev.overdueCount,
  }
}

export function calcPurchaseOrderDashboardStats(period = '本周') {
  const [start, end] = getPeriodRange(period)
  const [prevStart, prevEnd] = getPreviousPeriodRange(period)
  const orders = purchaseOrderState.orders
  const cur = sumPurchaseMetrics(orders, start, end)
  const prev = sumPurchaseMetrics(orders, prevStart, prevEnd)

  return {
    period,
    ...cur,
    compare: diffMetrics(cur, prev),
  }
}
