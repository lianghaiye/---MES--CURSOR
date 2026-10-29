import { cell, numCell } from './exportFieldHelpers'

export const purchaseSettleExportFields = [
  { key: 'status', title: '状态', getValue: (row) => cell(row, 'status') },
  { key: 'settleNo', title: '对账单号', getValue: (row) => cell(row, 'settleNo') },
  { key: 'supplier', title: '供应商', getValue: (row) => cell(row, 'supplier') },
  { key: 'periodKey', title: '账期', getValue: (row) => cell(row, 'periodKey') },
  { key: 'settleDate', title: '对账日期', getValue: (row) => cell(row, 'settleDate') },
  {
    key: 'bookAmount',
    title: '账面金额',
    getValue: (row) => numCell(row.bookAmount ?? row.totalAmount),
  },
  {
    key: 'confirmedAmount',
    title: '确认金额',
    getValue: (row) => numCell(row.confirmedAmount ?? row.bookAmount ?? row.totalAmount),
  },
  {
    key: 'invoiceStatus',
    title: '收票状态',
    getValue: (row) => cell(row, 'invoiceStatus') || '未收票',
  },
  { key: 'invoiceNo', title: '发票号码', getValue: (row) => cell(row, 'invoiceNo') },
  {
    key: 'invoiceAmount',
    title: '累计票面',
    getValue: (row) => numCell(row.invoiceAmount),
  },
  {
    key: 'paidAmount',
    title: '已付金额',
    getValue: (row) => numCell(row.paidAmount),
  },
  {
    key: 'paymentStatus',
    title: '付款状态',
    getValue: (row) => cell(row, 'paymentStatus') || '未付款',
  },
  {
    key: 'plannedPaymentDate',
    title: '计划付款日',
    getValue: (row) => cell(row, 'plannedPaymentDate'),
  },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
  { key: 'createdAt', title: '创建时间', getValue: (row) => cell(row, 'createdAt') },
]

export const purchaseSettleLineExportFields = [
  { key: 'settleNo', title: '对账单号', getValue: (row) => cell(row, 'settleNo') },
  { key: 'supplier', title: '供应商', getValue: (row) => cell(row, 'supplier') },
  { key: 'source', title: '来源', getValue: (row) => cell(row, 'source') },
  { key: 'sourceDocNo', title: '来源单号', getValue: (row) => cell(row, 'sourceDocNo') },
  { key: 'purchaseOrderNo', title: '采购单号', getValue: (row) => cell(row, 'purchaseOrderNo') },
  { key: 'itemCode', title: '物料编码', getValue: (row) => cell(row, 'itemCode') },
  { key: 'itemName', title: '物料名称', getValue: (row) => cell(row, 'itemName') },
  { key: 'settleQty', title: '结算数量', getValue: (row) => numCell(row.settleQty) },
  { key: 'settleUnit', title: '单位', getValue: (row) => cell(row, 'settleUnit') },
  { key: 'unitPrice', title: '单价', getValue: (row) => numCell(row.unitPrice) },
  { key: 'amount', title: '金额', getValue: (row) => numCell(row.amount) },
  { key: 'lineConfirm', title: '行确认额', getValue: (row) => numCell(row.lineConfirm) },
  { key: 'remark', title: '备注', getValue: (row) => cell(row, 'remark') },
]
