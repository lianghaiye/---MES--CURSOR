/** 调拨单状态 / 来源 */

export const TRANSFER_STATUS = {
  PENDING: '待确认',
  AWAIT_INBOUND: '待入库方确认',
  PARTIAL: '部分确认',
  DONE: '已完成',
  REFUSED: '已拒绝',
  VOIDED: '已作废',
}

export const transferStatusOptions = [
  TRANSFER_STATUS.PENDING,
  TRANSFER_STATUS.AWAIT_INBOUND,
  TRANSFER_STATUS.PARTIAL,
  TRANSFER_STATUS.DONE,
  TRANSFER_STATUS.REFUSED,
  TRANSFER_STATUS.VOIDED,
]

export function transferStatusColor(status) {
  if (status === TRANSFER_STATUS.DONE) return 'success'
  if (status === TRANSFER_STATUS.REFUSED || status === TRANSFER_STATUS.VOIDED) return 'error'
  if (status === TRANSFER_STATUS.PARTIAL || status === TRANSFER_STATUS.AWAIT_INBOUND)
    return 'processing'
  return 'default'
}

export const TRANSFER_SOURCE = {
  BUSINESS: 'business',
  MANUAL: 'manual',
}

export const transferSourceOptions = [
  { label: '业务', value: TRANSFER_SOURCE.BUSINESS },
  { label: '新增', value: TRANSFER_SOURCE.MANUAL },
]

export function transferSourceLabel(channel) {
  if (channel === TRANSFER_SOURCE.MANUAL || channel === 'web') return '新增'
  return '业务'
}

export function isTransferManualSource(orderOrChannel) {
  const channel =
    typeof orderOrChannel === 'string' ? orderOrChannel : orderOrChannel?.sourceChannel
  return transferSourceLabel(channel) === '新增'
}

export function isTransferBusinessSource(orderOrChannel) {
  return !isTransferManualSource(orderOrChannel)
}

/** 行：待确认 / 待入库 / 已完成（已签收）/ 已拒绝 */
export const TRANSFER_LINE_STATUS = {
  PENDING: '待确认',
  AWAIT_INBOUND: '待入库',
  DONE: '已完成',
  REFUSED: '已拒绝',
}

/** 调拨明细数量合计 */
export function calcTransferOrderQty(order) {
  return (order?.lineItems || []).reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
}

/** 已签收数量（行状态=已完成） */
export function calcTransferReceivedQty(order) {
  return (order?.lineItems || []).reduce((sum, line) => {
    if ((line.lineStatus || '') === TRANSFER_LINE_STATUS.DONE) return sum + (Number(line.qty) || 0)
    return sum
  }, 0)
}

/** 列表展示：已签收数量/全部数量 */
export function formatTransferQtyRatio(order, formatFn) {
  const fmt = typeof formatFn === 'function' ? formatFn : (v) => String(v ?? 0)
  return `${fmt(calcTransferReceivedQty(order))}/${fmt(calcTransferOrderQty(order))}`
}
