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

export function flattenGridToSteps(grid) {
  const result = []
  ;(grid || []).forEach((stepRows, stepIndex) => {
    ;(stepRows || []).forEach((cell, rowIndex) => {
      if (!cell?.processId) return
      const proc = getProcessById(cell.processId)
      const doc = cell.processFileId ? getProcessDocById(cell.processFileId) : null
      result.push({
        stepNo: stepIndex + 1,
        rowNo: rowIndex + 1,
        colNo: stepIndex + 1,
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
export function buildWorkOrderProcessesFromGrid(grid, routeId = '') {
  const flat = flattenGridToSteps(grid)
  return flat.map((step, index) => ({
    id: `${routeId}-step-${step.stepNo}-${step.rowNo}`,
    index: index + 1,
    stepNo: step.stepNo,
    rowNo: step.rowNo,
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
