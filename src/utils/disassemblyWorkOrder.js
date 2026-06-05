import dayjs from 'dayjs'

/** 工单编号：CJGD + 年月日 + 3位流水 */
export function generateDisassemblyOrderCode(existingCodes = [], refDate = dayjs()) {
  const prefix = `CJGD${refDate.format('YYYYMMDD')}`
  const sameDay = (existingCodes || []).filter((c) => String(c).startsWith(prefix))
  const maxSeq = sameDay.reduce((max, code) => {
    const n = parseInt(String(code).slice(prefix.length), 10)
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

/** 工单名称：[物品名称]拆解 + 3位流水 */
export function generateDisassemblyOrderName(itemName, existingNames = []) {
  const base = `${itemName || '物品'}拆解`
  const matched = existingNames.filter((n) => String(n).startsWith(base))
  const maxSeq = matched.reduce((max, name) => {
    const tail = String(name).slice(base.length)
    const n = parseInt(tail, 10)
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `${base}${String(maxSeq + 1).padStart(3, '0')}`
}

export const DISASSEMBLY_STATUS_OPTIONS = ['待下发', '已下发', '执行中', '待复核', '完成']

export const WORK_CENTER_MANAGERS = {
  默认工厂: 'admin1',
  机加车间: '张三',
  装配车间: '李四',
  总装车间: '孙琴丽',
  热处理车间: '王五',
}

export function statusColor(status) {
  const map = {
    待下发: 'warning',
    已下发: 'processing',
    执行中: 'blue',
    待复核: 'orange',
    完成: 'success',
  }
  return map[status] || 'default'
}

/** @deprecated 使用 statusColor */
export function progressColor(status) {
  return statusColor(status)
}

export function urgencyColor(urgency) {
  if (urgency === '紧急') return 'error'
  if (urgency === '加急') return 'warning'
  return 'default'
}

export function urgencyTagColor(urgency) {
  if (urgency === '紧急' || urgency === '加急') return 'error'
  return 'default'
}

export function urgencyLabel(urgency) {
  if (urgency === '紧急' || urgency === '加急') return '紧急'
  return '不紧急'
}

export function isOverdue(order) {
  if (!order?.planEndDate || order.status === '完成') return false
  return dayjs().isAfter(dayjs(order.planEndDate), 'day')
}

export function filterDisassemblyWorkOrders(list, filters = {}) {
  return (list || []).filter((row) => {
    if (filters.code && !row.code?.includes(filters.code)) return false
    if (filters.status && row.status !== filters.status) return false
    if (filters.itemName && !row.itemName?.includes(filters.itemName)) return false
    if (filters.urgency && filters.urgency !== '全部' && row.urgency !== filters.urgency)
      return false
    if (filters.workCenter && row.workCenter !== filters.workCenter) return false
    if (filters.documentDateRange?.length === 2) {
      const d = (row.createdAt || '').slice(0, 10)
      if (d < filters.documentDateRange[0] || d > filters.documentDateRange[1]) return false
    }
    return true
  })
}

export function canShowDisassemblyDispatchTab(status) {
  return status === '待下发'
}

export function canEditDisassemblyOrder(row) {
  return row?.status === '待下发' || row?.status === '已下发'
}

export function canDispatchDisassemblyOrder(row) {
  return row?.status === '待下发'
}

export function canDeleteDisassemblyOrder(row) {
  return row?.status === '待下发'
}

/** 映射为 WorkOrderDetailTab 可识别的工单结构 */
export function mapDisassemblyForDetailTab(order) {
  if (!order) return null
  return {
    ...order,
    productName: order.itemName,
    scheduleQty: order.disassemblyQty ?? 1,
    planQty: order.disassemblyQty ?? 1,
    planDateRange:
      order.planStartDate && order.planEndDate ? [order.planStartDate, order.planEndDate] : [],
    owner: order.personInCharge,
    sourceOrderNo: order.relatedScrapNo,
    progressLabel: order.status,
    taskStatus: '正常',
  }
}
