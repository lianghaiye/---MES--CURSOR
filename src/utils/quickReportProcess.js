import { buildProcessesFromRoute as buildRouteSteps } from '@/mock/processRoutes'
import { getProcessByName, resolveDefaultExecutors } from '@/store/processConfigStore'

/** 解析工序级良品/不良品，qty 为合计 */
export function resolveProcessQuantities(qtys = {}) {
  let goodQty = Math.max(0, Number(qtys.goodQty) || 0)
  let defectQty = Math.max(0, Number(qtys.defectQty) || 0)
  const legacyQty = Math.max(0, Number(qtys.qty) || 0)
  const finishedQty =
    qtys.finishedQty != null ? Math.max(0, Number(qtys.finishedQty) || 0) : goodQty + defectQty

  if (goodQty + defectQty <= 0 && legacyQty > 0) {
    return { goodQty: legacyQty, defectQty: 0, qty: legacyQty }
  }
  if (goodQty + defectQty <= 0 && finishedQty > 0) {
    return { goodQty: finishedQty, defectQty: 0, qty: finishedQty }
  }
  return { goodQty, defectQty, qty: goodQty + defectQty }
}

export function normalizeQuickReportProcess(partial = {}) {
  const qty = resolveProcessQuantities(partial)
  return {
    id: partial.id || `proc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    processConfigId: partial.processConfigId || '',
    name: partial.name || '',
    code: partial.code || '',
    goodQty: qty.goodQty,
    defectQty: qty.defectQty,
    qty: qty.qty,
    deleted: !!partial.deleted,
    manual: !!partial.manual,
    operators: partial.operators || [],
  }
}

/** 从工艺路线名称构建快速报工工序行 */
export function buildQuickReportProcessesFromRoute(routeName, qtys = {}) {
  const quantities = resolveProcessQuantities(qtys)
  const steps = buildRouteSteps(routeName)
  return steps.map((step, index) => {
    const proc = getProcessByName(step.name)
    const executors = step.executors?.length
      ? step.executors
      : resolveDefaultExecutors(proc)
    return normalizeQuickReportProcess({
      id: step.id || `proc-${index}-${Date.now()}`,
      processConfigId: step.processId || proc?.id || '',
      name: step.name,
      code: step.processCode || proc?.code || '',
      goodQty: quantities.goodQty,
      defectQty: quantities.defectQty,
      qty: quantities.qty,
      deleted: false,
      manual: false,
      operators: executors,
    })
  })
}
