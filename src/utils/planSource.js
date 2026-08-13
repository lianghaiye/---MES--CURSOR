/** 生产计划来源（轻量常量，避免拉起补货/在途等重依赖） */
export const PLAN_SOURCE = {
  SALES_ORDER: 'sales-order',
  STOCK_REPLENISH: 'stock-replenish',
  MANUAL: 'manual',
}

export const PLAN_SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: PLAN_SOURCE.SALES_ORDER, label: '销售订单' },
  { value: PLAN_SOURCE.STOCK_REPLENISH, label: '库存补货' },
  { value: PLAN_SOURCE.MANUAL, label: '手工' },
]

export function planSourceLabel(source) {
  const hit = PLAN_SOURCE_OPTIONS.find((o) => o.value && o.value === source)
  return hit?.label || '销售订单'
}
