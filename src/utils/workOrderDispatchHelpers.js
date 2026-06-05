import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { dispatchWorkOrderToMobile } from '@/utils/mobileTaskDispatch'

export function validateProcessExecutors(processes) {
  const missing = (processes || []).filter((p) => !p.executors?.length)
  if (missing.length) {
    const label = missing[0].resourceType === '工人小组' ? '执行组别' : '执行人'
    message.error(`请为工序「${missing.map((p) => p.name).join('、')}」选择${label}`)
    return false
  }
  return true
}

/** 保存工序与执行人配置，工单保持待下发 */
export function saveDispatchDraft(updateFn, workOrder) {
  if (!workOrder || !validateProcessExecutors(workOrder.processes)) return false
  updateFn(workOrder.id, {
    processes: workOrder.processes,
    status: '待下发',
  })
  message.success('工序配置已保存')
  return true
}

/** 下发并开始：推送小程序任务，工单变更为执行中 */
export function dispatchAndStartWorkOrder({ workOrder, orderCategory, updateFn }) {
  if (!workOrder || !validateProcessExecutors(workOrder.processes)) return false
  if (workOrder.status !== '待下发') {
    message.warning('仅待下发状态工单可下发并开始')
    return false
  }
  const mobileCategories = ['生产工单', '总装工单', '拆解工单']
  const tasks = mobileCategories.includes(orderCategory)
    ? dispatchWorkOrderToMobile(workOrder, orderCategory)
    : []
  updateFn(workOrder.id, {
    processes: workOrder.processes,
    status: '执行中',
    dispatchedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    executedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  const suffix = tasks.length ? `，已生成 ${tasks.length} 条小程序任务（演示同步）` : ''
  message.success(`工单已下发并开始执行${suffix}`)
  return true
}

export function canEditWorkOrder(row) {
  return row?.status === '待下发'
}
