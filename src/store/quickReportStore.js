import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  QUICK_REPORT_STORAGE_KEY,
  QUICK_REPORT_MATERIAL_KEY,
  createQuickReportSeed,
  normalizeQuickReport,
  formatReportDate,
} from '@/mock/quickReports'
import { calcMaterialList, getProductByCode, getProductById } from '@/mock/quickReportProducts'

function loadReports() {
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
  const finishedQty = Number(payload.finishedQty)
  if (!finishedQty || finishedQty <= 0) {
    return '请填写完工数量'
  }
  if (!payload.reportDate) {
    return '请选择报工日期'
  }
  const activeProcesses = (payload.processes || []).filter((p) => !p.deleted && p.name?.trim())
  if (!activeProcesses.length) {
    return '请至少保留一道工序'
  }
  if (payload.perProcessMode) {
    const missing = activeProcesses.find((p) => !p.operators?.length)
    if (missing) return `请为「${missing.name}」指定操作人员`
  } else if (!payload.operators?.length) {
    return '请选择操作人员'
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

  const activeProcesses = payload.processes
    .filter((p) => !p.deleted && p.name?.trim())
    .map((p) => ({
      id: p.id || `proc-${Date.now()}-${Math.random()}`,
      processConfigId: p.processConfigId || '',
      name: p.name.trim(),
      code: p.code || '',
      qty: Number(p.qty) || 0,
      deleted: false,
      manual: !!p.manual,
      operators: p.operators || [],
    }))

  const operators = payload.perProcessMode
    ? flattenOperators(activeProcesses, [], true)
    : payload.operators

  const product = getProductById(payload.productId) || getProductByCode(payload.productCode)
  const materialItems = product ? calcMaterialList(product, payload.finishedQty) : []

  const workOrderNo = generateWorkOrderNo(payload.reportDate)
  const now = dayjs().format('YYYY-MM-DD HH:mm')

  const record = normalizeQuickReport({
    id: `qr-${Date.now()}`,
    productId: payload.productId,
    productName: payload.productName.trim(),
    productCode: payload.productCode?.trim() || '',
    reportDate: payload.reportDate,
    finishedQty: Number(payload.finishedQty),
    routeId: payload.routeId,
    routeName: payload.routeName,
    perProcessMode: !!payload.perProcessMode,
    processes: activeProcesses,
    operators,
    workOrderNo,
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
    finishedQty: record.finishedQty,
    items: materialItems,
    createdAt: record.createdAt,
  }
  saveMaterialLists(materialLists)
  saveLastOperators(operators)

  return { ok: true, message: '报工成功', record }
}
