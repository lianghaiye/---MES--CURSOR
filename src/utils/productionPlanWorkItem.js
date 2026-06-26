import { normalizeDeliveryMode } from '@/utils/salesDeliveryMode'

/** 计划数量默认：订单数量 − 库存数量，小于 0 取 0 */
export function calcDefaultPlanQty(orderQty, stockQty) {
  return Math.max(0, (Number(orderQty) || 0) - (Number(stockQty) || 0))
}

/** 演示用成品库存（无真实库存接口时） */
export function demoStockQty(orderQty, seed = 0) {
  const q = Number(orderQty) || 0
  if (q <= 0) return 0
  return Math.min(q, Math.floor(q * 0.35) + (seed % 3))
}

/**
 * 补齐 / 规范化工作项产品明细字段
 * @param {object} wi 工作项
 * @param {object|null} salesLine 销售明细（可选）
 * @param {number} index 行序号（用于演示库存）
 */
export function enrichWorkItem(wi, salesLine = null, index = 0) {
  const line = salesLine || wi
  const orderQty = Number(wi.orderQty ?? wi.salesQty ?? line.salesQty ?? line.qty ?? 0)
  const hasStock = wi.stockQty != null && wi.stockQty !== ''
  const stockQty = hasStock ? Number(wi.stockQty) : demoStockQty(orderQty, index)
  const hasPlan = wi.planQty != null && wi.planQty !== ''
  const planQty = hasPlan ? Number(wi.planQty) : calcDefaultPlanQty(orderQty, stockQty)

  return {
    ...wi,
    salesQty: orderQty,
    orderQty,
    deliveryMode: wi.deliveryMode || normalizeDeliveryMode(line, {}),
    shippedQty: Number(wi.shippedQty ?? line.shippedQty ?? line.issueQty ?? 0),
    stockQty,
    planQty,
    unit: wi.unit || line.unit || '件',
    techParams: wi.techParams ?? line.techParams ?? '',
    drawingNo: wi.drawingNo ?? line.drawingNo ?? '',
    material: wi.material ?? line.material ?? '',
    matchingRequirements: wi.matchingRequirements ?? line.matchingRequirements ?? line.remark ?? '',
    packagingForm: wi.packagingForm ?? line.packagingForm ?? '',
    specModel: wi.specModel ?? wi.model ?? line.specModel ?? '',
  }
}

export function normalizePlanWorkItems(plan) {
  plan.workItems?.forEach((wi, idx) => {
    Object.assign(wi, enrichWorkItem(wi, null, idx))
    if (wi.expanded == null) wi.expanded = idx === 0
  })
  return plan
}
