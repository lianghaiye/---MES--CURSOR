import { sumSelectedShipQty } from '@/utils/shipEbom'

function lineIdMatches(row, lineId) {
  return row.id === lineId || row.salesLineId === lineId
}

/** 汇总销售明细已发货数量（仅统计已发货的发货申请，已有发货申请不受影响） */
export function calcSalesLineShippedQty(order, line) {
  if (!line) return 0
  const lineId = line.id
  let shippedFromApps = 0

  for (const app of order?.deliveryApplications || []) {
    const isShipped = app.status === '已发货' || Number(app.actualShipQty) > 0
    if (!isShipped) continue

    for (const li of app.lineItems || []) {
      if (lineIdMatches(li, lineId)) {
        shippedFromApps += Number(li.shipQty) || 0
      }
    }
    for (const ship of app.scatterShipments || []) {
      if (lineIdMatches(ship, lineId)) {
        shippedFromApps += sumSelectedShipQty(ship)
      }
    }
  }

  const fromField = Number(line.shippedQty ?? line.issueQty ?? 0)
  return shippedFromApps > 0 ? shippedFromApps : fromField
}

export function calcSalesLineAvailableQty(order, line) {
  const orderQty = Number(line.salesQty ?? line.qty) || 0
  const shippedQty = calcSalesLineShippedQty(order, line)
  return Math.max(0, orderQty - shippedQty)
}
