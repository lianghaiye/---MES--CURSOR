/** 销售订单选择弹窗：产品名称汇总（多个逗号分隔） */
export function formatSalesOrderProductNames(order) {
  const names = [...new Set((order?.lineItems || []).map((line) => line.productName).filter(Boolean))]
  return names.length ? names.join('，') : '—'
}

export function resolveSalesOrderCreatedAt(order) {
  return order?.createdAt || order?.documentDate || '—'
}

/** 销售订单选择弹窗筛选（支持模糊匹配） */
export function filterSalesOrdersForPicker(list, filters = {}) {
  const orderNo = String(filters.orderNo || '').trim()
  const customerName = String(filters.customerName || '').trim()
  const salesperson = String(filters.salesperson || '').trim()

  return (list || []).filter((order) => {
    if (orderNo && !String(order.orderNo || '').includes(orderNo)) return false
    if (customerName && !String(order.customerName || '').includes(customerName)) return false
    if (salesperson && !String(order.salesperson || '').includes(salesperson)) return false
    return true
  })
}
