export const SUPPLIER_ROLE = {
  OUTSOURCE: '外协',
  PURCHASE: '采购',
}

export const supplierRoleOptions = [
  { label: SUPPLIER_ROLE.OUTSOURCE, value: SUPPLIER_ROLE.OUTSOURCE },
  { label: SUPPLIER_ROLE.PURCHASE, value: SUPPLIER_ROLE.PURCHASE },
]

export const enterpriseScaleOptions = [
  { label: '大型', value: '大型' },
  { label: '中型', value: '中型' },
  { label: '小型', value: '小型' },
  { label: '微型', value: '微型' },
]

export const settlementMethodOptions = [
  { label: '现金结算', value: '现金结算' },
  { label: '银行转账', value: '银行转账' },
  { label: '承兑汇票', value: '承兑汇票' },
]

export const settlementCycleOptions = [
  { label: '月结', value: '月结' },
  { label: '周结', value: '周结' },
  { label: '半月结', value: '半月结' },
  { label: '季结', value: '季结' },
  { label: '无', value: '无' },
]

export const settlementTypeOptions = [
  { label: '先款后货', value: '先款后货' },
  { label: '先货后款', value: '先货后款' },
  { label: '预付款+货到付', value: '预付款+货到付' },
  { label: '预付款+发货付', value: '预付款+发货付' },
]

export const paymentMethodOptions = [
  { label: '款到发货', value: '款到发货' },
  { label: '货到付款', value: '货到付款' },
  { label: '现金', value: '现金' },
  { label: '预付款', value: '预付款' },
  { label: '预付定金发货前付款', value: '预付定金发货前付款' },
]

export const quoteMethodOptions = [
  { label: '询价议价', value: '询价议价' },
  { label: '固定报价', value: '固定报价' },
  { label: '框架协议价', value: '框架协议价' },
  { label: '招投标', value: '招投标' },
]

export const invoiceTypeOptions = [
  { label: '增值税专用发票', value: '增值税专用发票' },
  { label: '增值税普票', value: '增值税普票' },
  { label: '电子发票', value: '电子发票' },
]

export function supplierStatusColor(status) {
  const map = {
    启用: 'success',
    停用: 'default',
  }
  return map[status] || 'default'
}

export function formatSupplierRoles(roles = []) {
  if (!Array.isArray(roles) || !roles.length) return '—'
  return roles.join('、')
}
