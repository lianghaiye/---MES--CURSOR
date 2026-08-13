/**
 * 生产/总装工单 · 排产批次
 * 一张工单多个批次，每批独立数量与工序执行人
 */
import dayjs from 'dayjs'
import { syncWorkOrderExecutionStatus, isScheduleIncomplete } from '@/utils/workOrderStatus'

export function getWorkOrderPlanQty(wo) {
  return Math.max(0, Number(wo?.planQty) || 0)
}

export function getBatchesScheduledQty(wo) {
  const batches = wo?.scheduleBatches || []
  if (batches.length) {
    return batches.reduce((s, b) => s + Math.max(0, Number(b.qty) || 0), 0)
  }
  // 待下发且从未下发：创建时填写的 scheduleQty 不算「已排产」
  if (!wo?.dispatchedAt && (!wo?.status || wo.status === '待下发')) {
    return 0
  }
  return Math.max(0, Number(wo?.scheduleQty) || 0)
}

export function getRemainScheduleQty(wo) {
  return Math.max(0, getWorkOrderPlanQty(wo) - getBatchesScheduledQty(wo))
}

export function formatScheduleProgress(wo) {
  return `${getBatchesScheduledQty(wo)}/${getWorkOrderPlanQty(wo)}`
}

/** 排产未满计划（旁显用；不等于主状态） */
export function isPartialScheduled(wo) {
  return isScheduleIncomplete(wo)
}

/** 演示环境当前操作人 */
export function getWorkOrderOperatorName() {
  return 'admin1'
}

/** 编辑/下发等操作：写入更新时间、更新人（不含小程序报工完工） */
export function touchWorkOrderOperateUpdatedAt(workOrder, now = dayjs(), operator) {
  if (!workOrder) return
  workOrder.updatedAt = now.format('YYYY-MM-DD HH:mm:ss')
  workOrder.updater = operator || getWorkOrderOperatorName()
}

/**
 * 下发后回写工单执行主状态：
 * - 无已下发批次 → 待下发
 * - 已下发且无人领取 → 已下发
 * - 已有领取事实 → 执行中
 * 未排完不改 status（旁显）；暂停/终止/已完成不覆盖
 */
export function syncWorkOrderDispatchStatus(workOrder) {
  return syncWorkOrderExecutionStatus(workOrder)
}

export { isScheduleIncomplete }

function nextBatchId() {
  return `sb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** 从工单工序模板生成批次工序指派 */
export function buildBatchProcessAssignments(processes = []) {
  return (processes || []).map((p) => ({
    processId: p.id,
    processName: p.name || '',
    processCode: p.processCode || '',
    resourceType: p.resourceType || '工人',
    executors: Array.isArray(p.executors) ? [...p.executors] : [],
  }))
}

/**
 * 规范化工单排产批次字段；有批次时用合计回写 scheduleQty
 */
export function normalizeWorkOrderScheduleFields(wo) {
  if (!wo || typeof wo !== 'object') return wo
  if (!Array.isArray(wo.scheduleBatches)) wo.scheduleBatches = []
  if (wo.activeScheduleBatchId == null) {
    wo.activeScheduleBatchId = wo.scheduleBatches[0]?.id || ''
  }
  if (wo.scheduleBatches.length) {
    wo.scheduleQty = getBatchesScheduledQty(wo)
  }
  return wo
}

/**
 * @param {object} workOrder
 * @param {{ qty: number, processAssignments?: object[], dispatchNow?: boolean }} input
 */
export function createScheduleBatch(workOrder, input) {
  if (['暂停', '终止', '已完成', '完成'].includes(workOrder?.status) && input?.dispatchNow) {
    return { ok: false, message: '当前工单状态不可下发' }
  }
  const qty = Math.max(0, Number(input?.qty) || 0)
  if (qty <= 0) return { ok: false, message: '本批排产数量须大于 0' }
  const remain = getRemainScheduleQty(workOrder)
  if (qty > remain) {
    return { ok: false, message: `本批排产不可超过剩余可排 ${remain}` }
  }
  const assignments =
    input.processAssignments?.length > 0
      ? input.processAssignments.map((a) => ({
          processId: a.processId,
          processName: a.processName || '',
          processCode: a.processCode || '',
          resourceType: a.resourceType || '工人',
          executors: Array.isArray(a.executors) ? [...a.executors] : [],
        }))
      : buildBatchProcessAssignments(workOrder.processes)

  const missing = assignments.filter((a) => !a.executors?.length)
  if (input.dispatchNow && missing.length) {
    return {
      ok: false,
      message: `请为工序「${missing.map((a) => a.processName).join('、')}」选择本批执行人`,
    }
  }

  if (!Array.isArray(workOrder.scheduleBatches)) workOrder.scheduleBatches = []
  const batchNo = workOrder.scheduleBatches.length + 1
  const batch = {
    id: nextBatchId(),
    batchNo,
    qty,
    status: input.dispatchNow ? '执行中' : '待下发',
    processAssignments: assignments,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    dispatchedAt: input.dispatchNow ? dayjs().format('YYYY-MM-DD HH:mm') : '',
  }
  workOrder.scheduleBatches.push(batch)
  workOrder.activeScheduleBatchId = batch.id
  workOrder.scheduleQty = getBatchesScheduledQty(workOrder)

  if (input.dispatchNow) {
    if (!workOrder.dispatchedAt) {
      workOrder.dispatchedAt = dayjs().format('YYYY-MM-DD HH:mm')
    }
    applyBatchExecutorsToWorkOrderProcesses(workOrder, batch)
    syncWorkOrderDispatchStatus(workOrder)
    touchWorkOrderOperateUpdatedAt(workOrder)
  } else {
    touchWorkOrderOperateUpdatedAt(workOrder)
  }

  return { ok: true, batch }
}

/** 将批次执行人写回工单工序模板（便于下发 Tab / 兼容旧展示） */
export function applyBatchExecutorsToWorkOrderProcesses(workOrder, batch) {
  if (!workOrder?.processes?.length || !batch?.processAssignments?.length) return
  const map = new Map(batch.processAssignments.map((a) => [a.processId, a]))
  workOrder.processes.forEach((p) => {
    const a = map.get(p.id)
    if (a) p.executors = [...(a.executors || [])]
  })
}

export function dispatchScheduleBatch(workOrder, batchId) {
  if (['暂停', '终止', '已完成', '完成'].includes(workOrder?.status)) {
    return { ok: false, message: '当前工单状态不可下发' }
  }
  const batch = workOrder?.scheduleBatches?.find((b) => b.id === batchId)
  if (!batch) return { ok: false, message: '排产批次不存在' }
  if (batch.status !== '待下发') return { ok: false, message: '仅待下发批次可下发' }

  const missing = (batch.processAssignments || []).filter((a) => !a.executors?.length)
  if (missing.length) {
    return {
      ok: false,
      message: `请为工序「${missing.map((a) => a.processName).join('、')}」选择本批执行人`,
    }
  }

  batch.status = '执行中'
  batch.dispatchedAt = dayjs().format('YYYY-MM-DD HH:mm')
  workOrder.activeScheduleBatchId = batch.id
  if (!workOrder.dispatchedAt) {
    workOrder.dispatchedAt = dayjs().format('YYYY-MM-DD HH:mm')
  }
  applyBatchExecutorsToWorkOrderProcesses(workOrder, batch)
  syncWorkOrderDispatchStatus(workOrder)
  touchWorkOrderOperateUpdatedAt(workOrder)
  return { ok: true, batch }
}

export function removeScheduleBatch(workOrder, batchId) {
  const list = workOrder?.scheduleBatches || []
  const idx = list.findIndex((b) => b.id === batchId)
  if (idx === -1) return { ok: false, message: '排产批次不存在' }
  if (list[idx].status !== '待下发') {
    return { ok: false, message: '仅待下发批次可删除' }
  }
  list.splice(idx, 1)
  list.forEach((b, i) => {
    b.batchNo = i + 1
  })
  workOrder.scheduleQty = getBatchesScheduledQty(workOrder)
  if (workOrder.activeScheduleBatchId === batchId) {
    workOrder.activeScheduleBatchId = list[0]?.id || ''
  }
  return { ok: true }
}

export function getActiveScheduleBatch(workOrder) {
  const list = workOrder?.scheduleBatches || []
  if (!list.length) return null
  return list.find((b) => b.id === workOrder.activeScheduleBatchId) || list[list.length - 1]
}

export function batchStatusColor(status) {
  const map = {
    待下发: 'warning',
    已下发: 'processing',
    执行中: 'blue',
    完成: 'success',
    已完成: 'success',
  }
  return map[status] || 'default'
}
