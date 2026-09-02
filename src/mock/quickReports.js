import dayjs from 'dayjs'
import { normalizeQuickReportProcess } from '@/utils/quickReportProcess'
import { aggregateProcessesDefectLabel } from '@/utils/defectBreakdown'
import { enrichQuickReportForList } from '@/utils/quickReportEnrich'
import { createQuickReportSeedData } from '@/mock/quickReportSeed'

export const QUICK_REPORT_STORAGE_KEY = 'i_doms_mobile_quick_reports'
export const QUICK_REPORT_MATERIAL_KEY = 'i_doms_mobile_quick_material_lists'
export const QUICK_REPORT_SEED_VERSION_KEY = 'i_doms_quick_reports_seed_v'
export const QUICK_REPORT_SEED_VERSION = '8'

export function formatReportDate(d = new Date()) {
  return dayjs(d).format('YYYY-MM-DD')
}

function calcFinishedQty(processes, fallback) {
  if (fallback != null && fallback !== '') return Number(fallback) || 0
  const active = (processes || []).filter((p) => !p.deleted)
  if (!active.length) return 0
  return Math.max(...active.map((p) => Number(p.qty) || 0))
}

/** 解析良品/不良品/完工合计，兼容旧数据仅含 finishedQty */
export function resolveReportQuantities(row = {}) {
  const legacyFinished = Number(row.finishedQty) || 0
  const hasSplit =
    (row.goodQty != null && row.goodQty !== '') || (row.defectQty != null && row.defectQty !== '')
  if (!hasSplit) {
    return {
      goodQty: legacyFinished,
      defectQty: 0,
      finishedQty: legacyFinished,
    }
  }
  const goodQty = Math.max(0, Number(row.goodQty) || 0)
  const defectQty = Math.max(0, Number(row.defectQty) || 0)
  return {
    goodQty,
    defectQty,
    finishedQty: goodQty + defectQty,
  }
}

export function parseSubmitQuantities(payload = {}) {
  const goodQty = Number(payload.goodQty) || 0
  const defectQty = Number(payload.defectQty) || 0
  if (goodQty < 0 || defectQty < 0) {
    return { ok: false, message: '数量不能为负数' }
  }
  if (goodQty + defectQty <= 0) {
    return { ok: false, message: '请填写良品数或不良品数' }
  }
  return { ok: true, goodQty, defectQty, finishedQty: goodQty + defectQty }
}

function flattenOperators(processes, overallOperators, perProcessMode) {
  if (!perProcessMode) return overallOperators || []
  const set = new Set()
  ;(processes || [])
    .filter((p) => !p.deleted)
    .forEach((p) => (p.operators || []).forEach((n) => set.add(n)))
  return [...set]
}

/** 登记类型：关联已下发工单 → 工单登记，否则快速登记 */
export function resolveRegistrationType(row = {}) {
  if (row.registrationType) return row.registrationType
  if (row.registrationMode) return row.registrationMode
  if (row.workOrderId) return '工单登记'
  const no = row.workOrderNo || ''
  if (no && !no.startsWith('QK-')) return '工单登记'
  return '快速登记'
}

/** @deprecated 使用 resolveRegistrationType */
export function resolveRegistrationMode(row = {}) {
  return resolveRegistrationType(row)
}

/** 是否按工序登记（与小程序 perProcessRegister 一致） */
export function resolvePerProcessRegister(row = {}) {
  if (row.perProcessRegister !== undefined) return row.perProcessRegister !== false
  const activeProcesses = (row.processes || []).filter((p) => !p.deleted)
  if (!activeProcesses.length) return false
  return row.perProcessMode !== false
}

/** 登记方式展示：按工序登记 / 整体登记 */
export function resolveRegisterModeLabel(row = {}) {
  if (row.registerMode) return row.registerMode
  return resolvePerProcessRegister(row) ? '按工序登记' : '整体登记'
}

/** 登记日期：取记录创建时间日期部分 */
export function resolveRegisteredDate(row = {}) {
  if (row.registeredDate) return row.registeredDate
  if (row.createdAt) {
    const datePart = String(row.createdAt).split(' ')[0]
    if (datePart) return datePart
  }
  return row.reportDate || ''
}

/** 登记确认状态：待确认 / 已确认 */
export function resolveConfirmStatus(row = {}) {
  if (row.status === '已确认' || row.materialConfirmed) return '已确认'
  return '待确认'
}

export function isQuickReportConfirmed(row = {}) {
  return resolveConfirmStatus(row) === '已确认'
}

export function normalizeQuickReport(row) {
  const processes = (row.processes || []).map((p) => normalizeQuickReportProcess(p))
  const perProcessRegister = resolvePerProcessRegister(row)
  const operators = row.operators?.length
    ? row.operators
    : flattenOperators(processes, [], perProcessRegister)
  const qty = resolveReportQuantities({
    ...row,
    finishedQty: row.finishedQty ?? calcFinishedQty(processes, row.finishedQty),
  })
  const registrationType = resolveRegistrationType(row)
  const confirmStatus = resolveConfirmStatus(row)
  const enriched = enrichQuickReportForList({
    ...row,
    processes,
    processCount: processes.filter((p) => !p.deleted).length,
    ...qty,
    operators,
    perProcessRegister,
    perProcessMode: perProcessRegister,
    registrationType,
    registrationMode: registrationType,
    registerMode: resolveRegisterModeLabel({ ...row, perProcessRegister }),
    productionDate: row.reportDate || '',
    registeredDate: resolveRegisteredDate(row),
    reporter: row.reporter || '',
    workOrderStatus: row.workOrderStatus || '已报工',
    status: confirmStatus,
    confirmStatus,
    materialConfirmed: confirmStatus === '已确认',
    displayStatus: confirmStatus,
    defectReasonLabel: row.defectReasonLabel || aggregateProcessesDefectLabel(processes),
  })
  return enriched
}

export function createQuickReportSeed() {
  return createQuickReportSeedData()
}

export function filterQuickReports(list, filters = {}) {
  const {
    productName = '',
    workOrderNo = '',
    registrationType = '',
    registerMode = '',
    productionDateRange = null,
    registeredDateRange = null,
    reportDateRange = null,
    quickRange = null,
  } = filters

  const dateRange = productionDateRange || reportDateRange

  let result = [...list]

  if (quickRange === 'today') {
    const today = formatReportDate()
    result = result.filter((r) => r.reportDate === today)
  } else if (quickRange === 'week') {
    const now = new Date()
    const day = now.getDay() || 7
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - day + 1)
    weekStart.setHours(0, 0, 0, 0)
    result = result.filter((r) => {
      const d = new Date(String(r.reportDate).replace(/-/g, '/'))
      return d >= weekStart && d <= now
    })
  } else if (quickRange === 'month') {
    const start = dayjs().startOf('month')
    const end = dayjs().endOf('month')
    result = result.filter((r) => {
      const d = dayjs(r.reportDate)
      return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'))
    })
  }

  if (dateRange?.length === 2) {
    const [start, end] = dateRange
    result = result.filter((r) => {
      const d = dayjs(r.reportDate || r.productionDate)
      return !d.isBefore(dayjs(start).startOf('day')) && !d.isAfter(dayjs(end).endOf('day'))
    })
  }

  if (registeredDateRange?.length === 2) {
    const [start, end] = registeredDateRange
    result = result.filter((r) => {
      const d = dayjs(r.createdAt || r.registeredDate)
      return (
        d.isValid() &&
        !d.isBefore(dayjs(start).startOf('day')) &&
        !d.isAfter(dayjs(end).endOf('day'))
      )
    })
  }

  if (registrationType) {
    result = result.filter((r) => r.registrationType === registrationType)
  }

  if (registerMode) {
    result = result.filter((r) => r.registerMode === registerMode)
  }

  const nameKw = productName.trim()
  if (nameKw) {
    result = result.filter(
      (r) => r.productName?.includes(nameKw) || r.productCode?.includes(nameKw),
    )
  }

  const noKw = workOrderNo.trim()
  if (noKw) {
    result = result.filter((r) => r.workOrderNo?.includes(noKw))
  }

  return result
}

export function calcQuickReportStats(list) {
  const today = formatReportDate()
  const monthStart = dayjs().startOf('month')
  const monthEnd = dayjs().endOf('month')

  const todayList = list.filter((r) => r.reportDate === today)
  const monthList = list.filter((r) => {
    const d = dayjs(r.reportDate)
    return !d.isBefore(monthStart) && !d.isAfter(monthEnd)
  })

  return {
    todayQty: todayList.reduce((s, r) => s + (Number(r.finishedQty) || 0), 0),
    todayCount: todayList.length,
    monthQty: monthList.reduce((s, r) => s + (Number(r.finishedQty) || 0), 0),
  }
}
