import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { buildLaborHourRecord, filterLaborHourOrders, getPreviousPeriodRange } from '@/mock/laborHourManagement'
import { LABOR_DEMO_WORK_ORDER_IDS } from '@/mock/laborHourDemoSeed'
import { calcAutoDurationHours, enrichLaborLine, summarizeLaborLines } from '@/utils/laborHourCalc'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { LABOR_CONFIG_VERSION } from '@/mock/laborConfigSeed'

const STORAGE_KEY = 'i_doms_labor_hour_orders'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) {
        return {
          orders: parsed.orders.map((o) => recalcOrder(o)),
          laborConfigVersion: parsed.laborConfigVersion,
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      orders: laborHourState.orders,
      laborConfigVersion: LABOR_CONFIG_VERSION,
    }),
  )
}

/** 按产品/物料最新工时配置重算全部工时记录 */
export function refreshAllLaborHourOrders() {
  laborHourState.orders = laborHourState.orders.map((o) => recalcOrder(o))
}

function resolveOrderAuditStatus(lines) {
  const active = lines.filter((l) => l.auditStatus !== '已作废')
  if (!active.length) return '待审核'
  const audited = active.filter((l) => l.auditStatus === '已审核').length
  if (audited === 0) return '待审核'
  if (audited === active.length) return '已审核'
  return '部分审核'
}

export function recalcOrder(order) {
  const lines = (order.lines || []).map((line) =>
    enrichLaborLine(line, resolveLaborConfig(order.materialCode, line.processName)),
  )
  const summary = summarizeLaborLines(lines)
  return {
    ...order,
    lines,
    auditStatus: order.auditStatus || resolveOrderAuditStatus(lines),
    ...summary,
    auditedTotalHours: summary.auditedHours,
    auditedReportCount: summary.auditedReportQty,
    subsidyTotalHours: summary.subsidyHours,
    subsidyTotalReportQty: summary.subsidyReportQty,
    estimatedSalary: summary.salaryAmount,
    taskCount: summary.taskCount,
    participantCount: summary.participantCount,
  }
}

function mapWorkOrderToLaborCandidate(wo, workOrderType) {
  if (!wo?.processes?.length) return null
  const reported = wo.processes.filter((p) => p.executors?.length)
  if (!reported.length) return null
  const lines = reported.map((p, i) => ({
    seq: i + 1,
    processName: p.name,
    executor: p.executors?.[0] || 'admin',
    reportQty: wo.scheduleQty || wo.planQty || 1,
    reportDuration: p.reportDuration ?? 0,
    taskStartTime: wo.createdAt ? `${wo.createdAt} 08:00` : '',
    taskEndTime: wo.createdAt ? `${wo.createdAt} 18:00` : '',
  }))
  return buildLaborHourRecord({
    id: `lh-${wo.id}`,
    workOrderId: wo.id,
    workOrderType,
    workOrderCode: wo.code,
    workOrderName: wo.name,
    salesOrderNo: wo.sourceOrderNo || '',
    materialCode: wo.materialCode || '',
    materialName: wo.productName || '',
    specModel: wo.specModel || '',
    processRouteName: wo.processRouteName || '',
    workCenter: wo.workCenter || '默认工厂',
    owner: wo.owner || 'admin1',
    scheduleQty: wo.scheduleQty ?? wo.planQty ?? 0,
    createdAt: wo.createdAt ? `${wo.createdAt} 09:00:00` : dayjs().format('YYYY-MM-DD HH:mm'),
    completedAt: wo.status === '完成' ? `${wo.createdAt || dayjs().format('YYYY-MM-DD')} 18:00:00` : '',
    latestSubmitAt: dayjs().format('YYYY-MM-DD HH:mm'),
    lines,
  })
}

function buildInitialLaborHourOrders() {
  const demoIds = new Set(LABOR_DEMO_WORK_ORDER_IDS)
  const candidates = []

  workOrderState.orders.forEach((wo) => {
    if (!demoIds.has(wo.id)) return
    const record = mapWorkOrderToLaborCandidate(wo, 'production')
    if (record) candidates.push(record)
  })
  assemblyWorkOrderState.orders.forEach((wo) => {
    if (!demoIds.has(wo.id)) return
    const record = mapWorkOrderToLaborCandidate(wo, 'assembly')
    if (record) candidates.push(record)
  })
  qcWorkOrderState.orders.forEach((wo) => {
    if (!demoIds.has(wo.id)) return
    const record = mapWorkOrderToLaborCandidate(wo, 'qc')
    if (record) candidates.push(record)
  })

  return candidates.map(recalcOrder)
}

const stored = loadFromStorage()

export const laborHourState = reactive({
  orders: stored?.orders || buildInitialLaborHourOrders(),
})

if (!stored || stored.laborConfigVersion !== LABOR_CONFIG_VERSION) {
  laborHourState.orders = buildInitialLaborHourOrders()
}

watch(
  () => laborHourState.orders,
  () => persist(),
  { deep: true },
)

export function getLaborHourOrders(filters = {}) {
  return filterLaborHourOrders(laborHourState.orders, filters).map(recalcOrder)
}

export function getLaborHourById(id) {
  const order =
    laborHourState.orders.find((o) => o.id === id) ||
    laborHourState.orders.find((o) => o.workOrderId === id)
  return order ? recalcOrder(order) : null
}

function appendLog(order, entry) {
  order.logs = order.logs || []
  order.logs.unshift({
    id: `log-${Date.now()}`,
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operator: entry.operator || 'admin1',
    action: entry.action,
    target: entry.target || '',
    remark: entry.remark || '',
  })
}

export function adjustLaborLine(orderId, lineId, payload) {
  const order = laborHourState.orders.find((o) => o.id === orderId)
  if (!order) return { ok: false, message: '记录不存在' }
  const line = order.lines.find((l) => l.id === lineId)
  if (!line) return { ok: false, message: '明细不存在' }
  if (line.auditStatus === '已审核') return { ok: false, message: '已审核数据不可调整' }

  if (payload.adjustedReportQty != null) line.adjustedReportQty = payload.adjustedReportQty
  if (payload.adjustedDuration != null) line.adjustedDuration = payload.adjustedDuration
  if (payload.adjustReason != null) line.adjustReason = payload.adjustReason

  const config = resolveLaborConfig(order.materialCode, line.processName)
  if (config?.reportType === '批量计件' && config?.salaryMethod === '计时工资') {
    const qty = line.adjustedReportQty ?? line.reportQty ?? 0
    line.adjustedDuration = calcAutoDurationHours(config, qty)
  }

  const recalculated = recalcOrder(order)
  Object.assign(order, recalculated)
  appendLog(order, {
    action: '调整',
    target: `任务 ${line.taskNo}`,
    remark: payload.adjustReason || '',
  })
  return { ok: true, order: recalcOrder(order) }
}

export function subsidyLaborLine(orderId, lineId, payload) {
  const order = laborHourState.orders.find((o) => o.id === orderId)
  if (!order) return { ok: false, message: '记录不存在' }
  const line = order.lines.find((l) => l.id === lineId)
  if (!line) return { ok: false, message: '明细不存在' }
  if (line.auditStatus === '已审核') return { ok: false, message: '已审核数据不可补贴' }

  const config = resolveLaborConfig(order.materialCode, line.processName)
  if (config?.salaryMethod === '计件工资') {
    line.subsidyReportQty = Number(payload.subsidyReportQty) || 0
  } else {
    line.subsidyHours = Number(payload.subsidyHours) || 0
  }
  if (payload.subsidyReason != null) line.subsidyReason = payload.subsidyReason

  Object.assign(order, recalcOrder(order))
  appendLog(order, {
    action: '补贴',
    target: `任务 ${line.taskNo}`,
    remark: payload.subsidyReason || '',
  })
  return { ok: true, order: recalcOrder(order) }
}

export function auditLaborLines(orderId, lineIds, operator = 'admin1') {
  const order = laborHourState.orders.find((o) => o.id === orderId)
  if (!order) return { ok: false, message: '记录不存在' }
  const targets = order.lines.filter((l) => lineIds.includes(l.id))
  if (!targets.length) return { ok: false, message: '请选择待审核明细' }
  const pending = targets.filter((l) => l.auditStatus !== '已审核')
  if (!pending.length) return { ok: false, message: '所选明细均已审核' }

  pending.forEach((line) => {
    line.auditStatus = '已审核'
  })
  order.auditStatus = resolveOrderAuditStatus(order.lines)
  Object.assign(order, recalcOrder(order))
  appendLog(order, {
    action: '审核',
    operator,
    target: pending.map((l) => l.taskNo).join('、'),
    remark: '审核通过',
  })
  return { ok: true, order: recalcOrder(order) }
}

export function calcPeriodStats(period = 'week', filters = {}) {
  const current = getLaborHourOrders({ ...filters, period })
  const [prevStart, prevEnd] = getPreviousPeriodRange(period)
  const previous = getLaborHourOrders({
    ...filters,
    dateRange: [prevStart.format('YYYY-MM-DD'), prevEnd.format('YYYY-MM-DD')],
  })

  const aggregate = (list) => {
    const batchPieceHours = list.reduce((s, o) => {
      const h = (o.lines || [])
        .filter((l) => l.reportType === '批量计件')
        .reduce((sum, l) => sum + (Number(l.accountHours) || 0), 0)
      return s + h
    }, 0)
    const durationHours = list.reduce((s, o) => {
      const h = (o.lines || [])
        .filter((l) => l.reportType === '时长报工')
        .reduce((sum, l) => sum + (Number(l.accountHours) || 0), 0)
      return s + h
    }, 0)
    const totalHours = list.reduce((s, o) => s + (Number(o.accountHours) || 0), 0)
    const reportTotal = list.reduce((s, o) => s + (Number(o.reportQty) || 0), 0)
    const participants = new Set()
    list.forEach((o) =>
      (o.lines || []).forEach((l) => {
        if (l.executor) participants.add(l.executor)
      }),
    )
    return {
      totalHours: Math.round(totalHours * 100) / 100,
      batchPieceHours: Math.round(batchPieceHours * 100) / 100,
      durationHours: Math.round(durationHours * 100) / 100,
      reportTotal: Math.round(reportTotal * 100) / 100,
      participantCount: participants.size,
    }
  }

  const cur = aggregate(current)
  const prev = aggregate(previous)
  const diff = (k) => Math.round((cur[k] - prev[k]) * 100) / 100

  return {
    ...cur,
    compare: {
      totalHours: diff('totalHours'),
      batchPieceHours: diff('batchPieceHours'),
      durationHours: diff('durationHours'),
      reportTotal: diff('reportTotal'),
      participantCount: diff('participantCount'),
    },
  }
}
