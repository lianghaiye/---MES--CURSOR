import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  createPurchaseSettle,
  createPurchaseSettleLine,
  PURCHASE_SETTLE_STATUS,
  seedPurchaseSettles,
} from '@/mock/purchaseSettles'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { getRemainSettleQty, hasSettleUnit, resolvePricingQty } from '@/utils/settleUnit'

export const purchaseSettleState = reactive({
  settles: seedPurchaseSettles(),
})

function nextSettleNo() {
  const d = dayjs().format('YYYYMMDD')
  const seq = String(purchaseSettleState.settles.length + 1).padStart(3, '0')
  return `PS${d}${seq}`
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function listPurchaseSettles() {
  return purchaseSettleState.settles
}

export function getPurchaseSettleById(id) {
  return purchaseSettleState.settles.find((s) => s.id === id) || null
}

export function listSettlesByPurchaseOrderId(purchaseOrderId) {
  if (!purchaseOrderId) return []
  return purchaseSettleState.settles.filter((s) => s.purchaseOrderId === purchaseOrderId)
}

/** 可结算的入库行：已入库、挂采购单、仍有剩余结算量 */
export function listSettleableInboundLines(purchaseOrderId) {
  const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
  if (!po) return []
  const orders = inboundOrderState.orders.filter((o) => o.purchaseOrderId === purchaseOrderId)
  const rows = []
  orders.forEach((order) => {
    ;(order.lineItems || []).forEach((line) => {
      if ((line.lineStatus || '待入库') !== '已入库') return
      const remain = getRemainSettleQty(line)
      if (!(remain > 0)) return
      const poLine = (po.lineItems || []).find((l) => l.id === line.poLineId) || null
      const unitPrice = Number(
        poLine?.unitPriceInTax ?? poLine?.unitPriceExTax ?? line.unitPrice ?? 0,
      )
      const settleUnit = hasSettleUnit(line)
        ? line.settleUnit
        : hasSettleUnit(poLine || {})
          ? poLine.settleUnit
          : ''
      const defaultQty = remain
      rows.push({
        key: `${order.id}:${line.id}`,
        inboundOrderId: order.id,
        inboundDocNo: order.docNo,
        inboundLineId: line.id,
        poLineId: line.poLineId || poLine?.id || '',
        itemCode: line.itemCode,
        itemName: line.itemName,
        settleUnit: settleUnit || line.unit || '件',
        remainSettleQty: remain,
        settleQty: defaultQty,
        unitPrice,
        amount: round2(defaultQty * unitPrice),
        sourceLine: line,
        poLine,
      })
    })
  })
  return rows
}

export function createSettleFromPurchaseOrder(purchaseOrderId, payload = {}) {
  const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
  if (!po) return { ok: false, message: '采购单不存在' }
  const selected = payload.lineItems || []
  if (!selected.length) return { ok: false, message: '请至少选择一行结算明细' }

  const lineItems = []
  for (const row of selected) {
    const qty = Number(row.settleQty) || 0
    if (!(qty > 0)) return { ok: false, message: '结算数量须大于 0' }
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    if (!line) return { ok: false, message: '入库明细不存在' }
    const remain = getRemainSettleQty(line)
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」可结算数量不足（剩余 ${remain}）`,
      }
    }
    const unitPrice = Number(row.unitPrice) || 0
    lineItems.push(
      createPurchaseSettleLine({
        inboundOrderId: row.inboundOrderId,
        inboundDocNo: row.inboundDocNo || inbound.docNo,
        inboundLineId: row.inboundLineId,
        poLineId: row.poLineId || line.poLineId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        settleUnit: row.settleUnit || line.settleUnit || line.unit || '',
        settleQty: qty,
        unitPrice,
        amount: round2(qty * unitPrice),
      }),
    )
  }

  const settle = createPurchaseSettle({
    id: `ps-${Date.now()}`,
    settleNo: payload.settleNo || nextSettleNo(),
    status: PURCHASE_SETTLE_STATUS.DRAFT,
    purchaseOrderId: po.id,
    purchaseOrderNo: po.orderNo,
    supplier: po.supplier,
    settleDate: payload.settleDate || dayjs().format('YYYY-MM-DD'),
    remark: payload.remark || '',
    lineItems,
    totalAmount: round2(lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0)),
  })
  purchaseSettleState.settles.unshift(settle)
  return { ok: true, settle, message: `已生成结算单「${settle.settleNo}」` }
}

export function confirmPurchaseSettle(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '结算单不存在' }
  if (settle.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '结算单已确认' }
  }
  for (const row of settle.lineItems || []) {
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    if (!line) return { ok: false, message: '关联入库明细不存在' }
    const remain = getRemainSettleQty(line)
    const qty = Number(row.settleQty) || 0
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」可结算数量不足（剩余 ${remain}）`,
      }
    }
  }
  for (const row of settle.lineItems || []) {
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    line.settledSettleQty = round2(
      (Number(line.settledSettleQty) || 0) + (Number(row.settleQty) || 0),
    )
  }
  settle.status = PURCHASE_SETTLE_STATUS.CONFIRMED
  settle.confirmer = 'admin1'
  settle.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, settle, message: '结算单已确认' }
}

export function deletePurchaseSettle(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '结算单不存在' }
  if (settle.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '已确认结算单不可删除' }
  }
  const idx = purchaseSettleState.settles.findIndex((s) => s.id === settleId)
  if (idx >= 0) purchaseSettleState.settles.splice(idx, 1)
  return { ok: true, message: '已删除' }
}

/** PO 详情结算 Tab 展示行 */
export function buildPoSettleTabRows(purchaseOrderId) {
  return listSettlesByPurchaseOrderId(purchaseOrderId).map((s) => ({
    id: s.id,
    settleNo: s.settleNo,
    amount: s.totalAmount,
    settledAt: s.confirmedAt || s.createdAt,
    status: s.status,
  }))
}

export { resolvePricingQty, PURCHASE_SETTLE_STATUS }
