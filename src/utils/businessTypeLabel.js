/** 产品表单业务能力勾选项 */
export const PRODUCT_BUSINESS_TYPE_OPTIONS = [
  { key: 'canSell', label: '可销售' },
  { key: 'isWholeMachine', label: '整机' },
  { key: 'isPart', label: '零部件' },
  { key: 'canPurchase', label: '可采购' },
  { key: 'canOutsource', label: '可外协' },
]

/** 物料表单业务能力勾选项 */
export const MATERIAL_BUSINESS_TYPE_OPTIONS = [
  { key: 'canSell', label: '可销售' },
  { key: 'canProduce', label: '可生产' },
  { key: 'canPurchase', label: '可采购' },
  { key: 'canOutsource', label: '可外协' },
]

/** 统一主数据列表/表单业务能力（去重联合枚举） */
export const MASTER_BUSINESS_TYPE_OPTIONS = [
  { key: 'canSell', label: '可销售' },
  { key: 'canProduce', label: '可生产' },
  { key: 'isWholeMachine', label: '整机' },
  { key: 'isPart', label: '零部件' },
  { key: 'canPurchase', label: '可采购' },
  { key: 'canOutsource', label: '可外协' },
]

/** 拼接已勾选的业务类型，仅展示勾选项 */
export function formatBusinessTypeLabels(record, options = PRODUCT_BUSINESS_TYPE_OPTIONS) {
  if (!record) return '—'
  const labels = options.filter(({ key }) => Boolean(record[key])).map(({ label }) => label)
  return labels.length ? labels.join('、') : '—'
}

/** 列表筛选：按业务能力勾选项 key 匹配 */
export function matchesBusinessTypeFilter(
  record,
  filterKey,
  options = PRODUCT_BUSINESS_TYPE_OPTIONS,
) {
  if (!filterKey) return true
  const opt = options.find((o) => o.key === filterKey)
  return opt ? Boolean(record?.[opt.key]) : true
}
