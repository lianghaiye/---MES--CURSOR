/** 销售订单选择弹窗：产品名称汇总（多个逗号分隔） */
export function formatSalesOrderProductNames(order) {
  const names = [
    ...new Set((order?.lineItems || []).map((line) => line.productName).filter(Boolean)),
  ]
  return names.length ? names.join('，') : '—'
}

export function resolveSalesOrderCreatedAt(order) {
  return order?.createdAt || order?.documentDate || '—'
}

export const SALES_ORDER_DROPDOWN_QUICK_LIMIT = 8
export const SALES_ORDER_DROPDOWN_SEARCH_LIMIT = 50
export const SALES_ORDER_SELECT_PLACEHOLDER = '请搜索或选择'

export const SALES_ORDER_PICKER_EXCLUDED_STATUSES = new Set([
  '待审核',
  '待提交',
  '已作废',
  '已拒绝',
])

export function isSalesOrderSelectable(
  order,
  excludeStatuses = SALES_ORDER_PICKER_EXCLUDED_STATUSES,
) {
  if (!order) return false
  const set = excludeStatuses instanceof Set ? excludeStatuses : new Set(excludeStatuses || [])
  return !set.has(order.progressStatus || order.status)
}

export function getAllSalesOrderOptions(orders = [], { excludeStatuses } = {}) {
  const excluded =
    excludeStatuses === undefined
      ? null
      : excludeStatuses instanceof Set
        ? excludeStatuses
        : new Set(excludeStatuses || [])
  return (orders || [])
    .filter((order) => (excluded ? isSalesOrderSelectable(order, excluded) : true))
    .map((order) => ({
      label: `${order.orderNo} / ${order.customerName || '—'}`,
      value: order.orderNo,
      order,
    }))
}

export function filterSalesOrderOptions(options, keyword) {
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
      String(opt.order?.customerName || '')
        .toLowerCase()
        .includes(kw),
  )
}

export function buildSalesOrderDisplayOptions({ options, keyword, selectedValue, quickLimit }) {
  const filtered = filterSalesOrderOptions(options, keyword)
  const limit = keyword.trim() ? SALES_ORDER_DROPDOWN_SEARCH_LIMIT : quickLimit
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

/** 销售订单选择弹窗筛选（支持模糊匹配） */
export function filterSalesOrdersForPicker(list, filters = {}) {
  const orderNo = String(filters.orderNo || '').trim()
  const customerName = String(filters.customerName || '').trim()
  const salesperson = String(filters.salesperson || '').trim()
  const excludeStatuses =
    filters.excludeStatuses === undefined
      ? null
      : filters.excludeStatuses instanceof Set
        ? filters.excludeStatuses
        : new Set(filters.excludeStatuses || [])

  return (list || []).filter((order) => {
    if (excludeStatuses && !isSalesOrderSelectable(order, excludeStatuses)) return false
    if (orderNo && !String(order.orderNo || '').includes(orderNo)) return false
    if (customerName && !String(order.customerName || '').includes(customerName)) return false
    if (salesperson && !String(order.salesperson || '').includes(salesperson)) return false
    return true
  })
}
