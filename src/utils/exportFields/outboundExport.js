import { calcOutboundShipQty } from '@/mock/outboundOrders'
import { cell } from './exportFieldHelpers'

function formatQty(val) {
  if (val == null || val === '') return ''
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function sourceChannelLabel(channel) {
  if (channel === 'mini-program') return '小程序'
  return 'WEB'
}

export const outboundExportFields = [
  { key: 'status', title: '状态', getValue: (row) => cell(row, 'status') },
  { key: 'docNo', title: '出库单号', getValue: (row) => cell(row, 'docNo') },
  { key: 'outboundType', title: '出库类型', getValue: (row) => cell(row, 'outboundType') },
  {
    key: 'sourceChannel',
    title: '来源',
    getValue: (row) => sourceChannelLabel(row.sourceChannel),
  },
  { key: 'warehouse', title: '出库仓库', getValue: (row) => cell(row, 'warehouse') },
  {
    key: 'shipQtyTotal',
    title: '出库数量',
    getValue: (row) => formatQty(calcOutboundShipQty(row)),
  },
  { key: 'sourceOrderNo', title: '源单号', getValue: (row) => cell(row, 'sourceOrderNo') },
  { key: 'salesOrderNo', title: '销售订单', getValue: (row) => cell(row, 'salesOrderNo') },
  { key: 'contractNo', title: '合同编号', getValue: (row) => cell(row, 'contractNo') },
  { key: 'requisitionDept', title: '领用部门', getValue: (row) => cell(row, 'requisitionDept') },
  {
    key: 'totalWeight',
    title: '出库总重量',
    getValue: (row) => (row.totalWeight != null ? String(row.totalWeight) : ''),
  },
  { key: 'outboundTime', title: '出库时间', getValue: (row) => cell(row, 'outboundTime') },
  { key: 'createdAt', title: '创建时间', getValue: (row) => cell(row, 'createdAt') },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
  { key: 'auditDate', title: '审核时间', getValue: (row) => cell(row, 'auditDate') },
  { key: 'auditor', title: '审核人', getValue: (row) => cell(row, 'auditor') },
  { key: 'warehouseKeeper', title: '仓管员', getValue: (row) => cell(row, 'warehouseKeeper') },
  { key: 'workshop', title: '所在车间', getValue: (row) => cell(row, 'workshop') },
  { key: 'remark', title: '备注', getValue: (row) => cell(row, 'remark') },
]
