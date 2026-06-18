import dayjs from 'dayjs'
import { enrichLaborLine } from '@/utils/laborHourCalc'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'

export const laborAuditStatusOptions = ['待审核', '部分审核', '已审核']

export const laborTaskStatusOptions = ['已报工', '已审核']
export const laborPushStatusOptions = ['未推送', '已推送', '已自动推送']

export const periodOptions = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本年', value: 'year' },
]

function createLine(partial, materialCode) {
  const config = resolveLaborConfig(materialCode, partial.processName)
  const base = {
    id: `lhl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    auditStatus: '待审核',
    taskStatus: '已报工',
    pushStatus: '',
    executor: 'admin',
    operator: '',
    team: '',
    processName: '',
    taskNo: `T${dayjs().format('YYYYMMDD')}${String(Math.floor(Math.random() * 900) + 100)}`,
    reportQty: 1,
    reportDuration: 0,
    adjustedReportQty: null,
    adjustedDuration: null,
    subsidyReportQty: 0,
    subsidyHours: 0,
    adjustReason: '',
    subsidyReason: '',
    remark: '',
    taskStartTime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm'),
    taskEndTime: dayjs().format('YYYY-MM-DD HH:mm'),
    ...partial,
  }
  if (!base.operator) base.operator = base.executor || ''
  return enrichLaborLine(base, config)
}

function resolveOrderAuditStatus(lines) {
  const active = lines.filter((l) => l.auditStatus !== '已作废')
  if (!active.length) return '待审核'
  const audited = active.filter((l) => l.auditStatus === '已审核').length
  if (audited === 0) return '待审核'
  if (audited === active.length) return '已审核'
  return '部分审核'
}

export function buildLaborHourRecord(partial) {
  const lines = (partial.lines || []).map((l, i) =>
    createLine({ ...l, seq: i + 1 }, partial.materialCode),
  )
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  return {
    id: partial.id || (partial.workOrderId ? `lh-${partial.workOrderId}` : `lh-${Date.now()}`),
    workOrderId: partial.workOrderId || '',
    workOrderType: partial.workOrderType || 'production',
    workOrderCode: partial.workOrderCode || '',
    workOrderName: partial.workOrderName || '',
    salesOrderNo: partial.salesOrderNo || '',
    materialCode: partial.materialCode || '',
    materialName: partial.materialName || '',
    specModel: partial.specModel || '',
    processRouteName: partial.processRouteName || '',
    workCenter: partial.workCenter || '默认工厂',
    owner: partial.owner || 'admin1',
    scheduleQty: partial.scheduleQty ?? 0,
    auditStatus: partial.auditStatus || resolveOrderAuditStatus(lines),
    createdAt: partial.createdAt || now,
    completedAt: partial.completedAt || '',
    latestSubmitAt: partial.latestSubmitAt || now,
    lines,
    logs: partial.logs || [],
  }
}

export function filterLaborHourOrders(list, filters = {}) {
  let rows = [...list]
  if (filters.workOrderCode?.trim()) {
    const kw = filters.workOrderCode.trim().toLowerCase()
    rows = rows.filter((r) => r.workOrderCode.toLowerCase().includes(kw))
  }
  if (filters.workCenter) {
    rows = rows.filter((r) => r.workCenter === filters.workCenter)
  }
  if (filters.dateRange?.length === 2) {
    const [start, end] = filters.dateRange
    rows = rows.filter((r) => {
      const d = (r.createdAt || '').slice(0, 10)
      return d >= start && d <= end
    })
  }
  if (filters.period) {
    const now = dayjs()
    rows = rows.filter((r) => {
      const d = dayjs((r.latestSubmitAt || r.createdAt || '').replace(' ', 'T'))
      if (!d.isValid()) return false
      if (filters.period === 'week') return d.isAfter(now.startOf('week'))
      if (filters.period === 'month') return d.isAfter(now.startOf('month'))
      if (filters.period === 'year') return d.isAfter(now.startOf('year'))
      return true
    })
  }
  return rows
}

export function getPreviousPeriodRange(period) {
  const now = dayjs()
  if (period === 'week') {
    const start = now.startOf('week').subtract(1, 'week')
    return [start, start.endOf('week')]
  }
  if (period === 'month') {
    const start = now.startOf('month').subtract(1, 'month')
    return [start, start.endOf('month')]
  }
  const start = now.startOf('year').subtract(1, 'year')
  return [start, start.endOf('year')]
}
