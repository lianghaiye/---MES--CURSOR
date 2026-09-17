/** 盘点单状态 / 来源 */

export const STOCKTAKE_STATUS = {
  PENDING: '待确认',
  PARTIAL: '部分确认',
  DONE: '已确认',
  REFUSED: '已拒绝',
}

export const stocktakeStatusOptions = [
  STOCKTAKE_STATUS.PENDING,
  STOCKTAKE_STATUS.PARTIAL,
  STOCKTAKE_STATUS.DONE,
  STOCKTAKE_STATUS.REFUSED,
]

export function stocktakeStatusColor(status) {
  if (status === STOCKTAKE_STATUS.DONE) return 'success'
  if (status === STOCKTAKE_STATUS.REFUSED) return 'error'
  if (status === STOCKTAKE_STATUS.PARTIAL) return 'processing'
  return 'default'
}

export const STOCKTAKE_SOURCE = {
  BUSINESS: 'business',
  MANUAL: 'manual',
}

export const stocktakeSourceOptions = [
  { label: '业务', value: STOCKTAKE_SOURCE.BUSINESS },
  { label: '新增', value: STOCKTAKE_SOURCE.MANUAL },
]

export function stocktakeSourceLabel(channel) {
  if (channel === STOCKTAKE_SOURCE.MANUAL || channel === 'web') return '新增'
  return '业务'
}

export function isStocktakeManualSource(orderOrChannel) {
  const channel =
    typeof orderOrChannel === 'string' ? orderOrChannel : orderOrChannel?.sourceChannel
  return stocktakeSourceLabel(channel) === '新增'
}

export function isStocktakeBusinessSource(orderOrChannel) {
  return !isStocktakeManualSource(orderOrChannel)
}
