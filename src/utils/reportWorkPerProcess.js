import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { productBomState } from '@/store/productBomStore'
import { isBomActive } from '@/mock/productBomOptions'
import { employeeGroupState } from '@/store/employeeGroupStore'
import { workOrderState } from '@/store/workOrderStore'
import { personnelList } from '@/mock/personnel'
import { enrichQuickReportProcessForDetail } from '@/utils/quickReportEnrich'
import { enrichProcessReportLine } from '@/utils/processReportWageCalc'
import { summarizeProcessReportLines } from '@/utils/processReportWorkOrder'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { formatBreakdownLabel } from '@/utils/defectBreakdown'

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

function resolveReporterWorkCenter(reporter) {
  if (!reporter) return '—'
  const hit = personnelList.find((p) => p.name === reporter)
  return hit?.dept || '—'
}

function resolveTaskTime(datePrefix, time, fallback) {
  if (time) return datePrefix ? `${datePrefix} ${time}` : time
  return datePrefix ? `${datePrefix} ${fallback}` : '—'
}

function mapQuickReportProcessToLine(record, process, index, materialCode) {
  const enriched = enrichQuickReportProcessForDetail(process)
  const reporter = process.operators?.[0] || record.reporter || '—'
  const datePrefix = (record.createdAt || record.reportDate || '').slice(0, 10)
  const config = resolveLaborConfig(materialCode, process.name)
  const base = {
    id: process.id,
    productCode: materialCode,
    processName: process.name,
    reporter,
    team: resolveTeam(reporter),
    goodQty: process.goodQty,
    defectQty: process.defectQty,
    defectBreakdown: enriched.defectBreakdown,
    defectReason:
      formatBreakdownLabel(enriched.defectBreakdown) || enriched.defectReasonLabel || '—',
    workHours: process.workHours ?? '—',
    taskStartTime: resolveTaskTime(datePrefix, process.startTime, '08:00'),
    taskEndTime: resolveTaskTime(datePrefix, process.endTime, '18:00'),
    remark: process.remark || record.remark || '',
    subsidyReportQty: process.subsidyReportQty,
    subsidyHours: process.subsidyHours,
    subsidyReason: process.subsidyReason || '',
    seq: index + 1,
  }
  return enrichProcessReportLine(base, config)
}

/** 登记产出·按工序登记详情聚合（结构对齐工序报工详情） */
export function buildReportWorkPerProcessBundle(record) {
  if (!record || record.perProcessRegister === false) return null

  const isWorkOrderRegistration = record.registrationType === '工单登记'
  void workOrderState.orders
  const wo = record.workOrderId
    ? workOrderState.orders.find((o) => o.id === record.workOrderId)
    : null

  const master = findMasterByCode(record.productCode)
  const materialCode = record.productCode || master?.code || wo?.materialCode || '—'
  const materialName = record.productName || master?.name || wo?.productName || '—'
  const activeProcesses = (record.processes || []).filter((p) => !p.deleted)
  const lines = activeProcesses.map((p, i) =>
    mapQuickReportProcessToLine(record, p, i, materialCode),
  )

  const firstReporter = lines[0]?.reporter || record.reporter

  return {
    id: record.id,
    reportId: record.id,
    isWorkOrderRegistration,
    workOrderCode: isWorkOrderRegistration ? record.workOrderNo || wo?.code || '—' : '',
    materialCode,
    materialName,
    specModel: master?.specModel || wo?.specModel || '—',
    workCenter: wo?.workCenter || resolveReporterWorkCenter(firstReporter),
    owner: wo?.owner || record.reporter || '—',
    processRouteName: record.routeName || wo?.processRouteName || '—',
    ebomLabel: resolveEbomLabel(materialName, master?.bomName || wo?.bom || ''),
    registerMode: record.registerMode || record.registrationType || '—',
    lines,
    summary: summarizeProcessReportLines(lines),
  }
}
