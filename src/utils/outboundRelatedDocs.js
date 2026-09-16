/**
 * 出库单关联单据查询（领料→领料入库、采购退货→采购退货单）
 */
import { inboundOrderState } from '@/store/inboundOrderStore'
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { factoryQcState, getFactoryQcById } from '@/store/factoryQcStore'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import { calcReturnQtySummary, formatReturnQtySummary } from '@/mock/purchaseReturns'

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
