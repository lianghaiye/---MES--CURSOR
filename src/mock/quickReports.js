import dayjs from 'dayjs'
import { normalizeQuickReportProcess } from '@/utils/quickReportProcess'
import { aggregateProcessesDefectLabel } from '@/utils/defectBreakdown'
import { enrichQuickReportForList } from '@/utils/quickReportEnrich'
import { createWorkOrderLinkedQuickReportSeed } from '@/mock/quickReportWorkOrderSeed'

export const QUICK_REPORT_STORAGE_KEY = 'i_doms_mobile_quick_reports'
export const QUICK_REPORT_MATERIAL_KEY = 'i_doms_mobile_quick_material_lists'
export const QUICK_REPORT_SEED_VERSION_KEY = 'i_doms_quick_reports_seed_v'
export const QUICK_REPORT_SEED_VERSION = '4'

export function formatReportDate(d = new Date()) {
  return dayjs(d).format('YYYY-MM-DD')
}

function daysAgo(n) {
  return dayjs().subtract(n, 'day').format('YYYY-MM-DD')
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
    displayStatus: row.workOrderStatus || '已报工',
    defectReasonLabel: row.defectReasonLabel || aggregateProcessesDefectLabel(processes),
  })
  return enriched
}

export function createQuickReportSeed() {
  const today = formatReportDate()
  const legacy = [
    normalizeQuickReport({
      id: 'qr-1',
      productId: 'prod-1',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      reportDate: today,
      finishedQty: 25,
      routeId: 'route-1',
      routeName: '标准焊接工艺 v2',
      perProcessMode: false,
      processes: [
        { id: 'p1', name: '点焊', qty: 25, deleted: false, operators: [] },
        { id: 'p2', name: '打磨', qty: 20, deleted: false, operators: [] },
      ],
      operators: ['张三', '李四'],
      workOrderNo: `QK-${today.replace(/-/g, '')}-001`,
      workOrderStatus: '已报工',
      reporter: '张三',
      createdAt: `${today} 09:30`,
      remark: '',
    }),
    normalizeQuickReport({
      id: 'qr-2',
      productId: 'prod-2',
      productName: '电机外壳',
      productCode: 'DJ-2024-B',
      reportDate: today,
      finishedQty: 18,
      goodQty: 16,
      defectQty: 2,
      routeId: 'route-2a',
      routeName: '冲压工艺 v1',
      perProcessMode: false,
      processes: [
        { id: 'p3', name: '冲压', qty: 18, deleted: false, operators: [] },
        { id: 'p4', name: '去毛刺', qty: 18, deleted: false, operators: [] },
      ],
      operators: ['王五'],
      workOrderNo: `QK-${today.replace(/-/g, '')}-002`,
      workOrderStatus: '已报工',
      reporter: '王五',
      createdAt: `${today} 11:20`,
      remark: '',
    }),
    normalizeQuickReport({
      id: 'qr-3',
      productId: 'prod-3',
      productName: '法兰盘',
      productCode: 'FL-2024-C',
      reportDate: daysAgo(3),
      finishedQty: 12,
      routeId: 'route-3',
      routeName: '机加标准路线',
      perProcessMode: false,
      processes: [{ id: 'p5', name: '机加工', qty: 12, deleted: false, operators: [] }],
      operators: ['赵六', '钱七'],
      workOrderNo: `QK-${daysAgo(3).replace(/-/g, '')}-001`,
      workOrderStatus: '已报工',
      reporter: '赵六',
      createdAt: `${daysAgo(3)} 15:00`,
      remark: '',
    }),
    normalizeQuickReport({
      id: 'qr-4',
      productId: 'prod-4',
      productName: '密封圈',
      productCode: 'SEAL-2024-D',
      reportDate: daysAgo(10),
      finishedQty: 200,
      routeId: 'route-4',
      routeName: '硫化成型路线',
      perProcessMode: false,
      processes: [
        { id: 'p6', name: '硫化', qty: 200, deleted: false, operators: [] },
        { id: 'p7', name: '检验', qty: 200, deleted: false, operators: [] },
      ],
      operators: ['孙八'],
      workOrderNo: `QK-${daysAgo(10).replace(/-/g, '')}-003`,
      workOrderStatus: '已报工',
      reporter: '孙八',
      createdAt: `${daysAgo(10)} 08:45`,
      remark: '',
    }),
  ]
  return [...createWorkOrderLinkedQuickReportSeed(), ...legacy]
}

export function filterQuickReports(list, filters = {}) {
  const { productName = '', workOrderNo = '', reportDateRange = null, quickRange = null } = filters

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

  if (reportDateRange?.length === 2) {
    const [start, end] = reportDateRange
    result = result.filter((r) => {
      const d = dayjs(r.reportDate)
      return !d.isBefore(dayjs(start).startOf('day')) && !d.isAfter(dayjs(end).endOf('day'))
    })
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
