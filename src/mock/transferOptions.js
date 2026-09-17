/** 调拨单状态 / 来源 */

export const TRANSFER_STATUS = {
  PENDING: '待确认',
  PARTIAL: '部分确认',
  DONE: '已确认',
  REFUSED: '已拒绝',
}

export const transferStatusOptions = [
  TRANSFER_STATUS.PENDING,
  TRANSFER_STATUS.PARTIAL,
  TRANSFER_STATUS.DONE,
  TRANSFER_STATUS.REFUSED,
]

export function transferStatusColor(status) {
  if (status === TRANSFER_STATUS.DONE) return 'success'
  if (status === TRANSFER_STATUS.REFUSED) return 'error'
  if (status === TRANSFER_STATUS.PARTIAL) return 'processing'
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
