/**
 * 外协订单列表顶部统计（与列表筛选独立）
 */
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { computeOutsourcingOverdueStatus } from '@/mock/outsourcingOrders'
import { calcWxLineReceivedQty } from '@/utils/outsourcingInbound'
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
  return order.createdAt || order.documentDate
}

function roundQty(n) {
  const v = Number(n) || 0
  return Math.round(v * 10000) / 10000
}

function sumOutsourcingMetrics(orders, start, end) {
  let orderCount = 0
  let planQty = 0
  let returnedQty = 0
  let amountExTax = 0
  let amountInTax = 0
  let overdueCount = 0

  for (const order of orders || []) {
    if (!isStatOrder(order)) continue
    if (!inRange(orderDate(order), start, end)) continue

    orderCount += 1
    amountExTax += Number(order.amountExTax) || 0
    amountInTax += Number(order.amountInTax) || 0

    let orderPlan = 0
    let orderReturned = 0
    for (const line of order.lineItems || []) {
      orderPlan += Number(line.planQty) || 0
      orderReturned += calcWxLineReceivedQty(order, line)
    }
    planQty += orderPlan
    returnedQty += orderReturned

    const overdue = order.overdueStatus || computeOutsourcingOverdueStatus(order)
    if (order.status === '进行中' && order.returnStatus !== '已入库' && overdue === '已逾期') {
      overdueCount += 1
    }
  }

  return {
    orderCount,
    planQty: roundQty(planQty),
    returnedQty: roundQty(returnedQty),
    pendingReturnQty: roundQty(Math.max(0, planQty - returnedQty)),
    amountExTax: Math.round(amountExTax * 100) / 100,
    amountInTax: Math.round(amountInTax * 100) / 100,
    overdueCount,
  }
}

function diffMetrics(cur, prev) {
  return {
    orderCount: cur.orderCount - prev.orderCount,
    returnedQty: roundQty(cur.returnedQty - prev.returnedQty),
    pendingReturnQty: roundQty(cur.pendingReturnQty - prev.pendingReturnQty),
    amountExTax: Math.round((cur.amountExTax - prev.amountExTax) * 100) / 100,
    amountInTax: Math.round((cur.amountInTax - prev.amountInTax) * 100) / 100,
    overdueCount: cur.overdueCount - prev.overdueCount,
  }
}

export function calcOutsourcingOrderDashboardStats(period = '本周') {
  const [start, end] = getPeriodRange(period)
  const [prevStart, prevEnd] = getPreviousPeriodRange(period)
  const orders = outsourcingOrderState.orders
  const cur = sumOutsourcingMetrics(orders, start, end)
  const prev = sumOutsourcingMetrics(orders, prevStart, prevEnd)

  return {
    period,
    ...cur,
    compare: diffMetrics(cur, prev),
  }
}
