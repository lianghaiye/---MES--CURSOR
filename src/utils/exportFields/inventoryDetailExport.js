import { cell } from './exportFieldHelpers'
import { formatInventoryMoney, formatInventoryQtyWithUnit } from '@/utils/inventoryDetailLines'

export const inventoryDetailExportFields = [
  { key: 'warehouse', title: '所属仓库', getValue: (row) => cell(row, 'warehouse') },
  {
    key: 'ownership',
    title: '归属',
    getValue: (row) => (row.dedicated || row.salesOrderNo || row.salesOrderId ? '按单' : '自由'),
  },
  { key: 'itemName', title: '产品名称', getValue: (row) => cell(row, 'itemName') },
  { key: 'itemCode', title: '产品编码', getValue: (row) => cell(row, 'itemCode') },
  { key: 'materialType', title: '类型', getValue: (row) => cell(row, 'materialType') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'variantSummary', title: '变体属性', getValue: (row) => cell(row, 'variantSummary') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  {
    key: 'stockQty',
    title: '数量',
    getValue: (row) => formatInventoryQtyWithUnit(row.stockQty, row.unit),
  },
  {
    key: 'salesOrderNo',
    title: '销售订单号',
    getValue: (row) => cell(row, 'salesOrderNo') || '—',
  },
  {
    key: 'softAllocated',
    title: '软占用',
    getValue: (row) => formatInventoryQtyWithUnit(row.softAllocated, row.unit),
  },
  {
    key: 'availableQty',
    title: '可用',
    getValue: (row) => formatInventoryQtyWithUnit(row.availableQty, row.unit),
  },
  { key: 'locationNo', title: '库位', getValue: (row) => cell(row, 'locationNo') },
  {
    key: 'unitPrice',
    title: '成本单价（批次加权）',
    getValue: (row) => formatInventoryMoney(row.unitPrice),
  },
  {
    key: 'totalAmount',
    title: '库存总金额（批次实际成本）',
    getValue: (row) => formatInventoryMoney(row.totalAmount),
  },
]
