/**
 * 工单工序扁平列表 ↔ 工艺路线网格（本单结构编辑用）
 * 不写回工艺路线主数据。
 */
import { listMobileTasksForWorkOrder } from '@/utils/workOrderStatus'
import { getProcessByName } from '@/store/processConfigStore'
import {
  buildWorkOrderProcessesFromGrid,
  createEmptyGrid,
  normalizeCompletionMode,
  normalizeGrid,
  syncStepPolicies,
  validateProcessRouteGrid,
} from '@/utils/processRouteGrid'

/** 待下发且尚未生成小程序任务时，允许改本单工序结构 */
export function canEditWorkOrderProcessStructure(workOrder) {
  if (!workOrder?.id) return false
  if (workOrder.status !== '待下发') return false
  return listMobileTasksForWorkOrder(workOrder.id).length === 0
}

/**
 * 本单 processes → 临时 grid + stepPolicies
 */
export function buildGridFromWorkOrderProcesses(processes, stepPolicies = null) {
  const list = Array.isArray(processes) ? processes.filter(Boolean) : []
  if (!list.length) {
    const grid = createEmptyGrid(3, 2)
    return { grid, stepPolicies: syncStepPolicies(grid, stepPolicies) }
  }

  let maxStep = 1
  let maxRow = 1
  for (const p of list) {
    const stepNo = Number(p.stepNo) > 0 ? Number(p.stepNo) : Number(p.index) || 1
    const rowNo = Number(p.rowNo) > 0 ? Number(p.rowNo) : 1
    maxStep = Math.max(maxStep, stepNo)
    maxRow = Math.max(maxRow, rowNo)
  }

  const grid = createEmptyGrid(maxStep, maxRow)
  for (const p of list) {
    const stepNo = Number(p.stepNo) > 0 ? Number(p.stepNo) : Number(p.index) || 1
    const rowNo = Number(p.rowNo) > 0 ? Number(p.rowNo) : 1
    const si = stepNo - 1
    const ri = rowNo - 1
    if (!grid[si]) continue
    const master = p.processId ? null : getProcessByName(p.name)
    const processId = p.processId || master?.id || ''
    if (processId || p.name) {
      grid[si][ri] = {
        processId,
        processName: p.name || master?.name || '',
        processFileId: p.processFileId || '',
        processFileName: p.processFileName || '',
      }
    }
  }

  const policiesFromRows = []
  const seen = new Set()
  for (const p of list) {
    const stepNo = Number(p.stepNo) > 0 ? Number(p.stepNo) : Number(p.index) || 1
    if (seen.has(stepNo)) continue
    seen.add(stepNo)
    policiesFromRows.push({
      stepNo,
      completionMode: normalizeCompletionMode(p.completionMode),
    })
  }

  const mergedPolicies = syncStepPolicies(
    grid,
    stepPolicies?.length ? stepPolicies : policiesFromRows,
  )
  return { grid: normalizeGrid(grid), stepPolicies: mergedPolicies }
}

const PRESERVE_KEYS = [
  'executors',
  'processContent',
  'includeInDispatch',
  'skipProcessOutsourceOnDispatch',
  'outsourceConfirmBeforeDispatch',
  'blankingMaterials',
  'feedingMaterials',
  'finishDate',
  'inspection',
  'remark',
  'outsourceStatus',
  'outsourceQty',
  'outsourcingOrderIds',
  'hasFeeding',
]

function matchKey(p) {
  const stepNo = Number(p?.stepNo) || 0
  const rowNo = Number(p?.rowNo) || 0
  const processId = p?.processId || ''
  return `${processId}::${stepNo}::${rowNo}`
}

function findPreviousProcess(prevList, nextProc) {
  if (!prevList?.length || !nextProc) return null
  const bySlot = prevList.find((p) => matchKey(p) === matchKey(nextProc))
  if (bySlot) return bySlot
  if (nextProc.id) {
    const byId = prevList.find((p) => p.id === nextProc.id)
    if (byId) return byId
  }
  if (nextProc.processId) {
    const sameId = prevList.filter((p) => p.processId === nextProc.processId)
    if (sameId.length === 1) return sameId[0]
  }
  return null
}

function mergePreservedFields(nextProc, prevProc) {
  if (!prevProc) return nextProc
  const merged = { ...nextProc }
  for (const key of PRESERVE_KEYS) {
    if (prevProc[key] !== undefined) {
      merged[key] = Array.isArray(prevProc[key])
        ? prevProc[key].map((x) => (x && typeof x === 'object' ? { ...x } : x))
        : prevProc[key]
    }
  }
  // 资源类型变化时清空执行人，避免工人/小组错配
  if (
    prevProc.resourceType &&
    nextProc.resourceType &&
    prevProc.resourceType !== nextProc.resourceType
  ) {
    merged.executors = nextProc.executors || []
  }
  return merged
}

/**
 * 将网格写回工单 processes + stepPolicies，并尽量保留派工字段
 * @returns {{ ok: boolean, message?: string }}
 */
export function applyGridToWorkOrder(workOrder, grid, stepPolicies) {
  if (!workOrder) return { ok: false, message: '工单无效' }
  const check = validateProcessRouteGrid(grid)
  if (!check.ok) return check

  const prev = Array.isArray(workOrder.processes) ? [...workOrder.processes] : []
  const routeId = workOrder.id || workOrder.code || 'wo'
  const policies = syncStepPolicies(grid, stepPolicies)
  let next = buildWorkOrderProcessesFromGrid(grid, routeId, policies)
  next = next.map((p) => mergePreservedFields(p, findPreviousProcess(prev, p)))

  workOrder.processes = next
  workOrder.stepPolicies = policies
  return { ok: true }
}
