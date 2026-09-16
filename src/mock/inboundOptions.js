export const inboundTypeOptions = [
  '采购入库',
  '成品入库',
  '半成品入库',
  '盘点入库',
  '领料入库',
  '调拨入库',
  '报废入库',
  '余料入库',
  '其他入库',
]

/** 入库单状态（对外展示口径） */
export const inboundStatusOptions = ['待入库', '部分入库', '已拒绝', '已入库']

export const inboundItemTypeOptions = ['产品', '物料']

export const inboundLineSourceOptions = ['采购', '生产', '外协']

export const handlerOptions = ['admin1', '张三', '李四', '管理员']

/** 入库单来源：业务（系统单据驱动）/ 新增（仓管在入库页手工新建） */
export const INBOUND_SOURCE = {
  BUSINESS: 'business',
  MANUAL: 'manual',
}

export const inboundSourceOptions = [
  { label: '业务', value: INBOUND_SOURCE.BUSINESS },
  { label: '新增', value: INBOUND_SOURCE.MANUAL },
]

export function inboundSourceLabel(channel) {
  if (channel === INBOUND_SOURCE.MANUAL || channel === 'web') return '新增'
  return '业务'
}

export function isInboundManualSource(orderOrChannel) {
  const channel =
    typeof orderOrChannel === 'string' ? orderOrChannel : orderOrChannel?.sourceChannel
  return inboundSourceLabel(channel) === '新增'
}

export function isInboundBusinessSource(orderOrChannel) {
  return !isInboundManualSource(orderOrChannel)
}

/**
 * 解析来源：手工新建=新增；业务链路/历史小程序/带源单=业务
 */
export function resolveInboundSourceChannel(payload = {}) {
  const raw = payload.sourceChannel
  if (raw === INBOUND_SOURCE.MANUAL || raw === INBOUND_SOURCE.BUSINESS) return raw
  if (raw === 'mini-program') return INBOUND_SOURCE.BUSINESS
  if (
    payload.sourceOrderNo ||
    payload.purchaseOrderId ||
    payload.miniProgramTaskId ||
    payload.salesOrderId ||
    payload.salesOrderNo ||
    payload.outsourcingOrderId ||
    payload.outsourcingOrderNo ||
    (Array.isArray(payload.workOrders) && payload.workOrders.length)
  ) {
    return INBOUND_SOURCE.BUSINESS
  }
  if (raw === 'web') return INBOUND_SOURCE.MANUAL
  return INBOUND_SOURCE.MANUAL
}

export function normalizeInboundStatus(status) {
  if (status === '待处理') return '待入库'
  if (status === '已完成') return '已入库'
  if (status === '待审批') return '待入库'
  return status || '待入库'
}

export function inboundStatusColor(status) {
  const map = {
    待入库: 'processing',
    部分入库: 'warning',
    已拒绝: 'error',
    已入库: 'success',
  }
  return map[normalizeInboundStatus(status)] || 'default'
}
