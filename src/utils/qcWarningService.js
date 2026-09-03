import { QC_TASK_RESULT, QC_TASK_STATUS, listQcTasks } from '@/store/qcTaskStore'

const OPEN_QC_STATUSES = new Set([QC_TASK_STATUS.PENDING, QC_TASK_STATUS.IN_PROGRESS])
const FAIL_RESULTS = new Set([QC_TASK_RESULT.FAIL, QC_TASK_RESULT.PARTIAL, '不合格', '质检不通过'])

export function getProcessQcWarningForWorkOrderProcess(workOrder, processIndex) {
  const idx = Number(processIndex)
  if (!workOrder?.processes?.length || !Number.isFinite(idx)) return null

  const tasks = listQcTasks({ workOrderId: workOrder.id })
  if (!tasks.length && workOrder.orderNo) {
    tasks.push(...listQcTasks({}).filter((t) => t.workOrderNo === workOrder.orderNo))
  }

  const upstreamTasks = tasks.filter((t) => {
    const taskIdx = Number(t.processIndex)
    return Number.isFinite(taskIdx) && taskIdx < idx
  })

  const pending = upstreamTasks.filter((t) => OPEN_QC_STATUSES.has(t.qcStatus))
  if (pending.length) {
    return {
      level: 'warning',
      code: 'QC_PENDING',
      message: `上游工序质检待完成（${pending.map((t) => t.processName || t.processCode).join('、')}）`,
      tasks: pending,
    }
  }

  const failed = upstreamTasks.filter(
    (t) => t.qcStatus === QC_TASK_STATUS.COMPLETED && FAIL_RESULTS.has(t.qcResult),
  )
  if (failed.length) {
    return {
      level: 'error',
      code: 'QC_FAILED',
      message: `上游工序质检不合格（${failed.map((t) => t.processName || t.processCode).join('、')}）`,
      tasks: failed,
    }
  }

  return null
}

export function listWorkOrderQcWarnings(workOrder) {
  const warnings = []
  ;(workOrder?.processes || []).forEach((proc, i) => {
    const index = proc.index ?? i + 1
    const hit = getProcessQcWarningForWorkOrderProcess(workOrder, index)
    if (hit) {
      warnings.push({
        processIndex: index,
        processName: proc.name,
        ...hit,
      })
    }
  })
  return warnings
}
