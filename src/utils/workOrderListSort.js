/**
 * 生产/总装工单列表排序
 */

/** 操作更新时间：编辑/下发写入的 updatedAt；不含小程序报工完工 */
export function getWorkOrderOperateUpdatedAt(workOrder) {
  const raw = workOrder?.updatedAt || workOrder?.createdAt || ''
  const t = Date.parse(String(raw).replace(/-/g, '/'))
  return Number.isFinite(t) ? t : 0
}

/**
 * 按工单更新时间倒序（不再按状态优先）
 */
export function sortWorkOrdersForList(list) {
  return [...(list || [])].sort(
    (a, b) => getWorkOrderOperateUpdatedAt(b) - getWorkOrderOperateUpdatedAt(a),
  )
}
