import dayjs from 'dayjs'

/** 生产工单操作日志：追加一条 */
export function appendWorkOrderOperationLog(workOrder, entry = {}) {
  if (!workOrder) return null
  if (!Array.isArray(workOrder.operationLogs)) workOrder.operationLogs = []
  const row = {
    id: `wol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: entry.action || '操作',
    operator: entry.operator || '系统',
    operatedAt: entry.operatedAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    remark: entry.remark || '',
  }
  workOrder.operationLogs.unshift(row)
  return row
}

export function ensureWorkOrderOperationLogs(workOrder) {
  if (!workOrder) return []
  if (!Array.isArray(workOrder.operationLogs)) workOrder.operationLogs = []
  return workOrder.operationLogs
}
