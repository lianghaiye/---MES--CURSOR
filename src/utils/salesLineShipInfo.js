/**
 * 销售明细行 ↔ 发货单（发货申请）聚合，供列表「发货信息」摘要与抽屉使用。
 */

import { sumSelectedShipQty } from '@/utils/shipEbom'

function lineIdMatches(row, lineId) {
  return row?.id === lineId || row?.salesLineId === lineId
}

export function formatShipSummaryText(total = 0) {
  const n = Number(total) || 0
  if (n <= 0) return '—'
  return `已发货 ${n}`
}

/** 本发货单上对应该销售明细行的发货数量（整机 + 散件） */
export function calcLineShipQtyOnDelivery(app, lineId) {
  if (!app || !lineId) return 0
  let total = 0
  for (const li of app.lineItems || []) {
    if (!lineIdMatches(li, lineId)) continue
    if (li.actualShipQty != null && li.actualShipQty !== '') {
      total += Number(li.actualShipQty) || 0
    } else {
      total += Number(li.shipQty) || 0
    }
  }
  for (const ship of app.scatterShipments || []) {
    if (!lineIdMatches(ship, lineId)) continue
    if (ship.actualShipQty != null && ship.actualShipQty !== '') {
      total += Number(ship.actualShipQty) || 0
    } else {
      total += sumSelectedShipQty(ship)
    }
  }
  return Math.round(total * 10000) / 10000
}

/**
 * 列出本销售明细行关联的发货申请/发货单（按 id 去重，新在前）
 * 每条附带 lineShipQty：本行在该发货单上的发货数量
 * @param {object} order 销售订单（含 deliveryApplications）
 * @param {string} lineId 销售明细行 id
 * @returns {object[]}
 */
export function listDeliveriesForLine(order, lineId) {
  if (!order || !lineId) return []
  const seen = new Set()
  const matched = []
  for (const app of order.deliveryApplications || []) {
    const id = app?.id
    if (!id || seen.has(String(id))) continue
    const hit =
      (app.lineItems || []).some((li) => lineIdMatches(li, lineId)) ||
      (app.scatterShipments || []).some((sh) => lineIdMatches(sh, lineId))
    if (!hit) continue
    seen.add(String(id))
    matched.push({
      ...app,
      lineShipQty: calcLineShipQtyOnDelivery(app, lineId),
    })
  }
  matched.sort((a, b) => {
    const ta = String(a.deliveryDate || a.createdAt || '')
    const tb = String(b.deliveryDate || b.createdAt || '')
    return tb.localeCompare(ta)
  })
  return matched
}

export function summarizeLineShipInfo(order, lineId) {
  const deliveries = listDeliveriesForLine(order, lineId)
  return {
    total: deliveries.length,
    summaryText: formatShipSummaryText(deliveries.length),
    deliveries,
  }
}
