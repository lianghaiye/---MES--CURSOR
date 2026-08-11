/** 外协订单选择：下拉搜索 + 更多弹窗（排除待审核/待提交/已作废/已拒绝） */
import dayjs from 'dayjs'
import { formatReturnProductInfo } from '@/utils/returnProductInfo'

export const WX_PICKER_EXCLUDED_STATUSES = new Set(['待审核', '待提交', '已作废', '已拒绝'])

export const OUTSOURCING_ORDER_DROPDOWN_QUICK_LIMIT = 8
export const OUTSOURCING_ORDER_DROPDOWN_SEARCH_LIMIT = 50
export const OUTSOURCING_ORDER_SELECT_PLACEHOLDER = '请搜索或选择外协订单'

export function isOutsourcingOrderSelectable(order) {
  if (!order) return false
  return !WX_PICKER_EXCLUDED_STATUSES.has(order.status)
}

export function listSelectableOutsourcingOrders(orders = []) {
  return (orders || []).filter(isOutsourcingOrderSelectable)
}

export function getAllOutsourcingOrderOptions(orders = []) {
  return listSelectableOutsourcingOrders(orders).map((order) => ({
    label: `${order.orderNo} / ${order.supplier || '—'}`,
    value: order.orderNo,
    order,
  }))
}

export function filterOutsourcingOrderOptions(options, keyword) {
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

export function buildOutsourcingOrderDisplayOptions({
  options,
  keyword,
  selectedValue,
  quickLimit,
}) {
  const filtered = filterOutsourcingOrderOptions(options, keyword)
  const limit = keyword.trim() ? OUTSOURCING_ORDER_DROPDOWN_SEARCH_LIMIT : quickLimit
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

export function formatOutsourcingOrderProductInfo(order) {
  return formatReturnProductInfo(order)
}

export function filterOutsourcingOrdersForPicker(list, filters = {}) {
  const orderNo = String(filters.orderNo || '').trim()
  const supplier = String(filters.supplier || '').trim()
  const salesOrderNo = String(filters.salesOrderNo || '').trim()
  const creator = String(filters.creator || '').trim()
  const range = filters.createdAtRange

  return listSelectableOutsourcingOrders(list).filter((order) => {
    if (orderNo && !String(order.orderNo || '').includes(orderNo)) return false
    if (supplier && !String(order.supplier || '').includes(supplier)) return false
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
