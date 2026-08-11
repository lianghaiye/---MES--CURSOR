/** 采购订单选择：下拉搜索 + 更多弹窗（排除草稿/待审核/待提交/已作废/已拒绝） */
import dayjs from 'dayjs'
import { formatReturnProductInfo } from '@/utils/returnProductInfo'

export const PO_PICKER_EXCLUDED_STATUSES = new Set([
  '草稿',
  '待审核',
  '待提交',
  '已作废',
  '作废',
  '已拒绝',
])

export const PURCHASE_ORDER_DROPDOWN_QUICK_LIMIT = 8
export const PURCHASE_ORDER_DROPDOWN_SEARCH_LIMIT = 50
export const PURCHASE_ORDER_SELECT_PLACEHOLDER = '请搜索或选择采购订单'

export function isPurchaseOrderSelectable(order) {
  if (!order) return false
  return !PO_PICKER_EXCLUDED_STATUSES.has(order.status)
}

export function listSelectablePurchaseOrders(orders = []) {
  return (orders || []).filter(isPurchaseOrderSelectable)
}

export function getAllPurchaseOrderOptions(orders = []) {
  return listSelectablePurchaseOrders(orders).map((order) => ({
    label: `${order.orderNo} / ${order.supplier || '—'}`,
    value: order.orderNo,
    order,
  }))
}

export function filterPurchaseOrderOptions(options, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return options
  return options.filter(
    (opt) =>
      String(opt.value || '')
        .toLowerCase()
        .includes(kw) ||
      String(opt.label || '')
        .toLowerCase()
        .includes(kw) ||
      String(opt.order?.supplier || '')
        .toLowerCase()
        .includes(kw),
  )
}

export function buildPurchaseOrderDisplayOptions({ options, keyword, selectedValue, quickLimit }) {
  const filtered = filterPurchaseOrderOptions(options, keyword)
  const limit = keyword.trim() ? PURCHASE_ORDER_DROPDOWN_SEARCH_LIMIT : quickLimit
  const sliced = filtered.slice(0, limit)
  const display = sliced.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }))
  if (selectedValue && !display.some((opt) => opt.value === selectedValue)) {
    const hit = options.find((opt) => opt.value === selectedValue)
    display.unshift({
      label: hit?.label || selectedValue,
      value: selectedValue,
    })
  }
  return display
}

export function formatPurchaseOrderProductInfo(order) {
  return formatReturnProductInfo(order)
}

export function filterPurchaseOrdersForPicker(list, filters = {}) {
  const orderNo = String(filters.orderNo || '').trim()
  const supplier = String(filters.supplier || '').trim()
  const purchaser = String(filters.purchaser || '').trim()
  const salesOrderNo = String(filters.salesOrderNo || '').trim()
  const creator = String(filters.creator || '').trim()
  const range = filters.createdAtRange

  return listSelectablePurchaseOrders(list).filter((order) => {
    if (orderNo && !String(order.orderNo || '').includes(orderNo)) return false
    if (supplier && !String(order.supplier || '').includes(supplier)) return false
    if (purchaser && !String(order.purchaser || '').includes(purchaser)) return false
    if (salesOrderNo && !String(order.salesOrderNo || '').includes(salesOrderNo)) return false
    if (creator && !String(order.creator || '').includes(creator)) return false
    if (Array.isArray(range) && range.length === 2 && range[0] && range[1]) {
      const start = dayjs(range[0]).startOf('day')
      const end = dayjs(range[1]).endOf('day')
      const created = dayjs(order.createdAt)
      if (!created.isValid() || created.isBefore(start) || created.isAfter(end)) return false
    }
    return true
  })
}
