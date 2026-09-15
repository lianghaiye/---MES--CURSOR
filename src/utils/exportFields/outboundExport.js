import { formatNumber } from '@/utils/numberFormat'
import { formatOutboundQtyRatio } from '@/mock/outboundOrders'
import { outboundSourceLabel } from '@/mock/outboundOptions'
import { cell } from './exportFieldHelpers'

function formatQty(val) {
  return formatNumber(val, 4, { empty: '' })
}

export const outboundExportFields = [
  { key: 'status', title: '状态', getValue: (row) => cell(row, 'status') },
  { key: 'docNo', title: '出库单号', getValue: (row) => cell(row, 'docNo') },
  { key: 'outboundType', title: '出库类型', getValue: (row) => cell(row, 'outboundType') },
  { key: 'warehouse', title: '出库仓库', getValue: (row) => cell(row, 'warehouse') },
  {
    key: 'shipQtyTotal',
    title: '出库数量',
    getValue: (row) => formatOutboundQtyRatio(row, formatQty),
  },
  { key: 'sourceOrderNo', title: '源单号', getValue: (row) => cell(row, 'sourceOrderNo') },
  { key: 'salesOrderNo', title: '销售订单', getValue: (row) => cell(row, 'salesOrderNo') },
  { key: 'contractNo', title: '合同编号', getValue: (row) => cell(row, 'contractNo') },
  { key: 'requisitionDept', title: '申请部门', getValue: (row) => cell(row, 'requisitionDept') },
  { key: 'outboundTime', title: '出库时间', getValue: (row) => cell(row, 'outboundTime') },
  {
    key: 'sourceChannel',
    title: '来源',
    getValue: (row) => outboundSourceLabel(row.sourceChannel),
  },
  { key: 'createdAt', title: '创建时间', getValue: (row) => cell(row, 'createdAt') },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
  { key: 'auditDate', title: '操作时间', getValue: (row) => cell(row, 'auditDate') },
  { key: 'auditor', title: '操作人', getValue: (row) => cell(row, 'auditor') },
  { key: 'warehouseKeeper', title: '仓管员', getValue: (row) => cell(row, 'warehouseKeeper') },
  { key: 'remark', title: '备注', getValue: (row) => cell(row, 'remark') },
  {
    key: 'refuseReason',
    title: '拒绝理由',
    getValue: (row) => cell(row, 'refuseReason'),
  },
]
