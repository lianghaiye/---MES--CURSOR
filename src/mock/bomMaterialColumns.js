/** BOM 物料清单列配置（列显隐 / 冻结 / 排序） */
export const defaultBomColumnSettings = [
  { key: 'materialCode', title: '物料编码', hidden: false, frozen: true, order: 0 },
  { key: 'itemName', title: '名称', hidden: false, frozen: true, order: 1 },
  { key: 'specModel', title: '规格型号', hidden: false, frozen: false, order: 2 },
  { key: 'categoryName', title: '物料类别', hidden: false, frozen: false, order: 3 },
  { key: 'materialType', title: '物料类型', hidden: false, frozen: false, order: 4 },
  { key: 'supplyForm', title: '供应型态', hidden: false, frozen: false, order: 5 },
  { key: 'material', title: '材质', hidden: false, frozen: false, order: 6 },
  { key: 'unitQty', title: '单位用量', hidden: false, frozen: false, order: 7 },
  { key: 'unit', title: '单位', hidden: false, frozen: false, order: 8 },
  { key: 'childBom', title: '子件BOM', hidden: false, frozen: false, order: 9 },
  { key: 'childBomVersion', title: '子件BOM版本', hidden: false, frozen: false, order: 10 },
  { key: 'processDocName', title: '工艺文件名称', hidden: false, frozen: false, order: 11 },
  { key: 'lossRate', title: '子件损耗率(%)', hidden: false, frozen: false, order: 12 },
  { key: 'processRoute', title: '工艺路线', hidden: false, frozen: false, order: 13 },
  { key: 'unitPrice', title: '物料单价', hidden: false, frozen: false, order: 14 },
  { key: 'effectiveStart', title: '有效开始日期', hidden: false, frozen: false, order: 15 },
  { key: 'effectiveEnd', title: '有效结束日期', hidden: false, frozen: false, order: 16 },
  { key: 'remark', title: '备注', hidden: false, frozen: false, order: 17 },
]

export const bomTypeOptions = ['基础BOM', '订单BOM', '配置BOM']

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
