import dayjs from 'dayjs'
import { processReportState } from '@/store/processReportStore'
import { quickReportState } from '@/store/quickReportStore'
import { isQuickReportConfirmed } from '@/mock/quickReports'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { enrichProcessReportLine, calcFinalPieceQty } from '@/utils/processReportWageCalc'
import { enrichProcessReportRecord } from '@/utils/processReportEnrich'
import { buildReportWorkPerProcessBundle } from '@/utils/reportWorkPerProcess'
import { resolveEmployeeProfile } from '@/utils/employeeProfileResolver'
import { getProcessByName } from '@/store/processConfigStore'
import {
  formatSplitSlotLabel,
  resolveCollaborationGroupKey,
  resolveCollabOutcomeMode,
} from '@/utils/processReportCollaboration'
import { getTaskExecutionModeLabel } from '@/utils/taskExecutionMode'

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
    return round2((Number(record.adjustedGoodQty) || 0) + (Number(record.adjustedDefectQty) || 0))
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
  }
  return map[source] || '—'
}

function computeFinalPieceQtyFromLine(line = {}) {
  return calcFinalPieceQty(line)
}

function computeAccountHoursFromLine(line = {}) {
  const hours =
    line.adjustedWorkHours != null && line.adjustedWorkHours !== ''
      ? Number(line.adjustedWorkHours) || 0
      : Number(line.workHours) || 0
  const subsidy = Number(line.subsidyHours) || 0
  return round2(hours + subsidy)
}

function resolveProcessMeta(record = {}) {
  const proc = record.processName ? getProcessByName(record.processName) : null
  const resourceType = record.resourceType || proc?.resourceType || ''
  let taskExecutionMode = record.taskExecutionMode || proc?.taskExecutionMode || ''
  if (!taskExecutionMode && resolveCollabOutcomeMode(record)) {
    taskExecutionMode = 'collaborative'
  }
  const resourceTypeLabel = resourceType || '—'
  const executionModeLabel = taskExecutionMode ? getTaskExecutionModeLabel(taskExecutionMode) : '—'
  const splitSlotLabel =
    formatSplitSlotLabel({
      ...record,
      resourceType,
      taskExecutionMode,
    }) || '—'
  return {
    resourceType,
    resourceTypeLabel,
    taskExecutionMode,
    executionModeLabel,
    taskGroupId: resolveCollaborationGroupKey(record) || '',
    outcomeMode: resolveCollabOutcomeMode(record) || '',
    splitSlotLabel,
    collaborationSlot: record.collaborationSlot,
    collaborationTotal: record.collaborationTotal,
  }
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
    subsidyAmount: round2(partial.subsidyAmount ?? 0),
    goodWage: round2(partial.goodWage),
    defectWage: round2(partial.defectWage),
    prepWage: round2(partial.prepWage),
    qualityDeduction: round2(partial.qualityDeduction),
    salaryAmount: round2(partial.salaryAmount),
    resourceType: partial.resourceType || '',
    resourceTypeLabel: partial.resourceTypeLabel || partial.resourceType || '—',
    taskExecutionMode: partial.taskExecutionMode || '',
    executionModeLabel: partial.executionModeLabel || '—',
    splitSlotLabel: partial.splitSlotLabel || '—',
    taskGroupId: partial.taskGroupId || '',
    outcomeMode: partial.outcomeMode || '',
    collaborationSlot: partial.collaborationSlot,
    collaborationTotal: partial.collaborationTotal,
  }
  line.finalPieceQty = partial.finalPieceQty ?? computeFinalPieceQtyFromLine(line)
  line.accountHours = partial.accountHours ?? computeAccountHoursFromLine(line)
  return line
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
          subsidyMethod: record.subsidyMethod,
          subsidyFixedAmount: record.subsidyFixedAmount,
          subsidyAmount: wageLine.subsidyWage,
          salaryMethod: wageLine.salaryMethod || '—',
          goodWage: wageLine.goodWage,
          defectWage: wageLine.defectWage,
          prepWage: wageLine.prepWage,
          qualityDeduction: wageLine.qualityDeduction,
          salaryAmount: wageLine.salaryAmount,
          ...resolveProcessMeta(record),
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
          subsidyMethod: line.subsidyMethod,
          subsidyFixedAmount: line.subsidyFixedAmount,
          subsidyAmount: line.subsidyWage,
          salaryMethod: line.salaryMethod || '—',
          goodWage: line.goodWage,
          defectWage: line.defectWage,
          prepWage: line.prepWage,
          qualityDeduction: line.qualityDeduction,
          salaryAmount: line.salaryAmount,
        }),
      )
    })
  })
  return lines
}

export function collectAllSalaryDetailLines() {
  // 极简模式：仅工序报工 + 登记产出；工时管理属于标准模式，不参与本页核算
  return [...collectProcessReportLines(), ...collectQuickReportLines()]
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
        subsidyAmount: 0,
        qualityDeduction: 0,
        salaryAmount: 0,
      })
    }
    const row = map.get(key)
    row.taskCount += 1
    row.reportQty = round2(row.reportQty + effectiveReportQty(line))
    row.workHours = round2(row.workHours + effectiveWorkHours(line))
    row.subsidyReportQty = round2(row.subsidyReportQty + (Number(line.subsidyReportQty) || 0))
    row.subsidyHours = round2(row.subsidyHours + (Number(line.subsidyHours) || 0))
    row.subsidyAmount = round2(row.subsidyAmount + (Number(line.subsidyAmount) || 0))
    row.qualityDeduction = round2(row.qualityDeduction + (Number(line.qualityDeduction) || 0))
    row.salaryAmount = round2(row.salaryAmount + (Number(line.salaryAmount) || 0))
  })
  return [...map.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'zh-CN'))
}

export function summarizeSalaryDetailTotals(lines = []) {
  const sum = (key) => round2(lines.reduce((s, l) => s + (Number(l[key]) || 0), 0))
  const sumOptional = (key) =>
    round2(
      lines.reduce((s, l) => s + (l[key] != null && l[key] !== '' ? Number(l[key]) || 0 : 0), 0),
    )
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
    subsidyAmount: sum('subsidyAmount'),
    finalPieceQty: sum('finalPieceQty'),
    accountHours: sum('accountHours'),
    goodWage: sum('goodWage'),
    defectWage: sum('defectWage'),
    prepWage: sum('prepWage'),
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
    subsidyAmount: round2(rows.reduce((s, r) => s + (Number(r.subsidyAmount) || 0), 0)),
    qualityDeduction: round2(rows.reduce((s, r) => s + (Number(r.qualityDeduction) || 0), 0)),
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
