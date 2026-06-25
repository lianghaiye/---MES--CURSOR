export const CUSTOM_SALES_BUSINESS_TYPE = '定制销售'

/** 销售明细行业务类型（兼容旧订单头字段） */
export function resolveLineBusinessType(line = {}, order = {}) {
  return line.businessType || order.businessType || '自产销售'
}

export function deriveOrderBusinessType(lineItems = [], fallback = '自产销售') {
  const types = [
    ...new Set(
      (lineItems || []).map((line) => resolveLineBusinessType(line, { businessType: fallback })),
    ),
  ].filter(Boolean)
  if (!types.length) return fallback || '自产销售'
  if (types.length === 1) return types[0]
  return types.join('、')
}

export function isOutsourcingBusinessType(type) {
  return type === '外协销售'
}

export function isCustomSalesBusinessType(type) {
  return type === CUSTOM_SALES_BUSINESS_TYPE
}

export function isSelfMadeBusinessType(type) {
  return type === '自产销售' || isCustomSalesBusinessType(type)
}

export function isPurchasedBusinessType(type) {
  return type === '外购销售'
}

export function isManualSalesLine(line = {}) {
  if (line.isManualLine === true || line.isOutsourcingLine === true) return true
  const type = line.businessType
  return (
    !line.productId &&
    (type === '外协销售' || type === '质检服务' || type === CUSTOM_SALES_BUSINESS_TYPE)
  )
}

export function normalizeSalesLineBusiness(line = {}, order = {}) {
  const businessType = resolveLineBusinessType(line, order)
  const isManualLine = isManualSalesLine({ ...line, businessType })
  return {
    ...line,
    businessType,
    isManualLine,
    isOutsourcingLine: isManualLine && !isCustomSalesBusinessType(businessType),
  }
}
