/**
 * 工单监管看板：KPI / 工单工序进度 / 工人接单闲忙
 */
import dayjs from 'dayjs'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { processReportState } from '@/store/processReportStore'
import { employeeGroupState } from '@/store/employeeGroupStore'
import { listMobileTasksForWorkOrder } from '@/utils/workOrderStatus'
import { MOBILE_TASK_SYNC_KEY } from '@/utils/mobileTaskDispatch'
import { workCenterOptions } from '@/mock/workOrderOptions'
import { formatNumber } from '@/utils/numberFormat'
import { formatWorkOrderPlanDateRange } from '@/utils/workOrderBasicFields'

export const MONITOR_PERIOD = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
}

export const MONITOR_PERIOD_OPTIONS = [
  { label: '本日', value: MONITOR_PERIOD.TODAY },
  { label: '本周', value: MONITOR_PERIOD.WEEK },
  { label: '本月', value: MONITOR_PERIOD.MONTH },
]

export const MONITOR_WO_TYPE = {
  ALL: 'all',
  PRODUCTION: 'production',
  ASSEMBLY: 'assembly',
}

export const MONITOR_WO_TYPE_OPTIONS = [
  { label: '全部类型', value: MONITOR_WO_TYPE.ALL },
  { label: '生产工单', value: MONITOR_WO_TYPE.PRODUCTION },
  { label: '组装工单', value: MONITOR_WO_TYPE.ASSEMBLY },
]

/** 列表状态筛：进行中 = 已下发 + 执行中 + 暂停 */
export const MONITOR_LIST_STATUS = {
  RUNNING: 'running',
  PENDING: 'pending',
  DONE: 'done',
  ALL: 'all',
}

export const MONITOR_LIST_STATUS_OPTIONS = [
  { label: '进行中', value: MONITOR_LIST_STATUS.RUNNING },
  { label: '待下发', value: MONITOR_LIST_STATUS.PENDING },
  { label: '已完成', value: MONITOR_LIST_STATUS.DONE },
  { label: '全部', value: MONITOR_LIST_STATUS.ALL },
]

export const MONITOR_WORK_CENTER_OPTIONS = [
  { label: '全部工作中心', value: '' },
  ...workCenterOptions.map((v) => ({ label: v, value: v })),
]

const BUSY_TASK_STATUSES = new Set(['待报工', '待开始', '执行中'])
const MOBILE_TASK_STORAGE_KEY = 'i_doms_mobile_disassembly_tasks'

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getPeriodRange(period) {
  const now = dayjs()
  if (period === MONITOR_PERIOD.TODAY) {
    const d = now.format('YYYY-MM-DD')
    return [d, d]
  }
  if (period === MONITOR_PERIOD.MONTH) {
    return [now.startOf('month').format('YYYY-MM-DD'), now.endOf('month').format('YYYY-MM-DD')]
  }
  return [now.startOf('week').format('YYYY-MM-DD'), now.endOf('week').format('YYYY-MM-DD')]
}

function isDateInPeriod(dateStr, period) {
  if (!dateStr) return false
  const d = dayjs(String(dateStr).slice(0, 10))
  if (!d.isValid()) return false
  const [start, end] = getPeriodRange(period)
  return !d.isBefore(dayjs(start), 'day') && !d.isAfter(dayjs(end), 'day')
}

function mapWoBucket(status) {
  if (status === '待下发') return 'pending'
  if (status === '已完成' || status === '完成') return 'done'
  if (status === '终止') return null
  // 已下发 / 执行中 / 暂停 → 进行中
  return 'running'
}

function matchListStatus(status, listStatus) {
  const bucket = mapWoBucket(status)
  if (listStatus === MONITOR_LIST_STATUS.ALL) return true
  if (listStatus === MONITOR_LIST_STATUS.PENDING) return bucket === 'pending'
  if (listStatus === MONITOR_LIST_STATUS.DONE) return bucket === 'done'
  if (listStatus === MONITOR_LIST_STATUS.RUNNING) return bucket === 'running'
  return true
}

export function collectMonitorWorkOrders() {
  const real = [
    ...workOrderState.orders.map((o) => ({
      ...o,
      woKind: MONITOR_WO_TYPE.PRODUCTION,
      woTypeLabel: '生产工单',
      listPath: '/production/work-orders',
    })),
    ...assemblyWorkOrderState.orders.map((o) => ({
      ...o,
      woKind: MONITOR_WO_TYPE.ASSEMBLY,
      woTypeLabel: '组装工单',
      listPath: '/production/assembly-work-orders',
    })),
  ]
  // 看板专用演示单置顶，便于验收并行布局
  return [buildParallelDemoWorkOrder(), ...real.filter((o) => o.id !== 'wo-monitor-parallel-demo')]
}

function filterByTypeAndCenter(orders, { woType, workCenter }) {
  return orders.filter((o) => {
    if (woType && woType !== MONITOR_WO_TYPE.ALL && o.woKind !== woType) return false
    if (workCenter && o.workCenter !== workCenter) return false
    return true
  })
}

/** 工序展示态（以任务状态为准；已报工统一为绿色） */
export function resolveProcessDisplayStatus(task, process) {
  if (task) {
    if (task.controlStatus === '暂停' && task.taskStatus !== '已完成') return '暂停'
    // 现网：工人提交报工即工序完成（不要求凑满排产数）
    if (task.taskStatus === '已完成') return '已报工'
    if (Number(task.reportedFinishedQty) > 0 || Number(task.reportedGoodQty) > 0) return '已报工'
    if (task.taskStatus === '执行中') return '执行中'
    if (task.taskStatus === '待领取') return '待领取'
    if (['待报工', '待开始', '待分发'].includes(task.taskStatus)) return task.taskStatus
    return task.taskStatus || '待报工'
  }
  // 无移动任务时，用工序自身字段兜底
  if (Number(process?.reportedGoodQty) > 0 || Number(process?.goodQty) > 0) return '已报工'
  return process?.status || '待报工'
}

export function processStatusTone(status) {
  if (status === '已报工' || status === '已完成') return 'done'
  if (status === '执行中') return 'running'
  if (status === '暂停') return 'paused'
  if (status === '待领取') return 'claim'
  if (['待报工', '待开始', '待分发'].includes(status)) return 'queue'
  return 'idle'
}

/**
 * 工序 KPI（对齐现网：一次报工即完成，无「部分报工未完工」）
 * - done 已报工：任务已完成
 * - running 在制：已到今日列表/已指派，尚未报工完成
 * - claim 待领取：多人抢领
 */
export function classifyProcessKpiBucket(node) {
  if (!node) return null
  if (node.tone === 'claim' || node.status === '待领取') return 'claim'
  if (node.tone === 'done' || node.status === '已报工' || node.status === '已完成') return 'done'
  if (node.tone === 'paused') return null
  const open =
    node.tone === 'running' ||
    node.tone === 'queue' ||
    node.status === '执行中' ||
    ['待报工', '待开始', '待分发'].includes(node.status)
  return open ? 'running' : null
}

function findBestTask(tasks, process) {
  const name = process?.name || process?.processName || ''
  let list = (tasks || []).filter((t) => !t.hiddenByTerminate)
  if (name) {
    const byName = list.filter((t) => t.processName === name || t.processId === process.id)
    if (byName.length) list = byName
  }
  if (!list.length) return null
  // 优先进行中 / 已报工
  return (
    list.find((t) => t.taskStatus === '执行中') ||
    list.find((t) => t.taskStatus === '已完成') ||
    list.find((t) => BUSY_TASK_STATUSES.has(t.taskStatus)) ||
    list[0]
  )
}

function qtyOf(...vals) {
  for (const v of vals) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
  }
  return Number(vals.find((v) => Number.isFinite(Number(v)))) || 0
}

/** 构建可分叉的工艺路线步骤（同 stepNo 为并行） */
export function buildProcessRouteSteps(workOrder) {
  const processes = workOrder?.processes || []
  const tasks = listMobileTasksForWorkOrder(workOrder?.id)
  if (!processes.length) {
    // 仅有任务时，按 processSeq / processName 拼一条链
    const byName = new Map()
    tasks
      .filter((t) => !t.hiddenByTerminate)
      .forEach((t) => {
        const key = t.processName || t.processId || t.id
        if (!byName.has(key)) byName.set(key, t)
      })
    const nodes = [...byName.values()].map((t, idx) => {
      const status = resolveProcessDisplayStatus(t, null)
      return {
        id: t.id || `task-${idx}`,
        name: t.processName || `工序${idx + 1}`,
        stepNo: Number(t.processSeq) || idx + 1,
        rowNo: 0,
        status,
        tone: processStatusTone(status),
        planQty: qtyOf(t.expectedQty, t.targetQty, workOrder?.scheduleQty, workOrder?.planQty),
        goodQty: qtyOf(t.reportedGoodQty),
        badQty: qtyOf(t.reportedBadQty, t.reportedDefectQty, t.badQty),
      }
    })
    return groupNodesByStep(nodes)
  }

  const nodes = processes.map((p, idx) => {
    const task = findBestTask(tasks, p)
    const status = resolveProcessDisplayStatus(task, p)
    return {
      id: p.id || `proc-${idx}`,
      name: p.name || p.processName || `工序${idx + 1}`,
      stepNo: Number(p.stepNo) || idx + 1,
      rowNo: Number(p.rowNo) || 0,
      status,
      tone: processStatusTone(status),
      planQty: qtyOf(
        p.planQty,
        p.scheduleQty,
        task?.expectedQty,
        task?.targetQty,
        workOrder?.scheduleQty,
        workOrder?.planQty,
      ),
      goodQty: qtyOf(task?.reportedGoodQty, p.reportedGoodQty, p.goodQty),
      badQty: qtyOf(
        task?.reportedBadQty,
        task?.reportedDefectQty,
        task?.badQty,
        p.reportedBadQty,
        p.badQty,
      ),
    }
  })
  return groupNodesByStep(nodes)
}

function groupNodesByStep(nodes) {
  const map = new Map()
  nodes.forEach((n) => {
    const key = n.stepNo
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(n)
  })
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stepNo, list]) => {
      const sorted = list.sort(
        (a, b) => a.rowNo - b.rowNo || String(a.name).localeCompare(String(b.name)),
      )
      return {
        stepNo,
        parallel: sorted.length > 1,
        /** 并行较多时默认折叠展示前 N 个 */
        compact: sorted.length >= 4,
        collapseThreshold: 6,
        nodes: sorted,
      }
    })
}

/** 看板演示：多并行工序工单（仅看板聚合注入，不写 store） */
export function buildParallelDemoWorkOrder() {
  const parallelNames = ['钻孔', '攻丝', '去毛刺', '清洗', '尺寸检验', '外观检验', '喷漆', '烘干']
  const processes = [
    {
      id: 'mon-demo-1',
      name: '下料',
      stepNo: 1,
      rowNo: 0,
      status: '已报工',
      planQty: 20,
      reportedGoodQty: 20,
      badQty: 0,
    },
    ...parallelNames.map((name, i) => ({
      id: `mon-demo-p-${i}`,
      name,
      stepNo: 2,
      rowNo: i,
      status: i < 2 ? '已报工' : i < 4 ? '执行中' : i === 4 ? '待领取' : '待报工',
      planQty: 20,
      reportedGoodQty: i < 2 ? 20 : i < 4 ? 6 : 0,
      badQty: i === 1 ? 1 : 0,
    })),
    {
      id: 'mon-demo-3',
      name: '合套',
      stepNo: 3,
      rowNo: 0,
      status: '待报工',
      planQty: 20,
      reportedGoodQty: 0,
    },
    {
      id: 'mon-demo-4',
      name: '入库',
      stepNo: 4,
      rowNo: 0,
      status: '待开始',
      planQty: 20,
      reportedGoodQty: 0,
    },
  ]
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  return {
    id: 'wo-monitor-parallel-demo',
    orderNo: 'WO-PARALLEL-DEMO',
    name: '并行工序演示（多任务）',
    productName: '泵体组件并行加工',
    productCode: 'CP-PARALLEL-001',
    materialCode: 'CP-PARALLEL-001',
    specModel: 'Φ220×L480',
    material: 'HT250',
    status: '执行中',
    workCenter: '机加车间',
    planQty: 20,
    scheduleQty: 20,
    planDateRange: [
      dayjs().subtract(20, 'day').format('YYYY-MM-DD'),
      dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
    ],
    scheduleBatches: [
      { id: 'mon-sb-1', batchNo: 1, qty: 10, status: '执行中' },
      { id: 'mon-sb-2', batchNo: 2, qty: 10, status: '已下发' },
    ],
    updatedAt: now,
    createdAt: now,
    processes,
    woKind: MONITOR_WO_TYPE.PRODUCTION,
    woTypeLabel: '生产工单',
    listPath: '/production/work-orders',
    _monitorDemo: true,
  }
}

function listAllMobileTasks() {
  const out = []
  const seen = new Set()
  const push = (t) => {
    if (!t?.id || seen.has(t.id)) return
    seen.add(t.id)
    out.push(t)
  }
  const stored = readJsonStorage(MOBILE_TASK_STORAGE_KEY)
  if (Array.isArray(stored)) stored.forEach(push)
  const sync = readJsonStorage(MOBILE_TASK_SYNC_KEY)
  if (Array.isArray(sync)) sync.forEach(push)
  return out
}

/** 单工人任务（非工人小组） */
function isPersonalWorkerTask(t) {
  if (!t || t.hiddenByTerminate) return false
  if (t.resourceType === '工人小组') return false
  if (t.groupId || t.groupName) return false
  return true
}

/** 单工人名单：个人任务执行人 + 工单工序 resourceType=工人 的执行人 */
function collectIndividualWorkerNames(tasks) {
  const names = new Set()
  ;(tasks || []).forEach((t) => {
    if (!isPersonalWorkerTask(t)) return
    if (t.claimedBy) names.add(String(t.claimedBy).trim())
    if (t.executor) names.add(String(t.executor).trim())
    ;(t.executors || []).forEach((n) => names.add(String(n).trim()))
    ;(t.claimTargets || []).forEach((n) => names.add(String(n).trim()))
  })
  collectMonitorWorkOrders().forEach((o) => {
    ;(o.processes || []).forEach((p) => {
      if ((p.resourceType || '工人') === '工人小组') return
      ;(p.executors || []).forEach((n) => {
        if (n) names.add(String(n).trim())
      })
    })
  })
  ;['—', '-', ''].forEach((x) => names.delete(x))
  return [...names].filter(Boolean)
}

function isWorkerBusy(name, tasks, { personalOnly = false } = {}) {
  return tasks.some((t) => {
    if (t.hiddenByTerminate) return false
    if (personalOnly && !isPersonalWorkerTask(t)) return false
    const person = t.claimedBy || t.executor || ''
    if (person !== name) return false
    return BUSY_TASK_STATUSES.has(t.taskStatus)
  })
}

function workerCurrentTask(name, tasks, { personalOnly = false } = {}) {
  const match = (t) => {
    if (t.hiddenByTerminate) return false
    if (personalOnly && !isPersonalWorkerTask(t)) return false
    return t.claimedBy === name || t.executor === name
  }
  const hit =
    tasks.find((t) => match(t) && t.taskStatus === '执行中') ||
    tasks.find((t) => match(t) && BUSY_TASK_STATUSES.has(t.taskStatus))
  if (!hit) return null
  return {
    processName: hit.processName || '—',
    workOrderNo: hit.workOrderNo || hit.workOrderCode || '',
    taskStatus: hit.taskStatus,
    groupId: hit.groupId || null,
    groupName: hit.groupName || '',
    isLeaderClaim: Boolean(hit.groupId || hit.groupName || hit.resourceType === '工人小组'),
  }
}

/** 小组任务：组长接单后整组视为有活 */
function findActiveGroupTask(group, tasks) {
  const leader = group.leaderName
  return (
    tasks.find((t) => {
      if (t.hiddenByTerminate) return false
      if (!BUSY_TASK_STATUSES.has(t.taskStatus) && t.taskStatus !== '待分发') return false
      if (t.groupId && t.groupId === group.id) return true
      if (t.groupName && t.groupName === group.name) return true
      if (t.resourceType === '工人小组' && (t.claimedBy === leader || t.executor === leader)) {
        return BUSY_TASK_STATUSES.has(t.taskStatus) || t.taskStatus === '待分发'
      }
      return false
    }) || null
  )
}

function buildWorkerPanels(tasks) {
  const groups = (employeeGroupState.groups || []).filter((g) => !g.status || g.status === '启用')
  const groupPanels = groups.map((g) => {
    const members = (g.workers || []).map((w) => String(w.name || '').trim()).filter(Boolean)
    const leaderName = String(g.leaderName || '').trim()
    const allNames = [...new Set([leaderName, ...members].filter(Boolean))]

    const groupTask = findActiveGroupTask(g, tasks)
    const leaderCurrent = leaderName ? workerCurrentTask(leaderName, tasks) : null
    const leaderClaimedGroup =
      Boolean(groupTask) &&
      (groupTask.claimedBy === leaderName ||
        groupTask.executor === leaderName ||
        groupTask.taskStatus === '待分发')

    const memberRows = allNames.map((name) => {
      const personalBusy = isWorkerBusy(name, tasks)
      const current = workerCurrentTask(name, tasks)
      const isLeader = name === leaderName
      let status = '空闲'
      let statusTone = 'idle'
      let sub = '暂无进行中任务'
      if (personalBusy) {
        status = '忙碌'
        statusTone = 'busy'
        sub = current
          ? `${current.processName}${current.workOrderNo ? ` · ${current.workOrderNo}` : ''}`
          : '任务进行中'
        if (isLeader && leaderClaimedGroup) sub = `组长已接单 · ${sub}`
      } else if (groupTask && leaderClaimedGroup) {
        // 组长已接小组任务，组员未单独领任务 → 组内待命
        status = isLeader ? '忙碌' : '组内待命'
        statusTone = isLeader ? 'busy' : 'standby'
        sub = isLeader
          ? `组长已接单 · ${groupTask.processName || ''}`
          : `小组任务进行中（${groupTask.processName || '—'}）`
      }
      return {
        name,
        isLeader,
        status,
        statusTone,
        sub,
        taskCount: tasks.filter(
          (t) =>
            !t.hiddenByTerminate &&
            (t.claimedBy === name || t.executor === name) &&
            BUSY_TASK_STATUSES.has(t.taskStatus),
        ).length,
      }
    })

    const busyCount = memberRows.filter((m) => m.statusTone === 'busy').length
    const groupBusy = Boolean(groupTask) || busyCount > 0

    // 看板演示：加工小组补足到 12 人，便于验收大组跨页分块
    if (g.name === '加工小组' && memberRows.length < 12) {
      const padNames = ['刘一', '陈二', '杨三', '黄四', '赵五', '周七', '吴八', '徐九', '孙十']
      const exist = new Set(memberRows.map((m) => m.name))
      for (const name of padNames) {
        if (memberRows.length >= 12) break
        if (exist.has(name)) continue
        memberRows.push({
          name,
          isLeader: false,
          status: groupBusy && leaderClaimedGroup ? '组内待命' : '空闲',
          statusTone: groupBusy && leaderClaimedGroup ? 'standby' : 'idle',
          sub:
            groupBusy && leaderClaimedGroup
              ? `小组任务进行中（${groupTask?.processName || '—'}）`
              : '暂无进行中任务',
          taskCount: 0,
        })
      }
    }

    return {
      type: 'group',
      id: g.id,
      name: g.name,
      workCenter: g.workCenter || '',
      leaderName,
      groupBusy,
      groupStatus: groupBusy ? '忙碌' : '空闲',
      groupHint: leaderClaimedGroup
        ? `组长 ${leaderName || '—'} 已接单`
        : groupBusy
          ? '组内有进行中任务'
          : '暂无小组任务',
      currentProcess: groupTask?.processName || leaderCurrent?.processName || '',
      members: memberRows,
    }
  })

  // 单工人：个人任务/工序执行人；与小组并行展示（可同人两边出现）
  const individuals = collectIndividualWorkerNames(tasks)
    .map((name) => {
      const busy = isWorkerBusy(name, tasks, { personalOnly: true })
      const current = workerCurrentTask(name, tasks, { personalOnly: true })
      return {
        type: 'person',
        id: `person-${name}`,
        name,
        busy,
        status: busy ? '忙碌' : '空闲',
        statusTone: busy ? 'busy' : 'idle',
        sub: current
          ? `${current.processName}${current.workOrderNo ? ` · ${current.workOrderNo}` : ''}`
          : '暂无进行中个人任务',
        taskCount: tasks.filter(
          (t) =>
            isPersonalWorkerTask(t) &&
            (t.claimedBy === name || t.executor === name) &&
            BUSY_TASK_STATUSES.has(t.taskStatus),
        ).length,
      }
    })
    .sort((a, b) => Number(b.busy) - Number(a.busy) || a.name.localeCompare(b.name, 'zh-CN'))

  groupPanels.sort(
    (a, b) => Number(b.groupBusy) - Number(a.groupBusy) || a.name.localeCompare(b.name, 'zh-CN'),
  )

  return { groups: groupPanels, individuals }
}

function accumulateProcessStats(orders) {
  const stats = { done: 0, running: 0, queue: 0, claim: 0 }
  orders.forEach((o) => {
    buildProcessRouteSteps(o).forEach((step) => {
      step.nodes.forEach((n) => {
        const bucket = classifyProcessKpiBucket(n)
        if (bucket && stats[bucket] != null) stats[bucket] += 1
      })
    })
  })
  return stats
}

export function formatMonitorQty(val) {
  return formatNumber(val, 4, { empty: '0' })
}

function resolvePlanDateRange(o) {
  if (Array.isArray(o?.planDateRange) && o.planDateRange.length >= 2) {
    return [o.planDateRange[0], o.planDateRange[1]]
  }
  if (o?.planStartDate || o?.planEndDate) {
    return [o.planStartDate || '', o.planEndDate || '']
  }
  return []
}

function resolvePlanEndDate(o) {
  const range = resolvePlanDateRange(o)
  return range[1] || o?.planEndDate || ''
}

/** 超过计划结束日且未完结 → 逾期 */
export function isMonitorWorkOrderOverdue(o) {
  if (!o) return false
  if (['已完成', '完成', '终止'].includes(o.status)) return false
  const end = resolvePlanEndDate(o)
  if (!end) return false
  return dayjs().startOf('day').isAfter(dayjs(end).startOf('day'))
}

/** 分批次下发：存在排产批次且（多批 或 已有下发批次） */
export function resolveMonitorBatchLabel(o) {
  const batches = o?.scheduleBatches || []
  if (!batches.length) return ''
  const dispatched = batches.filter((b) => b.status && b.status !== '待下发')
  if (batches.length <= 1 && !dispatched.length) return ''
  const nos = (dispatched.length ? dispatched : batches)
    .map((b) => b.batchNo)
    .filter((n) => n != null && n !== '')
  if (nos.length) return `批次#${nos.join('/')}`
  return '批次'
}

function mapMonitorListRow(o) {
  const planRange = resolvePlanDateRange(o)
  const overdue = isMonitorWorkOrderOverdue(o)
  const routeSteps = buildProcessRouteSteps(o)
  const row = {
    id: o.id,
    orderNo: o.orderNo || o.workOrderNo || o.id,
    name: o.name || o.productName || o.itemName || '—',
    productName: o.productName || o.itemName || '',
    productCode: o.productCode || o.materialCode || '',
    specModel: o.specModel || o.spec || '',
    material: o.material || '',
    woTypeLabel: o.woTypeLabel,
    workCenter: o.workCenter || '—',
    status: o.status || '待下发',
    overdue,
    batchLabel: resolveMonitorBatchLabel(o),
    planQty: Number(o.planQty) || 0,
    scheduleQty: Number(o.scheduleQty) || 0,
    planDateText: formatWorkOrderPlanDateRange(planRange),
    planEnd: resolvePlanEndDate(o),
    actualStart: o.executedAt || o.dispatchedAt || '',
    listPath: o.listPath,
    routeSteps,
  }
  row.heightUnits = resolveMonitorRowHeightUnits(row, false)
  return row
}

/** 一页固定可放的串行高度格数（6 张串行，或 1 并行折叠 + 4 串行 等） */
export const MONITOR_PAGE_SLOT_UNITS = 6
/** 并行工序默认展示条数（2×2），折叠时固定占 2 格 */
export const MONITOR_PARALLEL_DEFAULT_VISIBLE = 4

/**
 * 列表高度格数：
 * - 串行 = 1
 * - 并行折叠（默认前 4 道）= 2
 * - 并行展开后，每多展示一道工序 +1 格
 */
export function resolveMonitorRowHeightUnits(row, expanded = false) {
  const parallelStep = (row.routeSteps || []).find((s) => s.parallel)
  if (!parallelStep) return 1
  const n = (parallelStep.nodes || []).length
  if (!expanded || n <= MONITOR_PARALLEL_DEFAULT_VISIBLE) return 2
  return 2 + (n - MONITOR_PARALLEL_DEFAULT_VISIBLE)
}

/**
 * 按高度格数装箱分页：串行 1 格、并行折叠 2 格；展开后按 resolveMonitorRowHeightUnits。
 * 默认容量 6：全串行 6 单，或 1 张折叠并行 + 4 张串行 = 5 单。
 */
export function packMonitorListPages(rows, slotUnits = MONITOR_PAGE_SLOT_UNITS) {
  const capacity = Math.max(1, Number(slotUnits) || MONITOR_PAGE_SLOT_UNITS)
  const pages = []
  let bucket = []
  let used = 0
  rows.forEach((row) => {
    const units = Math.max(1, Number(row.heightUnits) || 1)
    if (bucket.length && used + units > capacity) {
      pages.push(bucket)
      bucket = []
      used = 0
    }
    bucket.push(row)
    used += units
  })
  if (bucket.length) pages.push(bucket)
  return pages.length ? pages : [[]]
}

/**
 * @param {{ period: string, woType: string, workCenter: string, listStatus: string, page: number, slotUnits?: number, pageSize?: number, parallelExpanded?: Record<string, boolean> }} filters
 */
export function buildWorkOrderMonitorDashboard(filters = {}) {
  const period = filters.period || MONITOR_PERIOD.TODAY
  const woType = filters.woType || MONITOR_WO_TYPE.ALL
  const workCenter = filters.workCenter || ''
  const listStatus = filters.listStatus || MONITOR_LIST_STATUS.RUNNING
  const page = Math.max(1, Number(filters.page) || 1)
  const slotUnits = Math.max(
    1,
    Number(filters.slotUnits != null ? filters.slotUnits : filters.pageSize) ||
      MONITOR_PAGE_SLOT_UNITS,
  )
  const parallelExpanded = filters.parallelExpanded || {}

  void workOrderState.orders
  void assemblyWorkOrderState.orders
  void processReportState.records
  void employeeGroupState.groups

  const all = filterByTypeAndCenter(collectMonitorWorkOrders(), { woType, workCenter })

  // KPI 工单：待下发/进行中为当前快照；已完成为时段内
  let pending = 0
  let running = 0
  let done = 0
  all.forEach((o) => {
    const bucket = mapWoBucket(o.status)
    if (bucket === 'pending') pending += 1
    else if (bucket === 'running') running += 1
    else if (bucket === 'done' && isDateInPeriod(o.updatedAt || o.createdAt, period)) done += 1
  })

  // 报工：时段内笔数 / 良品 / 不良（关联工单需过类型与工作中心）
  const woIdSet = new Set(all.map((o) => o.id))
  const woNoSet = new Set(all.map((o) => o.orderNo || o.workOrderNo).filter(Boolean))
  let reportCount = 0
  let goodQty = 0
  let badQty = 0
  ;(processReportState.records || []).forEach((r) => {
    if (!isDateInPeriod(r.createdAt, period)) return
    if (r.workOrderId || r.workOrderNo) {
      const linked =
        (r.workOrderId && woIdSet.has(r.workOrderId)) ||
        (r.workOrderNo && woNoSet.has(r.workOrderNo))
      if (!linked) return
    } else if (woType !== MONITOR_WO_TYPE.ALL || workCenter) {
      // 无工单关联的报工在已筛选时不计入，避免口径混淆
      return
    }
    reportCount += 1
    goodQty += Number(r.goodQty) || 0
    badQty += Number(r.defectQty) || 0
  })

  const listSource = all
    .filter((o) => matchListStatus(o.status, listStatus))
    .sort((a, b) =>
      String(b.updatedAt || b.createdAt || '').localeCompare(
        String(a.updatedAt || a.createdAt || ''),
      ),
    )

  const total = listSource.length
  const mappedRows = listSource.map((o) => {
    const row = mapMonitorListRow(o)
    const expanded = Boolean(parallelExpanded[row.id])
    row.parallelExpanded = expanded
    row.heightUnits = resolveMonitorRowHeightUnits(row, expanded)
    return row
  })
  const pages = packMonitorListPages(mappedRows, slotUnits)
  const pageCount = Math.max(1, pages.length)
  const safePage = Math.min(page, pageCount)
  const pageRows = pages[safePage - 1] || []
  const pageUnits = pageRows.reduce((s, r) => s + (Number(r.heightUnits) || 1), 0)

  const allTasks = withDemoWorkerTasks(listAllMobileTasks())
  const workerPanels = buildWorkerPanels(allTasks)
  const processStats = accumulateProcessStats(all)

  const busyNameSet = new Set()
  workerPanels.groups.forEach((g) => {
    g.members.forEach((m) => {
      if (m.statusTone === 'busy') busyNameSet.add(m.name)
    })
  })
  workerPanels.individuals.forEach((p) => {
    if (p.busy) busyNameSet.add(p.name)
  })
  const standbyPeople = workerPanels.groups.reduce(
    (s, g) => s + g.members.filter((m) => m.statusTone === 'standby').length,
    0,
  )
  const totalNameSet = new Set()
  workerPanels.groups.forEach((g) => g.members.forEach((m) => totalNameSet.add(m.name)))
  workerPanels.individuals.forEach((p) => totalNameSet.add(p.name))
  const busyPeople = busyNameSet.size
  const totalPeople = totalNameSet.size

  return {
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    kpis: {
      pending,
      running,
      done,
      reportCount,
      goodQty,
      badQty,
      processDone: processStats.done,
      processRunning: processStats.running,
      processQueue: processStats.queue,
      processClaim: processStats.claim,
    },
    list: {
      total,
      page: safePage,
      pageSize: pageRows.length,
      slotUnits,
      pageUnits,
      pageCount,
      rows: pageRows,
    },
    workers: {
      groups: workerPanels.groups,
      individuals: workerPanels.individuals,
      busy: busyPeople,
      standby: standbyPeople,
      idle: Math.max(0, totalPeople - busyPeople - standbyPeople),
      total: totalPeople,
      groupBusy: workerPanels.groups.filter((g) => g.groupBusy).length,
      groupIdle: workerPanels.groups.filter((g) => !g.groupBusy).length,
    },
  }
}

/** 演示：小组接单 + 单工人接单，右侧两种形态都能看到 */
function withDemoWorkerTasks(tasks) {
  let next = tasks
  const g =
    (employeeGroupState.groups || []).find((x) => x.name === '加工小组') ||
    (employeeGroupState.groups || []).find((x) => x.status === '启用') ||
    (employeeGroupState.groups || [])[0]
  if (g?.leaderName && !next.some((t) => t.id === 'mon-demo-group-claim')) {
    next = [
      {
        id: 'mon-demo-group-claim',
        processName: '泵装配调试',
        workOrderNo: 'WO-GROUP-DEMO',
        workOrderCode: 'WO-GROUP-DEMO',
        taskStatus: '执行中',
        claimedBy: g.leaderName,
        executor: g.leaderName,
        groupId: g.id,
        groupName: g.name,
        resourceType: '工人小组',
      },
      ...next,
    ]
  }
  if (!next.some((t) => t.id === 'mon-demo-person-claim')) {
    const demoPeople = [
      {
        id: 'mon-demo-person-claim',
        processName: '钻孔',
        workOrderNo: 'WO-PERSON-DEMO',
        status: '执行中',
        name: '赵六',
      },
      {
        id: 'mon-demo-person-idle',
        processName: '去毛刺',
        workOrderNo: 'WO-PERSON-DEMO-2',
        status: '已完成',
        name: '钱七',
      },
      {
        id: 'mon-demo-person-3',
        processName: '焊接',
        workOrderNo: 'WO-PERSON-DEMO-3',
        status: '执行中',
        name: '周八',
      },
      {
        id: 'mon-demo-person-4',
        processName: '打磨',
        workOrderNo: 'WO-PERSON-DEMO-4',
        status: '待开始',
        name: '吴九',
      },
      {
        id: 'mon-demo-person-5',
        processName: '装配',
        workOrderNo: 'WO-PERSON-DEMO-5',
        status: '执行中',
        name: '郑十',
      },
      {
        id: 'mon-demo-person-6',
        processName: '试压',
        workOrderNo: 'WO-PERSON-DEMO-6',
        status: '待报工',
        name: '冯十一',
      },
    ]
    next = [
      ...demoPeople.map((p) => ({
        id: p.id,
        processName: p.processName,
        workOrderNo: p.workOrderNo,
        workOrderCode: p.workOrderNo,
        taskStatus: p.status,
        claimedBy: p.name,
        executor: p.name,
        resourceType: '工人',
        executors: [p.name],
      })),
      ...next,
    ]
  }
  return next
}
