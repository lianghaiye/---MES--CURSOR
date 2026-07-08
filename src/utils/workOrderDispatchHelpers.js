import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { dispatchWorkOrderToMobile } from '@/utils/mobileTaskDispatch'
import { generateLinesFromWorkOrder } from '@/store/reportConfirmStore'
import { buildWorkOrderDispatchEbomSnapshot } from '@/utils/workOrderEbomTree'
import { getProcessByName } from '@/store/processConfigStore'
import { normalizeReportMode } from '@/utils/reportMode'
import { shouldSplitCollaborativeTasks } from '@/utils/taskExecutionMode'
import { isParallelTaskDispatch } from '@/store/businessRuleStore'

export function validateProcessExecutors(processes) {
  const missing = (processes || []).filter((p) => !p.executors?.length)
  if (missing.length) {
    const label = missing[0].resourceType === '工人小组' ? '执行组别' : '执行人'
    message.error(`请为工序「${missing.map((p) => p.name).join('、')}」选择${label}`)
    return false
  }

  for (const process of processes || []) {
    const procConfig = getProcessByName(process.name)
    const enriched = {
      ...process,
      reportMode: normalizeReportMode(process.reportMode || procConfig?.reportMode),
      taskExecutionMode: process.taskExecutionMode ?? procConfig?.taskExecutionMode,
    }
    if (shouldSplitCollaborativeTasks(enriched) && (process.executors?.length || 0) < 2) {
      message.error(`工序「${process.name}」为多人协作模式，请至少选择 2 名执行人`)
      return false
    }
  }

  return true
}

export function validateWorkOrderDispatchReady(workOrder) {
  if (!workOrder) return false
  if (
    workOrder.orderCategory === '外协工单' &&
    (!workOrder.processRouteName || !String(workOrder.processRouteName).trim())
  ) {
    message.error('外协工单下发前请选择工艺路线')
    return false
  }
  if (!workOrder.processes?.length) {
    message.error('请先选择工艺路线以生成工序')
    return false
  }
  return validateProcessExecutors(workOrder.processes)
}

/** 保存工序与执行人配置，工单保持待下发 */
export function saveDispatchDraft(updateFn, workOrder) {
  if (!workOrder || !validateWorkOrderDispatchReady(workOrder)) return false
  updateFn(workOrder.id, {
    processes: workOrder.processes,
    processRouteName: workOrder.processRouteName,
    status: '待下发',
  })
  message.success('工序配置已保存')
  return true
}

/** 下发并开始：推送小程序任务，工单变更为执行中 */
export function dispatchAndStartWorkOrder({ workOrder, orderCategory, updateFn }) {
  if (!workOrder || !validateWorkOrderDispatchReady(workOrder)) return false
  if (workOrder.status !== '待下发') {
    message.warning('仅待下发状态工单可下发并开始')
    return false
  }
  const mobileCategories = ['生产工单', '总装工单', '拆解工单', '外协工单']
  const tasks = mobileCategories.includes(orderCategory)
    ? dispatchWorkOrderToMobile(workOrder, orderCategory)
    : []
  const confirmLines = generateLinesFromWorkOrder(workOrder, orderCategory)
  const ebomSnapshot = buildWorkOrderDispatchEbomSnapshot(workOrder)
  updateFn(workOrder.id, {
    processes: workOrder.processes,
    processRouteName: workOrder.processRouteName,
    status: '执行中',
    dispatchControl: isParallelTaskDispatch() ? 'parallel' : 'serial',
    dispatchedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    executedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    ...(ebomSnapshot ? { ebomSnapshot } : {}),
  })
  const parts = []
  if (tasks.length) parts.push(`已生成 ${tasks.length} 条小程序任务`)
  if (confirmLines.length) parts.push(`已生成 ${confirmLines.length} 条报工确认数据`)
  const suffix = parts.length ? `（${parts.join('，')}）` : ''
  message.success(`工单已下发并开始执行${suffix}`)
  return true
}

export function canEditWorkOrder(row) {
  return row?.status === '待下发'
}
