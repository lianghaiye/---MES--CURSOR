/** 销售订单状态（与采购订单对齐） */
export const SALES_ORDER_STATUS = {
  DRAFT: '待提交',
  PENDING: '待审核',
  REJECTED: '已拒绝',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  VOIDED: '已作废',
}

export const SALES_ORDER_STATUS_OPTIONS = [
  SALES_ORDER_STATUS.DRAFT,
  SALES_ORDER_STATUS.PENDING,
  SALES_ORDER_STATUS.REJECTED,
  SALES_ORDER_STATUS.IN_PROGRESS,
  SALES_ORDER_STATUS.COMPLETED,
  SALES_ORDER_STATUS.VOIDED,
]

const LEGACY_STATUS_MAP = {
  未审: SALES_ORDER_STATUS.PENDING,
  已审: SALES_ORDER_STATUS.IN_PROGRESS,
  已终止: SALES_ORDER_STATUS.VOIDED,
}

/** 旧状态 → 新状态 */
export function normalizeSalesOrderProgressStatus(status) {
  if (!status) return SALES_ORDER_STATUS.DRAFT
  return LEGACY_STATUS_MAP[status] || status
}

export function salesOrderStatusColor(status) {
  const map = {
    待提交: 'default',
    待审核: 'warning',
    已拒绝: 'error',
    进行中: 'processing',
    已完成: 'success',
    已作废: 'default',
  }
  return map[normalizeSalesOrderProgressStatus(status)] || 'default'
}

export function salesDeliveryStatusColor(status) {
  const map = {
    未发货: 'default',
    部分发货: 'processing',
    已发货: 'success',
    已签收: 'success',
  }
  return map[status] || 'default'
}

/** 已审核通过（进行中/已完成；兼容旧「已审」） */
export function isSalesOrderApproved(orderOrStatus) {
  const status = normalizeSalesOrderProgressStatus(
    typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.progressStatus,
  )
  return (
    status === SALES_ORDER_STATUS.IN_PROGRESS ||
    status === SALES_ORDER_STATUS.COMPLETED ||
    status === '已审'
  )
}
