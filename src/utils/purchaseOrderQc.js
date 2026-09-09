/**
 * 采购/外协订单关联的入库质检记录（演示：由收货单派生）
 */
import { purchaseReceiptState } from '@/store/purchaseReceiptStore'
import { outsourcingReceiptState } from '@/store/outsourcingReceiptStore'
import { listQcTasks, QC_TASK_STATUS } from '@/store/qcTaskStore'

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

function formatReturnExchangeText(line = {}) {
  const r = Number(line.returnQty)
  const e = Number(line.exchangeQty)
  const parts = []
  if (Number.isFinite(r) && r > 0) parts.push(`退货 ${r}`)
  if (Number.isFinite(e) && e > 0) parts.push(`换货 ${e}`)
  return parts.length ? parts.join(' / ') : '—'
}

function collectQcTasksForReceipt(receipt) {
  if (!receipt) return []
  const byId = listQcTasks({ sourceDocId: receipt.id, bizScope: '来料质检' })
  const no = String(receipt.receiptNo || '').trim()
  const byNo = no
    ? listQcTasks({ bizScope: '来料质检' }).filter((t) => String(t.sourceDocNo || '').trim() === no)
    : []
  const map = new Map()
  ;[...byId, ...byNo].forEach((t) => {
    if (!t?.id || t.qcStatus === QC_TASK_STATUS.CANCELLED) return
    map.set(t.id, t)
  })
  return [...map.values()]
}

function mapTaskLineToQcResultRow(task, line, idx, meta = {}) {
  return {
    id: `${task.id}__${line?.id || idx}`,
    purchaseOrderNo: meta.purchaseOrderNo || '',
    receiptNo: meta.receiptNo || '',
    receiptId: meta.receiptId || '',
    qcNo: task.qcNo || '',
    qcStatus: task.qcStatus || '',
    qcResult: line?.lineQcResult || task.qcResult || '',
    itemName: line?.itemName || line?.productName || task.itemName || '—',
    itemCode: line?.itemCode || line?.productCode || task.itemCode || '',
    inspectMethod: line?.inspectMethod || task.inspectMethod || '—',
    inspectQty: line?.inspectQty ?? line?.receiptQty ?? task.inspectQty ?? '',
    treatmentPlan: line?.treatmentPlan || task.treatmentPlan || '—',
    acceptInboundQty:
      line?.acceptInboundQty != null && line?.acceptInboundQty !== '' ? line.acceptInboundQty : '—',
    returnExchange: line ? formatReturnExchangeText(line) : '—',
  }
}

function appendQcResultRowsForReceipt(rows, receipt, purchaseOrderNo = '') {
  if (!receipt) return
  const meta = {
    purchaseOrderNo: purchaseOrderNo || receipt.purchaseOrderNo || '',
    receiptNo: receipt.receiptNo || '',
    receiptId: receipt.id || '',
  }
  collectQcTasksForReceipt(receipt).forEach((task) => {
    const lines = Array.isArray(task.lineItems) && task.lineItems.length ? task.lineItems : [null]
    lines.forEach((line, idx) => {
      rows.push(mapTaskLineToQcResultRow(task, line, idx, meta))
    })
  })
}

/**
 * 收货单 / 来料质检生成入库：质检结果明细（一个产品一行）
 * @param {object} receipt
 */
export function listQcProductResultLinesForReceipt(receipt) {
  if (!receipt) return []
  void purchaseReceiptState.receipts
  const rows = []
  appendQcResultRowsForReceipt(rows, receipt, receipt.purchaseOrderNo || '')
  return rows
}

/**
 * 采购订单生成入库：质检结果明细（一个产品一行）
 * @param {object|object[]} purchaseOrders
 */
export function listQcProductResultLinesForPurchaseOrders(purchaseOrders) {
  const orders = (Array.isArray(purchaseOrders) ? purchaseOrders : [purchaseOrders]).filter(Boolean)
  if (!orders.length) return []
  void purchaseReceiptState.receipts

  const rows = []
  orders.forEach((po) => {
    const receipts = (purchaseReceiptState.receipts || []).filter((r) =>
      isRelatedPurchaseReceipt(r, po),
    )
    receipts.forEach((receipt) => {
      appendQcResultRowsForReceipt(rows, receipt, po.orderNo || '')
    })
  })
  return rows
}
