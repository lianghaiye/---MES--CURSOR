import { PROCESS_REPORT_MODE_MAP } from '@/mock/defectItemSeed'
import { resolveDefectItemsByIds } from '@/store/defectItemStore'
import { getProcessByName } from '@/store/processConfigStore'
import { resolveReportMode } from '@/utils/reportMode'
import {
  breakdownToLegacy,
  ensureDefectBreakdown,
  resolveDefectReasonLabel,
} from '@/utils/defectBreakdown'

function resolveProcessReportType(process = {}) {
  const fromProcess = process.reportMode || process.reportType
  if (fromProcess) return resolveReportMode(fromProcess)
  const cfg = getProcessByName(process.name)
  if (cfg?.reportMode) return resolveReportMode(cfg.reportMode)
  const mapped = PROCESS_REPORT_MODE_MAP[process.name]
  return mapped ? resolveReportMode(mapped) : '—'
}

function getProcessDefectItems(processName) {
  const proc = getProcessByName(processName)
  if (!proc?.defectItemIds?.length) return []
  return resolveDefectItemsByIds(proc.defectItemIds)
}

/** 登记产出详情：工序行展示字段补全 */
export function enrichQuickReportProcessForDetail(process = {}) {
  const items = getProcessDefectItems(process.name)
  const defectBreakdown = ensureDefectBreakdown(process, items)
  const legacy = breakdownToLegacy(defectBreakdown)
  return {
    ...process,
    reportType: resolveProcessReportType(process),
    ...legacy,
    defectReasons: legacy.defectItemNames,
  }
}

/** 登记产出列表：记录级不良原因汇总 */
export function enrichQuickReportForList(row = {}) {
  const processes = (row.processes || []).map((p) => enrichQuickReportProcessForDetail(p))
  const defectReasonLabel =
    row.defectReasonLabel && row.defectReasonLabel !== '—'
      ? row.defectReasonLabel
      : processes
          .map((p) => resolveDefectReasonLabel(p, getProcessDefectItems(p.name)))
          .filter((label) => label && label !== '—')
          .join('；') || '—'
  return {
    ...row,
    processes,
    defectReasonLabel,
  }
}
