import { cell } from './exportFieldHelpers'
import {
  formatPurchaseDetailDate,
  formatPurchaseDetailMoney,
  formatPurchaseDetailQty,
} from '@/utils/purchaseDetailLines'

export const purchaseDetailExportFields = [
  { key: 'orderNo', title: '采购单号', getValue: (row) => cell(row, 'orderNo') },
  { key: 'productName', title: '产品名称', getValue: (row) => cell(row, 'productName') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  {
    key: 'purchaseQty',
    title: '采购数量',
    getValue: (row) => formatPurchaseDetailQty(row.purchaseQty),
  },
  {
    key: 'unitPriceExTax',
    title: '采购单价（不含税）',
    getValue: (row) => formatPurchaseDetailMoney(row.unitPriceExTax),
  },
  {
    key: 'taxRate',
    title: '税率',
    getValue: (row) => (row.taxRate != null && row.taxRate !== '' ? `${row.taxRate}%` : ''),
  },
  {
    key: 'unitPriceInTax',
    title: '采购单价（含税）',
    getValue: (row) => formatPurchaseDetailMoney(row.unitPriceInTax),
  },
  {
    key: 'totalPriceInTax',
    title: '总价（含税）',
    getValue: (row) => formatPurchaseDetailMoney(row.totalPriceInTax),
  },
  {
    key: 'totalPriceExTax',
    title: '总价（不含税）',
    getValue: (row) => formatPurchaseDetailMoney(row.totalPriceExTax),
  },
  {
    key: 'receivingWarehouse',
    title: '收货仓库',
    getValue: (row) => cell(row, 'receivingWarehouse'),
  },
  {
    key: 'receivedQty',
    title: '入库数量',
    getValue: (row) => formatPurchaseDetailQty(row.receivedQty),
  },
  {
    key: 'deliveryDate',
    title: '交货日期',
    getValue: (row) => formatPurchaseDetailDate(row.deliveryDate),
  },
  {
    key: 'inboundDate',
    title: '入库日期',
    getValue: (row) => cell(row, 'inboundDate'),
  },
  { key: 'workOrderNo', title: '关联工单号', getValue: (row) => cell(row, 'workOrderNo') },
  { key: 'salesOrderNo', title: '关联销售单号', getValue: (row) => cell(row, 'salesOrderNo') },
  { key: 'purchaser', title: '采购员', getValue: (row) => cell(row, 'purchaser') },
]
