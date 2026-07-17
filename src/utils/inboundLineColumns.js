/** 入库明细列定义（新增/编辑表单与详情页共用） */

export const inboundFormLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', key: 'itemCode', width: 120, ellipsis: true },
  { title: '物品名称', dataIndex: 'itemName', key: 'itemName', width: 130, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', key: 'specAttr', width: 90, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    dataIndex: 'variantSummary',
    key: 'variantAttr',
    width: 140,
    ellipsis: true,
  },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 90, ellipsis: true },
  { title: '入库数量', key: 'qty', width: 96 },
  { title: '入库仓库', key: 'warehouse', width: 120 },
  { title: '货位号', key: 'locationNo', dataIndex: 'locationNo', width: 110, ellipsis: true },
  { title: '重量', key: 'weight', width: 88 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 64 },
  { title: '单价', key: 'unitPrice', width: 96, align: 'right' },
  { title: '总价', key: 'totalPrice', width: 96, align: 'right' },
  { title: '当前库存数', key: 'stockQty', width: 100, align: 'right' },
  { title: '当前仓库数量', key: 'warehouseStockQty', width: 110, align: 'right' },
  { title: '操作', key: 'actions', width: 150 },
]

export const inboundDetailLineColumns = inboundFormLineColumns.filter((c) => c.key !== 'actions')
