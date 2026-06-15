import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  PROCESS_REPORT_STORAGE_KEY,
  PROCESS_REPORT_SEED_VERSION,
  PROCESS_REPORT_SEED_VERSION_KEY,
  PROCESS_REPORT_WO_LOG_KEY,
  createProcessReportSeed,
  filterProcessReports,
  normalizeProcessReport,
  createProcessReportWoLogSeed,
} from '@/mock/processReportRecords'
import { enrichProcessReportRecord } from '@/utils/processReportEnrich'
import {
  buildProcessReportWorkOrderBundle,
  calcProcessReportStats,
} from '@/utils/processReportWorkOrder'
import { calcAutoDurationHours } from '@/utils/laborHourCalc'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { breakdownToLegacy } from '@/utils/defectBreakdown'

function shouldReseed() {
  return localStorage.getItem(PROCESS_REPORT_SEED_VERSION_KEY) !== PROCESS_REPORT_SEED_VERSION
}

function loadRecords() {
  if (shouldReseed()) {
    const seed = createProcessReportSeed()
    localStorage.setItem(PROCESS_REPORT_STORAGE_KEY, JSON.stringify(seed))
    localStorage.setItem(PROCESS_REPORT_SEED_VERSION_KEY, PROCESS_REPORT_SEED_VERSION)
    localStorage.setItem(
      PROCESS_REPORT_WO_LOG_KEY,
      JSON.stringify(createProcessReportWoLogSeed()),
    )
    return seed
  }
  try {
    const raw = localStorage.getItem(PROCESS_REPORT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(normalizeProcessReport)
      }
    }
  } catch {
    /* ignore */
  }
  const seed = createProcessReportSeed()
  localStorage.setItem(PROCESS_REPORT_STORAGE_KEY, JSON.stringify(seed))
  localStorage.setItem(PROCESS_REPORT_SEED_VERSION_KEY, PROCESS_REPORT_SEED_VERSION)
  localStorage.setItem(PROCESS_REPORT_WO_LOG_KEY, JSON.stringify(createProcessReportWoLogSeed()))
  return seed
}

function loadWoLogs() {
  try {
    const raw = localStorage.getItem(PROCESS_REPORT_WO_LOG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function saveWoLogs(map) {
  localStorage.setItem(PROCESS_REPORT_WO_LOG_KEY, JSON.stringify(map))
}

function saveRecords(records) {
  localStorage.setItem(PROCESS_REPORT_STORAGE_KEY, JSON.stringify(records))
}

export const processReportState = reactive({
  records: loadRecords(),
})

export function reloadProcessReports() {
  processReportState.records = loadRecords()
}

export function getProcessReportStats() {
  return calcProcessReportStats(processReportState.records)
}

export function getProcessReports(filters = {}) {
  return filterProcessReports(processReportState.records, filters).map(enrichProcessReportRecord)
}

export function getProcessReportById(id) {
  const row = processReportState.records.find((r) => r.id === id)
  return row ? enrichProcessReportRecord(row) : null
}

export function getProcessReportWorkOrderBundle(workOrderId) {
  const logsMap = loadWoLogs()
  return buildProcessReportWorkOrderBundle(
    workOrderId,
    processReportState.records,
    logsMap[workOrderId] || [],
  )
}

function appendWorkOrderLog(workOrderId, entry) {
  const logsMap = loadWoLogs()
  const list = logsMap[workOrderId] || []
  list.unshift({
    id: `pr-log-${Date.now()}`,
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operator: entry.operator || 'admin1',
    action: entry.action,
    target: entry.target || '',
    remark: entry.remark || '',
  })
  logsMap[workOrderId] = list
  saveWoLogs(logsMap)
}

function updateRecord(id, patch) {
  const idx = processReportState.records.findIndex((r) => r.id === id)
  if (idx === -1) return null
  Object.assign(processReportState.records[idx], patch)
  saveRecords(processReportState.records)
  return enrichProcessReportRecord(processReportState.records[idx])
}

export function approveProcessReport(id, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status !== '待审核') return { ok: false, message: '仅待审核记录可审核' }
  const updated = updateRecord(id, {
    status: '已审核',
    auditedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    auditor: operator,
  })
  if (row.workOrderId) {
    appendWorkOrderLog(row.workOrderId, {
      operator,
      action: '通过',
      target: row.taskNo || row.processName,
      remark: '审核通过',
    })
  }
  return { ok: true, record: updated }
}

export function rejectProcessReport(id, reason, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status !== '待审核') return { ok: false, message: '仅待审核记录可拒绝' }
  if (!reason?.trim()) return { ok: false, message: '请填写拒绝原因' }
  const updated = updateRecord(id, {
    status: '已拒绝',
    rejectReason: reason.trim(),
    auditedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    auditor: operator,
  })
  if (row.workOrderId) {
    appendWorkOrderLog(row.workOrderId, {
      operator,
      action: '拒绝',
      target: row.taskNo || row.processName,
      remark: reason.trim(),
    })
  }
  return { ok: true, record: updated }
}

export function batchApproveProcessReports(ids, operator = 'admin1') {
  const pending = ids.filter((id) => {
    const row = processReportState.records.find((r) => r.id === id)
    return row?.status === '待审核'
  })
  if (!pending.length) return { ok: false, message: '请选择待审核记录' }
  pending.forEach((id) => approveProcessReport(id, operator))
  return { ok: true, message: `已通过 ${pending.length} 条` }
}

export function batchRejectProcessReports(ids, reason, operator = 'admin1') {
  if (!reason?.trim()) return { ok: false, message: '请填写拒绝原因' }
  const pending = ids.filter((id) => {
    const row = processReportState.records.find((r) => r.id === id)
    return row?.status === '待审核'
  })
  if (!pending.length) return { ok: false, message: '请选择待审核记录' }
  pending.forEach((id) => rejectProcessReport(id, reason, operator))
  return { ok: true, message: `已拒绝 ${pending.length} 条` }
}

export function adjustProcessReportLine(recordId, payload = {}) {
  const row = processReportState.records.find((r) => r.id === recordId)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status === '已审核') return { ok: false, message: '已审核数据不可调整' }

  const patch = {}
  if (payload.adjustedGoodQty != null) patch.adjustedGoodQty = payload.adjustedGoodQty
  if (payload.adjustedDefectQty != null) patch.adjustedDefectQty = payload.adjustedDefectQty
  if (payload.adjustedWorkHours != null) patch.adjustedWorkHours = payload.adjustedWorkHours
  if (payload.adjustReason != null) patch.adjustReason = payload.adjustReason
  if (payload.adjustedDefectBreakdown != null) {
    const legacy = breakdownToLegacy(payload.adjustedDefectBreakdown)
    patch.adjustedDefectBreakdown = legacy.defectBreakdown
  }

  const config = resolveLaborConfig(row.productCode, row.processName)
  if (config?.reportType === '批量计件' && config?.salaryMethod === '计时工资') {
    const qty = patch.adjustedGoodQty ?? row.adjustedGoodQty ?? row.goodQty ?? 0
    patch.adjustedWorkHours = calcAutoDurationHours(config, qty)
  }

  updateRecord(recordId, patch)
  if (row.workOrderId) {
    appendWorkOrderLog(row.workOrderId, {
      action: '调整',
      target: row.taskNo || row.processName,
      remark: payload.adjustReason || '',
    })
  }
  return { ok: true }
}

export function subsidyProcessReportLine(recordId, payload = {}) {
  const row = processReportState.records.find((r) => r.id === recordId)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status === '已审核') return { ok: false, message: '已审核数据不可补贴' }

  const config = resolveLaborConfig(row.productCode, row.processName)
  const patch = {}
  if (config?.salaryMethod === '计件工资') {
    patch.subsidyReportQty = Number(payload.subsidyReportQty) || 0
  } else {
    patch.subsidyHours = Number(payload.subsidyHours) || 0
  }
  if (payload.subsidyReason != null) patch.subsidyReason = payload.subsidyReason

  updateRecord(recordId, patch)
  if (row.workOrderId) {
    appendWorkOrderLog(row.workOrderId, {
      action: '补贴',
      target: row.taskNo || row.processName,
      remark: payload.subsidyReason || '',
    })
  }
  return { ok: true }
}

export function auditProcessReportLine(recordId, result, reason = '', operator = 'admin1') {
  if (result === 'reject') {
    return rejectProcessReport(recordId, reason, operator)
  }
  return approveProcessReport(recordId, operator)
}
