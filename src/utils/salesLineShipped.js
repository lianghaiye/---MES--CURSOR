import { sumSelectedShipQty } from '@/utils/shipEbom'

function lineIdMatches(row, lineId) {
  return row.id === lineId || row.salesLineId === lineId
}

function sumLineQtyFromApps(order, line, { onlyShipped = false } = {}) {
  if (!line) return 0
  const lineId = line.id
  let total = 0

  for (const app of order?.deliveryApplications || []) {
    if (onlyShipped) {
      const isShipped = app.status === '已发货' || Number(app.actualShipQty) > 0
      if (!isShipped) continue
    }
    for (const li of app.lineItems || []) {
      if (lineIdMatches(li, lineId)) {
        total += Number(li.shipQty) || 0
      }
    }
    for (const ship of app.scatterShipments || []) {
      if (lineIdMatches(ship, lineId)) {
        total += sumSelectedShipQty(ship)
      }
    }
  }
  return total
}

/** 汇总销售明细已确认出库数量（仅统计已发货的发货申请） */
export function calcSalesLineShippedQty(order, line) {
  if (!line) return 0
  const shippedFromApps = sumLineQtyFromApps(order, line, { onlyShipped: true })
  const fromField = Number(line.shippedQty ?? line.issueQty ?? 0)
  return shippedFromApps > 0 ? shippedFromApps : fromField
}

/** 汇总销售明细已申请发货数量（含待发货/待出库等未确认出库） */
export function calcSalesLineAppliedShipQty(order, line) {
  if (!line) return 0
  const fromApps = sumLineQtyFromApps(order, line, { onlyShipped: false })
  if (fromApps > 0) return fromApps
  return Number(line.shippedQty ?? line.issueQty ?? 0)
}

export function calcSalesLineAvailableQty(order, line) {
  const orderQty = Number(line.salesQty ?? line.qty) || 0
  const appliedQty = calcSalesLineAppliedShipQty(order, line)
  return Math.max(0, orderQty - appliedQty)
}
