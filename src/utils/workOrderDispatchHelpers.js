import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { dispatchWorkOrderToMobile } from '@/utils/mobileTaskDispatch'
import { generateLinesFromWorkOrder } from '@/store/reportConfirmStore'
import {
  buildWorkOrderDispatchEbomSnapshot,
  resolveWorkOrderLinkedBom,
} from '@/utils/workOrderEbomTree'
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
  const skipEbom =
    workOrder.skipEbom ||
    workOrder.orderCategory === '外协工单' ||
    workOrder.orderCategory === '维修工单'
  if (!skipEbom) {
    const hasSnapshot = Boolean(workOrder.ebomSnapshot?.materials?.length)
    const linkedBom = resolveWorkOrderLinkedBom(workOrder, 'production')
    if (!hasSnapshot && !linkedBom) {
      message.error('无自有生效 BOM 且无计划 EBOM 快照，不可下达（请先维护 SKU 产品 BOM）')
      return false
    }
  }
  return validateProcessExecutors(workOrder.processes)
}

/** 保存工序与执行人配置，工单保持待下发（草稿保存不校验必填项） */
export function saveDispatchDraft(updateFn, workOrder) {
  if (!workOrder) return false
  updateFn(workOrder.id, {
    processes: workOrder.processes,
    processRouteName: workOrder.processRouteName,
    status: '待下发',
  })
  message.success('工序配置已保存')
  return true
}

/** 下发并开始：推送小程序任务；支持未排满时再次下发（追加排产） */
export function dispatchAndStartWorkOrder({ workOrder, orderCategory, updateFn }) {
  if (!workOrder || !validateWorkOrderDispatchReady(workOrder)) return false
  const status = workOrder.status
  const allowStatuses = ['待下发', '已下发', '执行中']
  if (!allowStatuses.includes(status)) {
    message.warning('当前状态不可下发')
    return false
  }
  const isFirstDispatch = status === '待下发'
  const mobileCategories = ['生产工单', '总装工单', '拆解工单', '外协工单']
  const tasks = mobileCategories.includes(orderCategory)
    ? dispatchWorkOrderToMobile(workOrder, orderCategory)
    : []
  const confirmLines = generateLinesFromWorkOrder(workOrder, orderCategory)
  const ebomSnapshot = buildWorkOrderDispatchEbomSnapshot(workOrder)
  // 下发后默认「已下发」；若任务无需领取（单人待开始）仍保持已下发，领取后再升执行中
  updateFn(workOrder.id, {
    processes: workOrder.processes,
    processRouteName: workOrder.processRouteName,
    status: workOrder.hasClaimedTask ? '执行中' : '已下发',
    dispatchControl: isParallelTaskDispatch() ? 'parallel' : 'serial',
    ...(isFirstDispatch
      ? {
          dispatchedAt: dayjs().format('YYYY-MM-DD HH:mm'),
        }
      : { dispatchedAt: workOrder.dispatchedAt || dayjs().format('YYYY-MM-DD HH:mm') }),
    ...(ebomSnapshot ? { ebomSnapshot } : {}),
  })
  const parts = []
  if (tasks.length) parts.push(`已生成 ${tasks.length} 条小程序任务`)
  if (confirmLines.length) parts.push(`已生成 ${confirmLines.length} 条报工确认数据`)
  const suffix = parts.length ? `（${parts.join('，')}）` : ''
  message.success(isFirstDispatch ? `工单已下发${suffix}` : `已追加下发排产${suffix}`)
  return true
}

export function canEditWorkOrder(row) {
  return row?.status === '待下发'
}
