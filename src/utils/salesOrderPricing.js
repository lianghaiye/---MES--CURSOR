import { formatNumber } from '@/utils/numberFormat'

export const PRICE_SOURCES = ['product', 'customer_agreement', 'contract', 'manual']

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

/** UI 输入 95 或 0.95 均归一化为比率；允许小幅加价比率（如 1.05），>10 视为百分数 */
export function normalizeDiscountRate(value, fallback = 1) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  // 94 / 100 等百分数；0.94 / 1 / 1.05 等比率（含高于标准价）
  if (n > 10) return round4(Math.min(n, 100) / 100)
  return round4(n)
}

export function formatDiscountRatePercent(rate) {
  const normalized = normalizeDiscountRate(rate, 1)
  const pct = formatNumber(normalized * 100, 2, { empty: '0' })
  return `${pct}%`
}

export function ensureLinePricingFields(line = {}) {
  let listPrice = Number(line.listUnitPriceExTax)
  if (!Number.isFinite(listPrice) || listPrice <= 0) {
    listPrice = Number(line.unitPriceExTax) || 0
  }
  if ((!Number.isFinite(listPrice) || listPrice <= 0) && Number(line.unitPriceInTax) > 0) {
    const taxRate = Number(line.taxRate) || 0
    listPrice =
      taxRate >= 0
        ? round2(Number(line.unitPriceInTax) / (1 + taxRate / 100))
        : round2(Number(line.unitPriceInTax))
  }
  if (
    line.listUnitPriceExTax == null ||
    line.listUnitPriceExTax === '' ||
    Number(line.listUnitPriceExTax) <= 0
  ) {
    line.listUnitPriceExTax = listPrice
  }
  if (line.lineDiscountRate == null || line.lineDiscountRate === '') {
    line.lineDiscountRate = 1
  } else {
    line.lineDiscountRate = normalizeDiscountRate(line.lineDiscountRate, 1)
  }
  if (!line.priceSource) line.priceSource = 'product'
  return line
}

export const DISCOUNT_STRATEGIES = {
  NONE: 'none',
  LINE: 'line',
  ORDER: 'order',
  STACK: 'stack',
}

export const DISCOUNT_STRATEGY_LABELS = {
  [DISCOUNT_STRATEGIES.NONE]: '无折扣',
  [DISCOUNT_STRATEGIES.LINE]: '仅明细折扣',
  [DISCOUNT_STRATEGIES.ORDER]: '仅整单折扣',
  [DISCOUNT_STRATEGIES.STACK]: '折上加折',
}

/** 无折扣 / 仅明细折扣：不可使用整单折扣与减免 */
export function isOrderDiscountDisabled(strategy) {
  return strategy === DISCOUNT_STRATEGIES.NONE || strategy === DISCOUNT_STRATEGIES.LINE
}

/** 无折扣 / 仅整单折扣：行折扣固定 100% */
export function isLineDiscountDisabled(strategy) {
  return strategy === DISCOUNT_STRATEGIES.NONE || strategy === DISCOUNT_STRATEGIES.ORDER
}

export function ensureDiscountStrategy(order = {}) {
  if (!order.discountStrategy) {
    // 历史单据缺省按「仅明细折扣」兼容；新建表单默认「无折扣」
    order.discountStrategy = DISCOUNT_STRATEGIES.LINE
  }
  return order
}

export function ensureOrderDiscountFields(order = {}) {
  if (order.orderDiscountType == null || order.orderDiscountType === '') {
    order.orderDiscountType = 'none'
  }
  if (order.orderDiscountRate == null || order.orderDiscountRate === '') {
    order.orderDiscountRate = 1
  } else {
    order.orderDiscountRate = normalizeDiscountRate(order.orderDiscountRate, 1)
  }
  if (order.orderDiscountAmount == null || order.orderDiscountAmount === '') {
    order.orderDiscountAmount = 0
  } else {
    order.orderDiscountAmount = Math.max(0, round2(order.orderDiscountAmount))
  }
  if (order.orderDiscountReason == null) order.orderDiscountReason = ''
  return order
}

/**
 * 重算单行价格（不含整单优惠）
 * @param {object} line
 * @param {{ taxModeExcluding?: boolean, editMode?: 'discount'|'unitPrice' }} options
 */
export function recalcSalesLinePricing(line, options = {}) {
  const taxModeExcluding = options.taxModeExcluding !== false
  const editMode = options.editMode || 'discount'
  ensureLinePricingFields(line)

  const qty = Number(line.salesQty ?? line.qty) || 0
  line.qty = qty
  const taxRate = Number(line.taxRate) || 0
  let listPrice = Number(line.listUnitPriceExTax) || 0
  let discountRate = normalizeDiscountRate(line.lineDiscountRate, 1)

  if (editMode === 'unitPrice') {
    if (taxModeExcluding) {
      const unitEx = round2(Number(line.unitPriceExTax) || 0)
      line.unitPriceExTax = unitEx
      line.unitPriceInTax = round2(unitEx * (1 + taxRate / 100))
    } else {
      const unitInTax = round2(Number(line.unitPriceInTax) || 0)
      line.unitPriceInTax = unitInTax
      line.unitPriceExTax = taxRate >= 0 ? round2(unitInTax / (1 + taxRate / 100)) : unitInTax
    }
    if (listPrice > 0) {
      // 成交价高于标准价：抬高标准价，折扣保持 100%，避免加价率被当成百分数
      if (line.unitPriceExTax > listPrice) {
        line.listUnitPriceExTax = line.unitPriceExTax
        listPrice = line.unitPriceExTax
        discountRate = 1
      } else {
        discountRate = round4(line.unitPriceExTax / listPrice)
      }
      line.lineDiscountRate = discountRate
      line.priceSource = line.priceSource === 'product' ? 'manual' : line.priceSource
    } else {
      line.listUnitPriceExTax = Number(line.unitPriceExTax) || 0
      listPrice = line.listUnitPriceExTax
      discountRate = 1
      line.lineDiscountRate = 1
    }
  } else {
    // 改行折扣：以标准单价(不含税) × 折扣率计价，再推算含税价
    discountRate = Math.min(discountRate, 1)
    line.lineDiscountRate = discountRate
    line.unitPriceExTax = round2(listPrice * discountRate)
    line.unitPriceInTax = round2(line.unitPriceExTax * (1 + taxRate / 100))
  }

  line.totalPriceExTax = round2(qty * (Number(line.unitPriceExTax) || 0))
  line.totalPriceInTax = round2(qty * (Number(line.unitPriceInTax) || 0))
  line.listTotalPriceExTax = round2(listPrice * qty)
  line.lineDiscountAmount = round2(Math.max(0, listPrice * qty * (1 - Math.min(discountRate, 1))))
  return line
}

export function calcLineSubtotals(lineItems = []) {
  const lineListAmountExTax = round2(
    lineItems.reduce((sum, line) => {
      const qty = Number(line.qty ?? line.salesQty) || 0
      const listTotal =
        line.listTotalPriceExTax != null && line.listTotalPriceExTax !== ''
          ? Number(line.listTotalPriceExTax)
          : (Number(line.listUnitPriceExTax) || 0) * qty
      return sum + listTotal
    }, 0),
  )
  const lineAmountExTax = round2(
    lineItems.reduce((sum, line) => sum + (Number(line.totalPriceExTax) || 0), 0),
  )
  const lineAmountInTax = round2(
    lineItems.reduce((sum, line) => sum + (Number(line.totalPriceInTax) || 0), 0),
  )
  const lineDiscountTotal = round2(
    lineItems.reduce((sum, line) => sum + (Number(line.lineDiscountAmount) || 0), 0),
  )
  return { lineListAmountExTax, lineAmountExTax, lineAmountInTax, lineDiscountTotal }
}

/**
 * 将整单折扣/减免代入各明细后汇总
 * 行最终不含税 = 行明细折后不含税 × 整单折扣率 − 按行占比分摊的整单减免
 * 行最终含税按该行税负比例同步折算
 * @returns {{ amountExTax: number, amountInTax: number, orderDiscountByRate: number, orderDiscountTotal: number, settledLines: object[] }}
 */
export function settleLinesWithOrderDiscount(
  lineItems = [],
  orderDiscountRate = 1,
  orderDiscountAmount = 0,
) {
  const rate = normalizeDiscountRate(orderDiscountRate, 1)
  const lump = Math.max(0, round2(orderDiscountAmount))
  const bases = lineItems.map((line) => ({
    ex: Math.max(0, round2(Number(line.totalPriceExTax) || 0)),
    in: Math.max(0, round2(Number(line.totalPriceInTax) || 0)),
  }))
  const baseExSum = round2(bases.reduce((s, b) => s + b.ex, 0))
  const afterRateExSum = round2(bases.reduce((s, b) => s + round2(b.ex * rate), 0))
  const orderDiscountByRate = round2(Math.max(0, baseExSum - afterRateExSum))

  let allocatedLump = 0
  const settledLines = lineItems.map((line, index) => {
    const baseEx = bases[index].ex
    const baseIn = bases[index].in
    const afterRateEx = round2(baseEx * rate)
    let share = baseExSum > 0 ? round2(lump * (baseEx / baseExSum)) : 0
    if (index === lineItems.length - 1) {
      share = round2(Math.max(0, lump - allocatedLump))
    } else {
      allocatedLump = round2(allocatedLump + share)
    }
    const finalEx = round2(Math.max(0, afterRateEx - share))
    const finalIn = baseEx > 0 ? round2(finalEx * (baseIn / baseEx)) : round2(baseIn * rate)
    const qty = Number(line.qty ?? line.salesQty) || 0
    return {
      ...line,
      // 明细展示仍保留「行折后、整单前」单价；结算额写入 settled* 供核对
      settledTotalPriceExTax: finalEx,
      settledTotalPriceInTax: finalIn,
      settledUnitPriceExTax: qty > 0 ? round2(finalEx / qty) : 0,
      settledUnitPriceInTax: qty > 0 ? round2(finalIn / qty) : 0,
    }
  })

  const amountExTax = round2(
    settledLines.reduce((s, l) => s + (Number(l.settledTotalPriceExTax) || 0), 0),
  )
  const amountInTax = round2(
    settledLines.reduce((s, l) => s + (Number(l.settledTotalPriceInTax) || 0), 0),
  )
  const orderDiscountTotal = round2(orderDiscountByRate + lump)

  return {
    amountExTax,
    amountInTax,
    orderDiscountByRate,
    orderDiscountTotal,
    settledLines,
  }
}

/** 整单优惠后订单金额：整单折扣先入各行，再求和 */
export function calcOrderAmounts(order = {}, options = {}) {
  const taxModeExcluding = options.taxModeExcluding !== false
  ensureDiscountStrategy(order)
  const strategy = order.discountStrategy || DISCOUNT_STRATEGIES.LINE

  const lineItems = (order.lineItems || []).map((line) => {
    const lineCopy = { ...line }
    if (isLineDiscountDisabled(strategy)) {
      lineCopy.lineDiscountRate = 1
    }
    // 汇总时以当前成交单价为准，避免把用户刚录入的单价按折扣率回写掉
    // 改行折扣时由调用方先 recalc(editMode:'discount') 再汇总
    const editMode = options.lineEditMode || 'unitPrice'
    return recalcSalesLinePricing(lineCopy, { taxModeExcluding, editMode })
  })

  ensureOrderDiscountFields(order)
  const { lineListAmountExTax, lineAmountExTax, lineAmountInTax, lineDiscountTotal } =
    calcLineSubtotals(lineItems)

  let orderDiscountRate = normalizeDiscountRate(order.orderDiscountRate, 1)
  let orderDiscountAmount = Math.max(0, round2(order.orderDiscountAmount))
  if (isOrderDiscountDisabled(strategy)) {
    orderDiscountRate = 1
    orderDiscountAmount = 0
  }

  const settled = settleLinesWithOrderDiscount(lineItems, orderDiscountRate, orderDiscountAmount)
  const effectiveLineDiscountTotal = isLineDiscountDisabled(strategy) ? 0 : lineDiscountTotal

  return {
    lineItems: settled.settledLines,
    lineListAmountExTax,
    // 销售总额：各行明细折后（尚未扣整单优惠）
    lineAmountExTax,
    lineAmountInTax,
    lineDiscountTotal: effectiveLineDiscountTotal,
    orderDiscountByRate: settled.orderDiscountByRate,
    orderDiscountTotal: settled.orderDiscountTotal,
    // 最终成交额：Σ 各行（明细折后 × 整单折扣率 − 分摊减免）
    amountExTax: settled.amountExTax,
    amountInTax: settled.amountInTax,
    orderAmount: settled.amountInTax,
    totalQty: lineItems.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
    totalDiscountAmount: round2(effectiveLineDiscountTotal + settled.orderDiscountTotal),
    discountStrategy: strategy,
  }
}

export function applyOrderAmounts(order, options = {}) {
  const result = calcOrderAmounts(order, options)
  order.lineItems = result.lineItems
  order.lineListAmountExTax = result.lineListAmountExTax
  order.lineAmountExTax = result.lineAmountExTax
  order.lineAmountInTax = result.lineAmountInTax
  order.lineDiscountTotal = result.lineDiscountTotal
  order.orderDiscountByRate = result.orderDiscountByRate
  order.orderDiscountTotal = result.orderDiscountTotal
  order.amountExTax = result.amountExTax
  order.amountInTax = result.amountInTax
  order.orderAmount = result.orderAmount
  order.totalQty = result.totalQty
  order.totalDiscountAmount = result.totalDiscountAmount
  return order
}
