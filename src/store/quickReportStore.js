import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  QUICK_REPORT_STORAGE_KEY,
  QUICK_REPORT_MATERIAL_KEY,
  QUICK_REPORT_SEED_VERSION_KEY,
  QUICK_REPORT_SEED_VERSION,
  createQuickReportSeed,
  normalizeQuickReport,
  formatReportDate,
  parseSubmitQuantities,
  isQuickReportConfirmed,
} from '@/mock/quickReports'
import {
  calcMaterialList,
  getProductByCode,
  getProductById,
  getProductByName,
} from '@/mock/quickReportProducts'
import { normalizeQuickReportProcess } from '@/utils/quickReportProcess'
import { buildReportWorkPerProcessBundle } from '@/utils/reportWorkPerProcess'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { validateDefectBreakdown, getProcessDefectItemsForForm, resolveOverallDefectItems } from '@/utils/defectBreakdown'
import { buildQuickReportProcessesFromRoute } from '@/utils/quickReportProcess'
import { isDurationReportMode } from '@/utils/reportMode'

function shouldReseedReports() {
  return localStorage.getItem(QUICK_REPORT_SEED_VERSION_KEY) !== QUICK_REPORT_SEED_VERSION
}

function loadReports() {
  if (shouldReseedReports()) {
    const seed = createQuickReportSeed()
    localStorage.setItem(QUICK_REPORT_STORAGE_KEY, JSON.stringify(seed))
    localStorage.setItem(QUICK_REPORT_SEED_VERSION_KEY, QUICK_REPORT_SEED_VERSION)
    return seed
  }
  try {
    const raw = localStorage.getItem(QUICK_REPORT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(normalizeQuickReport)
      }
    }
  } catch {
    /* ignore */
  }
  const seed = createQuickReportSeed()
  localStorage.setItem(QUICK_REPORT_STORAGE_KEY, JSON.stringify(seed))
  localStorage.setItem(QUICK_REPORT_SEED_VERSION_KEY, QUICK_REPORT_SEED_VERSION)
  return seed
}

function saveReports(reports) {
  localStorage.setItem(QUICK_REPORT_STORAGE_KEY, JSON.stringify(reports))
}

function loadMaterialLists() {
  try {
    const raw = localStorage.getItem(QUICK_REPORT_MATERIAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function saveMaterialLists(data) {
  localStorage.setItem(QUICK_REPORT_MATERIAL_KEY, JSON.stringify(data))
}

export const quickReportState = reactive({
  reports: loadReports(),
})

export function reloadQuickReports() {
  quickReportState.reports = loadReports()
}

export function getQuickReportById(id) {
  reloadQuickReports()
  const row = quickReportState.reports.find((r) => r.id === id)
  return row ? normalizeQuickReport(row) : null
}

export function getReportWorkPerProcessBundle(id) {
  const row = getQuickReportById(id)
  if (!row) return null
  return buildReportWorkPerProcessBundle(row)
}

export function subsidyQuickReportProcess(reportId, processId, payload = {}) {
  reloadQuickReports()
  const report = quickReportState.reports.find((r) => r.id === reportId)
  if (!report) return { ok: false, message: '记录不存在' }
  const process = (report.processes || []).find((p) => p.id === processId && !p.deleted)
  if (!process) return { ok: false, message: '工序不存在' }

  const config = resolveLaborConfig(report.productCode, process.name)
  if (config?.salaryMethod === '计件工资') {
    process.subsidyReportQty = Number(payload.subsidyReportQty) || 0
  } else {
    process.subsidyHours = Number(payload.subsidyHours) || 0
  }
  if (payload.subsidyReason != null) process.subsidyReason = payload.subsidyReason

  const idx = report.processes.findIndex((p) => p.id === processId)
  if (idx >= 0) {
    report.processes[idx] = normalizeQuickReportProcess(process)
  }
  saveReports(quickReportState.reports)
  return { ok: true }
}

export function generateWorkOrderNo(reportDate) {
  const datePart = (reportDate || formatReportDate()).replace(/-/g, '')
  const key = `qr_wo_seq_${datePart}`
  let seq = Number(localStorage.getItem(key) || 0)
  seq += 1
  localStorage.setItem(key, String(seq))
  return `QK-${datePart}-${String(seq).padStart(3, '0')}`
}

function flattenOperators(processes, overallOperators, perProcessMode) {
  if (!perProcessMode) return overallOperators || []
  const set = new Set()
  processes.filter((p) => !p.deleted).forEach((p) => (p.operators || []).forEach((n) => set.add(n)))
  return [...set]
}

function getProcessDefectItems(processName) {
  return getProcessDefectItemsForForm(processName)
}

export function confirmQuickReport(id) {
  reloadQuickReports()
  const report = quickReportState.reports.find((r) => r.id === id)
  if (!report) return { ok: false, message: '记录不存在' }
  if (isQuickReportConfirmed(report)) return { ok: false, message: '该记录已确认' }
  report.status = '已确认'
  report.materialConfirmed = true
  const idx = quickReportState.reports.findIndex((r) => r.id === id)
  quickReportState.reports[idx] = normalizeQuickReport(report)
  saveReports(quickReportState.reports)
  const materialLists = loadMaterialLists()
  if (materialLists[id]) {
    materialLists[id].status = '已确认'
    saveMaterialLists(materialLists)
  }
  return { ok: true, message: '已确认' }
}

export function batchConfirmQuickReports(ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (!uniqueIds.length) return { ok: false, message: '请选择待确认记录' }
  let count = 0
  uniqueIds.forEach((id) => {
    const res = confirmQuickReport(id)
    if (res.ok) count += 1
  })
  if (!count) return { ok: false, message: '没有可确认的记录' }
  return { ok: true, message: `已确认 ${count} 条记录`, count }
}

export function deleteQuickReport(id) {
  reloadQuickReports()
  const idx = quickReportState.reports.findIndex((r) => r.id === id)
  if (idx === -1) return { ok: false, message: '记录不存在' }
  if (isQuickReportConfirmed(quickReportState.reports[idx])) {
    return { ok: false, message: '已确认记录不可删除' }
  }
  quickReportState.reports.splice(idx, 1)
  saveReports(quickReportState.reports)
  const materialLists = loadMaterialLists()
  if (materialLists[id]) {
    delete materialLists[id]
    saveMaterialLists(materialLists)
  }
  return { ok: true, message: '已删除' }
}

function resolveOverallDefectItemsForPayload(payload = {}) {
  const names = (payload.processes || []).filter((p) => !p.deleted).map((p) => p.name)
  if (names.length) return resolveOverallDefectItems(names)
  if (payload.routeName) {
    const procs = buildQuickReportProcessesFromRoute(payload.routeName, {})
    return resolveOverallDefectItems(procs.map((p) => p.name))
  }
  return resolveOverallDefectItems([])
}

function validateSubmit(payload) {
  if (!payload.productId && !payload.productName?.trim()) {
    return '请选择产品'
  }
  const qtyCheck = parseSubmitQuantities(payload)
  if (!qtyCheck.ok) return qtyCheck.message
  if (!payload.reportDate) {
    return '请选择生产日期'
  }
  const perProcessRegister = payload.perProcessRegister !== false
  if (!perProcessRegister) {
    const items = resolveOverallDefectItemsForPayload(payload)
    const defectErr = validateDefectBreakdown(payload.defectQty, payload.defectBreakdown, items)
    if (defectErr) return defectErr
  }
  if (perProcessRegister) {
    const activeProcesses = (payload.processes || []).filter((p) => !p.deleted && p.name?.trim())
    if (!activeProcesses.length) {
      return '请至少保留一道工序'
    }
    for (const p of activeProcesses) {
      if (isDurationReportMode(p.reportMode)) {
        const hours = Number(p.workHours)
        if (!hours || hours <= 0) return `${p.name}：请填写工作时长`
      }
      const items = getProcessDefectItems(p.name)
      const defectErr = validateDefectBreakdown(p.defectQty, p.defectBreakdown, items)
      if (defectErr) return `${p.name}：${defectErr}`
    }
  }
  return null
}

const OPERATOR_MEMORY_KEY = 'i_doms_mobile_qr_last_operators'

export function getLastOperators() {
  try {
    const raw = localStorage.getItem(OPERATOR_MEMORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return ['张三', '李四']
}

export function saveLastOperators(operators) {
  if (!operators?.length) return
  localStorage.setItem(OPERATOR_MEMORY_KEY, JSON.stringify(operators))
}

/** 提交报工（与小程序共用 localStorage，双向可见） */
export function submitQuickReport(payload) {
  reloadQuickReports()
  const err = validateSubmit(payload)
  if (err) return { ok: false, message: err }

  const isEdit = !!payload.id
  const existingIdx = isEdit ? quickReportState.reports.findIndex((r) => r.id === payload.id) : -1
  if (isEdit && existingIdx === -1) return { ok: false, message: '记录不存在' }
  if (isEdit && isQuickReportConfirmed(quickReportState.reports[existingIdx])) {
    return { ok: false, message: '已确认记录不可修改' }
  }

  const perProcessRegister = payload.perProcessRegister !== false
  const activeProcesses = perProcessRegister
    ? payload.processes
        .filter((p) => !p.deleted && p.name?.trim())
        .map((p) =>
          normalizeQuickReportProcess({
            ...p,
            name: p.name.trim(),
            deleted: false,
          }),
        )
    : []

  const operators = perProcessRegister
    ? flattenOperators(activeProcesses, [], true)
    : payload.operators || []

  const qtyCheck = parseSubmitQuantities(payload)
  const { goodQty, defectQty, finishedQty } = qtyCheck

  const product =
    getProductById(payload.productId) ||
    getProductByCode(payload.productCode) ||
    getProductByName(payload.productName)
  const materialItems = product ? calcMaterialList(product, finishedQty) : []

  const registrationType =
    payload.registrationType ||
    (payload.registrationMode === '工单登记' || payload.workOrderId ? '工单登记' : '快速登记')
  const isWorkOrderMode = registrationType === '工单登记'
  const workOrderNo = isWorkOrderMode
    ? payload.sourceWorkOrderNo || payload.workOrderNo
    : generateWorkOrderNo(payload.reportDate)
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const existing = isEdit ? quickReportState.reports[existingIdx] : null

  const record = normalizeQuickReport({
    id: payload.id || `qr-${Date.now()}`,
    productId: payload.productId,
    productName: payload.productName.trim(),
    productCode: payload.productCode?.trim() || '',
    reportDate: payload.reportDate,
    goodQty,
    defectQty,
    finishedQty,
    routeId: payload.routeId,
    routeName: payload.routeName,
    perProcessRegister,
    perProcessMode: perProcessRegister,
    processes: activeProcesses,
    operators,
    defectBreakdown: perProcessRegister ? [] : payload.defectBreakdown || [],
    defectItemIds: perProcessRegister ? [] : payload.defectItemIds || [],
    defectItemNames: perProcessRegister ? [] : payload.defectItemNames || [],
    defectReasonLabel: perProcessRegister ? '' : payload.defectReasonLabel || '',
    workOrderNo: isEdit ? existing?.workOrderNo || workOrderNo : workOrderNo,
    workOrderId: isEdit ? existing?.workOrderId || (isWorkOrderMode ? payload.workOrderId || '' : '') : isWorkOrderMode ? payload.workOrderId || '' : '',
    registrationType: isEdit ? existing?.registrationType || registrationType : registrationType,
    registrationMode: isEdit ? existing?.registrationMode || registrationType : registrationType,
    workOrderStatus: existing?.workOrderStatus || '已报工',
    status: existing?.status || '待确认',
    materialConfirmed: existing?.materialConfirmed || false,
    reporter: payload.reporter || existing?.reporter || 'admin1',
    remark: payload.remark || '',
    createdAt: existing?.createdAt || now,
  })

  if (isEdit) {
    quickReportState.reports[existingIdx] = record
  } else {
    quickReportState.reports.unshift(record)
  }
  saveReports(quickReportState.reports)

  const materialLists = loadMaterialLists()
  materialLists[record.id] = {
    reportId: record.id,
    workOrderNo: record.workOrderNo,
    productName: record.productName,
    productCode: record.productCode,
    goodQty: record.goodQty,
    defectQty: record.defectQty,
    finishedQty: record.finishedQty,
    items: materialItems,
    createdAt: record.createdAt,
    status: record.confirmStatus,
  }
  saveMaterialLists(materialLists)
  saveLastOperators(operators)

  return { ok: true, message: isEdit ? '登记已更新' : '报工成功', record }
}
