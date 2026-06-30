/** BOM 物料清单列配置（列显隐 / 冻结 / 排序） */
export const defaultBomColumnSettings = [
  { key: 'itemName', title: '子项名称', hidden: false, frozen: true, order: 0 },
  { key: 'specModel', title: '规格型号', hidden: false, frozen: true, order: 1 },
  { key: 'materialCode', title: '子项编码', hidden: false, frozen: false, order: 2 },
  { key: 'material', title: '材质', hidden: false, frozen: false, order: 3 },
  { key: 'drawingNo', title: '图号', hidden: false, frozen: false, order: 4 },
  { key: 'unitQty', title: '单位用量', hidden: false, frozen: false, order: 5 },
  { key: 'unit', title: '单位', hidden: false, frozen: false, order: 6 },
  { key: 'supplyForm', title: '供应型态', hidden: false, frozen: false, order: 7 },
  { key: 'categoryName', title: '物料类别', hidden: false, frozen: false, order: 8 },
  { key: 'materialType', title: '物料类型', hidden: false, frozen: false, order: 9 },
  { key: 'remark', title: '备注', hidden: false, frozen: false, order: 10 },
  { key: 'substitutePart', title: '替代件', hidden: false, frozen: false, order: 11 },
  { key: 'childBom', title: '子件BOM', hidden: false, frozen: false, order: 12 },
  { key: 'processRoute', title: '工艺路线', hidden: false, frozen: false, order: 13 },
  { key: 'processDocName', title: '工艺文件', hidden: false, frozen: false, order: 14 },
  { key: 'unitPrice', title: '单价', hidden: false, frozen: false, order: 15 },
]

/** 子件 BOM 展示：BOM 名称 + 版本号 */
export function formatChildBomLabel(line) {
  if (!line) return ''
  const name = String(line.childBom || '').trim()
  const version = String(line.childBomVersion || '').trim()
  if (name && version) return `${name} ${version}`
  return name || version || ''
}

/** 替代件展示：编码 + 名称 */
export function formatSubstitutePartLabel(line) {
  if (!line) return ''
  const code = String(line.substituteCode || '').trim()
  const name = String(line.substituteName || '').trim()
  if (code && name) return `[${code}] ${name}`
  return name || code || ''
}

export const bomTypeOptions = ['基准BOM', '订单BOM', '配置BOM']

export const bomTypeSelectOptions = bomTypeOptions.map((v) => ({ label: v, value: v }))

/** EBOM 设计专用，产品 BOM 新增/编辑不展示此选项 */
export const EBOM_TYPE_VALUE = 'EBOM'

export const unitOptions = ['个', '件', '套', '根', '台']

export const processDocOptions = [
  { label: '机加工艺-泵体', value: '机加工艺-泵体' },
  { label: '装配工艺-泵头', value: '装配工艺-泵头' },
  { label: '检验规程-整机', value: '检验规程-整机' },
]

export const processRouteOptions = [
  { label: '机加标准路线', value: '机加标准路线' },
  { label: '装配标准路线', value: '装配标准路线' },
]
