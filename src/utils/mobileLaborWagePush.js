/**
 * 工时工资推送至小程序端「工时工资」列表（与 i-doms-mobile 共用 storage key）
 */
import dayjs from 'dayjs'
import { getApprovedDuration, getApprovedReportQty } from '@/utils/laborHourCalc'

export const MOBILE_LABOR_WAGE_KEY = 'i_doms_mobile_labor_wage_lines'

export const TASK_STATUS = {
  REPORTED: '已报工',
  AUDITED: '已审核',
}

export const PUSH_STATUS = {
  NOT_PUSHED: '未推送',
  PUSHED: '已推送',
  AUTO_PUSHED: '已自动推送',
}

export function isPushedToMobile(pushStatus) {
  return pushStatus === PUSH_STATUS.PUSHED || pushStatus === PUSH_STATUS.AUTO_PUSHED
}

export function loadMobileLaborWageList() {
  try {
    const raw = localStorage.getItem(MOBILE_LABOR_WAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

export function saveMobileLaborWageList(list) {
  localStorage.setItem(MOBILE_LABOR_WAGE_KEY, JSON.stringify(list))
}

export function buildMobileWageItem(order, line) {
  const reportQty = getApprovedReportQty(line)
  const reportDuration = getApprovedDuration(line)
  return {
    id: line.id,
    laborOrderId: order.id,
    workOrderId: order.workOrderId,
    workOrderCode: order.workOrderCode,
    workOrderName: order.workOrderName,
    materialCode: order.materialCode,
    materialName: order.materialName,
    taskNo: line.taskNo,
    processName: line.processName,
    executor: line.executor,
    operator: line.operator || line.executor || '',
    taskStatus: line.taskStatus || TASK_STATUS.REPORTED,
    pushStatus: line.pushStatus || PUSH_STATUS.NOT_PUSHED,
    reportQty,
    reportDuration,
    adjustedReportQty: line.adjustedReportQty,
    adjustedDuration: line.adjustedDuration,
    subsidyReportQty: line.subsidyReportQty || 0,
    subsidyHours: line.subsidyHours || 0,
    accountHours: line.accountHours,
    salaryAmount: line.salaryAmount,
    reportType: line.reportType,
    salaryMethod: line.salaryMethod,
    reportTypeLabel: line.calcMethod || `${line.reportType}+${line.salaryMethod}`,
    adjustReason: line.adjustReason || '',
    subsidyReason: line.subsidyReason || '',
    remark: line.remark || '',
    reportTime: line.taskEndTime || line.taskStartTime || dayjs().format('YYYY-MM-DD HH:mm'),
    pushedAt: line.pushedAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export function buildMobileWageItemFromProcessReport(bundle, line) {
  const goodQty = line.adjustedGoodQty ?? line.goodQty ?? 0
  const defectQty = line.adjustedDefectQty ?? line.defectQty ?? 0
  const workHours = line.adjustedWorkHours ?? line.workHours ?? 0
  const accountHours =
    line.listAccountHours != null && Number.isFinite(Number(line.listAccountHours))
      ? Number(line.listAccountHours)
      : (line.accountHours ?? workHours)
  return {
    id: line.id,
    source: 'process-report',
    laborOrderId: bundle.id,
    workOrderId: bundle.workOrderId,
    workOrderCode: bundle.workOrderCode,
    workOrderName: bundle.workOrderName,
    materialCode: bundle.materialCode,
    materialName: bundle.materialName,
    salesOrderNo: bundle.salesOrderNo,
    taskNo: line.taskNo,
    processName: line.processName,
    executor: line.reporter,
    operator: line.operator || line.reporter || '',
    taskStatus: line.taskStatus || TASK_STATUS.REPORTED,
    pushStatus: line.pushStatus || PUSH_STATUS.NOT_PUSHED,
    goodQty,
    defectQty,
    reportQty: goodQty,
    reportDuration: workHours,
    adjustedGoodQty: line.adjustedGoodQty,
    adjustedDefectQty: line.adjustedDefectQty,
    adjustedReportQty: line.adjustedGoodQty,
    adjustedDuration: line.adjustedWorkHours,
    subsidyReportQty: line.subsidyReportQty || 0,
    subsidyHours: line.subsidyHours || 0,
    subsidyAmount: line.subsidyAmount,
    accountHours,
    goodWage: line.goodWage,
    defectWage: line.defectWage,
    manualQualityDeduction: line.manualQualityDeduction,
    salaryAmount: line.salaryAmount,
    reportType: line.reportType,
    salaryMethod: line.salaryMethod,
    reportTypeLabel: line.calcMethod || `${line.reportType || ''}+${line.salaryMethod || ''}`,
    adjustReason: line.adjustReason || '',
    subsidyReason: line.subsidyReason || '',
    remark: line.remark || '',
    reportTime: line.taskEndTime || line.taskStartTime || dayjs().format('YYYY-MM-DD HH:mm'),
    pushedAt: line.pushedAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export function upsertMobileWageItemFromProcessReport(bundle, line) {
  if (!isPushedToMobile(line.pushStatus)) return null
  const list = loadMobileLaborWageList()
  const item = buildMobileWageItemFromProcessReport(bundle, line)
  const idx = list.findIndex((row) => row.id === line.id)
  if (idx >= 0) list[idx] = { ...list[idx], ...item }
  else list.unshift(item)
  saveMobileLaborWageList(list)
  return item
}

export function upsertMobileWageItem(order, line) {
  if (!isPushedToMobile(line.pushStatus)) return null
  const list = loadMobileLaborWageList()
  const item = buildMobileWageItem(order, line)
  const idx = list.findIndex((row) => row.id === line.id)
  if (idx >= 0) list[idx] = { ...list[idx], ...item }
  else list.unshift(item)
  saveMobileLaborWageList(list)
  return item
}

export function updateMobileWageStatus(lineId, patch) {
  const list = loadMobileLaborWageList()
  const idx = list.findIndex((row) => row.id === lineId)
  if (idx < 0) return null
  list[idx] = { ...list[idx], ...patch }
  saveMobileLaborWageList(list)
  return list[idx]
}

export function removeMobileWageItem(lineId) {
  const list = loadMobileLaborWageList().filter((row) => row.id !== lineId)
  saveMobileLaborWageList(list)
}
