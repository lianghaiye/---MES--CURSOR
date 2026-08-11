/**
 * 采购订单行级收货/入库占用（对齐销售「已申请发货」逻辑）
 * 两条路径共用采购数量池：
 * - 先收货再入库 / 质检后入库
 * - 直接入库
 * 已申请入库（收货）= 有效收货单占用 + 有效入库单占用
 * 已入库 = 已确认入库数量
 */
import { inboundOrderState } from '@/store/inboundOrderStore'
import { purchaseReceiptState } from '@/store/purchaseReceiptStore'
import { formatNumber } from '@/utils/numberFormat'

function lineIdMatches(row, lineId) {
  return row.poLineId === lineId || row.id === lineId
}

function isActiveInboundOrder(order) {
  if (!order) return false
  const status = order.status || ''
  return status !== '已作废' && status !== '已取消'
}

function isConfirmedInboundOrder(order) {
  return order?.status === '已完成' || order?.status === '已入库' || order?.status === '已确认'
}

function isActivePurchaseReceipt(receipt) {
  if (!receipt) return false
  const status = receipt.receiptStatus || ''
  return status !== '已作废' && status !== '作废' && status !== '已取消'
}

function listInboundOrdersForPo(po) {
  if (!po) return []
  return (inboundOrderState.orders || []).filter(
    (o) =>
      isActiveInboundOrder(o) && (o.purchaseOrderId === po.id || o.sourceOrderNo === po.orderNo),
  )
}

function listPurchaseReceiptsForPo(po) {
  if (!po) return []
  return (purchaseReceiptState.receipts || []).filter(
    (r) =>
      isActivePurchaseReceipt(r) &&
      (r.purchaseOrderId === po.id || r.purchaseOrderNo === po.orderNo),
  )
}

/** 已生成收货单占用数量（有效收货单） */
export function calcPoLineAppliedReceiptQty(po, line) {
  if (!line) return 0
  const lineId = line.id
  let total = 0
  listPurchaseReceiptsForPo(po).forEach((receipt) => {
    ;(receipt.lineItems || []).forEach((li) => {
      if (lineIdMatches(li, lineId)) total += Number(li.receiptQty) || 0
    })
  })
  return total
}

/** 已申请入库数量（含待处理入库单） */
export function calcPoLineAppliedInboundQty(po, line) {
  if (!line) return 0
  const lineId = line.id
  let total = 0
  listInboundOrdersForPo(po).forEach((order) => {
    ;(order.lineItems || []).forEach((li) => {
      if (lineIdMatches(li, lineId)) total += Number(li.qty) || 0
    })
  })
  return total
}

/**
 * 已申请入库（收货）= 入库单占用 + 收货单占用
 * 两种路径共用采购数量，不可重复占用
 */
export function calcPoLineAppliedOccupyQty(po, line) {
  return calcPoLineAppliedInboundQty(po, line) + calcPoLineAppliedReceiptQty(po, line)
}

/** 已确认入库数量 */
export function calcPoLineReceivedQty(po, line) {
  if (!line) return 0
  const fromField = Number(line.receivedQty) || 0
  let fromOrders = 0
  listInboundOrdersForPo(po).forEach((order) => {
    if (!isConfirmedInboundOrder(order)) return
    ;(order.lineItems || []).forEach((li) => {
      if (lineIdMatches(li, line.id)) fromOrders += Number(li.qty) || 0
    })
  })
  return Math.max(fromField, fromOrders)
}

/** 剩余可收货 / 可申请入库数量（取已申请占用与已入库的较大值，避免已入库未计入占用时仍可操作） */
export function calcPoLineRemainInboundQty(po, line) {
  const purchaseQty = Number(line?.purchaseQty) || 0
  const applied = calcPoLineAppliedOccupyQty(po, line)
  const received = calcPoLineReceivedQty(po, line)
  const used = Math.max(applied, received)
  return Math.max(0, purchaseQty - used)
}

/** 明细是否已占满（置灰，不可再收货/入库） */
export function isPoLineOccupyFull(po, line) {
  return calcPoLineRemainInboundQty(po, line) <= 1e-9
}

/** 明细入库状态（按已确认入库） */
export function calcPoLineInboundStatus(po, line) {
  const purchaseQty = Number(line?.purchaseQty) || 0
  const received = calcPoLineReceivedQty(po, line)
  if (purchaseQty <= 0 || received <= 0) return '待入库'
  if (received >= purchaseQty - 1e-9) return '已入库'
  return '部分入库'
}

/** 整单入库状态 */
export function calcPoHeaderInboundStatus(po) {
  const lines = po?.lineItems || []
  if (!lines.length) return '待入库'
  const statuses = lines.map((l) => calcPoLineInboundStatus(po, l))
  if (statuses.every((s) => s === '已入库')) return '已入库'
  if (statuses.every((s) => s === '待入库')) return '待入库'
  return '部分入库'
}

/** 入库进度：已入库 / 已申请入库（收货） / 采购数量 */
export function formatInboundProgress(receivedQty, appliedQty, purchaseQty) {
  return `${formatNumber(receivedQty, 4, { empty: '-' })} / ${formatNumber(appliedQty, 4, { empty: '-' })} / ${formatNumber(purchaseQty, 4, { empty: '-' })}`
}

export const INBOUND_PROGRESS_TOOLTIP = '格式：已入库数量 / 已申请入库（收货）数量 / 采购数量'

export function poLineInboundStatusColor(status) {
  const map = {
    待入库: 'default',
    部分入库: 'processing',
    已入库: 'success',
  }
  return map[status] || 'default'
}
