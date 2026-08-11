/**
 * 采购/外协订单关联的入库质检记录（演示：由收货单派生）
 */
import { purchaseReceiptState } from '@/store/purchaseReceiptStore'
import { outsourcingReceiptState } from '@/store/outsourcingReceiptStore'

function mapQcRow(r) {
  return {
    id: r.qcId || `iqc-${r.id}`,
    qcNo: r.qcNo || '',
    qcStatus: r.qcStatus || '未质检',
    qcResult: r.qcResult || '',
    inspector: r.inspector || '',
    inspectedAt: r.inspectedAt || r.qcTime || '',
    receiptId: r.id,
    receiptNo: r.receiptNo || '',
  }
}

function isRelatedPurchaseReceipt(receipt, po) {
  if (!po || !receipt) return false
  return (
    (po.id && receipt.purchaseOrderId === po.id) ||
    (po.orderNo && receipt.purchaseOrderNo === po.orderNo)
  )
}

function isRelatedOutsourcingReceipt(receipt, order) {
  if (!order || !receipt) return false
  return (
    (order.id &&
      (receipt.outsourcingOrderId === order.id || receipt.purchaseOrderId === order.id)) ||
    (order.orderNo &&
      (receipt.outsourcingOrderNo === order.orderNo || receipt.purchaseOrderNo === order.orderNo))
  )
}

export function listInboundQcForPurchaseOrder(po) {
  if (!po) return []
  void purchaseReceiptState.receipts
  return (purchaseReceiptState.receipts || [])
    .filter((r) => isRelatedPurchaseReceipt(r, po))
    .map(mapQcRow)
    .filter((row) => row.qcNo || row.qcStatus)
}

export function listInboundQcForOutsourcingOrder(order) {
  if (!order) return []
  void outsourcingReceiptState.receipts
  return (outsourcingReceiptState.receipts || [])
    .filter((r) => isRelatedOutsourcingReceipt(r, order))
    .map(mapQcRow)
    .filter((row) => row.qcNo || row.qcStatus)
}
