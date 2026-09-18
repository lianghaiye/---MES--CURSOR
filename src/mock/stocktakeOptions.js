/** 盘点单状态 / 来源 / 类型 / 过账 */

export const STOCKTAKE_STATUS = {
  PENDING_APPROVAL: '待审核',
  APPROVED: '审核通过',
  REFUSED: '已拒绝',
  POSTED: '已过账',
}

export const stocktakeStatusOptions = [
  STOCKTAKE_STATUS.PENDING_APPROVAL,
  STOCKTAKE_STATUS.APPROVED,
  STOCKTAKE_STATUS.REFUSED,
  STOCKTAKE_STATUS.POSTED,
]

export function stocktakeStatusColor(status) {
  if (status === STOCKTAKE_STATUS.POSTED) return 'success'
  if (status === STOCKTAKE_STATUS.APPROVED) return 'processing'
  if (status === STOCKTAKE_STATUS.REFUSED) return 'error'
  return 'default'
}

/** 兼容历史种子/本地缓存状态 */
export function normalizeStocktakeStatus(status) {
  if (status === '待确认' || status === '部分确认') return STOCKTAKE_STATUS.PENDING_APPROVAL
  if (status === '已确认') return STOCKTAKE_STATUS.POSTED
  if (Object.values(STOCKTAKE_STATUS).includes(status)) return status
  return STOCKTAKE_STATUS.PENDING_APPROVAL
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

export const STOCKTAKE_TYPE = {
  OPENING: '期初调整',
  CLOSING: '期末调整',
  COST: '成本调整',
  OTHER: '其他调整',
}

export const stocktakeTypeOptions = [
  STOCKTAKE_TYPE.OPENING,
  STOCKTAKE_TYPE.CLOSING,
  STOCKTAKE_TYPE.COST,
  STOCKTAKE_TYPE.OTHER,
]

/** 过账结果标记（单据状态仍可为「审核通过」） */
export const STOCKTAKE_POSTING = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export function stocktakePostingLabel(status) {
  if (status === STOCKTAKE_POSTING.SUCCESS) return '过账成功'
  if (status === STOCKTAKE_POSTING.FAILED) return '过账失败'
  if (status === STOCKTAKE_POSTING.PENDING) return '待过账'
  return ''
}

/** 有差异的明细行数 */
export function calcStocktakeDiffLineCount(order) {
  return (order?.lineItems || []).filter((l) => Number(l.diffQty) !== 0).length
}

/** 明细总行数 */
export function calcStocktakeLineCount(order) {
  return (order?.lineItems || []).length
}

/** 列表展示：差异行数 / 全部行数 */
export function formatStocktakeQtyRatio(order) {
  return `${calcStocktakeDiffLineCount(order)}/${calcStocktakeLineCount(order)}`
}
