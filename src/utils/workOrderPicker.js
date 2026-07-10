export const WORK_ORDER_DROPDOWN_QUICK_LIMIT = 8
export const WORK_ORDER_DROPDOWN_SEARCH_LIMIT = 50
export const WORK_ORDER_SELECT_PLACEHOLDER = '请搜索或选择'

export function getAllWorkOrderOptions(orders = []) {
  return (orders || []).map((wo) => ({
    label: `${wo.code} / ${wo.productName || '—'}`,
    value: wo.code,
    workOrder: wo,
  }))
}

export function filterWorkOrderOptions(options, keyword) {
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
      String(opt.workOrder?.productName || '')
        .toLowerCase()
        .includes(kw),
  )
}

export function buildWorkOrderDisplayOptions({ options, keyword, selectedValue, quickLimit }) {
  const filtered = filterWorkOrderOptions(options, keyword)
  const limit = keyword.trim() ? WORK_ORDER_DROPDOWN_SEARCH_LIMIT : quickLimit
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

/** 工单选择弹窗筛选 */
export function filterWorkOrdersForPicker(list, filters = {}) {
  const code = String(filters.code || '').trim()
  const productName = String(filters.productName || '').trim()
  const salesOrderNo = String(filters.salesOrderNo || '').trim()
  const drawingNo = String(filters.drawingNo || '').trim()
  const specModel = String(filters.specModel || '').trim()

  return (list || []).filter((wo) => {
    if (filters.orderCategory && wo.orderCategory !== filters.orderCategory) return false
    if (code && !String(wo.code || '').includes(code)) return false
    if (productName && !String(wo.productName || '').includes(productName)) return false
    if (salesOrderNo && !String(wo.sourceOrderNo || '').includes(salesOrderNo)) return false
    if (drawingNo && !String(wo.drawingNo || '').includes(drawingNo)) return false
    if (specModel && !String(wo.specModel || '').includes(specModel)) return false
    if (filters.workCenter && wo.workCenter !== filters.workCenter) return false
    return true
  })
}

export const workOrderCategoryOptions = [
  '生产工单',
  '总装工单',
  '外协工单',
  '维修工单',
  '质检工单',
  '拆解工单',
]
