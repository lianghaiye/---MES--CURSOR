import { cell, numCell } from './exportFieldHelpers'

export const salesOrderLineExportFields = [
  { key: 'orderNo', title: '销售单号', getValue: (row) => cell(row, 'orderNo') },
  { key: 'progressStatus', title: '订单状态', getValue: (row) => cell(row, 'progressStatus') },
  { key: 'customerName', title: '客户名称', getValue: (row) => cell(row, 'customerName') },
  { key: 'productName', title: '产品名称', getValue: (row) => cell(row, 'productName') },
  { key: 'productCode', title: '产品编码', getValue: (row) => cell(row, 'productCode') },
  { key: 'businessType', title: '业务类型', getValue: (row) => cell(row, 'businessType') },
  { key: 'productAttr', title: '产品属性', getValue: (row) => cell(row, 'productAttr') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'variantSummary', title: '变体属性', getValue: (row) => cell(row, 'variantSummary') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  { key: 'techParams', title: '技术参数', getValue: (row) => cell(row, 'techParams') },
  {
    key: 'matchingRequirements',
    title: '配套要求',
    getValue: (row) => cell(row, 'matchingRequirements'),
  },
  { key: 'salesQty', title: '销售数量', getValue: (row) => numCell(row.salesQty, 0) },
  { key: 'shippedQty', title: '已发数量', getValue: (row) => numCell(row.shippedQty, 0) },
  { key: 'unshippedQty', title: '未发数量', getValue: (row) => numCell(row.unshippedQty, 0) },
  {
    key: 'lineDeliveryStatus',
    title: '行发货状态',
    getValue: (row) => cell(row, 'lineDeliveryStatus'),
  },
  { key: 'deliveryMode', title: '交付方式', getValue: (row) => cell(row, 'deliveryMode') },
  {
    key: 'stockFulfillmentModeLabel',
    title: '库存履约',
    getValue: (row) => cell(row, 'stockFulfillmentModeLabel'),
  },
  { key: 'stockTakeQty', title: '现货占用', getValue: (row) => numCell(row.stockTakeQty, 0) },
  { key: 'planProduceQty', title: '排产数量', getValue: (row) => numCell(row.planProduceQty, 0) },
  { key: 'deliveryDate', title: '交货日期', getValue: (row) => cell(row, 'deliveryDate') },
  { key: 'unit', title: '单位', getValue: (row) => cell(row, 'unit') },
  { key: 'bomName', title: 'Bom名称', getValue: (row) => cell(row, 'bomName') },
  { key: 'bomVersion', title: 'Bom版本', getValue: (row) => cell(row, 'bomVersion') },
  {
    key: 'unitPriceExTax',
    title: '单价（不含税）',
    getValue: (row) => numCell(row.unitPriceExTax),
  },
  { key: 'unitPriceInTax', title: '单价（含税）', getValue: (row) => numCell(row.unitPriceInTax) },
  { key: 'taxRate', title: '税率(%)', getValue: (row) => numCell(row.taxRate, 0) },
  {
    key: 'totalPriceExTax',
    title: '总价（不含税）',
    getValue: (row) => numCell(row.totalPriceExTax),
  },
  {
    key: 'totalPriceInTax',
    title: '总价（含税）',
    getValue: (row) => numCell(row.totalPriceInTax),
  },
  {
    key: 'lineDiscountRate',
    title: '行折扣(%)',
    getValue: (row) => {
      const n = Number(row.lineDiscountRate)
      if (!Number.isFinite(n)) return ''
      if (n >= 0 && n <= 1) return String(Math.round(n * 10000) / 100)
      return String(n)
    },
  },
  {
    key: 'lineDiscountAmount',
    title: '行优惠金额',
    getValue: (row) => numCell(row.lineDiscountAmount),
  },
  { key: 'packagingForm', title: '包装形式', getValue: (row) => cell(row, 'packagingForm') },
  { key: 'supplementDesc', title: '补充说明', getValue: (row) => cell(row, 'supplementDesc') },
  { key: 'salesperson', title: '业务员', getValue: (row) => cell(row, 'salesperson') },
  { key: 'contractNo', title: '合同编号', getValue: (row) => cell(row, 'contractNo') },
  { key: 'createdAt', title: '创建时间', getValue: (row) => cell(row, 'createdAt') },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
]
