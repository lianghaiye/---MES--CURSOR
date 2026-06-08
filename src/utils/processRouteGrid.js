import { getProcessById } from '@/store/processConfigStore'
import { getProcessDocById } from '@/store/processDocStore'

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
        hasFeeding: proc?.hasFeeding || false,
        resourceType: proc?.resourceType || '工人',
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
    resourceType: step.resourceType,
    processFileId: step.processFileId,
    processFileName: step.processFileName,
    executors: [],
    feedingMaterials: step.hasFeeding
      ? [{ id: `feed-${Date.now()}-${index}`, materialId: undefined, materialName: '', qty: null }]
      : [],
  }))
}

export function getSelectedCellMeta(grid, stepIndex, rowIndex) {
  const cell = grid?.[stepIndex]?.[rowIndex]
  if (!cell?.processId) return null
  const proc = getProcessById(cell.processId)
  return {
    stepNo: stepIndex + 1,
    rowNo: rowIndex + 1,
    colNo: stepIndex + 1,
    processName: proc?.name || '',
    processId: cell.processId,
    processFileId: cell.processFileId || undefined,
  }
}
