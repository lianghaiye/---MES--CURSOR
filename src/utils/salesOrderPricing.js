export const PRICE_SOURCES = ['product', 'customer_agreement', 'contract', 'manual']

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

/** UI 输入 95 或 0.95 均归一化为 0~1 的小数 */
export function normalizeDiscountRate(value, fallback = 1) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  if (n > 1) return round4(Math.min(n, 100) / 100)
  return round4(n)
}

export function formatDiscountRatePercent(rate) {
  const normalized = normalizeDiscountRate(rate, 1)
  return `${round2(normalized * 100)}%`
}

export function ensureLinePricingFields(line = {}) {
  const listPrice = Number(line.listUnitPriceExTax ?? line.unitPriceExTax) || 0
  if (line.listUnitPriceExTax == null || line.listUnitPriceExTax === '') {
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
  LINE: 'line',
  ORDER: 'order',
  STACK: 'stack',
}

export const DISCOUNT_STRATEGY_LABELS = {
  [DISCOUNT_STRATEGIES.LINE]: '仅明细折扣',
  [DISCOUNT_STRATEGIES.ORDER]: '仅整单折扣',
  [DISCOUNT_STRATEGIES.STACK]: '折上加折',
}

export function ensureDiscountStrategy(order = {}) {
  if (!order.discountStrategy) {
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
  const listPrice = Number(line.listUnitPriceExTax) || 0
  let discountRate = normalizeDiscountRate(line.lineDiscountRate, 1)

  if (editMode === 'unitPrice') {
    const unitEx = round2(Number(line.unitPriceExTax) || 0)
    line.unitPriceExTax = unitEx
    if (listPrice > 0) {
      discountRate = round4(unitEx / listPrice)
      line.lineDiscountRate = discountRate
      line.priceSource = line.priceSource === 'product' ? 'manual' : line.priceSource
    }
  } else {
    line.unitPriceExTax = round2(listPrice * discountRate)
    line.lineDiscountRate = discountRate
  }

  if (taxModeExcluding) {
    line.unitPriceInTax = round2(line.unitPriceExTax * (1 + taxRate / 100))
  } else {
    const unitInTax = round2(Number(line.unitPriceInTax) || 0)
    line.unitPriceInTax = unitInTax
    line.unitPriceExTax = taxRate >= 0 ? round2(unitInTax / (1 + taxRate / 100)) : unitInTax
    if (listPrice > 0) {
      line.lineDiscountRate = round4(line.unitPriceExTax / listPrice)
    }
  }

  line.totalPriceExTax = round2(qty * (Number(line.unitPriceExTax) || 0))
  line.totalPriceInTax = round2(qty * (Number(line.unitPriceInTax) || 0))
  line.lineDiscountAmount = round2(Math.max(0, listPrice * qty * (1 - discountRate)))
  return line
}

export function calcLineSubtotals(lineItems = []) {
  const lineAmountExTax = round2(
    lineItems.reduce((sum, line) => sum + (Number(line.totalPriceExTax) || 0), 0),
  )
  const lineAmountInTax = round2(
    lineItems.reduce((sum, line) => sum + (Number(line.totalPriceInTax) || 0), 0),
  )
  const lineDiscountTotal = round2(
    lineItems.reduce((sum, line) => sum + (Number(line.lineDiscountAmount) || 0), 0),
  )
  return { lineAmountExTax, lineAmountInTax, lineDiscountTotal }
}

/** 整单优惠后订单金额 */
export function calcOrderAmounts(order = {}, options = {}) {
  const taxModeExcluding = options.taxModeExcluding !== false
  ensureDiscountStrategy(order)
  const strategy = order.discountStrategy || DISCOUNT_STRATEGIES.LINE

  const lineItems = (order.lineItems || []).map((line) => {
    const lineCopy = { ...line }
    if (strategy === DISCOUNT_STRATEGIES.ORDER) {
      lineCopy.lineDiscountRate = 1
    }
    return recalcSalesLinePricing(lineCopy, { taxModeExcluding, editMode: 'discount' })
  })

  ensureOrderDiscountFields(order)
  const { lineAmountExTax, lineAmountInTax, lineDiscountTotal } = calcLineSubtotals(lineItems)

  let orderDiscountRate = normalizeDiscountRate(order.orderDiscountRate, 1)
  let orderDiscountAmount = Math.max(0, round2(order.orderDiscountAmount))
  if (strategy === DISCOUNT_STRATEGIES.LINE) {
    orderDiscountRate = 1
    orderDiscountAmount = 0
  }

  const afterRateExTax = round2(lineAmountExTax * orderDiscountRate)
  const amountExTax = round2(Math.max(0, afterRateExTax - orderDiscountAmount))

  const orderDiscountByRate = round2(Math.max(0, lineAmountExTax - afterRateExTax))
  const orderDiscountTotal = round2(orderDiscountByRate + orderDiscountAmount)

  const ratio = lineAmountExTax > 0 ? amountExTax / lineAmountExTax : 1
  const amountInTax = round2(lineAmountInTax * ratio)

  return {
    lineItems,
    lineAmountExTax,
    lineAmountInTax,
    lineDiscountTotal: strategy === DISCOUNT_STRATEGIES.ORDER ? 0 : lineDiscountTotal,
    orderDiscountByRate,
    orderDiscountTotal,
    amountExTax,
    amountInTax,
    orderAmount: amountInTax,
    totalQty: lineItems.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
    totalDiscountAmount: round2(
      (strategy === DISCOUNT_STRATEGIES.ORDER ? 0 : lineDiscountTotal) + orderDiscountTotal,
    ),
    discountStrategy: strategy,
  }
}

export function applyOrderAmounts(order, options = {}) {
  const result = calcOrderAmounts(order, options)
  order.lineItems = result.lineItems
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
