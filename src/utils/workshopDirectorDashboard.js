import dayjs from 'dayjs'
import { ECN_STATUS } from '@/constants/ecn'
import { DIRECTOR_PERIOD, WORKSHOP_SCOPE_ALL } from '@/constants/workshopDirector'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { disassemblyWorkOrderState } from '@/store/disassemblyWorkOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { processReportState } from '@/store/processReportStore'
import { reportConfirmState, CONFIRM_STATUS } from '@/store/reportConfirmStore'
import { productionPlanState } from '@/store/productionPlanStore'
import { factoryQcState } from '@/store/factoryQcStore'
import { scrapOrderState } from '@/store/scrapOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { outboundState } from '@/store/outboundStore'
import { ecnState } from '@/store/ecnStore'
import { stockState } from '@/store/stockStore'
import { calcPeriodStats } from '@/store/laborHourStore'
import { calcProcessReportStats } from '@/utils/processReportWorkOrder'

const STOCK_ALERT_THRESHOLD = 10
const PLAN_RISK_DAYS = 7

const ECN_TODO_STATUSES = [ECN_STATUS.PENDING, ECN_STATUS.APPROVING, ECN_STATUS.EXECUTING]

const INBOUND_PENDING = ['待审批', '待处理']
const OUTBOUND_PENDING = ['待处理', '待出库']

export const DIRECTOR_SHORTCUTS = [
  { key: 'work-orders', label: '生产工单', path: '/production/work-orders', color: '#1677ff' },
  {
    key: 'process-report',
    label: '工序报工',
    path: '/report-management/process-report',
    color: '#722ed1',
  },
  {
    key: 'report-work',
    label: '报工确认',
    path: '/report-management/report-work',
    color: '#13c2c2',
  },
  {
    key: 'production-plan',
    label: '生产计划',
    path: '/planning/production-plan',
    color: '#fa8c16',
  },
  { key: 'scrap', label: '报废品', path: '/quality/scrap-orders', color: '#eb2f96' },
  { key: 'inbound', label: '出入库', path: '/inventory/inbound', color: '#52c41a' },
  { key: 'labor-hour', label: '工时管理', path: '/labor-salary/labor-hour', color: '#2f54eb' },
]

function isAllWorkshop(workshop) {
  return !workshop || workshop === WORKSHOP_SCOPE_ALL
}

function resolveWorkshopField(record, fields = ['workCenter', 'sourceWorkshop', 'workshop']) {
  for (const key of fields) {
    if (record?.[key]) return record[key]
  }
  return ''
}

export function matchWorkshop(record, workshop, fields) {
  if (isAllWorkshop(workshop)) return true
  return resolveWorkshopField(record, fields) === workshop
}

function getPeriodRange(period) {
  const now = dayjs()
  if (period === DIRECTOR_PERIOD.TODAY) {
    const d = now.format('YYYY-MM-DD')
    return [d, d]
  }
  if (period === DIRECTOR_PERIOD.MONTH) {
    return [now.startOf('month').format('YYYY-MM-DD'), now.endOf('month').format('YYYY-MM-DD')]
  }
  return [now.startOf('week').format('YYYY-MM-DD'), now.endOf('week').format('YYYY-MM-DD')]
}

function isDateInPeriod(dateStr, period) {
  if (!dateStr) return period === DIRECTOR_PERIOD.TODAY ? false : true
  const d = dayjs(String(dateStr).slice(0, 10))
  if (!d.isValid()) return false
  const [start, end] = getPeriodRange(period)
  return !d.isBefore(dayjs(start), 'day') && !d.isAfter(dayjs(end), 'day')
}

function collectAllWorkOrders() {
  return [
    ...workOrderState.orders.map((o) => ({
      ...o,
      woType: '生产工单',
      listPath: '/production/work-orders',
    })),
    ...assemblyWorkOrderState.orders.map((o) => ({
      ...o,
      woType: '总装工单',
      listPath: '/production/assembly-work-orders',
    })),
    ...disassemblyWorkOrderState.orders.map((o) => ({
      ...o,
      woType: '拆解工单',
      listPath: '/production/disassembly-work-orders',
    })),
    ...qcWorkOrderState.orders.map((o) => ({
      ...o,
      woType: '质检工单',
      listPath: '/production/qc-work-orders',
    })),
  ]
}

function planMatchesWorkshop(plan, workshop, workOrders) {
  if (isAllWorkshop(workshop)) return true
  const orderNo = plan.salesOrderNo || plan.orderNo
  if (!orderNo) return false
  return workOrders.some(
    (wo) =>
      matchWorkshop(wo, workshop) &&
      (wo.sourceOrderNo === orderNo || wo.salesOrderNo === orderNo || wo.code === orderNo),
  )
}

function buildTodoItem(partial) {
  return {
    id: partial.id,
    category: partial.category,
    title: partial.title,
    subtitle: partial.subtitle || '',
    time: partial.time || '',
    urgency: partial.urgency || 'normal',
    route: partial.route || '',
    query: partial.query || {},
    payload: partial.payload || null,
  }
}

function filterProcessReports(workshop, period) {
  return processReportState.records.filter(
    (r) =>
      matchWorkshop(r, workshop) &&
      isDateInPeriod(r.createdAt || r.reportTime, period) &&
      r.status !== '已作废',
  )
}

function buildTodos(workshop, workOrders) {
  const todos = []

  workOrders
    .filter((wo) => matchWorkshop(wo, workshop) && wo.status === '待下发')
    .forEach((wo) => {
      todos.push(
        buildTodoItem({
          id: `wo-dispatch-${wo.id}`,
          category: '待下发工单',
          title: `${wo.code} · ${wo.name || wo.productName || ''}`,
          subtitle: `${wo.woType} · ${wo.workCenter || '—'}`,
          time: wo.submittedAt || wo.createdAt || '',
          urgency: wo.urgency === '紧急' ? 'high' : 'normal',
          route: wo.listPath,
          query: { status: '待下发' },
          payload: wo,
        }),
      )
    })

  processReportState.records
    .filter(
      (r) =>
        matchWorkshop(r, workshop) &&
        r.status !== '已审核' &&
        r.status !== '已作废' &&
        (r.status === '待审核' || !r.status),
    )
    .forEach((r) => {
      todos.push(
        buildTodoItem({
          id: `pr-audit-${r.id}`,
          category: '待审核报工',
          title: `${r.workOrderCode || r.taskNo || '报工'} · ${r.processName || ''}`,
          subtitle: `${r.productName || ''} · 待审核`,
          time: r.createdAt || r.reportTime || '',
          route:
            r.workOrderId && r.source !== 'quick'
              ? `/report-management/process-report/wo/${r.workOrderId}`
              : '/report-management/process-report',
          payload: r,
        }),
      )
    })

  reportConfirmState.lines
    .filter(
      (l) =>
        matchWorkshop(l, workshop) &&
        (l.confirmStatus === CONFIRM_STATUS.PENDING ||
          l.confirmStatus === CONFIRM_STATUS.WORKER_PENDING),
    )
    .forEach((l) => {
      todos.push(
        buildTodoItem({
          id: `rc-${l.id}`,
          category: '待确认报工',
          title: `${l.workOrderNo || ''} · ${l.processName || ''}`,
          subtitle: `${l.executor || ''} · ${l.confirmStatus}`,
          time: l.reportTime || '',
          route: '/report-management/report-work',
          payload: l,
        }),
      )
    })

  productionPlanState.plans
    .filter((plan) => {
      if (['已完成', '已关闭'].includes(plan.orderStatus)) return false
      const days = plan.daysToDelivery ?? dayjs(plan.deliveryDate).diff(dayjs(), 'day')
      const atRisk = days <= PLAN_RISK_DAYS
      const pendingRelease =
        plan.orderStatus === '待下达' ||
        plan.orderStatus === '部分下达' ||
        (plan.tags || []).some((t) => ['待下达', '部分下达'].includes(t))
      if (!atRisk && !pendingRelease) return false
      return planMatchesWorkshop(plan, workshop, workOrders)
    })
    .forEach((plan) => {
      const days = plan.daysToDelivery ?? dayjs(plan.deliveryDate).diff(dayjs(), 'day')
      todos.push(
        buildTodoItem({
          id: `plan-risk-${plan.id}`,
          category: '计划风险',
          title: `${plan.salesOrderNo || plan.orderNo} · ${plan.customerName || ''}`,
          subtitle: `交期 ${plan.deliveryDate || '—'} · 剩余 ${days} 天 · ${plan.orderStatus}`,
          time: plan.orderDate || '',
          urgency: days <= 3 ? 'high' : 'normal',
          route: '/planning/production-plan',
          payload: plan,
        }),
      )
    })

  factoryQcState.records
    .filter((r) => r.qcStatus === '待质检')
    .forEach((r) => {
      todos.push(
        buildTodoItem({
          id: `qc-${r.id}`,
          category: '待质检',
          title: `${r.qcNo || ''} · ${r.productName || r.itemName || ''}`,
          subtitle: `出厂质检 · ${r.workOrderNo || '—'}`,
          time: r.createdAt || r.qcDate || '',
          route: '/quality/factory-qc',
          payload: r,
        }),
      )
    })

  scrapOrderState.orders
    .filter((o) => o.auditStatus === '待审核')
    .forEach((o) => {
      todos.push(
        buildTodoItem({
          id: `scrap-${o.id}`,
          category: '待审核报废',
          title: `${o.scrapNo || ''} · ${o.itemName || ''}`,
          subtitle: `${o.scrapSource || ''} · 数量 ${o.qty ?? ''}`,
          time: o.reportedAt || '',
          route: '/quality/scrap-orders',
          payload: o,
        }),
      )
    })

  inboundOrderState.orders
    .filter((o) => INBOUND_PENDING.includes(o.status))
    .forEach((o) => {
      if (!isAllWorkshop(workshop) && o.sourceWorkshop && o.sourceWorkshop !== workshop) return
      todos.push(
        buildTodoItem({
          id: `in-${o.id}`,
          category: '待审批出入库',
          title: `${o.docNo || ''} · ${o.inboundType || '入库'}`,
          subtitle: `${o.status} · ${o.warehouse || ''}`,
          time: o.inboundDate || o.createdAt || '',
          route: `/inventory/inbound/${o.id}`,
          payload: o,
        }),
      )
    })

  outboundState.orders
    .filter((o) => OUTBOUND_PENDING.includes(o.status))
    .forEach((o) => {
      todos.push(
        buildTodoItem({
          id: `out-${o.id}`,
          category: '待审批出入库',
          title: `${o.docNo || o.outboundNo || ''} · 出库`,
          subtitle: `${o.status} · ${o.warehouse || ''}`,
          time: o.outboundDate || o.createdAt || '',
          route: '/inventory/outbound',
          payload: o,
        }),
      )
    })

  ecnState.items
    .filter((row) => ECN_TODO_STATUSES.includes(row.status))
    .forEach((row) => {
      todos.push(
        buildTodoItem({
          id: `ecn-${row.id}`,
          category: 'ECN 待办',
          title: `${row.ecnNo || ''} · ${row.changeType || row.ecnType || '工程变更'}`,
          subtitle: `${row.status} · ${row.productName || row.title || ''}`,
          time: row.submitTime || row.createdAt || '',
          urgency: row.status === ECN_STATUS.EXECUTING ? 'high' : 'normal',
          route: `/engineering-change/ecn/${row.id}/detail`,
          payload: row,
        }),
      )
    })

  const urgencyRank = { high: 0, normal: 1, low: 2 }
  return todos.sort((a, b) => {
    const ur = (urgencyRank[a.urgency] ?? 1) - (urgencyRank[b.urgency] ?? 1)
    if (ur !== 0) return ur
    return String(b.time).localeCompare(String(a.time))
  })
}

function summarizeTodoGroups(todos) {
  const groups = {}
  todos.forEach((t) => {
    groups[t.category] = (groups[t.category] || 0) + 1
  })
  return groups
}

function buildKpis(workshop, period, workOrders) {
  const scopedWo = workOrders.filter((wo) => matchWorkshop(wo, workshop))
  const periodReports = filterProcessReports(workshop, period)
  const reportStats = calcProcessReportStats(periodReports)

  const inProgressStatuses = ['进行中', '生产中', '执行中', '部分完成']
  const completedStatuses = ['已完成', '已关闭', '已完工']
  const activeWo = scopedWo.filter((wo) => wo.status && wo.status !== '待下发')
  const inProgress = activeWo.filter((wo) => inProgressStatuses.includes(wo.status)).length
  const completed = activeWo.filter((wo) => completedStatuses.includes(wo.status)).length
  const woTotal = activeWo.length
  const woProgressRate = woTotal ? Math.round((completed / woTotal) * 100) : 0

  const scopedPlans = productionPlanState.plans.filter((p) =>
    planMatchesWorkshop(p, workshop, workOrders),
  )
  const planTotal = scopedPlans.filter((p) => !['已关闭'].includes(p.orderStatus)).length
  const planDone = scopedPlans.filter((p) => ['已完成', '全部下达'].includes(p.orderStatus)).length
  const planCompleteRate = planTotal ? Math.round((planDone / planTotal) * 100) : 0

  const periodQc = factoryQcState.records.filter(
    (r) => r.qcStatus !== '已终止' && isDateInPeriod(r.qcDate || r.createdAt, period),
  )
  const qcDone = periodQc.filter((r) => r.qcStatus === '已完成')
  const qcPass = qcDone.filter((r) => (r.qcResult || r.result) === '合格').length
  const qcPassRate = qcDone.length ? Math.round((qcPass / qcDone.length) * 100) : 100

  const periodScrap = scrapOrderState.orders.filter((o) => isDateInPeriod(o.reportedAt, period))
  const scrapQty = periodScrap.reduce((s, o) => s + (Number(o.qty) || 0), 0)
  const reportQty =
    period === DIRECTOR_PERIOD.TODAY
      ? reportStats.todayQty
      : periodReports.reduce((s, r) => s + (Number(r.goodQty ?? r.reportQty ?? r.qty) || 0), 0)

  const laborPeriod = period === DIRECTOR_PERIOD.TODAY ? 'week' : period
  const laborFilters = isAllWorkshop(workshop) ? {} : { workCenter: workshop }
  const laborStats = calcPeriodStats(laborPeriod, laborFilters)

  const stockAlerts = stockState.records.filter(
    (r) => (Number(r.qty) || 0) < STOCK_ALERT_THRESHOLD,
  ).length

  const periodLabel =
    period === DIRECTOR_PERIOD.TODAY ? '今日' : period === DIRECTOR_PERIOD.MONTH ? '本月' : '本周'

  return [
    {
      key: 'output',
      title: `${periodLabel}报工产出`,
      value: reportQty,
      unit: '件',
      sub: `任务 ${period === DIRECTOR_PERIOD.TODAY ? reportStats.todayTaskCount : periodReports.length} 条`,
      tone: 'blue',
    },
    {
      key: 'wo-progress',
      title: '工单进度',
      value: woProgressRate,
      unit: '%',
      sub: `进行中 ${inProgress} / 共 ${woTotal}`,
      tone: 'purple',
    },
    {
      key: 'plan-rate',
      title: '计划完成率',
      value: planCompleteRate,
      unit: '%',
      sub: `已完成 ${planDone} / 在制计划 ${planTotal}`,
      tone: 'orange',
    },
    {
      key: 'qc-rate',
      title: '质检合格率',
      value: qcPassRate,
      unit: '%',
      sub: `报废 ${scrapQty} 件`,
      tone: 'green',
    },
    {
      key: 'labor',
      title: `${periodLabel}工时`,
      value: laborStats.totalHours ?? 0,
      unit: '小时',
      sub: `报工人数 ${laborStats.participantCount ?? 0}`,
      tone: 'cyan',
    },
    {
      key: 'stock-alert',
      title: '库存预警',
      value: stockAlerts,
      unit: '项',
      sub: `库存低于 ${STOCK_ALERT_THRESHOLD}`,
      tone: 'red',
    },
  ]
}

/** 聚合车间主任工作台数据（读取各 store 当前状态） */
export function buildWorkshopDirectorDashboard({
  workshop = WORKSHOP_SCOPE_ALL,
  period = DIRECTOR_PERIOD.TODAY,
} = {}) {
  void workOrderState.orders
  void assemblyWorkOrderState.orders
  void disassemblyWorkOrderState.orders
  void qcWorkOrderState.orders
  void processReportState.records
  void reportConfirmState.lines
  void productionPlanState.plans
  void factoryQcState.records
  void scrapOrderState.orders
  void inboundOrderState.orders
  void outboundState.orders
  void ecnState.items
  void stockState.records

  const workOrders = collectAllWorkOrders()
  const todos = buildTodos(workshop, workOrders)
  const todoGroups = summarizeTodoGroups(todos)
  const kpis = buildKpis(workshop, period, workOrders)

  return {
    workshop,
    period,
    todos,
    todoGroups,
    todoTotal: todos.length,
    kpis,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export const TODO_CATEGORY_ORDER = [
  '待下发工单',
  '待审核报工',
  '待确认报工',
  '计划风险',
  '待质检',
  '待审核报废',
  '待审批出入库',
  'ECN 待办',
]
