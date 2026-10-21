/** 返工单状态与来源 */

export const REWORK_ORDER_STATUS = {
  PENDING: '待返工',
  IN_PROGRESS: '返工中',
  DONE: '已完成',
  CLOSED: '已关闭',
}

export const REWORK_ORDER_SOURCE = {
  PROCESS_QC: '过程检',
  FINISHED_QC: '成品检',
  WORKSHOP_WEB: '车间Web',
  WORKSHOP_MOBILE: '车间小程序',
}

export function reworkOrderStatusColor(status) {
  const map = {
    待返工: 'orange',
    返工中: 'processing',
    已完成: 'success',
    已关闭: 'default',
  }
  return map[status] || 'default'
}

export function isReworkOrderOpen(status) {
  return status === REWORK_ORDER_STATUS.PENDING || status === REWORK_ORDER_STATUS.IN_PROGRESS
}

/**
 * 返工任务展示态：与生产工单排产任务一致（待领取 / 待报工 / 已报工 / 暂停 / 已终止）
 * 不展示工序报工/工时的待审核、已审核、已拒绝
 */
export function resolveReworkTaskStatus(task = {}, options = {}) {
  const status = String(task.status || '')
  const taskStatus = String(task.taskStatus || '')
  const closed = Boolean(options.orderClosed)
  const reportedQty = Number(task.goodQty || task.reportedGoodQty || task.doneQty) || 0
  const targetQty = Number(task.targetQty ?? task.scheduleQty ?? task.qty) || 0

  if (
    taskStatus === '已终止' ||
    status === '已终止' ||
    status === '已取消' ||
    taskStatus === '已取消'
  ) {
    return '已终止'
  }
  if (closed && reportedQty <= 0) return '已终止'
  if (task.controlStatus === '暂停' && taskStatus !== '已完成' && status !== '已审核') {
    return '暂停'
  }
  if (taskStatus === '待领取' || status === '待领取') return '待领取'
  if (
    taskStatus === '已完成' ||
    taskStatus === '已报工' ||
    status === '待审核' ||
    status === '已审核' ||
    status === '已拒绝' ||
    reportedQty > 0 ||
    (targetQty > 0 && reportedQty + 1e-9 >= targetQty)
  ) {
    return '已报工'
  }
  if (['待报工', '待开始', '执行中'].includes(taskStatus) || status === '待报工') {
    return '待报工'
  }
  return '待报工'
}
