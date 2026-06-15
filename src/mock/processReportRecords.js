import { breakdownToLegacy, ensureDefectBreakdown } from '@/utils/defectBreakdown'
import { resolveDefectItemsByIds } from '@/store/defectItemStore'
import {
  createProcessReportTaskSeed,
  createProcessReportWoLogSeed,
} from '@/mock/processReportTaskSeed'
import { createProcessReportQuickSeed } from '@/mock/processReportQuickSeed'

export const PROCESS_REPORT_STORAGE_KEY = 'i_doms_mobile_process_report_records'
export const PROCESS_REPORT_SEED_VERSION_KEY = 'i_doms_process_report_seed_v'
export const PROCESS_REPORT_SEED_VERSION = '7'
export const PROCESS_REPORT_WO_LOG_KEY = 'i_doms_process_report_wo_logs'

export const RECORD_STATUS = ['待审核', '已审核', '已拒绝']

export function formatReportDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function createSeed() {
  return [...createProcessReportTaskSeed(), ...createProcessReportQuickSeed()]
}

export function normalizeProcessReport(row) {
  const items = resolveDefectItemsByIds(row.defectItemIds || [])
  const defectBreakdown = ensureDefectBreakdown(row, items)
  const legacy = breakdownToLegacy(defectBreakdown)
  return {
    ...row,
    source: row.source || 'quick',
    status: row.status || '待审核',
    rejectReason: row.rejectReason || '',
    ...legacy,
    defectReason: row.defectReason || legacy.defectReasonLabel,
  }
}

export function createProcessReportSeed() {
  return createSeed().map(normalizeProcessReport)
}

export { createProcessReportWoLogSeed }

export function filterProcessReports(list, filters = {}) {
  let rows = [...list]
  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status)
  }
  if (filters.source) {
    rows = rows.filter((r) => r.source === filters.source)
  }
  if (filters.keyword?.trim()) {
    const kw = filters.keyword.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.workOrderNo?.toLowerCase().includes(kw) ||
        r.productName?.toLowerCase().includes(kw) ||
        r.productCode?.toLowerCase().includes(kw) ||
        r.processName?.toLowerCase().includes(kw) ||
        r.reporter?.toLowerCase().includes(kw),
    )
  }
  if (filters.dateRange?.length === 2) {
    const [start, end] = filters.dateRange
    rows = rows.filter((r) => {
      const d = (r.createdAt || '').slice(0, 10)
      return d >= start && d <= end
    })
  }
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}
