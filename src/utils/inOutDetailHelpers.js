import { inboundStatusOptions } from '@/mock/inboundOptions'
import { outboundStatusOptions } from '@/mock/outboundOptions'
import { getInboundOrderById } from '@/store/inboundOrderStore'
import { getOutboundOrderById } from '@/store/outboundStore'

/** 出入库详情页「单据状态」下拉：入库 + 出库状态去重合并 */
export const inOutDocStatusOptions = [
  ...new Set([...inboundStatusOptions, ...outboundStatusOptions]),
]

export function inOutDocStatusColor(status) {
  const map = {
    待审批: 'warning',
    待处理: 'processing',
    待出库: 'processing',
    待申领人确认: 'warning',
    已完成: 'success',
    已出库: 'success',
    已拒绝: 'error',
    拒绝领料: 'error',
  }
  return map[status] || 'default'
}

/** 从关联出入库单头解析单据状态 */
export function resolveInOutDocStatus(row) {
  if (!row) return ''
  if (row.businessType === '入库单' && row.headerId) {
    const order = getInboundOrderById(row.headerId)
    if (order?.status) return order.status
  }
  if (row.businessType === '出库单' && row.headerId) {
    const order = getOutboundOrderById(row.headerId)
    if (order?.status) return order.status
  }
  return row.docStatus || ''
}

export function enrichInOutDetailRow(row) {
  return {
    ...row,
    docStatus: resolveInOutDocStatus(row),
  }
}
