/**
 * 暂停/终止确认弹窗演示数据
 * - 有报工：暂停二次确认（仍要暂停）；已下发无报工也会弹确认
 * - 部分报工：终止双分支确认
 * - 已下发未报工：终止后任务隐藏
 */
import dayjs from 'dayjs'
import { buildProcessesFromRoute } from '@/mock/processRoutes'
import { MOBILE_TASK_SYNC_KEY } from '@/utils/mobileTaskDispatch'

export const WORK_ORDER_CONTROL_DEMO_IDS = [
  'wo-ctrl-pause-reported',
  'wo-ctrl-term-noreport',
  'wo-ctrl-term-partial',
]

const ROUTE = '机加标准路线'
const TS = dayjs().format('YYYY-MM-DD HH:mm:ss')

function baseProcesses(executors = ['张三']) {
  return buildProcessesFromRoute(ROUTE).map((p, i) => ({
    ...p,
    executors: i === 0 ? [...executors] : [...executors],
  }))
}

function makeBatch(woId, qty, status = '执行中') {
  return {
    id: `sb-${woId}-1`,
    batchNo: 1,
    qty,
    status,
    processAssignments: [],
    createdAt: TS,
    dispatchedAt: TS,
  }
}

/** 演示工单（生产） */
export function createWorkOrderControlDemoOrders() {
  return [
    {
      id: 'wo-ctrl-pause-reported',
      code: 'WO-CTRL-PAUSE-001',
      name: '【演示·暂停确认】法兰盘加工工单',
      productName: '法兰盘',
      materialCode: 'CP-CTRL-01',
      orderCategory: '生产工单',
      status: '执行中',
      hasClaimedTask: true,
      dispatchedAt: TS,
      executedAt: TS,
      scheduleQty: 10,
      planQty: 10,
      workCenter: '机加车间',
      bom: '法兰盘',
      warehouse: '半成品仓',
      urgency: '普通',
      planDateRange: ['2026-08-01', '2026-08-20'],
      remark: '演示：已有任务报工完成 → 点「暂停」应弹出二次确认',
      processRouteName: ROUTE,
      source: 'control-demo',
      sourceOrderNo: 'SO-CTRL-PAUSE',
      processes: baseProcesses(['张三', '李四']),
      scheduleBatches: [makeBatch('wo-ctrl-pause-reported', 10)],
      activeScheduleBatchId: 'sb-wo-ctrl-pause-reported-1',
      createdAt: '2026-08-01',
      updatedAt: TS,
    },
    {
      id: 'wo-ctrl-term-noreport',
      code: 'WO-CTRL-TERM-001',
      name: '【演示·终止无报工】轴承座加工工单',
      productName: '轴承座',
      materialCode: 'CP-CTRL-02',
      orderCategory: '生产工单',
      status: '已下发',
      hasClaimedTask: false,
      dispatchedAt: TS,
      scheduleQty: 8,
      planQty: 8,
      workCenter: '机加车间',
      bom: '轴承座',
      warehouse: '半成品仓',
      urgency: '普通',
      planDateRange: ['2026-08-05', '2026-08-25'],
      remark: '演示：任务已下发但尚未报工 → 终止后小程序任务应隐藏',
      processRouteName: ROUTE,
      source: 'control-demo',
      sourceOrderNo: 'SO-CTRL-TERM1',
      processes: baseProcesses(['王五']),
      scheduleBatches: [makeBatch('wo-ctrl-term-noreport', 8, '已下发')],
      activeScheduleBatchId: 'sb-wo-ctrl-term-noreport-1',
      createdAt: '2026-08-05',
      updatedAt: TS,
    },
    {
      id: 'wo-ctrl-term-partial',
      code: 'WO-CTRL-TERM-002',
      name: '【演示·终止部分报工】端盖加工工单',
      productName: '端盖',
      materialCode: 'CP-CTRL-03',
      orderCategory: '生产工单',
      status: '执行中',
      hasClaimedTask: true,
      dispatchedAt: TS,
      executedAt: TS,
      scheduleQty: 12,
      planQty: 12,
      workCenter: '机加车间',
      bom: '端盖',
      warehouse: '半成品仓',
      urgency: '紧急',
      planDateRange: ['2026-08-08', '2026-08-28'],
      remark: '演示：部分任务已报工 → 点「终止」应弹出：仍终止（重置报工）/ 不处理（保留报工）',
      processRouteName: ROUTE,
      source: 'control-demo',
      sourceOrderNo: 'SO-CTRL-TERM2',
      processes: baseProcesses(['赵六']),
      scheduleBatches: [makeBatch('wo-ctrl-term-partial', 12)],
      activeScheduleBatchId: 'sb-wo-ctrl-term-partial-1',
      createdAt: '2026-08-08',
      updatedAt: TS,
    },
  ]
}

function taskSeed(partial) {
  return {
    placement: 'todo',
    resourceType: '工人',
    orderCategory: '生产工单',
    reportMode: '计数报工',
    reportedGoodQty: 0,
    reportedDefectQty: 0,
    reportedFinishedQty: 0,
    controlStatus: '',
    hiddenByTerminate: false,
    createdAt: TS,
    ...partial,
  }
}

/** 与演示工单绑定的小程序任务 */
export function createWorkOrderControlDemoTasks() {
  return [
    // —— 暂停确认：1 条已完成 + 1 条待报工 ——
    taskSeed({
      id: 'task-ctrl-pause-done',
      workOrderId: 'wo-ctrl-pause-reported',
      workOrderCode: 'WO-CTRL-PAUSE-001',
      workOrderNo: 'WO-CTRL-PAUSE-001',
      taskNo: 'T-CTRL-P1',
      processName: '下料',
      processSeq: 1,
      productName: '法兰盘',
      itemCode: 'CP-CTRL-01',
      expectedQty: 10,
      targetQty: 10,
      executor: '张三',
      claimedBy: '张三',
      taskStatus: '已完成',
      reportedGoodQty: 10,
      reportedFinishedQty: 10,
      reportStatus: '待审核',
    }),
    taskSeed({
      id: 'task-ctrl-pause-pending',
      workOrderId: 'wo-ctrl-pause-reported',
      workOrderCode: 'WO-CTRL-PAUSE-001',
      workOrderNo: 'WO-CTRL-PAUSE-001',
      taskNo: 'T-CTRL-P2',
      processName: '钻孔',
      processSeq: 2,
      productName: '法兰盘',
      itemCode: 'CP-CTRL-01',
      expectedQty: 10,
      targetQty: 10,
      executor: '李四',
      claimedBy: '李四',
      taskStatus: '待报工',
    }),

    // —— 终止无报工：全部待领取/待报工 ——
    taskSeed({
      id: 'task-ctrl-term-claim',
      workOrderId: 'wo-ctrl-term-noreport',
      workOrderCode: 'WO-CTRL-TERM-001',
      workOrderNo: 'WO-CTRL-TERM-001',
      taskNo: 'T-CTRL-N1',
      processName: '下料',
      processSeq: 1,
      productName: '轴承座',
      itemCode: 'CP-CTRL-02',
      expectedQty: 8,
      targetQty: 8,
      placement: 'claim',
      claimTargets: ['王五'],
      executor: '',
      taskStatus: '待领取',
    }),
    taskSeed({
      id: 'task-ctrl-term-pending',
      workOrderId: 'wo-ctrl-term-noreport',
      workOrderCode: 'WO-CTRL-TERM-001',
      workOrderNo: 'WO-CTRL-TERM-001',
      taskNo: 'T-CTRL-N2',
      processName: '钻孔',
      processSeq: 2,
      productName: '轴承座',
      itemCode: 'CP-CTRL-02',
      expectedQty: 8,
      targetQty: 8,
      executor: '王五',
      taskStatus: '待开始',
    }),

    // —— 终止部分报工：1 完成 + 1 进行中 ——
    taskSeed({
      id: 'task-ctrl-term-done',
      workOrderId: 'wo-ctrl-term-partial',
      workOrderCode: 'WO-CTRL-TERM-002',
      workOrderNo: 'WO-CTRL-TERM-002',
      taskNo: 'T-CTRL-T1',
      processName: '下料',
      processSeq: 1,
      productName: '端盖',
      itemCode: 'CP-CTRL-03',
      expectedQty: 12,
      targetQty: 12,
      executor: '赵六',
      claimedBy: '赵六',
      taskStatus: '已完成',
      reportedGoodQty: 12,
      reportedFinishedQty: 12,
      reportStatus: '待审核',
    }),
    taskSeed({
      id: 'task-ctrl-term-open',
      workOrderId: 'wo-ctrl-term-partial',
      workOrderCode: 'WO-CTRL-TERM-002',
      workOrderNo: 'WO-CTRL-TERM-002',
      taskNo: 'T-CTRL-T2',
      processName: '铣削',
      processSeq: 2,
      productName: '端盖',
      itemCode: 'CP-CTRL-03',
      expectedQty: 12,
      targetQty: 12,
      executor: '赵六',
      claimedBy: '赵六',
      taskStatus: '待报工',
      reportedGoodQty: 3,
      reportedFinishedQty: 3,
    }),
  ]
}

const TASK_SEED_FLAG = 'i_doms_wo_control_demo_tasks_v2'

/** 写入/合并演示任务到小程序任务存储（供 analyzeWorkOrderTasks 读取） */
export function ensureWorkOrderControlDemoTasks() {
  if (typeof localStorage === 'undefined') return
  try {
    if (localStorage.getItem(TASK_SEED_FLAG) === '1') {
      // 仍确保任务存在（被清空时重建）
    }
    const demos = createWorkOrderControlDemoTasks()
    const demoIds = new Set(demos.map((t) => t.id))

    let stored = []
    try {
      const raw = localStorage.getItem('i_doms_mobile_disassembly_tasks')
      if (raw) {
        const parsed = JSON.parse(raw)
        stored = Array.isArray(parsed) ? parsed : []
      }
    } catch {
      stored = []
    }
    const rest = stored.filter((t) => !demoIds.has(t?.id))
    localStorage.setItem('i_doms_mobile_disassembly_tasks', JSON.stringify([...demos, ...rest]))

    let sync = []
    try {
      const rawSync = localStorage.getItem(MOBILE_TASK_SYNC_KEY)
      if (rawSync) {
        const parsed = JSON.parse(rawSync)
        sync = Array.isArray(parsed) ? parsed : []
      }
    } catch {
      sync = []
    }
    const syncRest = sync.filter((t) => !demoIds.has(t?.id))
    localStorage.setItem(MOBILE_TASK_SYNC_KEY, JSON.stringify([...demos, ...syncRest]))

    localStorage.setItem(TASK_SEED_FLAG, '1')
  } catch {
    /* ignore */
  }
}

export function ensureWorkOrderControlDemoOrders(orders) {
  ensureWorkOrderControlDemoTasks()
  const demos = createWorkOrderControlDemoOrders()
  const existedMap = new Map((orders || []).map((o) => [o.id, o]))
  const mergedDemos = demos.map((d) => {
    const existed = existedMap.get(d.id)
    if (!existed) return d
    // 保留用户已操作的管控态，避免刷新把演示单打回执行中
    return {
      ...d,
      status: existed.status || d.status,
      hasClaimedTask: existed.hasClaimedTask ?? d.hasClaimedTask,
      statusBeforePause: existed.statusBeforePause || '',
      pausedAt: existed.pausedAt || '',
      terminatedAt: existed.terminatedAt || '',
      terminateMode: existed.terminateMode || '',
    }
  })
  const rest = (orders || []).filter((o) => !WORK_ORDER_CONTROL_DEMO_IDS.includes(o.id))
  return [...mergedDemos, ...rest]
}
