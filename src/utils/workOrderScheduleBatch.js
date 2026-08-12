/**
 * 生产/总装工单 · 排产批次
 * 一张工单多个批次，每批独立数量与工序执行人
 */
import dayjs from 'dayjs'

export function getWorkOrderPlanQty(wo) {
  return Math.max(0, Number(wo?.planQty) || 0)
}

export function getBatchesScheduledQty(wo) {
  const batches = wo?.scheduleBatches || []
  if (!batches.length) return Math.max(0, Number(wo?.scheduleQty) || 0)
  return batches.reduce((s, b) => s + Math.max(0, Number(b.qty) || 0), 0)
}

export function getRemainScheduleQty(wo) {
  return Math.max(0, getWorkOrderPlanQty(wo) - getBatchesScheduledQty(wo))
}

export function formatScheduleProgress(wo) {
  return `${getBatchesScheduledQty(wo)}/${getWorkOrderPlanQty(wo)}`
}

export function isPartialScheduled(wo) {
  const plan = getWorkOrderPlanQty(wo)
  const scheduled = getBatchesScheduledQty(wo)
  return plan > 0 && scheduled > 0 && scheduled < plan
}

/** 编辑/下发操作时间；不含小程序报工完工 */
export function touchWorkOrderOperateUpdatedAt(workOrder, now = dayjs()) {
  if (!workOrder) return
  workOrder.updatedAt = now.format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 下发后回写工单状态：
 * - 尚无已下发批次 → 待下发
 * - 有已下发且仍有待下发批次或剩余可排 → 部分下发
 * - 已全部下发进入生产 → 执行中
 * 完成/暂停/终止不覆盖
 */
export function syncWorkOrderDispatchStatus(workOrder) {
  if (!workOrder) return workOrder
  const locked = ['完成', '已完成', '暂停', '终止']
  if (locked.includes(workOrder.status)) return workOrder

  const batches = workOrder.scheduleBatches || []
  if (!batches.length) return workOrder

  const hasDispatched = batches.some((b) => b.status && b.status !== '待下发')
  if (!hasDispatched) {
    workOrder.status = '待下发'
    return workOrder
  }

  const hasPendingBatch = batches.some((b) => b.status === '待下发')
  const remain = getRemainScheduleQty(workOrder)
  if (hasPendingBatch || remain > 0) {
    workOrder.status = '部分下发'
  } else {
    workOrder.status = '执行中'
  }
  return workOrder
}

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
  const qty = Math.max(0, Number(input?.qty) || 0)
  if (qty <= 0) return { ok: false, message: '本批排产数量须大于 0' }
  // 允许已排产 + 本批 > 计划数量（加急/超产）

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
    部分下发: 'processing',
    已下发: 'processing',
    执行中: 'blue',
    完成: 'success',
  }
  return map[status] || 'default'
}
