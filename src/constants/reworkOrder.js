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

/** 工单无真实排产批次时的占位 id，保证单据上仍能展示「批次 #1」 */
export function fallbackScheduleBatchId(workOrderId) {
  return workOrderId ? `sb-fallback-${workOrderId}` : ''
}

export function formatScheduleBatchLabel(batchOrNo) {
  const no =
    batchOrNo && typeof batchOrNo === 'object'
      ? (batchOrNo.batchNo ?? batchOrNo.scheduleBatchNo)
      : batchOrNo
  if (no === undefined || no === null || String(no).trim() === '') return '—'
  return `批次 #${no}`
}

/** 发起返工可选批次：有真实排产批次用真实；否则合成一批（整单数量） */
export function listReworkableScheduleBatches(wo) {
  const real = Array.isArray(wo?.scheduleBatches) ? wo.scheduleBatches.filter(Boolean) : []
  if (real.length) return real
  const qty = Number(wo?.scheduleQty) || Number(wo?.planQty) || 0
  return [
    {
      id: fallbackScheduleBatchId(wo?.id),
      batchNo: 1,
      qty,
      status: wo?.status || '',
      synthetic: true,
    },
  ]
}

export function resolveReworkScheduleBatch(wo, payload = {}) {
  const batches = listReworkableScheduleBatches(wo)
  const id = String(payload.scheduleBatchId || '').trim()
  const no = payload.scheduleBatchNo
  if (id) {
    const hit = batches.find((b) => String(b.id) === id)
    if (hit) return hit
  }
  if (no !== undefined && no !== null && String(no).trim() !== '') {
    const hit = batches.find((b) => String(b.batchNo) === String(no))
    if (hit) return hit
  }
  if (batches.length === 1) return batches[0]
  return null
}

/** 排产「返工数」按批次对齐；历史单据无批次时记到第一批 */
export function reworkOrderMatchesScheduleBatch(order, scheduleBatchId, batches = []) {
  const targetId = String(scheduleBatchId || '').trim()
  if (!targetId) return true
  const orderId = String(order?.scheduleBatchId || '').trim()
  if (orderId) return orderId === targetId
  return String(batches[0]?.id || '') === targetId
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
