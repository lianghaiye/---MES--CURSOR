/**
 * 生产/总装工单列表排序
 */

/** 列表状态优先级：数值越小越靠前 */
export const WORK_ORDER_STATUS_SORT_RANK = {
  待下发: 0,
  部分下发: 1,
  已下发: 1,
  执行中: 2,
  完成: 3,
  已完成: 3,
  暂停: 4,
  终止: 5,
}

export function getWorkOrderStatusSortRank(status) {
  if (status == null || status === '') return 99
  return WORK_ORDER_STATUS_SORT_RANK[status] ?? 99
}

/** 操作更新时间：编辑/下发写入的 updatedAt；不含小程序报工完工 */
export function getWorkOrderOperateUpdatedAt(workOrder) {
  const raw = workOrder?.updatedAt || workOrder?.createdAt || ''
  const t = Date.parse(String(raw).replace(/-/g, '/'))
  return Number.isFinite(t) ? t : 0
}

/**
 * 按状态优先级 + 操作更新时间倒序
 */
export function sortWorkOrdersForList(list) {
  return [...(list || [])].sort((a, b) => {
    const ra = getWorkOrderStatusSortRank(a?.status)
    const rb = getWorkOrderStatusSortRank(b?.status)
    if (ra !== rb) return ra - rb
    return getWorkOrderOperateUpdatedAt(b) - getWorkOrderOperateUpdatedAt(a)
  })
}
