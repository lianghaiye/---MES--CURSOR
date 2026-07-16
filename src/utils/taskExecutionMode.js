import { normalizeReportMode } from '@/utils/reportMode'

export const TASK_EXECUTION_MODES = [
  { value: 'single_claim', label: '单人领工' },
  { value: 'collaborative', label: '多人协作' },
]

export const DEFAULT_TASK_EXECUTION_MODE = 'single_claim'

export function normalizeTaskExecutionMode(mode) {
  return mode === 'collaborative' ? 'collaborative' : 'single_claim'
}

export function isCollaborativeExecutionMode(mode) {
  return normalizeTaskExecutionMode(mode) === 'collaborative'
}

export function resolveProcessExecutionMode(process) {
  if (!process) return DEFAULT_TASK_EXECUTION_MODE
  return normalizeTaskExecutionMode(process.taskExecutionMode)
}

/** 是否应按执行人数拆分为多条协作任务 */
export function shouldSplitCollaborativeTasks(process) {
  if (!process) return false
  if (resolveProcessExecutionMode(process) !== 'collaborative') return false
  if (process.resourceType && process.resourceType !== '工人') return false
  if (normalizeReportMode(process.reportMode) !== '时长报工') return false
  return (process.executors || []).length > 1
}

export function buildTaskGroupId(workOrderId, processSeq) {
  return `tg-${workOrderId}-${processSeq}`
}

export function buildCollaborativeTaskId(workOrderId, processSeq, slot) {
  return `mt-${workOrderId}-${processSeq}-${String(slot).padStart(2, '0')}`
}

export function buildCollaborativeTaskNo(dateStr, processSeq, slot) {
  return `T${dateStr}${String(processSeq).padStart(3, '0')}-${String(slot).padStart(2, '0')}`
}

export function buildStandardTaskId(workOrderId, processSeq) {
  return `mt-${workOrderId}-${processSeq}`
}

export function buildStandardTaskNo(dateStr, processSeq) {
  return `T${dateStr}${String(processSeq).padStart(3, '0')}`
}

export function getTaskExecutionModeLabel(mode) {
  return (
    TASK_EXECUTION_MODES.find((item) => item.value === normalizeTaskExecutionMode(mode))?.label ||
    '单人领工'
  )
}

export function estimateTaskCountForProcess(process) {
  const executors = process?.executors || []
  if (shouldSplitCollaborativeTasks(process)) return executors.length
  return 1
}
