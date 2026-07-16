import { cell, numCell } from './exportFieldHelpers'

import { DISCOUNT_STRATEGY_LABELS } from '@/utils/salesOrderPricing'

function formatDate(val) {
  if (!val) return ''
  return String(val).slice(0, 10)
}

export const salesOrderExportFields = [
  { key: 'orderNo', title: '销售单号', getValue: (row) => cell(row, 'orderNo') },
  { key: 'customerName', title: '客户名称', getValue: (row) => cell(row, 'customerName') },
  { key: 'progressStatus', title: '进度状态', getValue: (row) => cell(row, 'progressStatus') },
  { key: 'totalQty', title: '销售数量', getValue: (row) => numCell(row.totalQty, 0) },
  { key: 'contractNo', title: '合同编号', getValue: (row) => cell(row, 'contractNo') },
  { key: 'deliveryMethod', title: '交货方式', getValue: (row) => cell(row, 'deliveryMethod') },
  { key: 'deliveryStatus', title: '发货状态', getValue: (row) => cell(row, 'deliveryStatus') },
  {
    key: 'totalIssuedQty',
    title: '发货数量',
    getValue: (row) => numCell(row.totalIssuedQty, 0),
  },
  {
    key: 'lineAmountExTax',
    title: '销售金额（不含税）',
    getValue: (row) =>
      numCell(
        row.lineListAmountExTax ?? Number(row.lineAmountExTax) + Number(row.lineDiscountTotal || 0),
      ),
  },
  {
    key: 'lineAmountInTax',
    title: '销售金额（含税）',
    getValue: (row) => numCell(row.lineAmountInTax ?? row.orderAmount),
  },
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
    key: 'amountExTax',
    title: '最终成交额（不含税）',
    getValue: (row) => numCell(row.amountExTax),
  },
  {
    key: 'amountInTax',
    title: '最终成交额（含税）',
    getValue: (row) => numCell(row.amountInTax ?? row.orderAmount),
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
  { key: 'createdAt', title: '创建日期', getValue: (row) => formatDate(row.createdAt) },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
  { key: 'approvedAt', title: '审核日期', getValue: (row) => formatDate(row.approvedAt) },
  { key: 'approver', title: '审核人', getValue: (row) => cell(row, 'approver') },
]
