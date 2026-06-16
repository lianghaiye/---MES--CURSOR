import dayjs from 'dayjs'
import { getLaborHourOrders } from '@/store/laborHourStore'
import { processReportState } from '@/store/processReportStore'
import { quickReportState } from '@/store/quickReportStore'
import { isQuickReportConfirmed } from '@/mock/quickReports'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { enrichProcessReportLine } from '@/utils/processReportWageCalc'
import { enrichProcessReportRecord } from '@/utils/processReportEnrich'
import { buildReportWorkPerProcessBundle } from '@/utils/reportWorkPerProcess'
import { resolveEmployeeProfile } from '@/utils/employeeProfileResolver'

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

function parseTime(val) {
  if (!val) return null
  const d = dayjs(val)
  return d.isValid() ? d : null
}

function inDateRange(timeVal, startDate, endDate) {
  const d = parseTime(timeVal)
  if (!d) return !startDate && !endDate
  if (startDate && d.isBefore(dayjs(startDate).startOf('day'))) return false
  if (endDate && d.isAfter(dayjs(endDate).endOf('day'))) return false
  return true
}

function matchEmployee(name, keyword) {
  if (!keyword?.trim()) return true
  return (name || '').includes(keyword.trim())
}

function matchProcess(processName, keyword) {
  if (!keyword?.trim()) return true
  return (processName || '').includes(keyword.trim())
}

function resolveAdjustedReportQty(record = {}) {
  if (record.adjustedGoodQty != null || record.adjustedDefectQty != null) {
    return round2(
      (Number(record.adjustedGoodQty) || 0) + (Number(record.adjustedDefectQty) || 0),
    )
  }
  if (record.adjustedReportQty != null && record.adjustedReportQty !== '') {
    return round2(record.adjustedReportQty)
  }
  return null
}

function effectiveReportQty(line = {}) {
  if (line.adjustedReportQty != null && line.adjustedReportQty !== '') {
    return Number(line.adjustedReportQty) || 0
  }
  return Number(line.reportQty) || 0
}

function effectiveWorkHours(line = {}) {
  if (line.adjustedWorkHours != null && line.adjustedWorkHours !== '') {
    return Number(line.adjustedWorkHours) || 0
  }
  return Number(line.workHours) || 0
}

function resolveSourceLabel(source = '') {
  const map = {
    'process-report': '工序报工',
    'quick-report': '登记产出',
    'labor-hour': '工时管理',
  }
  return map[source] || '—'
}

function computeFinalPieceQtyFromLine(line = {}) {
  const good =
    line.adjustedGoodQty != null && line.adjustedGoodQty !== ''
      ? Number(line.adjustedGoodQty) || 0
      : Number(line.goodQty) || 0
  const defect =
    line.adjustedDefectQty != null && line.adjustedDefectQty !== ''
      ? Number(line.adjustedDefectQty) || 0
      : Number(line.defectQty) || 0
  const subsidy = Number(line.subsidyReportQty) || 0
  return round2(good + defect + subsidy)
}

function computeAccountHoursFromLine(line = {}) {
  const hours =
    line.adjustedWorkHours != null && line.adjustedWorkHours !== ''
      ? Number(line.adjustedWorkHours) || 0
      : Number(line.workHours) || 0
  const subsidy = Number(line.subsidyHours) || 0
  return round2(hours + subsidy)
}

function buildDetailLine(partial) {
  const profile = resolveEmployeeProfile(partial.employeeName)
  const line = {
    ...partial,
    employeeNo: profile.employeeNo,
    positions: profile.positions,
    workCenter: profile.workCenter,
    sourceLabel: resolveSourceLabel(partial.source),
    goodQty: round2(partial.goodQty ?? 0),
    defectQty: round2(partial.defectQty ?? 0),
    defectReason: partial.defectReason || '—',
    adjustedGoodQty: partial.adjustedGoodQty ?? null,
    adjustedDefectQty: partial.adjustedDefectQty ?? null,
    reportQty: round2(partial.reportQty ?? (partial.goodQty ?? 0) + (partial.defectQty ?? 0)),
    workHours: round2(partial.workHours),
    adjustedReportQty: partial.adjustedReportQty ?? null,
    adjustedWorkHours: partial.adjustedWorkHours ?? null,
    subsidyReportQty: round2(partial.subsidyReportQty),
    subsidyHours: round2(partial.subsidyHours),
    goodWage: round2(partial.goodWage),
    defectWage: round2(partial.defectWage),
    qualityDeduction: round2(partial.qualityDeduction),
    salaryAmount: round2(partial.salaryAmount),
  }
  line.finalPieceQty = partial.finalPieceQty ?? computeFinalPieceQtyFromLine(line)
  line.accountHours = partial.accountHours ?? computeAccountHoursFromLine(line)
  return line
}

function collectLaborHourLines() {
  const lines = []
  getLaborHourOrders().forEach((order) => {
    ;(order.lines || []).forEach((line) => {
      if (line.auditStatus !== '已审核') return
      lines.push(
        buildDetailLine({
          id: `lh-${order.id}-${line.id}`,
          source: 'labor-hour',
          employeeName: line.executor || '—',
          workOrderCode: order.workOrderCode || '—',
          taskNo: line.taskNo || '—',
          processName: line.processName || '—',
          reportType: line.reportType || '—',
          reportTime: line.taskEndTime || order.latestSubmitAt || order.createdAt,
          goodQty: Number(line.reportQty) || 0,
          defectQty: 0,
          defectReason: '—',
          reportQty: Number(line.reportQty) || 0,
          workHours: Number(line.reportDuration ?? line.accountHours) || 0,
          adjustedGoodQty:
            line.adjustedReportQty != null && line.adjustedReportQty !== ''
              ? round2(line.adjustedReportQty)
              : null,
          adjustedDefectQty: null,
          adjustedReportQty: resolveAdjustedReportQty(line),
          adjustedWorkHours:
            line.adjustedDuration != null && line.adjustedDuration !== ''
              ? round2(line.adjustedDuration)
              : null,
          subsidyReportQty: line.subsidyReportQty,
          subsidyHours: line.subsidyHours,
          salaryMethod: line.salaryMethod || '—',
          goodWage: line.salaryAmount,
          defectWage: 0,
          qualityDeduction: 0,
          salaryAmount: line.salaryAmount,
        }),
      )
    })
  })
  return lines
}

function collectProcessReportLines() {
  const lines = []
  processReportState.records
    .filter((r) => r.status === '已审核')
    .forEach((record) => {
      const enriched = enrichProcessReportRecord(record)
      const config = resolveLaborConfig(record.productCode, record.processName)
      const wageLine = enrichProcessReportLine(
        {
          ...enriched,
          reporter: record.reporter,
          goodQty: record.goodQty,
          defectQty: record.defectQty,
          workHours: record.workHours,
          adjustedGoodQty: record.adjustedGoodQty,
          adjustedDefectQty: record.adjustedDefectQty,
          adjustedWorkHours: record.adjustedWorkHours,
          subsidyReportQty: record.subsidyReportQty,
          subsidyHours: record.subsidyHours,
          subsidyReason: record.subsidyReason,
        },
        config,
      )
      lines.push(
        buildDetailLine({
          id: `pr-${record.id}`,
          source: 'process-report',
          employeeName: record.reporter || '—',
          workOrderCode: record.workOrderNo || '—',
          taskNo: record.taskNo || '—',
          processName: record.processName || '—',
          reportType: wageLine.reportType || '—',
          reportTime: record.createdAt || record.taskEndTime,
          goodQty: Number(record.goodQty) || 0,
          defectQty: Number(record.defectQty) || 0,
          defectReason: enriched.defectItems || enriched.defectReason || record.defectReason || '—',
          reportQty: (Number(record.goodQty) || 0) + (Number(record.defectQty) || 0),
          workHours:
            Number(record.workHours) ||
            Number(wageLine.adjustedWorkHours) ||
            Number(wageLine.accountHours) ||
            0,
          adjustedGoodQty:
            record.adjustedGoodQty != null && record.adjustedGoodQty !== ''
              ? round2(record.adjustedGoodQty)
              : null,
          adjustedDefectQty:
            record.adjustedDefectQty != null && record.adjustedDefectQty !== ''
              ? round2(record.adjustedDefectQty)
              : null,
          adjustedReportQty: resolveAdjustedReportQty(record),
          adjustedWorkHours:
            record.adjustedWorkHours != null && record.adjustedWorkHours !== ''
              ? round2(record.adjustedWorkHours)
              : null,
          subsidyReportQty: record.subsidyReportQty,
          subsidyHours: record.subsidyHours,
          salaryMethod: wageLine.salaryMethod || '—',
          goodWage: wageLine.goodWage,
          defectWage: wageLine.defectWage,
          qualityDeduction: wageLine.qualityDeduction,
          salaryAmount: wageLine.salaryAmount,
        }),
      )
    })
  return lines
}

function collectQuickReportLines() {
  const lines = []
  quickReportState.reports.forEach((record) => {
    if (!isQuickReportConfirmed(record)) return
    if (record.perProcessRegister === false) return
    const bundle = buildReportWorkPerProcessBundle(record)
    if (!bundle?.lines?.length) return
    bundle.lines.forEach((line) => {
      lines.push(
        buildDetailLine({
          id: `qr-${record.id}-${line.id}`,
          source: 'quick-report',
          employeeName: line.reporter || record.reporter || '—',
          workOrderCode: record.workOrderNo || '—',
          taskNo: '—',
          processName: line.processName || '—',
          reportType: line.reportType || '—',
          reportTime: record.createdAt || record.reportDate,
          goodQty: Number(line.goodQty) || 0,
          defectQty: Number(line.defectQty) || 0,
          defectReason: line.defectReason || '—',
          reportQty: (Number(line.goodQty) || 0) + (Number(line.defectQty) || 0),
          workHours: Number(line.workHours) || Number(line.accountHours) || 0,
          adjustedGoodQty: null,
          adjustedDefectQty: null,
          adjustedReportQty: null,
          adjustedWorkHours: null,
          subsidyReportQty: line.subsidyReportQty,
          subsidyHours: line.subsidyHours,
          salaryMethod: line.salaryMethod || '—',
          goodWage: line.goodWage,
          defectWage: line.defectWage,
          qualityDeduction: line.qualityDeduction,
          salaryAmount: line.salaryAmount,
        }),
      )
    })
  })
  return lines
}

export function collectAllSalaryDetailLines() {
  return [
    ...collectLaborHourLines(),
    ...collectProcessReportLines(),
    ...collectQuickReportLines(),
  ]
}

export function filterSalaryDetailLines(lines = [], filters = {}) {
  const { startDate, endDate, employeeName, processName } = filters
  return lines.filter((line) => {
    if (!inDateRange(line.reportTime, startDate, endDate)) return false
    if (!matchEmployee(line.employeeName, employeeName)) return false
    if (!matchProcess(line.processName, processName)) return false
    return true
  })
}

export function summarizeSalaryByEmployee(lines = []) {
  const map = new Map()
  lines.forEach((line) => {
    const key = line.employeeName || '—'
    if (!map.has(key)) {
      const profile = resolveEmployeeProfile(key)
      map.set(key, {
        id: key,
        employeeName: key,
        employeeNo: profile.employeeNo,
        positions: profile.positions,
        workCenter: profile.workCenter,
        taskCount: 0,
        reportQty: 0,
        workHours: 0,
        subsidyReportQty: 0,
        subsidyHours: 0,
        salaryAmount: 0,
      })
    }
    const row = map.get(key)
    row.taskCount += 1
    row.reportQty = round2(row.reportQty + effectiveReportQty(line))
    row.workHours = round2(row.workHours + effectiveWorkHours(line))
    row.subsidyReportQty = round2(row.subsidyReportQty + (Number(line.subsidyReportQty) || 0))
    row.subsidyHours = round2(row.subsidyHours + (Number(line.subsidyHours) || 0))
    row.salaryAmount = round2(row.salaryAmount + (Number(line.salaryAmount) || 0))
  })
  return [...map.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'zh-CN'))
}

export function summarizeSalaryDetailTotals(lines = []) {
  const sum = (key) => round2(lines.reduce((s, l) => s + (Number(l[key]) || 0), 0))
  const sumOptional = (key) =>
    round2(lines.reduce((s, l) => s + (l[key] != null && l[key] !== '' ? Number(l[key]) || 0 : 0), 0))
  return {
    goodQty: sum('goodQty'),
    defectQty: sum('defectQty'),
    reportQty: sum('reportQty'),
    workHours: sum('workHours'),
    adjustedGoodQty: sumOptional('adjustedGoodQty'),
    adjustedDefectQty: sumOptional('adjustedDefectQty'),
    adjustedReportQty: sumOptional('adjustedReportQty'),
    adjustedWorkHours: sumOptional('adjustedWorkHours'),
    subsidyReportQty: sum('subsidyReportQty'),
    subsidyHours: sum('subsidyHours'),
    finalPieceQty: sum('finalPieceQty'),
    accountHours: sum('accountHours'),
    goodWage: sum('goodWage'),
    defectWage: sum('defectWage'),
    qualityDeduction: sum('qualityDeduction'),
    salaryAmount: sum('salaryAmount'),
  }
}

export function summarizeSalarySummaryTotals(rows = []) {
  return {
    taskCount: rows.reduce((s, r) => s + (Number(r.taskCount) || 0), 0),
    reportQty: round2(rows.reduce((s, r) => s + (Number(r.reportQty) || 0), 0)),
    workHours: round2(rows.reduce((s, r) => s + (Number(r.workHours) || 0), 0)),
    subsidyReportQty: round2(rows.reduce((s, r) => s + (Number(r.subsidyReportQty) || 0), 0)),
    subsidyHours: round2(rows.reduce((s, r) => s + (Number(r.subsidyHours) || 0), 0)),
    salaryAmount: round2(rows.reduce((s, r) => s + (Number(r.salaryAmount) || 0), 0)),
  }
}

export function querySalaryStats(filters = {}) {
  const lines = filterSalaryDetailLines(collectAllSalaryDetailLines(), filters)
  const summaryRows = summarizeSalaryByEmployee(lines)
  return {
    lines,
    summaryRows,
    summaryTotals: summarizeSalarySummaryTotals(summaryRows),
    detailTotals: summarizeSalaryDetailTotals(lines),
  }
}
