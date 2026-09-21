/** 盘点单状态 / 来源 / 类型 / 过账 */

export const STOCKTAKE_STATUS = {
  DRAFT: '待提交',
  PENDING_APPROVAL: '待审核',
  APPROVED: '审核通过',
  REFUSED: '已拒绝',
}

export const stocktakeStatusOptions = [
  STOCKTAKE_STATUS.DRAFT,
  STOCKTAKE_STATUS.PENDING_APPROVAL,
  STOCKTAKE_STATUS.APPROVED,
  STOCKTAKE_STATUS.REFUSED,
]

export function stocktakeStatusColor(status) {
  if (status === STOCKTAKE_STATUS.APPROVED) return 'processing'
  if (status === STOCKTAKE_STATUS.REFUSED) return 'error'
  if (status === STOCKTAKE_STATUS.PENDING_APPROVAL) return 'warning'
  return 'default'
}

/** 兼容历史种子/本地缓存状态 */
export function normalizeStocktakeStatus(status) {
  if (status === '待确认' || status === '部分确认') return STOCKTAKE_STATUS.PENDING_APPROVAL
  // 历史「已过账 / 已确认」：单据状态归一为审核通过，过账成功由 postingStatus 表达
  if (status === '已确认' || status === '已过账') return STOCKTAKE_STATUS.APPROVED
  if (Object.values(STOCKTAKE_STATUS).includes(status)) return status
  return STOCKTAKE_STATUS.DRAFT
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
  if (
    channel === STOCKTAKE_SOURCE.MANUAL ||
    channel === 'web' ||
    channel === 'miniprogram' ||
    channel === 'mobile'
  ) {
    return '新增'
  }
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
  OPENING: '期初盘点',
  CLOSING: '期末盘点',
  COST: '成本调整',
  OTHER: '其他调整',
}

/** 兼容历史「期初调整 / 期末调整」 */
export function normalizeStocktakeType(type) {
  if (type === '期初调整') return STOCKTAKE_TYPE.OPENING
  if (type === '期末调整') return STOCKTAKE_TYPE.CLOSING
  if (Object.values(STOCKTAKE_TYPE).includes(type)) return type
  return type || STOCKTAKE_TYPE.OTHER
}

export const stocktakeTypeOptions = [
  STOCKTAKE_TYPE.OPENING,
  STOCKTAKE_TYPE.CLOSING,
  STOCKTAKE_TYPE.COST,
  STOCKTAKE_TYPE.OTHER,
]

/** 过账状态（与单据状态拆分；仅审核通过后有意义） */
export const STOCKTAKE_POSTING = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export const stocktakePostingOptions = [
  { label: '待过账', value: STOCKTAKE_POSTING.PENDING },
  { label: '部分过账', value: STOCKTAKE_POSTING.PARTIAL },
  { label: '过账成功', value: STOCKTAKE_POSTING.SUCCESS },
  { label: '过账失败', value: STOCKTAKE_POSTING.FAILED },
]

export function stocktakePostingLabel(status) {
  if (status === STOCKTAKE_POSTING.SUCCESS) return '过账成功'
  if (status === STOCKTAKE_POSTING.PARTIAL) return '部分过账'
  if (status === STOCKTAKE_POSTING.FAILED) return '过账失败'
  if (status === STOCKTAKE_POSTING.PENDING) return '待过账'
  return ''
}

export function stocktakePostingColor(status) {
  if (status === STOCKTAKE_POSTING.SUCCESS) return 'success'
  if (status === STOCKTAKE_POSTING.PARTIAL) return 'processing'
  if (status === STOCKTAKE_POSTING.FAILED) return 'error'
  if (status === STOCKTAKE_POSTING.PENDING) return 'warning'
  return 'default'
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
