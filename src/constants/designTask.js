/** 设计任务状态 */
export const DESIGN_TASK_STATUS = {
  PENDING: '待设计',
  DESIGNING: '设计中',
  PENDING_AUDIT: '待审核',
  APPROVED: '审核通过',
  REJECTED: '已驳回',
  VOIDED: '已作废',
}

/** 设计任务来源 */
export const DESIGN_TASK_SOURCE = {
  SALES_ORDER: '销售订单',
  MANUAL: '手工新增',
  SHIP_ACCESSORY: '随货配件',
}

/**
 * 任务类型
 * - full：整机/定制设计（出图、审 EBOM）
 * - bom_only：轻类型，仅为配件/SKU 补齐并启用产品 BOM
 */
export const DESIGN_TASK_KIND = {
  FULL: 'full',
  BOM_ONLY: 'bom_only',
}

/** 需自动生成设计任务的产品属性 */
export const CUSTOM_PRODUCT_ATTRIBUTES = ['定制产品', '定制-成品零部件']

export function isCustomProductAttribute(attr) {
  return CUSTOM_PRODUCT_ATTRIBUTES.includes(attr)
}

export function isBomOnlyDesignTask(task) {
  return task?.taskKind === DESIGN_TASK_KIND.BOM_ONLY
}

export function designTaskStatusColor(status) {
  const map = {
    待设计: 'orange',
    设计中: 'gold',
    待审核: 'processing',
    审核通过: 'success',
    已驳回: 'error',
    已作废: 'default',
  }
  return map[status] || 'default'
}

/** 列表展示用来源文案 */
export function designTaskSourceLabel(source) {
  if (source === DESIGN_TASK_SOURCE.SALES_ORDER) return '销售订单'
  if (source === DESIGN_TASK_SOURCE.MANUAL) return '新增'
  if (source === DESIGN_TASK_SOURCE.SHIP_ACCESSORY) return '随货配件'
  return source || '—'
}

export function designTaskKindLabel(kind) {
  if (kind === DESIGN_TASK_KIND.BOM_ONLY) return '补BOM'
  return '设计'
}
