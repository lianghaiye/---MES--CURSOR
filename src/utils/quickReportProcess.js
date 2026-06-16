import { buildProcessesFromRoute as buildRouteSteps } from '@/mock/processRoutes'
import { getProcessByName, resolveDefaultExecutors } from '@/store/processConfigStore'
import { resolveDefectItemsByIds } from '@/store/defectItemStore'
import { breakdownToLegacy, ensureDefectBreakdown } from '@/utils/defectBreakdown'
import {
  createScheduledProcessQuantities,
  resolveScheduleQty,
} from '@/utils/processReportQuantities'
import { isDurationReportMode, resolveReportMode } from '@/utils/reportMode'
import dayjs from 'dayjs'

function defaultProcessTimes() {
  const t = dayjs().format('HH:mm')
  return { startTime: t, endTime: t }
}

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

function getProcessDefectItems(processName) {
  const proc = getProcessByName(processName)
  if (!proc?.defectItemIds?.length) return []
  return resolveDefectItemsByIds(proc.defectItemIds)
}

export function normalizeQuickReportProcess(partial = {}) {
  const qty = resolveProcessQuantities(partial)
  const proc = getProcessByName(partial.name)
  const reportMode = resolveReportMode(partial.reportMode || partial.reportType || proc?.reportMode)
  const duration = isDurationReportMode(reportMode)
  const times = defaultProcessTimes()
  const items = getProcessDefectItems(partial.name)
  const defectBreakdown = ensureDefectBreakdown(partial, items)
  const legacy = breakdownToLegacy(defectBreakdown)
  const operators = partial.operators?.length ? [partial.operators[0]] : []
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
    operators,
    reportMode,
    workHours: duration ? Number(partial.workHours) || 0 : null,
    startTime: duration ? partial.startTime || times.startTime : '',
    endTime: duration ? partial.endTime || times.endTime : '',
    scheduleQty: partial.scheduleQty ?? qty.goodQty,
    subsidyReportQty: Number(partial.subsidyReportQty) || 0,
    subsidyHours: Number(partial.subsidyHours) || 0,
    subsidyReason: partial.subsidyReason || '',
    ...legacy,
  }
}

/** 从工艺路线名称构建快速报工工序行 */
export function buildQuickReportProcessesFromRoute(routeName, qtys = {}) {
  const scheduleQty = resolveScheduleQty(qtys)
  const useScheduleDefault =
    qtys.useScheduleDefault !== false && scheduleQty > 0 && qtys.scheduleQty != null
  const quantities = useScheduleDefault
    ? createScheduledProcessQuantities(scheduleQty)
    : resolveProcessQuantities(qtys)
  const steps = buildRouteSteps(routeName)
  return steps.map((step, index) => {
    const proc = getProcessByName(step.name)
    const executors = step.executors?.length ? step.executors : resolveDefaultExecutors(proc)
    return normalizeQuickReportProcess({
      id: step.id || `proc-${index}-${Date.now()}`,
      processConfigId: step.processId || proc?.id || '',
      name: step.name,
      code: step.processCode || proc?.code || '',
      reportMode: proc?.reportMode || '',
      goodQty: quantities.goodQty,
      defectQty: quantities.defectQty,
      qty: quantities.qty,
      scheduleQty: useScheduleDefault ? scheduleQty : quantities.goodQty,
      deleted: false,
      manual: false,
      operators: executors.slice(0, 1),
    })
  })
}
