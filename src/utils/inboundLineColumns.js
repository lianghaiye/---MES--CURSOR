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
  /** 点收数量：按采购单位计，如「3 根」；单单位时与入库数量同值 */
  { title: '点收数量', key: 'qty', width: 120 },
  /** 入库数量：按库存单位入账，如「36 米」；单单位同点收数量 */
  { title: '入库数量', key: 'stockUnitQty', width: 130 },
  /** 有结算单位时展示，如「55.5 kg」 */
  { title: '结算数量', key: 'settleQty', width: 150 },
  { title: '入库仓库', key: 'warehouse', width: 120 },
  { title: '货位号', key: 'locationNo', dataIndex: 'locationNo', width: 110, ellipsis: true },
  { title: '入库成本价', key: 'unitPrice', width: 120, align: 'right' },
  { title: '总价', key: 'totalPrice', width: 96, align: 'right' },
  { title: '当前库存数', key: 'stockQty', width: 120, align: 'right' },
  { title: '当前仓库数量', key: 'warehouseStockQty', width: 130, align: 'right' },
  { title: '操作', key: 'actions', width: 200 },
]

export const inboundDetailLineColumns = inboundFormLineColumns.filter((c) => c.key !== 'actions')

/** 点收数量列提示 */
export const RECEIVE_QTY_TIP =
  '按采购单位点收。采购单位≠库存单位时，库存入账以「入库数量」为准；采购单位=库存单位时，点收数量即入库数量。'

/** 入库数量列提示文案（库存单位入账量） */
export const STOCK_UNIT_QTY_TIP =
  '采购单位≠库存单位时，按库存单位填写的实际入账量。一批一码/一类一码：默认填合计，生成一个批次；一物一码：默认填单件数量，每个数量各生成一个批次。'

/** 结算数量列提示 */
export const SETTLE_QTY_TIP =
  '仅当物料结算单位≠库存单位时填写，本列展示结算数量合计。编辑明细可选三种录入：统一单件 = 单件结算数量 × 入库件数；逐件 = 各件结算数量之和；直接填合计 = 合计数量。列表里直接改本列，按合计保存。'

/** 入库成本价列提示 */
export const INBOUND_COST_PRICE_TIP =
  '入库的成本价。仅库存单位时，总价 = 入库成本价 × 入库数量。采购单位≠库存单位时，入库数量按录入方式合计：统一单件 = 单件数量 × 入库件数；逐件 = 各件数量之和；直接填合计 = 合计数量。有结算单位时，总价 = 入库成本价 × 结算数量合计。结算数量同样支持统一单件、逐件、直接填合计，与入库数量的录入方式分开。'
