import dayjs from 'dayjs'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { productBomState } from '@/store/productBomStore'
import { employeeGroupState } from '@/store/employeeGroupStore'
import { workOrderState } from '@/store/workOrderStore'
import { enrichProcessReportRecord } from '@/utils/processReportEnrich'
import { formatReportDate } from '@/mock/processReportRecords'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { enrichProcessReportLine } from '@/utils/processReportWageCalc'
import {
  formatBreakdownLabel,
  getApprovedDefectBreakdown,
} from '@/utils/defectBreakdown'

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
    (b) => b.status === '使用中' && (b.productName === productName || b.bomName === bomName),
  )
  if (hit) return `${hit.bomName} ${hit.version}`
  if (bomName) return `${bomName} —`
  return '—'
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

function mapRecordToLine(record, index, materialCode) {
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
    id: record.id,
    status: record.status,
    auditStatus: record.status,
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
    defectBreakdown: effectiveBreakdown,
    defectReason: formatBreakdownLabel(effectiveBreakdown) || enriched.defectItems || '—',
  }
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

  const sumQty = (list) =>
    list.reduce((s, r) => s + (Number(r.goodQty) || 0) + (Number(r.defectQty) || 0), 0)

  return {
    todayQty: sumQty(todayList),
    todayTaskCount: todayList.length,
    monthQty: sumQty(monthList),
  }
}

export function summarizeProcessReportLines(lines = []) {
  const sum = (key) => lines.reduce((s, l) => s + (Number(l[key]) || 0), 0)
  const workHours = lines.reduce((s, l) => {
    const h = Number(l.workHours)
    return s + (Number.isFinite(h) ? h : 0)
  }, 0)
  return {
    goodQty: sum('goodQty'),
    defectQty: sum('defectQty'),
    workHours: Math.round(workHours * 100) / 100,
  }
}

/** 快速报工详情聚合（单条报工，结构对齐任务报工详情） */
export function buildProcessReportQuickBundle(recordId, records = []) {
  const record = records.find((r) => r.id === recordId && r.source === 'quick')
  if (!record) return null

  const master = findMasterByCode(record.productCode)
  const productCode = record.productCode || master?.code || '—'
  const line = mapRecordToLine(record, 0, productCode)

  return {
    id: `pr-quick-${recordId}`,
    recordId,
    materialCode: productCode,
    materialName: record.productName || master?.name || '—',
    specModel: master?.specModel || record.specModel || '—',
    workCenter: record.workCenter || '—',
    owner: '—',
    processRouteName: '—',
    ebomLabel: resolveEbomLabel(record.productName, master?.bomName || ''),
    auditStatus: record.status,
    lines: [line],
  }
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

  return {
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
    auditStatus: resolveOrderAuditStatus(lines),
    lines,
    logs,
    summary: summarizeProcessReportLines(lines),
  }
}
