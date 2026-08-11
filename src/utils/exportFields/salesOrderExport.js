import { cell, numCell } from './exportFieldHelpers'

import { DISCOUNT_STRATEGY_LABELS } from '@/utils/salesOrderPricing'

function formatDateTime(val) {
  if (!val) return ''
  return String(val)
}

export const salesOrderExportFields = [
  { key: 'progressStatus', title: '状态', getValue: (row) => cell(row, 'progressStatus') },
  { key: 'orderNo', title: '销售单号', getValue: (row) => cell(row, 'orderNo') },
  { key: 'customerName', title: '客户名称', getValue: (row) => cell(row, 'customerName') },
  { key: 'deliveryStatus', title: '发货状态', getValue: (row) => cell(row, 'deliveryStatus') },
  { key: 'totalQty', title: '销售数量', getValue: (row) => numCell(row.totalQty, 0) },
  {
    key: 'totalIssuedQty',
    title: '发货数量',
    getValue: (row) => numCell(row.totalIssuedQty, 0),
  },
  {
    key: 'lineAmountInTax',
    title: '销售总额（含税）',
    getValue: (row) => numCell(row.lineAmountInTax ?? row.orderAmount),
  },
  {
    key: 'lineAmountExTax',
    title: '销售总额（不含税）',
    getValue: (row) => numCell(row.lineAmountExTax),
  },
  { key: 'contractNo', title: '合同编号', getValue: (row) => cell(row, 'contractNo') },
  { key: 'deliveryMethod', title: '交货方式', getValue: (row) => cell(row, 'deliveryMethod') },
  {
    key: 'discountStrategy',
    title: '优惠策略',
    getValue: (row) => DISCOUNT_STRATEGY_LABELS[row.discountStrategy] || row.discountStrategy || '',
  },
  {
    key: 'totalDiscountAmount',
    title: '优惠总额',
    getValue: (row) => numCell(row.totalDiscountAmount),
  },
  {
    key: 'amountInTax',
    title: '最终成交额（含税）',
    getValue: (row) => numCell(row.amountInTax ?? row.orderAmount),
  },
  {
    key: 'amountExTax',
    title: '最终成交额（不含税）',
    getValue: (row) => numCell(row.amountExTax),
  },
  { key: 'urgency', title: '紧急度', getValue: (row) => cell(row, 'urgency') },
  { key: 'salesperson', title: '业务员', getValue: (row) => cell(row, 'salesperson') },
  { key: 'inventoryStatus', title: '库存状态', getValue: (row) => cell(row, 'inventoryStatus') },
  { key: 'settlementType', title: '结算类型', getValue: (row) => cell(row, 'settlementType') },
  { key: 'paymentRatio', title: '付款比例', getValue: (row) => cell(row, 'paymentRatio') },
  {
    key: 'downPaymentAmount',
    title: '首付金额',
    getValue: (row) => numCell(row.downPaymentAmount),
  },
  { key: 'salesChannel', title: '销售渠道', getValue: (row) => cell(row, 'salesChannel') },
  { key: 'region', title: '所属区域', getValue: (row) => cell(row, 'region') },
  { key: 'orderSource', title: '订单来源', getValue: (row) => cell(row, 'orderSource') },
  { key: 'createdAt', title: '创建时间', getValue: (row) => formatDateTime(row.createdAt) },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
  { key: 'approvedAt', title: '审核时间', getValue: (row) => formatDateTime(row.approvedAt) },
  { key: 'approver', title: '审核人', getValue: (row) => cell(row, 'approver') },
  {
    key: 'updatedAt',
    title: '最近更新时间',
    getValue: (row) => formatDateTime(row.updatedAt || row.createdAt),
  },
  {
    key: 'updater',
    title: '更新人',
    getValue: (row) => cell(row, 'updater') || cell(row, 'creator'),
  },
]
