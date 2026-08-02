/** 出库明细列定义（新增/编辑表单与详情页共用） */

/** 仅销售出库展示的明细列 */
export const OUTBOUND_SALES_ONLY_LINE_KEYS = ['packagingForm', 'deliveryRemark']

/** 销售出库隐藏的明细列（领料/发料出库展示） */
export const OUTBOUND_NON_SALES_LINE_KEYS = ['blankSizeText']

export const outboundFormLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', key: 'itemCode', width: 120, ellipsis: true },
  { title: '物品名称', dataIndex: 'itemName', key: 'itemName', width: 130, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    dataIndex: 'variantSummary',
    key: 'variantAttr',
    width: 140,
    ellipsis: true,
  },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 90, ellipsis: true },
  {
    title: '下料尺寸',
    dataIndex: 'blankSizeText',
    key: 'blankSizeText',
    width: 160,
    ellipsis: true,
  },
  { title: '条码类型', dataIndex: 'barcodeType', key: 'barcodeType', width: 96 },
  { title: '当前库存数', key: 'stockQty', width: 120, align: 'right' },
  { title: '当前仓库数量', key: 'warehouseStockQty', width: 130, align: 'right' },
  { title: '仓库', key: 'shipWarehouse', width: 120 },
  { title: '货位号', key: 'locationNo', dataIndex: 'locationNo', width: 110, ellipsis: true },
  { title: '出库数量', key: 'shipQty', width: 96 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 64 },
  { title: '拣选批次', key: 'batchPick', width: 260 },
  {
    title: '包装形式',
    dataIndex: 'packagingForm',
    key: 'packagingForm',
    width: 96,
    ellipsis: true,
  },
  { title: '发货备注', key: 'deliveryRemark', width: 140, ellipsis: true },
  { title: '单价', key: 'unitPrice', width: 96, align: 'right' },
  { title: '总价', key: 'totalPrice', width: 96, align: 'right' },
  { title: '操作', key: 'actions', width: 150 },
]

export const outboundDetailLineColumns = outboundFormLineColumns.filter((c) => c.key !== 'actions')

/** 按出库类型过滤明细列（非销售出库隐藏包装形式、发货备注；销售出库隐藏下料尺寸） */
export function filterOutboundLineColumns(columns, outboundType) {
  const list = Array.isArray(columns) ? columns : []
  if (outboundType === '销售出库') {
    return list.filter((c) => !OUTBOUND_NON_SALES_LINE_KEYS.includes(c.key))
  }
  return list.filter((c) => !OUTBOUND_SALES_ONLY_LINE_KEYS.includes(c.key))
}

/** 拣选批次列提示 */
export const OUTBOUND_BATCH_PICK_TIP_MANUAL =
  '自主拣选：先填写出库数量，再多选批次（或点「搜索更多」按入库时间筛选）。系统按所选批次「余量小优先」跨批扣减；出库数量大于所选批次合计时拦截。允许跨批次扣减。'

export const OUTBOUND_BATCH_PICK_TIP_AUTO =
  '默认先进先出+优先整批+余料优先：填写出库数量，确认时自动扣批。可点「自主拣选」指定批次；自主拣选时优先扣数量小的批次，并允许跨批。'

/** @deprecated 兼容旧引用，等同自主拣选提示 */
export const OUTBOUND_BATCH_PICK_TIP = OUTBOUND_BATCH_PICK_TIP_MANUAL

const BATCH_ATTR_LABELS = {
  material: '材质',
  specModel: '规格型号',
  inboundEntryMode: '入库方式',
  length: '长度',
  weight: '重量',
}

/** 批次 attrs 展示文案（确认出库回写等仍可用） */
export function formatBatchAttrsText(attrs) {
  if (!attrs || typeof attrs !== 'object') return ''
  const parts = []
  Object.entries(attrs).forEach(([key, val]) => {
    if (val == null || val === '') return
    if (key === 'inboundEntryMode') return
    const label = BATCH_ATTR_LABELS[key] || key
    parts.push(`${label}:${val}`)
  })
  return parts.join('；')
}
