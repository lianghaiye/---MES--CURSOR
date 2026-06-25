/** 设计任务状态 */
export const DESIGN_TASK_STATUS = {
  PENDING: '待设计',
  DESIGNING: '设计中',
  PENDING_AUDIT: '待审核',
  APPROVED: '审核通过',
  REJECTED: '已驳回',
}

/** 设计任务来源 */
export const DESIGN_TASK_SOURCE = {
  SALES_ORDER: '销售订单',
  MANUAL: '手工新增',
}

/** 需自动生成设计任务的产品属性 */
export const CUSTOM_PRODUCT_ATTRIBUTES = ['定制产品', '定制-成品零部件']

export function isCustomProductAttribute(attr) {
  return CUSTOM_PRODUCT_ATTRIBUTES.includes(attr)
}

export function designTaskStatusColor(status) {
  const map = {
    待设计: 'orange',
    设计中: 'gold',
    待审核: 'processing',
    审核通过: 'success',
    已驳回: 'error',
  }
  return map[status] || 'default'
}

/** 列表展示用来源文案 */
export function designTaskSourceLabel(source) {
  if (source === DESIGN_TASK_SOURCE.SALES_ORDER) return '销售订单'
  if (source === DESIGN_TASK_SOURCE.MANUAL) return '新增'
  return source || '—'
}
