import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createReworkOrder,
  createReworkProcessLine,
  seedReworkOrders,
  REWORK_ORDER_SEED_VERSION,
  REWORK_ORDER_SEED_VERSION_KEY,
} from '@/mock/reworkOrders'
import {
  REWORK_ORDER_STATUS,
  REWORK_ORDER_SOURCE,
  isReworkOrderOpen,
} from '@/constants/reworkOrder'
import { workOrderState, updateWorkOrder } from '@/store/workOrderStore'
import { assemblyWorkOrderState, updateAssemblyWorkOrder } from '@/store/assemblyWorkOrderStore'

const STORAGE_KEY = 'i_doms_rework_orders'

/** 生产工单 + 总装工单（返工可选范围） */
export function listReworkableWorkOrders() {
  return [...(workOrderState.orders || []), ...(assemblyWorkOrderState.orders || [])]
}

function findWorkOrder(idOrCode) {
  if (!idOrCode) return null
  return (
    workOrderState.orders.find((o) => o.id === idOrCode || o.code === idOrCode) ||
    assemblyWorkOrderState.orders.find((o) => o.id === idOrCode || o.code === idOrCode) ||
    null
  )
}

function patchWorkOrder(workOrderId, patch, options = {}) {
  if (assemblyWorkOrderState.orders.some((o) => o.id === workOrderId)) {
    return updateAssemblyWorkOrder(workOrderId, patch, options)
  }
  return updateWorkOrder(workOrderId, patch, options)
}

function loadOrders() {
  const seeded = seedReworkOrders()
  let existing = []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.orders)) {
        existing = parsed.orders.map((o) => createReworkOrder(o))
      }
    }
  } catch {
    /* ignore */
  }
  const version = localStorage.getItem(REWORK_ORDER_SEED_VERSION_KEY)
  const userOrders = existing.filter((o) => !String(o.id || '').startsWith('rw-demo-'))
  if (version !== REWORK_ORDER_SEED_VERSION) {
    localStorage.setItem(REWORK_ORDER_SEED_VERSION_KEY, REWORK_ORDER_SEED_VERSION)
    return [...seeded, ...userOrders]
  }
  if (!existing.length) return seeded
  const ids = new Set(existing.map((o) => o.id))
  const extra = seeded.filter((s) => !ids.has(s.id))
  return extra.length ? [...extra, ...existing] : existing
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: reworkOrderState.orders }))
}

export const reworkOrderState = reactive({
  orders: loadOrders(),
})

watch(
  () => reworkOrderState.orders,
  () => persist(),
  { deep: true },
)

function nextReworkNo() {
  const d = dayjs().format('YYYYMMDD')
  const seq = String(reworkOrderState.orders.length + 1).padStart(3, '0')
  return `FG${d}${seq}`
}

export function listReworkOrders() {
  return reworkOrderState.orders
}

export function getReworkOrderById(id) {
  return reworkOrderState.orders.find((o) => o.id === id) || null
}

export function listOpenReworkOrdersByWorkOrderId(workOrderId) {
  if (!workOrderId) return []
  return reworkOrderState.orders.filter(
    (o) => o.workOrderId === workOrderId && isReworkOrderOpen(o.status),
  )
}

/** 工单关联的全部返工单（含已完成/已关闭） */
export function listReworkOrdersByWorkOrder(workOrder) {
  if (!workOrder) return []
  const id = workOrder.id
  const code = String(workOrder.code || workOrder.orderNo || '').trim()
  return reworkOrderState.orders.filter((o) => {
    if (id && o.workOrderId === id) return true
    if (code && String(o.workOrderNo || '').trim() === code) return true
    return false
  })
}

/** 工单是否有未结束返工单（用于旁显「返工」标签，不改工单主状态） */
export function workOrderHasOpenRework(workOrder) {
  if (!workOrder) return false
  void reworkOrderState.orders
  return listReworkOrdersByWorkOrder(workOrder).some((o) => isReworkOrderOpen(o.status))
}

/** 工单某工序待重做数量汇总 */
export function getProcessPendingReworkQty(workOrderId, processName) {
  if (!workOrderId || !processName) return 0
  return listOpenReworkOrdersByWorkOrderId(workOrderId).reduce((sum, order) => {
    const line = (order.processes || []).find((p) => p.processName === processName)
    return sum + Math.max(0, Number(line?.pendingQty) || 0)
  }, 0)
}

export function filterReworkOrders(list, filters = {}) {
  return list.filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.source && row.source !== filters.source) return false
    if (filters.reworkNo && !String(row.reworkNo || '').includes(filters.reworkNo.trim())) {
      return false
    }
    if (
      filters.workOrderNo &&
      !String(row.workOrderNo || '').includes(filters.workOrderNo.trim())
    ) {
      return false
    }
    if (
      filters.productName &&
      !String(row.productName || '').includes(filters.productName.trim())
    ) {
      return false
    }
    if (filters.workCenter && row.workCenter !== filters.workCenter) return false
    return true
  })
}

function refreshOrderProcessPending(order) {
  ;(order.processes || []).forEach((p) => {
    p.pendingQty = Math.max(0, (Number(p.qty) || 0) - (Number(p.doneQty) || 0))
  })
  const allDone = (order.processes || []).every((p) => (Number(p.pendingQty) || 0) <= 0)
  const anyDone = (order.processes || []).some((p) => (Number(p.doneQty) || 0) > 0)
  if (allDone && (order.processes || []).length) {
    order.status = REWORK_ORDER_STATUS.DONE
    order.completedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  } else if (anyDone) {
    order.status = REWORK_ORDER_STATUS.IN_PROGRESS
  } else {
    order.status = REWORK_ORDER_STATUS.PENDING
  }
  order.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function resolveStatusBeforeRework(wo) {
  const restore = wo?.statusBeforeRework || '执行中'
  if (restore === '已完成' || restore === '完成') return '已完成'
  if (restore === '暂停' || restore === '终止' || restore === '返工中') return '执行中'
  return restore
}

/** 返工只打标签，不回退/改写工单主状态；顺带清掉历史上写成「返工中」的主状态 */
function applyWorkOrderReworkStatus(workOrderId) {
  const wo = findWorkOrder(workOrderId)
  if (!wo) return
  const open = listOpenReworkOrdersByWorkOrderId(workOrderId)
  const stamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
  if (wo.status === '返工中') {
    const next = resolveStatusBeforeRework(wo)
    patchWorkOrder(
      workOrderId,
      {
        status: next,
        statusBeforeRework: '',
        reworkStartedAt: open.length ? wo.reworkStartedAt || stamp : '',
        reworkCompletedAt: open.length ? '' : stamp,
      },
      { skipCompletionDeduct: next === '已完成' || next === '完成' },
    )
    return
  }
  if (open.length) {
    patchWorkOrder(workOrderId, {
      reworkStartedAt: wo.reworkStartedAt || stamp,
    })
    return
  }
  if (wo.reworkStartedAt || wo.statusBeforeRework) {
    patchWorkOrder(workOrderId, {
      statusBeforeRework: '',
      reworkStartedAt: '',
      reworkCompletedAt: stamp,
    })
  }
}

/** 质检明细返工数合计（过程检/成品检：returnQty） */
export function resolveReworkQtyFromQcTask(task) {
  return (task?.lineItems || []).reduce((sum, line) => {
    const n = Number(line.returnQty)
    return sum + (Number.isFinite(n) && n > 0 ? n : 0)
  }, 0)
}

function resolveReworkProcessNamesFromQc(task, wo) {
  const fromTask = [task?.processName, task?.processCode]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  if (fromTask.length) return [...new Set(fromTask)]
  const fromWo = (wo?.processes || [])
    .map((p) => String(p.name || p.processName || '').trim())
    .filter(Boolean)
  if (fromWo.length) return fromWo
  return ['返工']
}

/**
 * 过程检 / 成品检完成后：按返工数生成返工单及重做工序任务
 * @returns {{ ok: boolean, skipped?: boolean, order?: object, message?: string }}
 */
export function createReworkFromProductionQc(task) {
  if (!task) return { ok: false, skipped: true, message: '质检单不存在' }
  const scope = String(task.bizScope || '')
  if (scope !== '生产过程检' && scope !== '成品检') {
    return { ok: false, skipped: true, message: '仅生产过程检/成品检支持按返工数生成返工单' }
  }
  if (String(task.reworkOrderNo || '').trim()) {
    return {
      ok: false,
      skipped: true,
      message: `已关联返工单「${task.reworkOrderNo}」`,
    }
  }
  const qty = resolveReworkQtyFromQcTask(task)
  if (!(qty > 0)) {
    return { ok: false, skipped: true, message: '返工数为 0，未生成返工单' }
  }

  const wo =
    findWorkOrder(task.workOrderId) ||
    findWorkOrder(task.workOrderNo) ||
    findWorkOrder(task.sourceDocNo)
  const processNames = resolveReworkProcessNamesFromQc(task, wo)
  const source =
    scope === '成品检' ? REWORK_ORDER_SOURCE.FINISHED_QC : REWORK_ORDER_SOURCE.PROCESS_QC
  const reasonParts = []
  const plan = String(task.treatmentPlan || '').trim()
  if (plan) reasonParts.push(plan)
  ;(task.lineItems || []).forEach((line) => {
    const r = Number(line.returnQty)
    if (Number.isFinite(r) && r > 0 && line.treatmentPlan) {
      const tp = String(line.treatmentPlan).trim()
      if (tp && !reasonParts.includes(tp)) reasonParts.push(tp)
    }
  })
  if (!reasonParts.length) {
    reasonParts.push(task.qcResult || '质检返工')
  }

  const result = createReworkOrderRecord({
    workOrderId: wo?.id || task.workOrderId || '',
    workOrderNo: wo?.code || task.workOrderNo || task.sourceDocNo || '',
    productName: task.itemName || wo?.productName || '',
    productCode: task.itemCode || wo?.productCode || wo?.materialCode || '',
    qty,
    processNames,
    reason: reasonParts.join('；'),
    remark: `来自${scope} ${task.qcNo || ''}`.trim(),
    source,
    qcTaskId: task.id,
    qcTaskNo: task.qcNo || '',
    creator: task.inspector || 'admin1',
  })
  if (!result.ok) {
    return { ok: false, skipped: false, message: result.message || '生成返工单失败' }
  }

  // eslint-disable-next-line global-require
  const { attachQcTaskReworkOrder } = require('@/store/qcTaskStore')
  attachQcTaskReworkOrder(task.id, {
    reworkOrderNo: result.order.reworkNo,
    reworkOrderId: result.order.id,
  })

  const taskNames = (result.order.processes || []).map((p) => p.processName).filter(Boolean)
  return {
    ok: true,
    order: result.order,
    message: `已生成返工单「${result.order.reworkNo}」及返工任务（${taskNames.join('、') || '—'}，数量 ${qty}）`,
  }
}

/**
 * 创建返工单（免审，创建即生效）
 */
export function createReworkOrderRecord(payload = {}) {
  const workOrderId = payload.workOrderId
  const wo = findWorkOrder(workOrderId) || findWorkOrder(payload.workOrderNo)
  if (!wo && !payload.workOrderNo) {
    return { ok: false, message: '请选择工单' }
  }
  const qty = Number(payload.qty) || 0
  if (!(qty > 0)) return { ok: false, message: '返工数量须大于 0' }
  const processNames = payload.processNames || []
  if (!processNames.length) return { ok: false, message: '请至少勾选一道重做工序' }
  const reason = String(payload.reason || '').trim()

  const woProcesses = wo?.processes || []
  const assignees = payload.processAssignees || {}
  const processes = processNames.map((name) => {
    const hit = woProcesses.find((p) => p.name === name)
    const originalExecutors = [...(hit?.executors || [])]
    const reworkAssignee = String(assignees[name] || '').trim() || originalExecutors[0] || ''
    return createReworkProcessLine({
      processId: hit?.id || hit?.processId || '',
      processName: name,
      processIndex: hit?.index ?? hit?.stepNo ?? 0,
      qty,
      doneQty: 0,
      originalExecutors,
      reworkAssignee,
    })
  })

  const order = createReworkOrder({
    id: `rw-${Date.now()}`,
    reworkNo: nextReworkNo(),
    status: REWORK_ORDER_STATUS.PENDING,
    source: payload.source || REWORK_ORDER_SOURCE.WORKSHOP_WEB,
    workOrderId: wo?.id || workOrderId || '',
    workOrderNo: wo?.code || payload.workOrderNo || '',
    workOrderCategory: wo?.orderCategory || payload.workOrderCategory || '生产工单',
    productName: wo?.productName || payload.productName || '',
    productCode: wo?.productCode || wo?.materialCode || payload.productCode || '',
    specModel: wo?.specModel || payload.specModel || '',
    material: wo?.material || payload.material || '',
    drawingNo: wo?.drawingNo || payload.drawingNo || '',
    workCenter: wo?.workCenter || payload.workCenter || '',
    processRouteName: wo?.processRouteName || payload.processRouteName || '',
    scheduleQty: Number(wo?.scheduleQty) || Number(wo?.planQty) || 0,
    planQty: Number(wo?.planQty) || Number(wo?.scheduleQty) || 0,
    qty,
    reason,
    remark: payload.remark || '',
    processes,
    qcTaskId: payload.qcTaskId || '',
    qcTaskNo: payload.qcTaskNo || '',
    creator: payload.creator || 'admin1',
  })

  reworkOrderState.orders.unshift(order)
  if (order.workOrderId) applyWorkOrderReworkStatus(order.workOrderId)

  if (payload.qcTaskId) {
    try {
      // eslint-disable-next-line global-require
      const { attachQcTaskReworkOrder } = require('@/store/qcTaskStore')
      attachQcTaskReworkOrder(payload.qcTaskId, {
        reworkOrderNo: order.reworkNo,
        reworkOrderId: order.id,
      })
    } catch (err) {
      console.error('[rework] attach qc task failed', err)
    }
  }

  // 生成工序报工返工任务（工人在工序报工列表/小程序接任务）
  let taskMsg = ''
  try {
    // eslint-disable-next-line global-require
    const { createReworkProcessReportTasks } = require('@/store/processReportStore')
    const taskRes = createReworkProcessReportTasks(order, wo)
    if (taskRes.ok) {
      taskMsg = `，已生成 ${taskRes.records.length} 条返工任务`
    }
  } catch (err) {
    console.error('[rework] create process report tasks failed', err)
  }

  return {
    ok: true,
    order,
    message: `已创建返工单「${order.reworkNo}」${taskMsg}`,
  }
}

/**
 * 返工报工：冲减指定返工单某工序待重做数量
 */
export function reportAgainstReworkOrder(reworkOrderId, payload = {}) {
  const order = getReworkOrderById(reworkOrderId)
  if (!order) return { ok: false, message: '返工单不存在' }
  if (!isReworkOrderOpen(order.status)) {
    return { ok: false, message: '返工单已结束，不可再报' }
  }
  const processName = payload.processName
  const line = (order.processes || []).find((p) => p.processName === processName)
  if (!line) return { ok: false, message: '该返工单未包含所选工序' }
  const qty = Number(payload.goodQty) || 0
  if (!(qty > 0)) return { ok: false, message: '报工数量须大于 0' }
  const pending = Math.max(0, Number(line.pendingQty) || 0)
  if (qty > pending + 1e-9) {
    return { ok: false, message: `超过待重做数量（剩余 ${pending}）` }
  }

  line.doneQty = (Number(line.doneQty) || 0) + qty
  refreshOrderProcessPending(order)
  order.reportLogs = order.reportLogs || []
  order.reportLogs.unshift({
    id: `rwlog-${Date.now()}`,
    processName,
    goodQty: qty,
    reporter: payload.reporter || 'admin1',
    reportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    remark: payload.remark || '',
    processReportId: payload.processReportId || '',
    taskNo: payload.taskNo || '',
  })

  if (order.workOrderId) applyWorkOrderReworkStatus(order.workOrderId)
  return {
    ok: true,
    order,
    message: `已冲减返工单「${order.reworkNo}」工序「${processName}」${qty} 件`,
  }
}

/** 工序报工拒绝等场景：回滚已冲减的待重做数量 */
export function rollbackReworkOrderReport(reworkOrderId, payload = {}) {
  const order = getReworkOrderById(reworkOrderId)
  if (!order) return { ok: false, message: '返工单不存在' }
  const processName = payload.processName
  const line = (order.processes || []).find((p) => p.processName === processName)
  if (!line) return { ok: false, message: '该返工单未包含所选工序' }
  const qty = Number(payload.goodQty) || 0
  if (!(qty > 0)) return { ok: false, message: '回滚数量无效' }
  line.doneQty = Math.max(0, (Number(line.doneQty) || 0) - qty)
  refreshOrderProcessPending(order)
  order.reportLogs = order.reportLogs || []
  order.reportLogs.unshift({
    id: `rwlog-rb-${Date.now()}`,
    processName,
    goodQty: -qty,
    reporter: payload.reporter || 'admin1',
    reportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    remark: payload.remark || '回滚',
  })
  if (order.workOrderId) applyWorkOrderReworkStatus(order.workOrderId)
  return { ok: true, order, message: '已回滚返工冲减' }
}

export function closeReworkOrder(id) {
  const order = getReworkOrderById(id)
  if (!order) return { ok: false, message: '返工单不存在' }
  if (order.status === REWORK_ORDER_STATUS.DONE) {
    return { ok: false, message: '返工单已完成' }
  }
  order.status = REWORK_ORDER_STATUS.CLOSED
  order.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  try {
    // eslint-disable-next-line global-require
    const { cancelReworkProcessReportTasks } = require('@/store/processReportStore')
    cancelReworkProcessReportTasks(order.id)
  } catch {
    /* ignore */
  }
  if (order.workOrderId) applyWorkOrderReworkStatus(order.workOrderId)
  return { ok: true, order, message: '返工单已关闭' }
}

function restoreLegacyReworkMainStatuses() {
  listReworkableWorkOrders().forEach((wo) => {
    if (wo.status === '返工中') applyWorkOrderReworkStatus(wo.id)
  })
}

restoreLegacyReworkMainStatuses()

export { REWORK_ORDER_STATUS, REWORK_ORDER_SOURCE }
