import { cell } from './exportFieldHelpers'
import {
  formatOutsourcingDetailDate,
  formatOutsourcingDetailMoney,
  formatOutsourcingDetailQty,
} from '@/utils/outsourcingDetailLines'

export const outsourcingDetailExportFields = [
  { key: 'status', title: '单据状态', getValue: (row) => cell(row, 'status') },
  { key: 'orderNo', title: '外协单号', getValue: (row) => cell(row, 'orderNo') },
  { key: 'supplier', title: '供应商', getValue: (row) => cell(row, 'supplier') },
  { key: 'inboundProgress', title: '入库进度', getValue: (row) => cell(row, 'inboundProgress') },
  { key: 'productName', title: '产品名称', getValue: (row) => cell(row, 'productName') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  {
    key: 'planQty',
    title: '计划数量',
    getValue: (row) => formatOutsourcingDetailQty(row.planQty),
  },
  {
    key: 'unitPriceExTax',
    title: '单价（不含税）',
    getValue: (row) => formatOutsourcingDetailMoney(row.unitPriceExTax),
  },
  {
    key: 'taxRate',
    title: '税率',
    getValue: (row) => (row.taxRate != null && row.taxRate !== '' ? `${row.taxRate}%` : ''),
  },
  {
    key: 'unitPriceInTax',
    title: '单价（含税）',
    getValue: (row) => formatOutsourcingDetailMoney(row.unitPriceInTax),
  },
  {
    key: 'totalPriceInTax',
    title: '总价（含税）',
    getValue: (row) => formatOutsourcingDetailMoney(row.totalPriceInTax),
  },
  {
    key: 'totalPriceExTax',
    title: '总价（不含税）',
    getValue: (row) => formatOutsourcingDetailMoney(row.totalPriceExTax),
  },
  {
    key: 'receivingWarehouse',
    title: '收货仓库',
    getValue: (row) => cell(row, 'receivingWarehouse'),
  },
  {
    key: 'receivedQty',
    title: '入库数量',
    getValue: (row) => formatOutsourcingDetailQty(row.receivedQty),
  },
  {
    key: 'deliveryDate',
    title: '计划交期',
    getValue: (row) => formatOutsourcingDetailDate(row.deliveryDate),
  },
  {
    key: 'inboundDate',
    title: '入库日期',
    getValue: (row) => cell(row, 'inboundDate'),
  },
  { key: 'workOrderName', title: '关联工单', getValue: (row) => cell(row, 'workOrderName') },
  { key: 'salesOrderNo', title: '关联销售单号', getValue: (row) => cell(row, 'salesOrderNo') },
  { key: 'contactPerson', title: '联系人', getValue: (row) => cell(row, 'contactPerson') },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
  { key: 'createdAt', title: '创建时间', getValue: (row) => cell(row, 'createdAt') },
]
