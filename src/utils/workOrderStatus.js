/**
 * 工单执行主状态 + 排产旁显
 * 主状态：待下发 / 已下发 / 执行中 / 已完成 / 暂停 / 终止
 * 「部分下发」不再作为主状态；未排完用排产进度旁显
 */
import { MOBILE_TASK_SYNC_KEY } from '@/utils/mobileTaskDispatch'

export const WORK_ORDER_STATUSES = ['待下发', '已下发', '执行中', '已完成', '暂停', '终止']

function planQtyOf(wo) {
  return Math.max(0, Number(wo?.planQty) || 0)
}

function scheduledQtyOf(wo) {
  const batches = wo?.scheduleBatches || []
  if (batches.length) {
    return batches.reduce((s, b) => s + Math.max(0, Number(b.qty) || 0), 0)
  }
  if (!wo?.dispatchedAt && (!wo?.status || wo.status === '待下发')) {
    return 0
  }
  return Math.max(0, Number(wo?.scheduleQty) || 0)
}

function remainScheduleQtyOf(wo) {
  return Math.max(0, planQtyOf(wo) - scheduledQtyOf(wo))
}

function hasScheduleStarted(wo) {
  if (!wo) return false
  if (wo.dispatchedAt) return true
  const batches = wo.scheduleBatches || []
  if (batches.some((b) => b.status && b.status !== '待下发')) return true
  if (batches.some((b) => b.status === '待下发')) return true
  return scheduledQtyOf(wo) > 0
}

export const WORK_ORDER_STATUS_LOCKED = new Set(['暂停', '终止', '已完成', '完成'])

/** 领取/报工事实：升「执行中」的判定 */
const CLAIM_EVIDENCE_STATUSES = new Set(['待报工', '执行中', '已完成'])

const MOBILE_TASK_STORAGE_KEY = 'i_doms_mobile_disassembly_tasks'

export function normalizeWorkOrderStatusLabel(status) {
  if (status === '完成') return '已完成'
  if (status === '部分下发') return null // 需按事实重算
  return status || '待下发'
}

export function isWorkOrderStatusLocked(status) {
  return WORK_ORDER_STATUS_LOCKED.has(status)
}

/**
 * 未排完：已开始排产/下发，且仍有剩余可排或存在待下发批次。
 * 纯「待下发」且尚未排产不打此标签。
 */
export function isScheduleIncomplete(wo) {
  if (!wo) return false
  if (!hasScheduleStarted(wo)) return false
  if (remainScheduleQtyOf(wo) > 0) return true
  return (wo.scheduleBatches || []).some((b) => b.status === '待下发')
}

export function formatScheduleProgressLabel(wo) {
  return `${scheduledQtyOf(wo)}/${planQtyOf(wo)}`
}

export function workOrderStatusColor(status) {
  const map = {
    待下发: 'warning',
    已下发: 'processing',
    执行中: 'blue',
    已完成: 'success',
    完成: 'success',
    暂停: 'default',
    终止: 'error',
    部分下发: 'processing', // 兼容旧数据展示瞬间
  }
  return map[status] || 'default'
}

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

/** 读取与工单关联的小程序任务（本地演示同源存储） */
export function listMobileTasksForWorkOrder(workOrderId) {
  if (!workOrderId) return []
  const out = []
  const seen = new Set()

  const push = (task) => {
    if (!task?.id || task.workOrderId !== workOrderId) return
    if (seen.has(task.id)) return
    seen.add(task.id)
    out.push(task)
  }

  const stored = readJsonStorage(MOBILE_TASK_STORAGE_KEY)
  if (Array.isArray(stored)) stored.forEach(push)

  const sync = readJsonStorage(MOBILE_TASK_SYNC_KEY)
  if (Array.isArray(sync)) sync.forEach(push)

  return out
}

function persistMobileTaskPatches(patchesById) {
  const ids = Object.keys(patchesById)
  if (!ids.length) return

  const stored = readJsonStorage(MOBILE_TASK_STORAGE_KEY)
  if (Array.isArray(stored)) {
    let changed = false
    const next = stored.map((t) => {
      const patch = patchesById[t.id]
      if (!patch) return t
      changed = true
      return { ...t, ...patch }
    })
    if (changed) writeJsonStorage(MOBILE_TASK_STORAGE_KEY, next)
  }

  const sync = readJsonStorage(MOBILE_TASK_SYNC_KEY)
  if (Array.isArray(sync)) {
    let changed = false
    const next = sync.map((t) => {
      const patch = patchesById[t.id]
      if (!patch) return t
      changed = true
      return { ...t, ...patch }
    })
    if (changed) writeJsonStorage(MOBILE_TASK_SYNC_KEY, next)
  }
}

export function taskHasClaimEvidence(task) {
  if (!task) return false
  if (task.claimedBy) return true
  if (CLAIM_EVIDENCE_STATUSES.has(task.taskStatus)) return true
  if (Number(task.reportedFinishedQty) > 0) return true
  if (Number(task.reportedGoodQty) > 0) return true
  return false
}

export function taskHasReportProgress(task) {
  if (!task) return false
  if (task.taskStatus === '已完成') return true
  if (Number(task.reportedFinishedQty) > 0) return true
  if (Number(task.reportedGoodQty) > 0) return true
  return false
}

export function analyzeWorkOrderTasks(workOrderId) {
  const tasks = listMobileTasksForWorkOrder(workOrderId)
  const visible = tasks.filter((t) => !t.hiddenByTerminate)
  const hasClaim = visible.some(taskHasClaimEvidence)
  const reportedTasks = visible.filter(taskHasReportProgress)
  const unfinished = visible.filter((t) => t.taskStatus !== '已完成')
  return {
    tasks: visible,
    allTasks: tasks,
    hasClaim,
    hasReported: reportedTasks.length > 0,
    reportedCount: reportedTasks.length,
    unfinishedCount: unfinished.length,
  }
}

export function workOrderHasClaimEvidence(workOrder) {
  if (!workOrder) return false
  if (workOrder.hasClaimedTask) return true
  return analyzeWorkOrderTasks(workOrder.id).hasClaim
}

/**
 * 按执行事实回写主状态（不覆盖暂停/终止/已完成）
 * 未排完不改 status
 */
export function syncWorkOrderExecutionStatus(workOrder) {
  if (!workOrder) return workOrder
  if (isWorkOrderStatusLocked(workOrder.status)) return workOrder

  const batches = workOrder.scheduleBatches || []
  const hasDispatchedBatch = batches.some((b) => b.status && b.status !== '待下发')
  const hasDispatched =
    hasDispatchedBatch ||
    Boolean(workOrder.dispatchedAt) ||
    workOrder.status === '已下发' ||
    workOrder.status === '执行中' ||
    workOrder.status === '部分下发'

  if (!hasDispatched) {
    workOrder.status = '待下发'
    return workOrder
  }

  if (workOrderHasClaimEvidence(workOrder)) {
    workOrder.status = '执行中'
    workOrder.hasClaimedTask = true
    if (!workOrder.executedAt) {
      workOrder.executedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
  } else {
    workOrder.status = '已下发'
  }
  return workOrder
}

/** @deprecated 使用 syncWorkOrderExecutionStatus；保留别名兼容旧 import */
export function syncWorkOrderDispatchStatus(workOrder) {
  return syncWorkOrderExecutionStatus(workOrder)
}

/** 加载时清洗旧状态 */
export function migrateWorkOrderStatusFields(wo) {
  if (!wo || typeof wo !== 'object') return wo
  if (wo.status === '完成') wo.status = '已完成'
  if (wo.urgency === '正常') wo.urgency = '普通'
  if (wo.progressLabel != null) {
    delete wo.progressLabel
  }
  if (wo.taskStatus === '正常') {
    // 废弃无意义的任务态占位，避免详情头展示「正常」
    delete wo.taskStatus
  }
  if (wo.status === '部分下发') {
    wo.status = workOrderHasClaimEvidence(wo) ? '执行中' : '已下发'
  }
  const batches = wo.scheduleBatches || []
  const hasDispatchedBatch = batches.some((b) => b.status && b.status !== '待下发')
  if ((hasDispatchedBatch || wo.dispatchedAt) && wo.status === '待下发') {
    wo.status = workOrderHasClaimEvidence(wo) ? '执行中' : '已下发'
  }
  // 待下发且无批次：创建时 scheduleQty 清零展示用（保留 planQty）
  if (wo.status === '待下发' && !batches.length && !wo.dispatchedAt) {
    wo.scheduleQty = 0
  }
  if (!wo.creator) wo.creator = wo.owner || 'admin1'
  if (!wo.updater) wo.updater = wo.creator || wo.owner || 'admin1'
  if (!wo.updatedAt) wo.updatedAt = wo.createdAt || ''
  return wo
}

export function markWorkOrderClaimed(workOrder) {
  if (!workOrder) return workOrder
  workOrder.hasClaimedTask = true
  if (!isWorkOrderStatusLocked(workOrder.status)) {
    workOrder.status = '执行中'
  }
  return workOrder
}

export function canPauseWorkOrder(status) {
  // 待下发也可暂停（挂起未开工单）；终止用「终止」
  return ['待下发', '已下发', '执行中', '部分下发'].includes(status)
}

export function canResumeWorkOrder(status) {
  return status === '暂停'
}

export function canTerminateWorkOrder(status) {
  return ['待下发', '已下发', '执行中', '部分下发', '暂停'].includes(status)
}

export function canContinueSchedule(status) {
  return ['待下发', '已下发', '执行中'].includes(status)
}

/**
 * 暂停工单
 * - 已下发/执行中：一律二次确认
 * - 有报工完成：使用更强提示（不影响已完成任务）
 * @returns {{ ok: boolean, message?: string, needConfirm?: boolean, reportedCount?: number, patch?: object }}
 */
export function buildPauseWorkOrderResult(workOrder, { confirmed = false } = {}) {
  if (!workOrder) return { ok: false, message: '工单不存在' }
  if (!canPauseWorkOrder(workOrder.status)) {
    return { ok: false, message: `当前状态「${workOrder.status}」不可暂停` }
  }
  const analysis = analyzeWorkOrderTasks(workOrder.id)
  if (!confirmed) {
    if (analysis.hasReported) {
      return {
        ok: false,
        needConfirm: true,
        confirmOkText: '仍要暂停',
        reportedCount: analysis.reportedCount,
        message: `当前工单下已有 ${analysis.reportedCount} 条任务报工完成，是否仍要暂停？暂停不影响已完成的任务。`,
      }
    }
    // 任务已下发（含已下发/执行中，或已存在任务）也要确认
    if (
      analysis.tasks.length > 0 ||
      workOrder.status === '已下发' ||
      workOrder.status === '执行中' ||
      workOrder.dispatchedAt
    ) {
      return {
        ok: false,
        needConfirm: true,
        confirmOkText: '确认暂停',
        message: '工单任务已下发，暂停后小程序端未完成任务将显示「暂停」且不可报工，是否确认暂停？',
      }
    }
    return {
      ok: false,
      needConfirm: true,
      confirmOkText: '确认暂停',
      message: `确定暂停工单「${workOrder.code || ''}」吗？暂停后可恢复执行。`,
    }
  }

  const patches = {}
  for (const task of analysis.tasks) {
    if (task.taskStatus === '已完成') continue
    patches[task.id] = {
      controlStatus: '暂停',
      taskStatusBeforeControl: task.taskStatusBeforeControl || task.taskStatus,
    }
  }
  try {
    persistMobileTaskPatches(patches)
  } catch {
    /* 任务侧写入失败不阻断工单状态变更 */
  }

  return {
    ok: true,
    patch: {
      status: '暂停',
      statusBeforePause: workOrder.status,
      pausedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
  }
}

export function buildResumeWorkOrderResult(workOrder) {
  if (!workOrder) return { ok: false, message: '工单不存在' }
  if (!canResumeWorkOrder(workOrder.status)) {
    return { ok: false, message: '仅暂停工单可恢复' }
  }
  const restore =
    workOrder.statusBeforePause && !isWorkOrderStatusLocked(workOrder.statusBeforePause)
      ? workOrder.statusBeforePause
      : workOrder.hasClaimedTask || workOrderHasClaimEvidence(workOrder)
        ? '执行中'
        : '已下发'

  const analysis = analyzeWorkOrderTasks(workOrder.id)
  const patches = {}
  for (const task of analysis.tasks) {
    if (task.controlStatus !== '暂停') continue
    patches[task.id] = {
      controlStatus: '',
      taskStatus: task.taskStatusBeforeControl || task.taskStatus,
      taskStatusBeforeControl: '',
    }
  }
  try {
    persistMobileTaskPatches(patches)
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    patch: {
      status: restore,
      statusBeforePause: '',
      pausedAt: '',
    },
  }
}

/**
 * 终止工单
 * @param {'reset'|'keep'|null} mode reset=仍终止重置报工；keep=不处理承认报工
 */
export function buildTerminateWorkOrderResult(workOrder, { mode = null, confirmed = false } = {}) {
  if (!workOrder) return { ok: false, message: '工单不存在' }
  if (!canTerminateWorkOrder(workOrder.status)) {
    return { ok: false, message: `当前状态「${workOrder.status}」不可终止` }
  }
  const analysis = analyzeWorkOrderTasks(workOrder.id)
  if (analysis.hasReported && !mode) {
    return {
      ok: false,
      needChoose: true,
      reportedCount: analysis.reportedCount,
      message: `当前工单下已有 ${analysis.reportedCount} 条任务报工完成，是否仍要终止？`,
    }
  }
  if (!analysis.hasReported && !confirmed && mode == null) {
    return {
      ok: false,
      needConfirm: true,
      message: '终止后不可恢复生产，是否确认终止？',
    }
  }

  const effectiveMode = mode || 'reset'
  const patches = {}
  if (effectiveMode === 'reset') {
    for (const task of analysis.allTasks) {
      patches[task.id] = {
        controlStatus: '终止',
        hiddenByTerminate: true,
        reportedGoodQty: 0,
        reportedDefectQty: 0,
        reportedFinishedQty: 0,
        taskStatus: '终止',
        reportStatus: '',
      }
    }
  } else if (effectiveMode === 'keep') {
    for (const task of analysis.allTasks) {
      if (taskHasReportProgress(task)) {
        patches[task.id] = {
          controlStatus: '终止保留',
          hiddenByTerminate: false,
        }
      } else {
        patches[task.id] = {
          controlStatus: '终止',
          hiddenByTerminate: true,
        }
      }
    }
  }
  try {
    persistMobileTaskPatches(patches)
  } catch {
    /* 任务侧写入失败不阻断工单状态变更 */
  }

  return {
    ok: true,
    patch: {
      status: '终止',
      terminatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      terminateMode: effectiveMode,
      statusBeforePause: '',
    },
  }
}

/**
 * 排产信息行：重置任务状态并清零报工数量
 * @param {object} workOrder
 * @param {{ batchId?: string, processName?: string, executor?: string }} record
 */
export function resetWorkOrderScheduleTask(workOrder, record) {
  if (!workOrder || !record) return { ok: false, message: '参数无效' }

  const processName = record.processName || ''
  const executor = record.executor && record.executor !== '—' ? record.executor : ''
  const tasks = listMobileTasksForWorkOrder(workOrder.id)
  const byProcess = tasks.filter((t) => !t.hiddenByTerminate && t.processName === processName)
  const matched = executor
    ? byProcess.filter((t) => t.executor === executor || t.claimedBy === executor || !t.executor)
    : byProcess
  const targets = matched.length ? matched : byProcess

  const patches = {}
  for (const task of targets) {
    const toClaim =
      task.placement === 'claim' ||
      task.taskStatus === '待领取' ||
      (Array.isArray(task.claimTargets) && task.claimTargets.length > 1 && !task.executor)
    patches[task.id] = {
      taskStatus: toClaim ? '待领取' : '待报工',
      claimedBy: toClaim ? '' : task.claimedBy || task.executor || '',
      reportedGoodQty: 0,
      reportedFinishedQty: 0,
      reportedBadQty: 0,
      badQty: 0,
      reportQty: 0,
      reportDuration: 0,
      reportedAt: '',
      reportStatus: '',
      controlStatus: '',
      taskStatusBeforeControl: '',
      hiddenByTerminate: false,
    }
  }
  try {
    persistMobileTaskPatches(patches)
  } catch {
    /* ignore */
  }

  const batch = (workOrder.scheduleBatches || []).find((b) => b.id === record.batchId)
  if (batch) {
    const assignments = batch.processAssignments || []
    const assignment = assignments.find((a) => a.processName === processName)
    if (assignment) {
      assignment.scheduleTaskStatus = targets.some((t) => patches[t.id]?.taskStatus === '待领取')
        ? '待领取'
        : '待报工'
      assignment.reportQty = 0
      assignment.goodQty = 0
      assignment.badQty = 0
      assignment.reportDuration = ''
      assignment.reportedAt = ''
      assignment.reportCleared = true
    }
    if (batch.status === '完成') {
      batch.status = '执行中'
    }
  }

  const analysis = analyzeWorkOrderTasks(workOrder.id)
  if (!analysis.hasClaim && !analysis.hasReported) {
    workOrder.hasClaimedTask = false
  }
  syncWorkOrderExecutionStatus(workOrder)

  return {
    ok: true,
    resetCount: Object.keys(patches).length,
    patch: {
      scheduleBatches: workOrder.scheduleBatches,
      status: workOrder.status,
      hasClaimedTask: workOrder.hasClaimedTask,
    },
  }
}

/** 详情栏是否展示「修改排产数量」（不按已下发/执行中区分可改性；有报工在操作时拦截） */
export function canShowEditScheduleQty(workOrder) {
  if (!workOrder) return false
  if (['终止', '已完成', '完成'].includes(workOrder.status)) return false
  // 极简模式单执行人下发后即为执行中，故用「已下发事实」而非状态白名单
  return (
    Boolean(workOrder.dispatchedAt) ||
    ['已下发', '执行中', '暂停', '部分下发'].includes(workOrder.status) ||
    analyzeWorkOrderTasks(workOrder.id).tasks.length > 0
  )
}

export function isScheduleBatchCompleted(batch) {
  return ['完成', '已完成'].includes(batch?.status)
}

/** 可修改排产数量的批次（未完成） */
export function listEditableScheduleBatches(workOrder) {
  return (workOrder?.scheduleBatches || []).filter((b) => !isScheduleBatchCompleted(b))
}

function batchHasReportedProgress(workOrder, batch) {
  if (!batch) return false
  if (isScheduleBatchCompleted(batch)) return true
  const assignments = batch.processAssignments || []
  if (
    assignments.some(
      (a) =>
        !a.reportCleared &&
        (Number(a.reportQty) > 0 || Number(a.goodQty) > 0 || a.scheduleTaskStatus === '已报工'),
    )
  ) {
    return true
  }

  const tasks = listMobileTasksForWorkOrder(workOrder.id).filter((t) => !t.hiddenByTerminate)
  const linked = tasks.filter((t) => t.scheduleBatchId === batch.id || t.batchId === batch.id)
  if (linked.length) return linked.some(taskHasReportProgress)

  const editable = listEditableScheduleBatches(workOrder)
  if (editable.length === 1 && editable[0].id === batch.id) {
    return tasks.some(taskHasReportProgress)
  }

  const batchQty = Math.max(0, Number(batch.qty) || 0)
  return tasks.some(
    (t) =>
      Math.max(0, Number(t.expectedQty ?? t.targetQty) || 0) === batchQty &&
      taskHasReportProgress(t),
  )
}

function listTasksForScheduleBatch(workOrder, batch) {
  const tasks = listMobileTasksForWorkOrder(workOrder.id).filter((t) => !t.hiddenByTerminate)
  if (!batch) return tasks
  const linked = tasks.filter((t) => t.scheduleBatchId === batch.id || t.batchId === batch.id)
  if (linked.length) return linked
  const editable = listEditableScheduleBatches(workOrder)
  if (editable.length <= 1) return tasks
  const batchQty = Math.max(0, Number(batch.qty) || 0)
  const byQty = tasks.filter(
    (t) => Math.max(0, Number(t.expectedQty ?? t.targetQty) || 0) === batchQty,
  )
  return byQty.length ? byQty : tasks
}

function buildScheduleQtyWorkOrderPatch(workOrder, qty, batchId) {
  const batches = Array.isArray(workOrder.scheduleBatches) ? workOrder.scheduleBatches : []
  if (!batches.length) {
    return { scheduleQty: qty }
  }

  const targetId = batchId || listEditableScheduleBatches(workOrder)[0]?.id || batches[0].id
  const nextBatches = batches.map((b) => (b.id === targetId ? { ...b, qty } : { ...b }))
  const scheduleQty = nextBatches.reduce((s, b) => s + Math.max(0, Number(b.qty) || 0), 0)
  return {
    scheduleQty,
    scheduleBatches: nextBatches,
    activeScheduleBatchId: targetId,
  }
}

/**
 * 修改排产数量
 * - 分批：已完成批次不可改；多未完成批次需指定 batchId
 * - 已有任务报工：禁止修改
 * - 无报工：确认后改数量，并同步小程序任务目标数
 */
export function buildEditScheduleQtyResult(
  workOrder,
  newQty,
  { confirmed = false, batchId = '' } = {},
) {
  if (!workOrder) return { ok: false, message: '工单不存在' }
  if (['终止', '已完成', '完成'].includes(workOrder.status)) {
    return { ok: false, message: '当前工单状态不可修改排产数量' }
  }

  const batches = workOrder.scheduleBatches || []
  let targetBatch = null
  let resolvedBatchId = batchId || ''

  if (batches.length) {
    const editable = listEditableScheduleBatches(workOrder)
    if (!editable.length) {
      return {
        ok: false,
        blocked: true,
        message: '所有排产批次均已完成，不可修改排产数量',
      }
    }
    if (!resolvedBatchId) {
      if (editable.length === 1) {
        resolvedBatchId = editable[0].id
      } else {
        return {
          ok: false,
          needSelectBatch: true,
          editableBatches: editable,
          message: '请选择要修改的排产批次',
        }
      }
    }
    targetBatch = batches.find((b) => b.id === resolvedBatchId) || null
    if (!targetBatch) return { ok: false, message: '排产批次不存在' }
    if (isScheduleBatchCompleted(targetBatch)) {
      return {
        ok: false,
        blocked: true,
        message: '该批次已完成，不允许修改排产数量',
      }
    }
    if (batchHasReportedProgress(workOrder, targetBatch)) {
      return {
        ok: false,
        blocked: true,
        message: '当前已有任务完成报工，不允许修改报工数量，请撤回任务报工状态后再修改。',
      }
    }
  } else {
    const analysis = analyzeWorkOrderTasks(workOrder.id)
    if (analysis.hasReported) {
      return {
        ok: false,
        blocked: true,
        message: '当前已有任务完成报工，不允许修改报工数量，请撤回任务报工状态后再修改。',
      }
    }
  }

  const qty = Math.max(0, Math.floor(Number(newQty) || 0))
  if (qty <= 0) return { ok: false, message: '排产数量须大于 0' }

  const plan = planQtyOf(workOrder)
  if (targetBatch) {
    const others = batches
      .filter((b) => b.id !== targetBatch.id)
      .reduce((s, b) => s + Math.max(0, Number(b.qty) || 0), 0)
    const maxQty = plan > 0 ? Math.max(0, plan - others) : 0
    if (plan > 0 && qty > maxQty) {
      return {
        ok: false,
        message: `本批排产数量不可超过 ${maxQty}（计划 ${plan} − 其他批次 ${others}）`,
      }
    }
  } else if (plan > 0 && qty > plan) {
    return { ok: false, message: `排产数量不可超过计划数量 ${plan}` }
  }

  if (!confirmed) {
    const batchLabel = targetBatch ? `批次 #${targetBatch.batchNo} ` : ''
    return {
      ok: false,
      needConfirm: true,
      qty,
      batchId: resolvedBatchId,
      message: `是否确认修改${batchLabel}当前排产数量为【${qty}】，确认后将同步修改小程序任务的目标数。`,
    }
  }

  const syncTasks = targetBatch
    ? listTasksForScheduleBatch(workOrder, targetBatch)
    : analyzeWorkOrderTasks(workOrder.id).tasks
  const patches = {}
  for (const task of syncTasks) {
    if (task.taskStatus === '已完成') continue
    patches[task.id] = {
      expectedQty: qty,
      targetQty: qty,
      scheduleBatchId: targetBatch?.id || task.scheduleBatchId || '',
    }
  }
  try {
    persistMobileTaskPatches(patches)
  } catch {
    /* 任务侧写入失败不阻断工单侧 */
  }

  return {
    ok: true,
    qty,
    batchId: resolvedBatchId,
    syncedTaskCount: Object.keys(patches).length,
    patch: buildScheduleQtyWorkOrderPatch(workOrder, qty, resolvedBatchId),
  }
}
