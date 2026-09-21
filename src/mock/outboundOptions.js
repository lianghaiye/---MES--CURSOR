export const outboundTypeOptions = [
  '销售出库',
  '领料出库',
  '盘点出库',
  '采购退货',
  '半成品出库',
  '投料出库',
  '发料出库',
  '总装领料出库',
  '部装领料出库',
  '调拨出库',
  '装箱出库',
  '报废出库',
  '其他出库',
]

export const itemTypeOptions = ['物料', '产品']

/** 出库单状态（对外展示口径） */
export const outboundStatusOptions = ['待出库', '部分出库', '已拒绝', '已出库', '待申领人确认']

/** 需审批的出库类型（领料出库 / 发料出库本期直接「待出库」→确认出库，不再走审批） */
export const outboundApprovalTypes = []

export const outboundTimeUnitOptions = [
  { label: '日', value: 'day' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

/** 出库单来源：业务（系统单据驱动）/ 新增（仓管在出库页手工新建） */
export const OUTBOUND_SOURCE = {
  BUSINESS: 'business',
  MANUAL: 'manual',
}

export const outboundSourceOptions = [
  { label: '业务', value: OUTBOUND_SOURCE.BUSINESS },
  { label: '新增', value: OUTBOUND_SOURCE.MANUAL },
]

export function outboundSourceLabel(channel) {
  if (channel === OUTBOUND_SOURCE.MANUAL || channel === 'web') return '新增'
  return '业务'
}

export function isOutboundManualSource(orderOrChannel) {
  const channel =
    typeof orderOrChannel === 'string' ? orderOrChannel : orderOrChannel?.sourceChannel
  return outboundSourceLabel(channel) === '新增'
}

export function isOutboundBusinessSource(orderOrChannel) {
  return !isOutboundManualSource(orderOrChannel)
}

/**
 * 解析来源：手工新建=新增；业务链路/历史小程序/带源单=业务
 */
export function resolveOutboundSourceChannel(payload = {}) {
  const raw = payload.sourceChannel
  if (raw === OUTBOUND_SOURCE.MANUAL || raw === OUTBOUND_SOURCE.BUSINESS) return raw
  if (raw === 'mini-program') return OUTBOUND_SOURCE.BUSINESS
  if (
    payload.sourceOrderNo ||
    payload.materialReqId ||
    payload.materialReqNo ||
    payload.salesOrderId ||
    payload.deliveryOrderId ||
    (Array.isArray(payload.workOrders) && payload.workOrders.length) ||
    (Array.isArray(payload.outsourcingOrders) && payload.outsourcingOrders.length)
  ) {
    return OUTBOUND_SOURCE.BUSINESS
  }
  if (raw === 'web') return OUTBOUND_SOURCE.MANUAL
  return OUTBOUND_SOURCE.MANUAL
}

export function normalizeOutboundStatus(status) {
  if (status === '待处理') return '待出库'
  if (status === '拒绝领料') return '已拒绝'
  return status || '待出库'
}

export function outboundStatusColor(status) {
  const map = {
    待出库: 'processing',
    部分出库: 'warning',
    待申领人确认: 'warning',
    已拒绝: 'error',
    已出库: 'success',
  }
  return map[normalizeOutboundStatus(status)] || 'default'
}

export function needsOutboundApproval(outboundType) {
  return outboundApprovalTypes.includes(outboundType)
}

export const warehouseOptions = [
  { label: '库A仓', value: '库A仓' },
  { label: '库库仓', value: '库库仓' },
  { label: '成品仓', value: '成品仓' },
  { label: '半成品仓', value: '半成品仓' },
  { label: '原材料仓', value: '原材料仓' },
]

export const handlerOptions = ['admin1', '张三', '李四']

export const requisitionDeptOptions = ['默认工厂', '机加车间', '装配车间', '质检中心']

export const workshopOptions = ['默认工厂', '机加车间', '装配车间']

export const outboundLineSourceOptions = ['采购', '生产', '外协']
