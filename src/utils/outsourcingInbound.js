/** 外协回货/入库占用（与采购入库进度口径类似） */

import { outsourcingReceiptState } from '@/store/outsourcingReceiptStore'

function getInboundOrdersByOutsourcingOrderFn() {
  // eslint-disable-next-line global-require
  const { getInboundOrdersByOutsourcingOrder } = require('@/store/inboundOrderStore')
  return getInboundOrdersByOutsourcingOrder
}

function lineIdMatches(row, lineId) {
  if (!lineId) return false
  return (
    row.wxLineId === lineId || row.poLineId === lineId || row.lineId === lineId || row.id === lineId
  )
}

function isActiveOutsourcingReceipt(receipt) {
  if (!receipt) return false
  const status = receipt.receiptStatus || ''
  return status !== '已作废' && status !== '作废' && status !== '已取消'
}

function isActiveInboundOrder(order) {
  if (!order) return false
  const status = order.status || ''
  return status !== '已作废' && status !== '已取消'
}

function listOutsourcingReceiptsForOrder(order) {
  if (!order) return []
  return (outsourcingReceiptState.receipts || []).filter(
    (r) =>
      isActiveOutsourcingReceipt(r) &&
      (r.outsourcingOrderId === order.id ||
        r.outsourcingOrderNo === order.orderNo ||
        r.purchaseOrderId === order.id),
  )
}

export function calcWxLineReceivedQty(order, line) {
  return Number(line?.receivedQty) || 0
}

export function calcWxLineAppliedOccupyQty(order, line) {
  const applied = Number(line?.appliedReceiptQty) || 0
  const received = calcWxLineReceivedQty(order, line)
  return Math.max(applied, received)
}

export function calcWxLineRemainInboundQty(order, line) {
  if (line?.cancelled) return 0
  const planQty = Number(line?.planQty) || 0
  const used = calcWxLineAppliedOccupyQty(order, line)
  return Math.max(0, planQty - used)
}

export function isWxLineOccupyFull(order, line) {
  return calcWxLineRemainInboundQty(order, line) <= 1e-9
}

/**
 * 明细是否已生成过收货单或入库单（有效单据任一明细命中，或行上已有回货占用）
 * 用于订单变更「取消行」门控
 */
export function wxLineHasReceiptOrInboundDoc(order, line) {
  if (!order || !line) return false
  const lineId = line.id
  if ((Number(line.receivedQty) || 0) > 1e-9) return true
  if ((Number(line.appliedReceiptQty) || 0) > 1e-9) return true
  if (!lineId) return false
  for (const receipt of listOutsourcingReceiptsForOrder(order)) {
    for (const li of receipt.lineItems || []) {
      if (lineIdMatches(li, lineId)) return true
    }
  }
  try {
    const listFn = getInboundOrdersByOutsourcingOrderFn()
    for (const inbound of listFn(order) || []) {
      if (!isActiveInboundOrder(inbound)) continue
      for (const li of inbound.lineItems || []) {
        if (lineIdMatches(li, lineId)) return true
      }
    }
  } catch {
    /* ignore */
  }
  return false
}

export function calcWxLineReturnStatus(order, line) {
  if (line?.cancelled) return '已入库'
  const planQty = Number(line?.planQty) || 0
  const received = calcWxLineReceivedQty(order, line)
  if (planQty <= 0 || received <= 0) return '待入库'
  if (received >= planQty - 1e-9) return '已入库'
  return '部分入库'
}

export function calcWxHeaderReturnStatus(order) {
  const lines = (order?.lineItems || []).filter((l) => !l.cancelled)
  if (!lines.length) return '已入库'
  const statuses = lines.map((l) => calcWxLineReturnStatus(order, l))
  if (statuses.every((s) => s === '已入库')) return '已入库'
  if (statuses.every((s) => s === '待入库')) return '待入库'
  return '部分入库'
}

/** 已出库（已确认）数量 */
export function calcWxLineIssuedQty(order, line) {
  return Number(line?.issuedQty) || 0
}

/** 已申请发料数量（含待出库占用；与销售已申请发货同口径） */
export function calcWxLineAppliedIssueQty(order, line) {
  const applied = Number(line?.appliedIssueQty) || 0
  const issued = calcWxLineIssuedQty(order, line)
  return Math.max(applied, issued)
}

export function calcWxLineRemainIssueQty(order, line) {
  if (line?.cancelled) return 0
  const planQty = Number(line?.planQty) || 0
  const used = calcWxLineAppliedIssueQty(order, line)
  return Math.max(0, planQty - used)
}

export function isWxLineIssueFull(order, line) {
  return calcWxLineRemainIssueQty(order, line) <= 1e-9
}

export function calcWxHeaderIssueStatus(order) {
  const lines = (order?.lineItems || []).filter((l) => !l.cancelled)
  if (!lines.length) return '已出库'
  const plan = lines.reduce((s, l) => s + (Number(l.planQty) || 0), 0)
  const applied = lines.reduce((s, l) => s + calcWxLineAppliedIssueQty(order, l), 0)
  if (plan <= 0 || applied <= 0) return '待出库'
  if (applied >= plan - 1e-9) return '已出库'
  return '部分出库'
}

export function formatWxInboundProgress(receivedQty, appliedQty, planQty) {
  const fmt = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '-'
    return String(Number(n.toFixed(4)))
  }
  return `${fmt(receivedQty)} / ${fmt(appliedQty)} / ${fmt(planQty)}`
}

export const WX_INBOUND_PROGRESS_TOOLTIP = '格式：已入库数量 / 已申请入库（收货）数量 / 计划数量'

function listActiveInboundOrdersForWx(order) {
  try {
    const listFn = getInboundOrdersByOutsourcingOrderFn()
    return (listFn(order) || []).filter((o) => isActiveInboundOrder(o))
  } catch {
    return []
  }
}

/** 外协行入库结算数量合计（有效入库单明细 settleQty 之和） */
export function calcWxLineInboundSettleQty(order, line) {
  if (!order || !line) return 0
  let total = 0
  listActiveInboundOrdersForWx(order).forEach((inbound) => {
    ;(inbound.lineItems || []).forEach((li) => {
      if (!lineIdMatches(li, line.id)) return
      total += Number(li.settleQty) || 0
    })
  })
  return total
}

/** 结算数量展示单位：优先入库明细 settleUnit，否则行上 settleUnit */
export function resolveWxLineSettleUnit(order, line) {
  if (!order || !line) return String(line?.settleUnit || '').trim()
  for (const inbound of listActiveInboundOrdersForWx(order)) {
    for (const li of inbound.lineItems || []) {
      if (!lineIdMatches(li, line.id)) continue
      const u = String(li.settleUnit || '').trim()
      if (u) return u
    }
  }
  return String(line.settleUnit || '').trim()
}

/** 回货仓库：行字段 / 收货明细 / 订单预入仓库 */
export function resolveWxLineReturnWarehouse(order, line) {
  const fromLine = String(line?.receivingWarehouse || line?.returnWarehouse || '').trim()
  if (fromLine) return fromLine
  if (!order || !line?.id) return String(order?.shipWarehouse || '').trim()
  for (const receipt of listOutsourcingReceiptsForOrder(order)) {
    for (const li of receipt.lineItems || []) {
      if (!lineIdMatches(li, line.id)) continue
      const wh = String(li.receivingWarehouse || '').trim()
      if (wh) return wh
    }
  }
  return String(order?.shipWarehouse || '').trim()
}

/** 发货进度：已出库数量 / 已申请数量 / 计划数量（对齐销售发货进度） */
export function formatWxIssueProgress(issuedQty, appliedIssueQty, planQty) {
  return formatWxInboundProgress(issuedQty, appliedIssueQty, planQty)
}

export const WX_ISSUE_PROGRESS_TOOLTIP = '格式：已出库数量 / 已申请数量 / 计划数量'
