import { getFreeQtyByItemCode, buildLineStockReminder } from '@/store/salesStockAllocationStore'

/** 销售行库存履约方式：决定审核时占用现货 vs 排产数量 */
export const STOCK_FULFILLMENT_MODE = {
  /** 优先吃自由备货，缺口再进生产计划 */
  PREFER_STOCK: 'prefer_stock',
  /** 即使有自由备货也按全量排产，不占用自由备货 */
  FORCE_MTO: 'force_mto',
  /** 仅吃现货；自由备货不足则审核失败 */
  STOCK_ONLY: 'stock_only',
}

export const STOCK_FULFILLMENT_MODE_LABELS = {
  [STOCK_FULFILLMENT_MODE.PREFER_STOCK]: '优先现货',
  [STOCK_FULFILLMENT_MODE.FORCE_MTO]: '强制按单生产',
  [STOCK_FULFILLMENT_MODE.STOCK_ONLY]: '仅现货',
}

export const STOCK_FULFILLMENT_MODE_OPTIONS = [
  {
    value: STOCK_FULFILLMENT_MODE.PREFER_STOCK,
    label: STOCK_FULFILLMENT_MODE_LABELS[STOCK_FULFILLMENT_MODE.PREFER_STOCK],
  },
  {
    value: STOCK_FULFILLMENT_MODE.FORCE_MTO,
    label: STOCK_FULFILLMENT_MODE_LABELS[STOCK_FULFILLMENT_MODE.FORCE_MTO],
  },
  {
    value: STOCK_FULFILLMENT_MODE.STOCK_ONLY,
    label: STOCK_FULFILLMENT_MODE_LABELS[STOCK_FULFILLMENT_MODE.STOCK_ONLY],
  },
]

export function normalizeStockFulfillmentMode(mode) {
  const v = String(mode || '').trim()
  if (
    v === STOCK_FULFILLMENT_MODE.FORCE_MTO ||
    v === STOCK_FULFILLMENT_MODE.STOCK_ONLY ||
    v === STOCK_FULFILLMENT_MODE.PREFER_STOCK
  ) {
    return v
  }
  return STOCK_FULFILLMENT_MODE.PREFER_STOCK
}

export function stockFulfillmentModeLabel(mode) {
  const key = normalizeStockFulfillmentMode(mode)
  return STOCK_FULFILLMENT_MODE_LABELS[key] || STOCK_FULFILLMENT_MODE_LABELS.prefer_stock
}

/**
 * 按行计算审核时的「预计占用 / 预计排产」。
 * 同编码多行按顺序扣减自由备货，避免重复吃同一批库存。
 * 已占用（如审核前跨单调拨）计入覆盖，不再重复从自由备货扣减。
 * @param {object[]} lines
 * @param {{
 *   getFreeQty?: (code: string) => number,
 *   getAllocatedQty?: (line: object) => number,
 *   forceFullPlanLineIds?: Set<string>
 * }} [options]
 */
export function buildLineStockFulfillmentPlan(lines, options = {}) {
  const getFreeQty = options.getFreeQty || getFreeQtyByItemCode
  const getAllocatedQty = options.getAllocatedQty || (() => 0)
  const forceFullPlanLineIds = options.forceFullPlanLineIds || new Set()
  const freeLeft = new Map()
  const rows = []

  for (const line of lines || []) {
    const code = String(line?.productCode || '').trim()
    const need = Math.max(0, Number(line?.salesQty ?? line?.qty) || 0)
    const mode = normalizeStockFulfillmentMode(line?.stockFulfillmentMode)
    const already = Math.max(0, Number(getAllocatedQty(line)) || 0)
    if (code && !freeLeft.has(code)) {
      freeLeft.set(code, Math.max(0, Number(getFreeQty(code)) || 0))
    }
    const freeBefore = code ? freeLeft.get(code) || 0 : 0
    const needRemain = Math.max(0, need - already)

    let stockTake = already
    let planQty = 0
    let additionalTake = 0

    if (forceFullPlanLineIds.has(line?.id)) {
      // 需设计任务等：必须进计划；保留已调拨占用
      planQty = need
      stockTake = already
    } else if (mode === STOCK_FULFILLMENT_MODE.FORCE_MTO) {
      // 全量排产，不再吃自由备货；已调拨占用保留供发货
      planQty = need
      stockTake = already
    } else if (mode === STOCK_FULFILLMENT_MODE.STOCK_ONLY) {
      additionalTake = Math.min(needRemain, freeBefore)
      stockTake = already + additionalTake
      planQty = 0
    } else {
      additionalTake = Math.min(needRemain, freeBefore)
      stockTake = already + additionalTake
      planQty = Math.max(0, need - stockTake)
    }

    if (code) freeLeft.set(code, Math.max(0, freeBefore - additionalTake))

    rows.push({
      lineId: line?.id,
      productCode: code,
      productName: line?.productName || '',
      need,
      mode,
      modeLabel: stockFulfillmentModeLabel(mode),
      freeBefore,
      already,
      stockTake,
      planQty,
      shortfall: mode === STOCK_FULFILLMENT_MODE.STOCK_ONLY ? Math.max(0, need - stockTake) : 0,
    })
  }

  return rows
}

/** 仅现货但自由备货不足的行 */
export function listStockOnlyShortfalls(planRows) {
  return (planRows || []).filter((r) => r.shortfall > 0)
}

/** 未结束订单可在详情/编辑页申请跨单调拨 */
export function canApplyStockTransfer(order) {
  if (!order?.id) return false
  const status = String(order.progressStatus || '')
  return status !== '已完成' && status !== '已作废'
}

/**
 * 存在他单占用时建议可先跨单调拨（不要求自由备货不足）
 */
export function listLinesSuggestingStockTransfer(order) {
  if (!order) return []
  return (order.lineItems || [])
    .filter((line) => String(line?.productCode || '').trim())
    .map((line) => {
      const remind = buildLineStockReminder(line, order)
      return { line, remind }
    })
    .filter(({ remind }) => remind.otherQty > 0)
}
