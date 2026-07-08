import dayjs from 'dayjs'
import { getEmployeeGroupByName } from '@/store/employeeGroupStore'
import { buildDisassemblyProcesses } from '@/mock/processRoutes'
import { getProcessByName } from '@/store/processConfigStore'
import { normalizeReportMode } from '@/utils/reportMode'
import {
  buildCollaborativeTaskId,
  buildCollaborativeTaskNo,
  buildStandardTaskId,
  buildStandardTaskNo,
  buildTaskGroupId,
  resolveProcessExecutionMode,
  shouldSplitCollaborativeTasks,
} from '@/utils/taskExecutionMode'
import { isParallelTaskDispatch } from '@/store/businessRuleStore'

export const MOBILE_TASK_SYNC_KEY = 'i_doms_mobile_tasks_sync'

/** 拆解工单在小程序沿用的工序序列 */
export const DISASSEMBLY_MOBILE_PROCESSES = ['拆解', '拆解质检', '入库']

function loadSyncQueue() {
  try {
    const raw = localStorage.getItem(MOBILE_TASK_SYNC_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function saveSyncQueue(tasks) {
  localStorage.setItem(MOBILE_TASK_SYNC_KEY, JSON.stringify(tasks))
}

function resolveDispatchControl() {
  return isParallelTaskDispatch() ? 'parallel' : 'serial'
}

function resolveSerialLocked(processSeq, dispatchControl) {
  if (dispatchControl === 'parallel') return false
  return processSeq > 1
}

function resolvePlacement(process, executors) {
  const resourceType = process.resourceType || '工人'
  const names = executors || []

  if (resourceType === '工人') {
    if (names.length <= 1) {
      return {
        placement: 'todo',
        taskStatus: '待开始',
        executor: names[0] || '',
        claimTargets: [],
        groupId: null,
        groupName: '',
        groupLeader: '',
        leaderParticipates: true,
      }
    }
    return {
      placement: 'claim',
      taskStatus: '待领取',
      executor: '',
      claimTargets: [...names],
      groupId: null,
      groupName: '',
      groupLeader: '',
      leaderParticipates: true,
    }
  }

  const groups = names.map((n) => getEmployeeGroupByName(n)).filter(Boolean)
  const leaders = groups.map((g) => g.leaderName).filter(Boolean)

  if (names.length <= 1) {
    const group = groups[0]
    return {
      placement: 'todo',
      taskStatus: '待分发',
      executor: group?.leaderName || names[0] || '',
      claimTargets: [],
      groupId: group?.id || null,
      groupName: group?.name || names[0] || '',
      groupLeader: group?.leaderName || '',
      leaderParticipates: group?.leaderParticipates ?? true,
      groupWorkers: group?.workers || [],
    }
  }

  return {
    placement: 'claim',
    taskStatus: '待领取',
    executor: '',
    claimTargets: leaders.length ? leaders : names,
    groupId: null,
    groupName: names.join('、'),
    groupLeader: '',
    leaderParticipates: true,
    groupWorkers: [],
    groupOptions: groups,
  }
}

function enrichProcessForTask(process) {
  const procConfig = getProcessByName(process.name)
  return {
    ...process,
    reportMode: normalizeReportMode(process.reportMode || procConfig?.reportMode),
    taskExecutionMode: resolveProcessExecutionMode({
      taskExecutionMode: process.taskExecutionMode ?? procConfig?.taskExecutionMode,
    }),
  }
}

function buildCollaborativeTasks(workOrder, process, processSeq, product, processes, ts, dateStr, dispatchControl) {
  const executors = process.executors || []
  const taskGroupId = buildTaskGroupId(workOrder.id, processSeq)
  const baseTaskNo = buildStandardTaskNo(dateStr, processSeq)

  return executors.map((executorName, index) => {
    const slot = index + 1
    return {
      id: buildCollaborativeTaskId(workOrder.id, processSeq, slot),
      taskGroupId,
      taskNo: buildCollaborativeTaskNo(dateStr, processSeq, slot),
      baseTaskNo,
      collaborationSlot: slot,
      collaborationTotal: executors.length,
      taskExecutionMode: 'collaborative',
      workOrderId: workOrder.id,
      workOrderCode: workOrder.code,
      workOrderName: workOrder.name,
      processName: process.name,
      processSeq,
      processRoute: workOrder.processRouteName || '',
      resourceType: process.resourceType || '工人',
      reportMode: process.reportMode || '',
      executors: [...executors],
      orderCategory: workOrder.orderCategory,
      orderSource: workOrder.orderSource || workOrder.source || '',
      salesOrderNo: workOrder.sourceOrderNo || '',
      workOrderRemark: workOrder.remark || '',
      laborCalcMethod: '时长报工+计时工资',
      nextProcess: getNextProcessName(processes, process.name),
      createdAt: ts,
      dispatchControl,
      serialLocked: resolveSerialLocked(processSeq, dispatchControl),
      placement: 'todo',
      taskStatus: '待开始',
      executor: executorName,
      claimTargets: [],
      groupId: null,
      groupName: '',
      groupLeader: '',
      leaderParticipates: true,
      ...product,
    }
  })
}

function buildSingleTask(
  workOrder,
  process,
  processSeq,
  product,
  processes,
  ts,
  dateStr,
  orderCategory,
  dispatchControl,
) {
  const placement = resolvePlacement(process, process.executors)
  const taskGroupId = buildTaskGroupId(workOrder.id, processSeq)

  return {
    id: buildStandardTaskId(workOrder.id, processSeq),
    taskGroupId,
    taskNo: buildStandardTaskNo(dateStr, processSeq),
    baseTaskNo: buildStandardTaskNo(dateStr, processSeq),
    collaborationSlot: 1,
    collaborationTotal: 1,
    taskExecutionMode: 'single_claim',
    workOrderId: workOrder.id,
    workOrderCode: workOrder.code,
    workOrderName: workOrder.name,
    processName: process.name,
    processSeq,
    processRoute: workOrder.processRouteName || '',
    resourceType: process.resourceType || '工人',
    reportMode: process.reportMode || '',
    executors: [...(process.executors || [])],
    orderCategory,
    orderSource: workOrder.orderSource || workOrder.source || '',
    salesOrderNo: workOrder.sourceOrderNo || '',
    workOrderRemark: workOrder.remark || '',
    laborCalcMethod: '时长报工+计时工资',
    nextProcess: getNextProcessName(processes, process.name),
    createdAt: ts,
    dispatchControl,
    serialLocked: resolveSerialLocked(processSeq, dispatchControl),
    ...product,
    ...placement,
  }
}

function mapWorkOrderProduct(workOrder, orderCategory) {
  if (orderCategory === '拆解工单') {
    return {
      productName: workOrder.itemName || workOrder.productName || '',
      itemCode: workOrder.itemCode || '',
      specModel: workOrder.specModel || '',
      barcodeType: workOrder.barcodeType || workOrder.specModel || '一批一码',
      serialNo: workOrder.serialNo || '',
      expectedQty: workOrder.planQty || workOrder.scheduleQty || 1,
    }
  }
  return {
    productName: workOrder.productName || '',
    itemCode: workOrder.productCode || workOrder.itemCode || '',
    specModel: workOrder.specModel || '',
    barcodeType: workOrder.barcodeType || '一批一码',
    serialNo: workOrder.serialNo || '',
    expectedQty: workOrder.planQty || workOrder.scheduleQty || 1,
  }
}

function getProcessesForOrder(workOrder, orderCategory) {
  if (orderCategory === '拆解工单') {
    const expected = ['拆解', '拆解质检', '入库']
    const names = (workOrder.processes || []).map((p) => p.name)
    if (expected.every((n) => names.includes(n))) {
      return workOrder.processes
    }
    return buildDisassemblyProcesses()
  }
  return workOrder.processes || []
}

function getNextProcessName(processes, currentName) {
  const idx = processes.findIndex((p) => p.name === currentName)
  if (idx < 0 || idx >= processes.length - 1) return ''
  return processes[idx + 1].name
}

/**
 * 根据 PC 工单生成小程序任务（标准模式串行锁定；极简报工并行下发）
 */
export function generateMobileTasksFromWorkOrder(workOrder, orderCategory) {
  const processes = getProcessesForOrder(workOrder, orderCategory)
  const product = mapWorkOrderProduct(workOrder, orderCategory)
  const ts = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const dateStr = dayjs().format('YYYYMMDD')
  const dispatchControl = resolveDispatchControl()
  const tasks = []

  processes.forEach((rawProcess, index) => {
    const process = enrichProcessForTask(rawProcess)
    const processSeq = process.index ?? index + 1

    if (shouldSplitCollaborativeTasks(process)) {
      tasks.push(
        ...buildCollaborativeTasks(
          workOrder,
          process,
          processSeq,
          product,
          processes,
          ts,
          dateStr,
          dispatchControl,
        ),
      )
      return
    }

    tasks.push(
      buildSingleTask(
        workOrder,
        process,
        processSeq,
        product,
        processes,
        ts,
        dateStr,
        orderCategory,
        dispatchControl,
      ),
    )
  })

  return tasks
}

export function pushMobileTasks(tasks) {
  const queue = loadSyncQueue()
  const map = new Map(queue.map((t) => [t.id, t]))
  for (const task of tasks) {
    map.set(task.id, task)
  }
  saveSyncQueue([...map.values()])
  return tasks.length
}

export function dispatchWorkOrderToMobile(workOrder, orderCategory) {
  const tasks = generateMobileTasksFromWorkOrder(workOrder, orderCategory)
  pushMobileTasks(tasks)
  return tasks
}

export function getMobileSyncQueue() {
  return loadSyncQueue()
}
