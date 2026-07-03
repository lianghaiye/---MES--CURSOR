import dayjs from 'dayjs'
import {
  PUSH_STATUS,
  TASK_STATUS,
  isPushedToMobile,
  upsertMobileWageItemFromProcessReport,
} from '@/utils/mobileLaborWagePush'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { productBomState } from '@/store/productBomStore'
import { isBomActive } from '@/mock/productBomOptions'
import { employeeGroupState } from '@/store/employeeGroupStore'
import { workOrderState } from '@/store/workOrderStore'
import { enrichProcessReportRecord } from '@/utils/processReportEnrich'
import { formatReportDate } from '@/mock/processReportRecords'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { enrichProcessReportLine, resolveListAccountHours } from '@/utils/processReportWageCalc'
import { formatBreakdownLabel, getApprovedDefectBreakdown } from '@/utils/defectBreakdown'

function findMasterByCode(code) {
  if (!code) return null
  void productInfoState.products
  void materialInfoState.materials
  return (
    productInfoState.products.find((p) => p.code === code) ||
    materialInfoState.materials.find((m) => m.code === code) ||
    null
  )
}

function resolveTeam(reporter) {
  if (!reporter) return '—'
  void employeeGroupState.groups
  const hit = employeeGroupState.groups.find(
    (g) => g.leaderName === reporter || (g.workers || []).some((w) => w.name === reporter),
  )
  return hit?.name || '—'
}

function resolveEbomLabel(productName, bomName) {
  void productBomState.boms
  const hit = productBomState.boms.find(
    (b) => isBomActive(b) && (b.productName === productName || b.bomName === bomName),
  )
  if (hit) return `${hit.bomName} ${hit.version}`
  if (bomName) return `${bomName} —`
  return '—'
}

function resolveOrderTaskStatus(lines) {
  const active = lines.filter((l) => l.taskStatus !== '已作废')
  if (!active.length) return TASK_STATUS.REPORTED
  if (active.every((l) => l.taskStatus === TASK_STATUS.AUDITED)) return TASK_STATUS.AUDITED
  if (active.some((l) => l.taskStatus === TASK_STATUS.AUDITED)) return '部分审核'
  return TASK_STATUS.REPORTED
}

function resolveOrderAuditStatus(lines) {
  const active = lines.filter((l) => l.status !== '已作废')
  if (!active.length) return '待审核'
  const audited = active.filter((l) => l.status === '已审核').length
  if (audited === 0) return '待审核'
  if (audited === active.length) return '已审核'
  return '部分审核'
}

function buildTaskNo(record, index) {
  if (record.taskNo) return record.taskNo
  const date = (record.createdAt || '').slice(0, 10).replace(/-/g, '') || dayjs().format('YYYYMMDD')
  return `T${date}${String(index + 1).padStart(3, '0')}`
}

function migrateLineFields(record) {
  let taskStatus = record.taskStatus
  if (!taskStatus) {
    taskStatus = record.status === '已审核' ? TASK_STATUS.AUDITED : TASK_STATUS.REPORTED
  }
  let pushStatus = record.pushStatus
  if (!pushStatus) {
    pushStatus = record.pushedAt ? PUSH_STATUS.PUSHED : PUSH_STATUS.NOT_PUSHED
  }
  return {
    taskStatus,
    pushStatus,
    operator: record.operator || record.reporter || '',
  }
}

function mapRecordToLine(record, index, materialCode) {
  const migrated = migrateLineFields(record)
  const enriched = enrichProcessReportRecord(record)
  const datePrefix = (record.createdAt || '').slice(0, 10)
  const config = resolveLaborConfig(materialCode || record.productCode, record.processName)
  const base = {
    ...enriched,
    seq: index + 1,
    taskNo: buildTaskNo(record, index),
    team: record.team || resolveTeam(record.reporter),
    defectReason: record.defectReason || enriched.defectItems || '—',
    taskStartTime:
      record.taskStartTime || (datePrefix ? `${datePrefix} ${record.startTime || '08:00'}` : '—'),
    taskEndTime:
      record.taskEndTime || (datePrefix ? `${datePrefix} ${record.endTime || '18:00'}` : '—'),
    workHours: record.workHours ?? '—',
    adjustedGoodQty: record.adjustedGoodQty,
    adjustedDefectQty: record.adjustedDefectQty,
    adjustedDefectBreakdown: record.adjustedDefectBreakdown,
    adjustedWorkHours: record.adjustedWorkHours,
    adjustReason: record.adjustReason || '',
    subsidyReportQty: record.subsidyReportQty,
    subsidyHours: record.subsidyHours,
    subsidyReason: record.subsidyReason || '',
    subsidyMethod: record.subsidyMethod,
    subsidyFixedAmount: record.subsidyFixedAmount,
    manualQualityDeduction: record.manualQualityDeduction,
    overridePieceRate: record.overridePieceRate,
    overrideStandardHourlyRate: record.overrideStandardHourlyRate,
    overrideSalaryMethod: record.overrideSalaryMethod,
    images: Array.isArray(record.images) ? [...record.images] : [],
    id: record.id,
    status: record.status,
    auditStatus: record.status,
    ...migrated,
  }
  const line = enrichProcessReportLine(base, config)
  const effectiveBreakdown = getApprovedDefectBreakdown({
    ...enriched,
    ...base,
    defectBreakdown: enriched.defectBreakdown,
    adjustedDefectBreakdown: record.adjustedDefectBreakdown,
  })
  return {
    ...line,
    listAccountHours: resolveListAccountHours(line, config),
    defectBreakdown: effectiveBreakdown,
    defectReason: formatBreakdownLabel(effectiveBreakdown) || enriched.defectItems || '—',
  }
}

function resolveRecordReportQty(record = {}) {
  return (Number(record.goodQty) || 0) + (Number(record.defectQty) || 0)
}

function resolveRecordAdjustedReportQty(record = {}) {
  if (record.adjustedGoodQty != null || record.adjustedDefectQty != null) {
    return (Number(record.adjustedGoodQty) || 0) + (Number(record.adjustedDefectQty) || 0)
  }
  if (record.adjustedReportQty != null && record.adjustedReportQty !== '') {
    return Number(record.adjustedReportQty) || 0
  }
  return resolveRecordReportQty(record)
}

export function calcProcessReportStats(records = []) {
  const today = formatReportDate()
  const monthStart = dayjs().startOf('month')
  const monthEnd = dayjs().endOf('month')

  const todayList = records.filter((r) => (r.createdAt || '').slice(0, 10) === today)
  const monthList = records.filter((r) => {
    const d = dayjs((r.createdAt || '').slice(0, 10))
    return d.isValid() && !d.isBefore(monthStart) && !d.isAfter(monthEnd)
  })

  const sumQty = (list) => list.reduce((s, r) => s + resolveRecordReportQty(r), 0)
  const sumAdjustedQty = (list) =>
    list.reduce((s, r) => s + resolveRecordAdjustedReportQty(r), 0)

  return {
    todayQty: sumQty(todayList),
    todayAdjustedQty: sumAdjustedQty(todayList),
    todayTaskCount: todayList.length,
    monthQty: sumQty(monthList),
  }
}

export function summarizeProcessReportLines(lines = []) {
  const sum = (key) => lines.reduce((s, l) => s + (Number(l[key]) || 0), 0)
  const accountHours = lines.reduce((s, l) => {
    const h = Number(l.listAccountHours)
    return s + (Number.isFinite(h) ? h : 0)
  }, 0)
  return {
    goodQty: sum('goodQty'),
    defectQty: sum('defectQty'),
    accountHours: Math.round(accountHours * 100) / 100,
    workHours: Math.round(accountHours * 100) / 100,
  }
}

/** 快速报工详情聚合（单条报工，结构对齐任务报工详情） */
export function buildProcessReportQuickBundle(recordId, records = [], logs = []) {
  const record = records.find((r) => r.id === recordId && r.source === 'quick')
  if (!record) return null

  const master = findMasterByCode(record.productCode)
  const productCode = record.productCode || master?.code || '—'
  const line = mapRecordToLine(record, 0, productCode)
  const lines = [line]

  const bundle = {
    id: `pr-quick-${recordId}`,
    recordId,
    workOrderCode: line.taskNo || record.taskNo || '—',
    workOrderName: `${record.processName || '快速报工'}`,
    materialCode: productCode,
    materialName: record.productName || master?.name || '—',
    specModel: master?.specModel || record.specModel || '—',
    salesOrderNo: record.salesOrderNo || '—',
    workCenter: record.workCenter || '—',
    owner: record.reporter || '—',
    processRouteName: '—',
    ebomLabel: resolveEbomLabel(record.productName, master?.bomName || ''),
    taskStatus: line.taskStatus,
    auditStatus: record.status,
    lines,
    logs,
    summary: summarizeProcessReportLines(lines),
  }

  if (isPushedToMobile(line.pushStatus)) {
    upsertMobileWageItemFromProcessReport(bundle, line)
  }

  return bundle
}

/** 按生产工单聚合任务报工详情（对齐工时管理详情结构） */
export function buildProcessReportWorkOrderBundle(workOrderId, records, logs = []) {
  void workOrderState.orders
  const wo = workOrderState.orders.find((o) => o.id === workOrderId)
  if (!wo) return null

  const taskRecords = records
    .filter((r) => r.source === 'workorder' && r.workOrderId === workOrderId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  const master = findMasterByCode(wo.materialCode || taskRecords[0]?.productCode)
  const productCode = wo.materialCode || master?.code || taskRecords[0]?.productCode || '—'
  const lines = taskRecords.map((r, i) => mapRecordToLine(r, i, productCode))
  const scheduleQty = wo.scheduleQty ?? wo.planQty ?? 0
  lines.forEach((line) => {
    if (line.scheduleQty == null || line.scheduleQty === '') {
      line.scheduleQty = scheduleQty
    }
  })

  const bundle = {
    id: `pr-wo-${workOrderId}`,
    workOrderId,
    workOrderCode: wo.code,
    workOrderName: wo.name || wo.productName,
    materialCode: productCode,
    materialName: wo.productName || master?.name || '—',
    specModel: master?.specModel || wo.specModel || '—',
    salesOrderNo: wo.sourceOrderNo || '—',
    scheduleQty: wo.scheduleQty ?? wo.planQty ?? 0,
    workCenter: wo.workCenter || '—',
    owner: wo.owner || 'admin1',
    processRouteName: wo.processRouteName || '—',
    ebomLabel: resolveEbomLabel(wo.productName, wo.bom),
    taskStatus: resolveOrderTaskStatus(lines),
    auditStatus: resolveOrderAuditStatus(lines),
    lines,
    logs,
    summary: summarizeProcessReportLines(lines),
  }

  lines.forEach((line) => {
    if (isPushedToMobile(line.pushStatus)) {
      upsertMobileWageItemFromProcessReport(bundle, line)
    }
  })

  return bundle
}
