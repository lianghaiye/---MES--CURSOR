import { getWorkOrders } from '@/store/workOrderStore'

export const PRODUCTION_QC_SCOPES = new Set(['生产过程检', '成品检'])

export function isProductionQcScope(scope) {
  return PRODUCTION_QC_SCOPES.has(scope)
}

function matchWorkOrder(task, order) {
  if (!task || !order) return false
  if (task.workOrderId && order.id === task.workOrderId) return true
  const nos = [task.workOrderNo, task.sourceDocNo]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  if (!nos.length) return false
  const code = String(order.code || order.orderNo || '').trim()
  return Boolean(code && nos.includes(code))
}

/** 过程检 / 成品检抬头：优先单据快照，缺省回落来源工单，排产数量再回落行数量 */
export function resolveProductionQcHeader(task) {
  const empty = {
    workOrderNo: '',
    processName: '',
    workCenter: '',
    processRoute: '',
    scheduleQty: '',
    scheduleBatch: '',
  }
  if (!task) return empty
  const wo = (getWorkOrders() || []).find((order) => matchWorkOrder(task, order))
  const lineQty = (task.lineItems || []).reduce(
    (sum, line) => sum + (Number(line.scheduleQty ?? line.receiptQty) || 0),
    0,
  )
  const explicitQty = task.scheduleQty
  const woQty = wo?.scheduleQty
  const scheduleQty =
    explicitQty !== undefined && explicitQty !== null && explicitQty !== ''
      ? explicitQty
      : woQty !== undefined && woQty !== null && Number(woQty) > 0
        ? woQty
        : lineQty || ''
  return {
    workOrderNo: task.workOrderNo || task.sourceDocNo || wo?.code || wo?.orderNo || '',
    processName: task.processName || task.processCode || '',
    workCenter: task.workCenter || wo?.workCenter || '',
    processRoute: task.processRouteName || task.processRoute || wo?.processRouteName || '',
    scheduleQty,
    scheduleBatch:
      task.scheduleBatchNo !== undefined &&
      task.scheduleBatchNo !== null &&
      task.scheduleBatchNo !== ''
        ? String(task.scheduleBatchNo)
        : '',
  }
}
