/** 入库明细列定义（新增/编辑表单与详情页共用） */

export const inboundFormLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'lineStatus', dataIndex: 'lineStatus', width: 88 },
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
  { title: '条码类型', dataIndex: 'barcodeType', key: 'barcodeType', width: 96 },
  /** 数量与单位合并展示，如「3 根」 */
  { title: '入库数量', key: 'qty', width: 120 },
  /** 双单位时的库存量，如「36 米」；单单位同入库数量 */
  { title: '库存数量', key: 'stockUnitQty', width: 130 },
  /** 有结算单位时展示，如「55.5 kg」 */
  { title: '结算数量', key: 'settleQty', width: 120 },
  { title: '入库仓库', key: 'warehouse', width: 120 },
  { title: '货位号', key: 'locationNo', dataIndex: 'locationNo', width: 110, ellipsis: true },
  { title: '单价', key: 'unitPrice', width: 96, align: 'right' },
  { title: '总价', key: 'totalPrice', width: 96, align: 'right' },
  { title: '当前库存数', key: 'stockQty', width: 120, align: 'right' },
  { title: '当前仓库数量', key: 'warehouseStockQty', width: 130, align: 'right' },
  { title: '操作', key: 'actions', width: 220 },
]

export const inboundDetailLineColumns = inboundFormLineColumns.filter((c) => c.key !== 'actions')

/** 库存数量列提示文案 */
export const STOCK_UNIT_QTY_TIP =
  '一类一码/一批一码：可直接填库存合计。一物一码：填统一单件量（钢管=长度；板材请点「编辑」填长×宽换算面积）；每件不同也请点编辑逐件/逐张填写'

/** 结算数量列提示 */
export const SETTLE_QTY_TIP =
  '仅当物料结算单位与库存单位不同时填写（如库存按件/米、结算按 kg）。用于与供应商计价；未启用结算单位时本列为空。'
