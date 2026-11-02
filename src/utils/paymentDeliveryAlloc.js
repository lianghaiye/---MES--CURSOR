import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { sumPaymentsByDeliveryCode } from '@/store/salesPaymentStore'
import {
  calcApplyShipQty,
  calcDeliveryAmountInTax,
  mapApplicationToDeliveryOrder,
  resolveDeliveryOrderStatus,
} from '@/utils/deliveryOrder'

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function normalizePaymentDeliveryRow(
  row,
  order,
  { manual = false, allocAmount = null } = {},
) {
  const mapped = row?.deliveryCode ? row : mapApplicationToDeliveryOrder(row, order)
  const qty =
    Number(mapped.applyShipQty) ||
    Number(row?.qty) ||
    calcApplyShipQty(mapped) ||
    Number(mapped.totalShipQty) ||
    0
  const amount =
    Number(mapped.totalAmountInTax) || Number(row?.amount) || calcDeliveryAmountInTax(mapped) || 0
  const status =
    mapped.deliveryStatus ||
    resolveDeliveryOrderStatus(mapped) ||
    mapped.status ||
    row?.status ||
    '—'
  const deliveryDate = String(
    mapped.deliveryDate || mapped.documentDate || mapped.createdAt || row?.deliveryDate || '',
  ).slice(0, 10)
  const deliveryCode = mapped.deliveryCode || row?.deliveryCode || '—'
  const id = mapped.id || row?.id || mapped.deliveryCode || `d-${deliveryDate}-${qty}`
  return {
    id,
    deliveryCode,
    status,
    deliveryDate,
    qty,
    amount: round2(amount),
    paidAmount: sumPaymentsByDeliveryCode(deliveryCode === '—' ? '' : deliveryCode),
    allocAmount: allocAmount != null && allocAmount !== '' ? round2(allocAmount) : null,
    manual: Boolean(manual),
  }
}

/** 销售订单自动带出的发货行 */
export function buildDeliveryAllocRowsForSalesOrder(salesOrderNo) {
  const no = String(salesOrderNo || '').trim()
  if (!no) return []
  const order = findSalesOrderByOrderNo(no)
  const fromStore = (deliveryOrderState.orders || []).filter((d) => d.salesOrderNo === no)
  if (fromStore.length) {
    return fromStore.map((d) => normalizePaymentDeliveryRow(d, order, { manual: false }))
  }
  return (order?.deliveryApplications || []).map((app) =>
    normalizePaymentDeliveryRow(app, order, { manual: false }),
  )
}

export function refreshDeliveryAllocMetrics(list) {
  return (list || []).map((r) =>
    normalizePaymentDeliveryRow(r, null, {
      manual: Boolean(r.manual),
      allocAmount: r.allocAmount,
    }),
  )
}

export function sumDeliveryAllocAmounts(rows = []) {
  return round2(
    (rows || []).reduce((s, r) => s + (Number(r.allocAmount) > 0 ? Number(r.allocAmount) : 0), 0),
  )
}

/** 提交用：保留已关联发货单；本次回款可空 */
export function toPaymentDeliveryAllocs(rows = []) {
  return (rows || [])
    .filter((r) => r?.deliveryCode && r.deliveryCode !== '—')
    .map((r) => ({
      deliveryId: r.id || '',
      deliveryCode: r.deliveryCode,
      amount: Number(r.allocAmount) > 0 ? round2(r.allocAmount) : null,
    }))
}
