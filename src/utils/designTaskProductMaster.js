import { DESIGN_TASK_SOURCE } from '@/constants/designTask'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'

/**
 * 设计任务是否关联产品库主数据（含变体 SKU；非销售手工行）
 * 物料库命中亦视为有主数据（本期回写产品 BOM 仍以产品 SKU 为主）
 */
export function designTaskHasProductMaster(task) {
  if (!task?.productId) return false
  if (task.isManualLine === true) return false

  const inProduct = productInfoState.products.some((p) => String(p.id) === String(task.productId))
  const inMaterial = materialInfoState.materials.some(
    (m) => String(m.id) === String(task.productId),
  )
  if (!inProduct && !inMaterial) return false

  if (task.source === DESIGN_TASK_SOURCE.SALES_ORDER && task.salesOrderNo && task.salesLineId) {
    const order = findSalesOrderByOrderNo(task.salesOrderNo)
    const line = order?.lineItems?.find((l) => l.id === task.salesLineId)
    if (line?.isManualLine) return false
  }
  return true
}

/** 是否可回写「产品 BOM」（产品库中的普通产品或变体 SKU） */
export function designTaskCanPublishProductBom(task) {
  if (!designTaskHasProductMaster(task)) return false
  return productInfoState.products.some((p) => String(p.id) === String(task.productId))
}
