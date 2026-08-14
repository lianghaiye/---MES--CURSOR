/**
 * 成品/半成品入库 — 工单清单（对齐领料出库）
 */
import {
  OUTBOUND_WORK_ORDER_COLUMNS,
  enrichOutboundWorkOrderRow,
  findLinkedWorkOrder,
  snapshotWorkOrdersForOutbound,
} from '@/utils/outboundWorkOrders'

export const INBOUND_WORK_ORDER_COLUMNS = OUTBOUND_WORK_ORDER_COLUMNS

export const enrichInboundWorkOrderRow = enrichOutboundWorkOrderRow

export { findLinkedWorkOrder, snapshotWorkOrdersForOutbound as snapshotWorkOrdersForInbound }

export function isProductionInboundType(inboundType) {
  return inboundType === '成品入库' || inboundType === '半成品入库'
}

/** 从入库单解析工单清单（仅成品/半成品入库） */
export function resolveInboundWorkOrders(order) {
  if (!order || !isProductionInboundType(order.inboundType)) return []

  const fromOrder = Array.isArray(order.workOrders) ? order.workOrders : []
  if (fromOrder.length) {
    return fromOrder.map(enrichInboundWorkOrderRow)
  }

  // 兼容：仅有源单工单号时拼一条
  const code = String(order.sourceOrderNo || '').trim()
  if (code && !code.includes('、') && order.sourceType === '生产工单') {
    return [
      enrichInboundWorkOrderRow({
        code,
        productName: order.productName || order.lineItems?.[0]?.itemName || '',
        productCode: order.lineItems?.[0]?.itemCode || '',
      }),
    ]
  }

  return []
}
