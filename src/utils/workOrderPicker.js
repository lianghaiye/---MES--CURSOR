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
  '质检工单',
  '拆解工单',
]
