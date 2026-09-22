import {
  getProcessById,
  getOperationLabels,
  resolveDefaultExecutors,
} from '@/store/processConfigStore'
import { normalizeReportMode } from '@/utils/reportMode'
import { normalizeTaskExecutionMode } from '@/utils/taskExecutionMode'
import { getProcessDocById } from '@/store/processDocStore'
import { createEmptyWorkOrderProcessExtras } from '@/utils/workOrderProcessDisplay'

export const MAX_ROUTE_STEPS = 150
export const MAX_ROUTE_PARALLEL = 50

/** 步骤完成方式：全部完成 | 选做完成 */
export const COMPLETION_MODE_ALL = 'all'
export const COMPLETION_MODE_ANY = 'any'
export const COMPLETION_MODE_OPTIONS = [
  { value: COMPLETION_MODE_ALL, label: '全部完成' },
  { value: COMPLETION_MODE_ANY, label: '选做完成' },
]

export function normalizeCompletionMode(mode) {
  return mode === COMPLETION_MODE_ANY ? COMPLETION_MODE_ANY : COMPLETION_MODE_ALL
}

export function formatCompletionModeLabel(mode) {
  return normalizeCompletionMode(mode) === COMPLETION_MODE_ANY ? '选做完成' : '全部完成'
}

/** 按网格列数对齐 stepPolicies，缺省为全部完成 */
export function syncStepPolicies(grid, policies) {
  const g = normalizeGrid(grid)
  const prev = Array.isArray(policies) ? policies : []
  return g.map((_, i) => {
    const stepNo = i + 1
    const found = prev.find((p) => Number(p?.stepNo) === stepNo) || prev[i]
    return {
      stepNo,
      completionMode: normalizeCompletionMode(found?.completionMode),
    }
  })
}

export function getCompletionModeAt(policies, stepIndex) {
  const stepNo = Number(stepIndex) + 1
  const found =
    (policies || []).find((p) => Number(p?.stepNo) === stepNo) || (policies || [])[stepIndex]
  return normalizeCompletionMode(found?.completionMode)
}

export function insertStepPolicyAfter(policies, afterIndex) {
  const list = (policies || []).map((p, i) => ({
    stepNo: i + 1,
    completionMode: normalizeCompletionMode(p?.completionMode),
  }))
  const idx = Math.max(-1, Math.min(Number(afterIndex), list.length - 1))
  list.splice(idx + 1, 0, { stepNo: 0, completionMode: COMPLETION_MODE_ALL })
  return list.map((p, i) => ({
    stepNo: i + 1,
    completionMode: normalizeCompletionMode(p.completionMode),
  }))
}

export function removeStepPolicyAt(policies, index) {
  const list = (policies || []).map((p, i) => ({
    stepNo: i + 1,
    completionMode: normalizeCompletionMode(p?.completionMode),
  }))
  const idx = Number(index)
  if (idx < 0 || idx >= list.length || list.length <= 1) {
    return list
  }
  list.splice(idx, 1)
  return list.map((p, i) => ({
    stepNo: i + 1,
    completionMode: normalizeCompletionMode(p.completionMode),
  }))
}

/** 某步有效工序数 */
export function countProcessesInStep(grid, stepIndex) {
  return (grid?.[stepIndex] || []).filter((cell) => cell?.processId).length
}

/** 网格：steps[stepIndex].rows[rowIndex] = cell | null */
export function createEmptyGrid(stepCount = 9, rowCount = 2) {
  return Array.from({ length: stepCount }, () => Array.from({ length: rowCount }, () => null))
}

export function normalizeGrid(grid) {
  if (!Array.isArray(grid) || !grid.length) {
    return createEmptyGrid()
  }
  return grid.map((step) =>
    Array.isArray(step) ? step.map((cell) => (cell ? { ...cell } : null)) : [],
  )
}

/** 在 afterIndex（0-based）之后插入一列空步；afterIndex === -1 插到最前 */
export function insertStepAfter(grid, afterIndex) {
  const g = normalizeGrid(grid)
  const rows = Math.max(1, g[0]?.length || 1)
  if (g.length >= MAX_ROUTE_STEPS) return g
  const empty = Array.from({ length: rows }, () => null)
  const idx = Math.max(-1, Math.min(Number(afterIndex), g.length - 1))
  g.splice(idx + 1, 0, empty)
  return g
}

/** 在每步的 afterIndex 之后插入空行；afterIndex === -1 插到最上 */
export function insertRowAfter(grid, afterIndex) {
  const g = normalizeGrid(grid)
  const rows = Math.max(1, g[0]?.length || 1)
  if (rows >= MAX_ROUTE_PARALLEL) return g
  const idx = Math.max(-1, Math.min(Number(afterIndex), rows - 1))
  g.forEach((step) => {
    step.splice(idx + 1, 0, null)
  })
  return g
}

/** 删除指定步（列）；至少保留 1 步 */
export function removeStepAt(grid, index) {
  const g = normalizeGrid(grid)
  if (g.length <= 1) return g
  const idx = Number(index)
  if (idx < 0 || idx >= g.length) return g
  g.splice(idx, 1)
  return g
}

/** 删除指定行；至少保留 1 行 */
export function removeRowAt(grid, index) {
  const g = normalizeGrid(grid)
  const rows = Math.max(1, g[0]?.length || 1)
  if (rows <= 1) return g
  const idx = Number(index)
  if (idx < 0 || idx >= rows) return g
  g.forEach((step) => {
    step.splice(idx, 1)
  })
  return g
}

export function countGridSteps(grid) {
  return (grid || []).filter((step) => step?.some((cell) => cell?.processId)).length
}

export function countGridParallel(grid) {
  let max = 0
  for (const step of grid || []) {
    const n = (step || []).filter((cell) => cell?.processId).length
    max = Math.max(max, n)
  }
  return max
}

export function validateProcessRouteGrid(grid) {
  const steps = countGridSteps(grid)
  const parallel = countGridParallel(grid)
  if (steps > MAX_ROUTE_STEPS) {
    return { ok: false, message: `工序步数不能超过 ${MAX_ROUTE_STEPS}` }
  }
  if (parallel > MAX_ROUTE_PARALLEL) {
    return { ok: false, message: `并行工序数不能超过 ${MAX_ROUTE_PARALLEL}` }
  }
  if (steps === 0) {
    return { ok: false, message: '请至少配置一个工序步骤' }
  }
  return { ok: true }
}

export function flattenGridToSteps(grid, stepPolicies = null) {
  const policies = syncStepPolicies(grid, stepPolicies)
  const modeByStep = new Map(policies.map((p) => [p.stepNo, p.completionMode]))
  const result = []
  ;(grid || []).forEach((stepRows, stepIndex) => {
    ;(stepRows || []).forEach((cell, rowIndex) => {
      if (!cell?.processId) return
      const proc = getProcessById(cell.processId)
      const doc = cell.processFileId ? getProcessDocById(cell.processFileId) : null
      const stepNo = stepIndex + 1
      result.push({
        stepNo,
        rowNo: rowIndex + 1,
        colNo: stepIndex + 1,
        completionMode: modeByStep.get(stepNo) || COMPLETION_MODE_ALL,
        processId: cell.processId,
        processCode: proc?.code || '',
        name: proc?.name || cell.processName || '',
        icon: proc?.icon || 'ToolOutlined',
        hasFeeding: Boolean(proc?.operations?.opFeeding || proc?.hasFeeding),
        isBlanking: Boolean(proc?.isBlanking),
        opOutsource: Boolean(proc?.operations?.opOutsource),
        resourceType: proc?.resourceType || '工人',
        reportMode: normalizeReportMode(proc?.reportMode),
        taskExecutionMode: normalizeTaskExecutionMode(proc?.taskExecutionMode),
        processFileId: cell.processFileId || '',
        processFileName: doc?.name || cell.processFileName || '',
      })
    })
  })
  return result.sort((a, b) => a.stepNo - b.stepNo || a.rowNo - b.rowNo)
}

/** 转为工单工序结构 */
export function buildWorkOrderProcessesFromGrid(grid, routeId = '', stepPolicies = null) {
  const policies = syncStepPolicies(grid, stepPolicies)
  const flat = flattenGridToSteps(grid, policies)
  return flat.map((step, index) => ({
    id: `${routeId}-step-${step.stepNo}-${step.rowNo}`,
    index: index + 1,
    stepNo: step.stepNo,
    rowNo: step.rowNo,
    completionMode: step.completionMode || COMPLETION_MODE_ALL,
    includeInDispatch: true,
    name: step.name,
    processCode: step.processCode,
    processId: step.processId,
    icon: step.icon,
    hasFeeding: step.hasFeeding,
    isBlanking: Boolean(step.isBlanking),
    resourceType: step.resourceType,
    reportMode: step.reportMode || '',
    taskExecutionMode: step.taskExecutionMode || 'single_claim',
    processFileId: step.processFileId,
    processFileName: step.processFileName,
    executors: resolveDefaultExecutors(getProcessById(step.processId)),
    ...createEmptyWorkOrderProcessExtras(),
    opOutsource: Boolean(step.opOutsource),
    feedingMaterials: step.hasFeeding
      ? [{ id: `feed-${Date.now()}-${index}`, materialId: undefined, materialName: '', qty: null }]
      : [],
  }))
}

/** 下发页：需要勾选的「选做完成」步（工序数 ≥ 2） */
export function listAnyCompletionSteps(processes) {
  const byStep = new Map()
  for (const p of processes || []) {
    const stepNo = Number(p.stepNo)
    if (!Number.isFinite(stepNo) || stepNo < 1) continue
    if (!byStep.has(stepNo)) byStep.set(stepNo, [])
    byStep.get(stepNo).push(p)
  }
  const groups = []
  for (const [stepNo, list] of byStep) {
    const mode = normalizeCompletionMode(list[0]?.completionMode)
    if (mode === COMPLETION_MODE_ANY && list.length >= 2) {
      groups.push({ stepNo, processes: list })
    }
  }
  return groups.sort((a, b) => a.stepNo - b.stepNo)
}

export function validateDispatchProcessSelection(processes) {
  for (const group of listAnyCompletionSteps(processes)) {
    const selected = group.processes.filter((p) => p.includeInDispatch !== false)
    if (!selected.length) {
      return {
        ok: false,
        message: `第 ${group.stepNo} 步为选做完成，请至少选择一道工序`,
      }
    }
  }
  return { ok: true }
}

/** 下发时过滤：选做步仅保留勾选项；全部完成步全留 */
export function applyDispatchProcessFilter(processes) {
  const anyStepNos = new Set(listAnyCompletionSteps(processes).map((g) => g.stepNo))
  const filtered = (processes || []).filter((p) => {
    const stepNo = Number(p.stepNo)
    if (!anyStepNos.has(stepNo)) return true
    return p.includeInDispatch !== false
  })
  return filtered.map((p, index) => ({
    ...p,
    index: index + 1,
    includeInDispatch: true,
  }))
}

export function getSelectedCellMeta(grid, stepIndex, rowIndex) {
  const cell = grid?.[stepIndex]?.[rowIndex]
  if (!cell?.processId) return null
  const proc = getProcessById(cell.processId)
  const configLabels = [...(proc?.isBlanking ? ['下料'] : []), ...getOperationLabels(proc)]
  return {
    stepNo: stepIndex + 1,
    rowNo: rowIndex + 1,
    colNo: stepIndex + 1,
    processName: proc?.name || cell.processName || '',
    processCode: proc?.code || '',
    processId: cell.processId,
    processFileId: cell.processFileId || undefined,
    resourceType: proc?.resourceType || '',
    reportMode: proc?.reportMode || '',
    isBlanking: Boolean(proc?.isBlanking),
    configLabels,
  }
}

/** 列表/详情展示用 */
export function formatApplyScopeLabel(scope) {
  const map = {
    全部产品: '全局',
    单个物品: '单产品',
    物品类别: '产品类别',
  }
  return map[scope] || scope || '—'
}
