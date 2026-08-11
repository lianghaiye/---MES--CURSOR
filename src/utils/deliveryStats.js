import dayjs from 'dayjs'
import { salesOrderState } from '@/store/salesOrderStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'

export const STAT_PERIOD_OPTIONS = ['本周', '本月', '本季', '本年']

/** @returns {[string, string]} YYYY-MM-DD */
export function getPeriodRange(period, ref = dayjs()) {
  const d = ref
  if (period === '本周') {
    const start = d.startOf('week')
    return [start.format('YYYY-MM-DD'), d.endOf('week').format('YYYY-MM-DD')]
  }
  if (period === '本月') {
    return [d.startOf('month').format('YYYY-MM-DD'), d.endOf('month').format('YYYY-MM-DD')]
  }
  if (period === '本季') {
    const month = d.month()
    const qStart = Math.floor(month / 3) * 3
    const start = d.month(qStart).startOf('month')
    const end = start.add(2, 'month').endOf('month')
    return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
  }
  return [d.startOf('year').format('YYYY-MM-DD'), d.endOf('year').format('YYYY-MM-DD')]
}

/** 上一统计周期区间（用于「较上周期」） */
export function getPreviousPeriodRange(period, ref = dayjs()) {
  const d = ref
  if (period === '本周') return getPeriodRange('本周', d.subtract(1, 'week'))
  if (period === '本月') return getPeriodRange('本月', d.subtract(1, 'month'))
  if (period === '本季') return getPeriodRange('本季', d.subtract(3, 'month'))
  return getPeriodRange('本年', d.subtract(1, 'year'))
}

function inRange(dateStr, start, end) {
  if (!dateStr) return false
  const d = String(dateStr).slice(0, 10)
  return d >= start && d <= end
}

function sumSalesOrderQtyInRange(start, end) {
  let qty = 0
  let amount = 0
  for (const so of salesOrderState.orders || []) {
    if (!inRange(so.documentDate, start, end)) continue
    for (const line of so.lineItems || []) {
      qty += Number(line.qty ?? line.salesQty) || 0
    }
    amount += Number(so.amountExTax) || 0
  }
  return { qty, amount }
}

function sumDeliveryQtyInRange(start, end) {
  let shipped = 0
  let pending = 0
  let deliveryAmount = 0
  for (const row of deliveryOrderState.orders || []) {
    if (!inRange(row.documentDate, start, end)) continue
    if (row.deliveryStatus === '已发货') {
      shipped += Number(row.actualOutboundQty) || 0
      deliveryAmount += Number(row.totalAmountExTax) || 0
    } else {
      pending += Number(row.applyShipQty) || 0
    }
  }
  return { shipped, pending, deliveryAmount }
}

const MOCK_DELTAS = {
  本周: { salesQty: -22, shipped: 0, pending: -22, salesAmount: -155.46, deliveryAmount: 0 },
  本月: { salesQty: -18, shipped: 2, pending: -20, salesAmount: -120.0, deliveryAmount: 45.5 },
  本季: { salesQty: 12, shipped: 8, pending: 4, salesAmount: 200.0, deliveryAmount: 86.31 },
  本年: { salesQty: 35, shipped: 28, pending: 7, salesAmount: 520.0, deliveryAmount: 310.2 },
}

/**
 * 顶部统计（与列表筛选独立）
 */
export function calcDeliveryDashboardStats(period = '本周') {
  const [start, end] = getPeriodRange(period)
  const curSales = sumSalesOrderQtyInRange(start, end)
  const curDel = sumDeliveryQtyInRange(start, end)
  const mock = MOCK_DELTAS[period] || MOCK_DELTAS['本周']

  return {
    period,
    salesProductQty: curSales.qty,
    shippedQty: curDel.shipped,
    pendingShipQty: curDel.pending,
    salesAmountExTax: curSales.amount,
    deliveryAmountExTax: curDel.deliveryAmount,
    compare: {
      salesProductQty: mock.salesQty,
      shippedQty: mock.shipped,
      pendingShipQty: mock.pending,
      salesAmountExTax: mock.salesAmount,
      deliveryAmountExTax: mock.deliveryAmount,
    },
  }
}
