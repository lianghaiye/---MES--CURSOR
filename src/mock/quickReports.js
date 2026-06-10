import dayjs from 'dayjs'

export const QUICK_REPORT_STORAGE_KEY = 'i_doms_mobile_quick_reports'
export const QUICK_REPORT_MATERIAL_KEY = 'i_doms_mobile_quick_material_lists'

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

function flattenOperators(processes, overallOperators, perProcessMode) {
  if (!perProcessMode) return overallOperators || []
  const set = new Set()
  ;(processes || [])
    .filter((p) => !p.deleted)
    .forEach((p) => (p.operators || []).forEach((n) => set.add(n)))
  return [...set]
}

export function normalizeQuickReport(row) {
  const processes = (row.processes || []).map((p) => ({
    ...p,
    deleted: !!p.deleted,
    operators: p.operators || [],
  }))
  const operators = row.operators?.length
    ? row.operators
    : flattenOperators(processes, [], row.perProcessMode)
  return {
    ...row,
    processes,
    processCount: processes.filter((p) => !p.deleted).length,
    finishedQty: row.finishedQty ?? calcFinishedQty(processes, row.finishedQty),
    operators,
    workOrderStatus: row.workOrderStatus || '已报工',
    displayStatus: row.workOrderStatus || '已报工',
  }
}

export function createQuickReportSeed() {
  const today = formatReportDate()
  return [
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
