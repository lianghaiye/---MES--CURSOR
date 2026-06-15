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
} from '@/mock/quickReports'
import {
  calcMaterialList,
  getProductByCode,
  getProductById,
  getProductByName,
} from '@/mock/quickReportProducts'
import { normalizeQuickReportProcess } from '@/utils/quickReportProcess'

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
  if (perProcessRegister) {
    const activeProcesses = (payload.processes || []).filter((p) => !p.deleted && p.name?.trim())
    if (!activeProcesses.length) {
      return '请至少保留一道工序'
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

  const record = normalizeQuickReport({
    id: `qr-${Date.now()}`,
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
    workOrderNo,
    workOrderId: isWorkOrderMode ? payload.workOrderId || '' : '',
    registrationType,
    registrationMode: registrationType,
    workOrderStatus: '已报工',
    reporter: payload.reporter || 'admin1',
    remark: payload.remark || '',
    createdAt: now,
  })

  quickReportState.reports.unshift(record)
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
  }
  saveMaterialLists(materialLists)
  saveLastOperators(operators)

  return { ok: true, message: '报工成功', record }
}
