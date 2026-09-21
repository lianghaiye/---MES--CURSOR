/**
 * 出库单关联单据查询（领料→领料入库、采购退货→采购退货单、销售→发货/出厂检、调拨/盘点）
 */
import { inboundOrderState } from '@/store/inboundOrderStore'
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { factoryQcState, getFactoryQcById } from '@/store/factoryQcStore'
import { deliveryOrderState, getDeliveryOrderById } from '@/store/deliveryOrderStore'
import { getTransferOrderById, transferOrderState } from '@/store/transferOrderStore'
import { getStocktakeOrderById, stocktakeOrderState } from '@/store/stocktakeOrderStore'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import { calcReturnQtySummary, formatReturnQtySummary } from '@/mock/purchaseReturns'

function sumLineQty(lines, keys = ['qty', 'shipQty', 'countQty', 'bookQty']) {
  return (lines || []).reduce((sum, line) => {
    for (const key of keys) {
      const n = Number(line?.[key])
      if (Number.isFinite(n) && n !== 0) return sum + n
    }
    return sum
  }, 0)
}

/** 领料出库确认后生成的领料入库单 */
export function listRelatedInboundsForOutbound(outbound) {
  if (!outbound) return []
  const id = outbound.id
  const docNo = outbound.docNo
  const byId = new Map()

  ;(outbound.linkedInboundOrders || []).forEach((ref) => {
    if (!ref?.id) return
    const full = inboundOrderState.orders.find((o) => o.id === ref.id)
    if (full) byId.set(full.id, full)
  })

  inboundOrderState.orders.forEach((o) => {
    if (id && o.outboundOrderId === id) {
      byId.set(o.id, o)
      return
    }
    if (docNo && (o.outboundDocNo === docNo || o.sourceOrderNo === docNo)) {
      if (o.inboundType === '领料入库' || o.sourceType === '领料出库') {
        byId.set(o.id, o)
      }
    }
  })

  return [...byId.values()].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  )
}

/** 采购退货出库关联的采购退货单 */
export function listRelatedPurchaseReturnsForOutbound(outbound) {
  if (!outbound) return []
  const id = outbound.id
  const docNo = outbound.docNo
  const sourceNo = outbound.sourceOrderNo
  const list = purchaseReturnState.returns || []

  return list
    .filter((r) => {
      if (sourceNo && (r.returnNo === sourceNo || r.id === outbound.purchaseReturnId)) return true
      if (id && (r.outboundOrderId === id || (r.outboundOrders || []).some((o) => o.id === id)))
        return true
      if (
        docNo &&
        (r.outboundOrderNo === docNo ||
          (r.outboundOrders || []).some((o) => o.outboundOrderNo === docNo))
      ) {
        return true
      }
      return false
    })
    .map((r) => ({
      ...r,
      returnQtyText: formatReturnQtySummary(r),
      returnQtyTotal: calcReturnQtySummary(r).totalQty,
    }))
}

/** 销售出库 → 关联发货单 */
export function listRelatedDeliveriesForOutbound(outbound) {
  if (!outbound || outbound.outboundType !== '销售出库') return []
  void deliveryOrderState.orders
  const byId = new Map()
  const push = (row) => {
    if (row?.id) byId.set(row.id, row)
  }

  if (outbound.linkedDeliveryId) push(getDeliveryOrderById(outbound.linkedDeliveryId))
  const code = String(outbound.linkedDeliveryCode || outbound.sourceOrderNo || '').trim()
  if (code) {
    const hit = (deliveryOrderState.orders || []).find((d) => d.deliveryCode === code)
    push(hit)
  }
  ;(deliveryOrderState.orders || []).forEach((d) => {
    const linked = findLinkedSalesOutbound(d)
    if (linked && linked.id === outbound.id) push(d)
  })

  return [...byId.values()]
}

/** 调拨出库 → 关联调拨单 */
export function listRelatedTransfersForOutbound(outbound) {
  if (!outbound || outbound.outboundType !== '调拨出库') return []
  void transferOrderState.orders
  const byId = new Map()
  const push = (row) => {
    if (row?.id) byId.set(row.id, row)
  }
  if (outbound.transferOrderId) push(getTransferOrderById(outbound.transferOrderId))
  const no = String(outbound.transferDocNo || outbound.sourceOrderNo || '').trim()
  if (no) {
    push((transferOrderState.orders || []).find((o) => o.docNo === no))
  }
  ;(transferOrderState.orders || []).forEach((o) => {
    if (
      (outbound.id && (o.linkedOutboundIds || []).includes(outbound.id)) ||
      (outbound.docNo && (o.linkedOutboundDocNos || []).includes(outbound.docNo))
    ) {
      push(o)
    }
  })
  return [...byId.values()].map((row) => ({
    ...row,
    transferQty: sumLineQty(row.lineItems || [], ['qty']),
  }))
}

/** 盘点出库 → 关联盘点单 */
export function listRelatedStocktakesForOutbound(outbound) {
  if (!outbound || outbound.outboundType !== '盘点出库') return []
  void stocktakeOrderState.orders
  const byId = new Map()
  const push = (row) => {
    if (row?.id) byId.set(row.id, row)
  }
  if (outbound.stocktakeOrderId) push(getStocktakeOrderById(outbound.stocktakeOrderId))
  const no = String(outbound.stocktakeDocNo || outbound.sourceOrderNo || '').trim()
  if (no) {
    push((stocktakeOrderState.orders || []).find((o) => o.docNo === no))
  }
  ;(stocktakeOrderState.orders || []).forEach((o) => {
    if (
      (outbound.id && (o.linkedOutboundIds || []).includes(outbound.id)) ||
      (outbound.docNo && (o.linkedOutboundDocNos || []).includes(outbound.docNo))
    ) {
      push(o)
    }
  })
  return [...byId.values()].map((row) => ({
    ...row,
    stocktakeQty: sumLineQty(row.lineItems || [], ['qty', 'countQty', 'bookQty']),
  }))
}

/** 发货单关联的出厂质检（经销售出库） */
export function listFactoryQcForDelivery(delivery) {
  if (!delivery) return []
  const ob = findLinkedSalesOutbound(delivery)
  if (!ob) return []

  const byId = new Map()
  if (ob.factoryQcId) {
    const one = getFactoryQcById(ob.factoryQcId)
    if (one) byId.set(one.id, one)
  }
  ;(factoryQcState.records || []).forEach((r) => {
    if (r.outboundDocNo === ob.docNo || r.sourceOrderNo === ob.docNo) {
      byId.set(r.id, r)
    }
  })

  return [...byId.values()].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  )
}

/** 质检数量合计（行 inspectQty） */
export function calcFactoryQcInspectQty(qc) {
  const lines = qc?.lineItems || []
  const total = lines.reduce((s, l) => s + (Number(l.inspectQty ?? l.shipQty) || 0), 0)
  return Math.round(total * 1000) / 1000
}
