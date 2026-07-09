export const CUSTOMER_GRADE = {
  NORMAL: '普通',
  STRATEGIC: '战略',
  CORE: '核心',
}

export const customerGradeOptions = [
  { label: CUSTOMER_GRADE.NORMAL, value: CUSTOMER_GRADE.NORMAL },
  { label: CUSTOMER_GRADE.STRATEGIC, value: CUSTOMER_GRADE.STRATEGIC },
  { label: CUSTOMER_GRADE.CORE, value: CUSTOMER_GRADE.CORE },
]

export const enterpriseScaleOptions = [
  { label: '大型', value: '大型' },
  { label: '中型', value: '中型' },
  { label: '小型', value: '小型' },
  { label: '微型', value: '微型' },
]

export const addressTypeOptions = [
  { label: '注册地址', value: '注册地址' },
  { label: '收货地址', value: '收货地址' },
  { label: '账单地址', value: '账单地址' },
  { label: '开票地址', value: '开票地址' },
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

export const currencyOptions = [
  { label: 'CNY', value: 'CNY' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
]

export const deliveryMethodOptions = [
  { label: '送货', value: '送货' },
  { label: '自提', value: '自提' },
  { label: '快递', value: '快递' },
  { label: '物流', value: '物流' },
]

export const freightBearerOptions = [
  { label: '买方', value: '买方' },
  { label: '卖方', value: '卖方' },
]

export const invoiceTypeOptions = [
  { label: '增值税专用发票', value: '增值税专用发票' },
  { label: '增值税普票', value: '增值税普票' },
  { label: '电子发票', value: '电子发票' },
]

export const customerDataStatusOptions = [
  { label: '草稿', value: '草稿' },
  { label: '待审', value: '待审' },
  { label: '已审', value: '已审' },
  { label: '作废', value: '作废' },
]

export function customerDataStatusColor(status) {
  const map = {
    草稿: 'default',
    待审: 'processing',
    已审: 'success',
    作废: 'error',
  }
  return map[status] || 'default'
}

export function customerGradeColor(grade) {
  const map = {
    普通: 'default',
    战略: 'blue',
    核心: 'gold',
  }
  return map[grade] || 'default'
}
