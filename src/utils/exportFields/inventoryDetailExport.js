import { cell } from './exportFieldHelpers'
import { formatInventoryMoney, formatInventoryQtyWithUnit } from '@/utils/inventoryDetailLines'

export const inventoryDetailExportFields = [
  { key: 'warehouse', title: '所属仓库', getValue: (row) => cell(row, 'warehouse') },
  { key: 'itemName', title: '产品名称', getValue: (row) => cell(row, 'itemName') },
  { key: 'itemCode', title: '产品编码', getValue: (row) => cell(row, 'itemCode') },
  { key: 'materialType', title: '类型', getValue: (row) => cell(row, 'materialType') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'variantSummary', title: '变体属性', getValue: (row) => cell(row, 'variantSummary') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  {
    key: 'stockQty',
    title: '库存数量',
    getValue: (row) => formatInventoryQtyWithUnit(row.stockQty, row.unit),
  },
  {
    key: 'softAllocated',
    title: '软占用',
    getValue: (row) => formatInventoryQtyWithUnit(row.softAllocated, row.unit),
  },
  { key: 'locationNo', title: '库位', getValue: (row) => cell(row, 'locationNo') },
  {
    key: 'unitPrice',
    title: '单价',
    getValue: (row) => formatInventoryMoney(row.unitPrice),
  },
  {
    key: 'totalAmount',
    title: '库存总金额',
    getValue: (row) => formatInventoryMoney(row.totalAmount),
  },
]
