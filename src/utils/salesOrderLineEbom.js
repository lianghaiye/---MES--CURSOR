import { salesOrderState } from '@/store/salesOrderStore'
import { buildEbomSnapshotFromEbomRecord } from '@/utils/ebomSnapshot'

/** 设计任务审核通过后回写销售订单行 EBOM 快照 */
export function applyEbomSnapshotToSalesLine(salesOrderNo, salesLineId, ebom, salesQty = 1) {
  const order = salesOrderState.orders.find((o) => o.orderNo === salesOrderNo)
  if (!order) return { ok: false, message: '销售订单不存在' }
  const line = (order.lineItems || []).find((l) => l.id === salesLineId)
  if (!line) return { ok: false, message: '销售明细不存在' }

  const snapshot = buildEbomSnapshotFromEbomRecord(ebom, Number(salesQty) || 1)
  line.ebomSnapshot = snapshot
  line.bomId = ''
  line.bomName = ebom.ebomName || ''
  line.bomVersion = ebom.version || ''
  return { ok: true, line, snapshot }
}
