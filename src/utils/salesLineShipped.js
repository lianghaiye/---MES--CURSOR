import { sumSelectedShipQty } from '@/utils/shipEbom'

function lineIdMatches(row, lineId) {
  return row.id === lineId || row.salesLineId === lineId
}

function isShippedApplication(app) {
  return app?.status === '已发货' || Number(app?.actualShipQty) > 0
}

/** 发货申请中某整机行的占用数量：未确认按申请量，已确认按实际出库量 */
function lineQtyFromAppLine(app, li) {
  if (!li) return 0
  if (isShippedApplication(app)) {
    if (li.actualShipQty != null && li.actualShipQty !== '') {
      return Number(li.actualShipQty) || 0
    }
    // 仅有整单实际出库量时，按行申请量占比分摊
    const applyTotal = (app.lineItems || []).reduce((s, r) => s + (Number(r.shipQty) || 0), 0)
    const actualTotal = Number(app.actualShipQty)
    if (applyTotal > 0 && Number.isFinite(actualTotal) && actualTotal >= 0) {
      return Math.round((((Number(li.shipQty) || 0) * actualTotal) / applyTotal) * 10000) / 10000
    }
  }
  return Number(li.shipQty) || 0
}

/** 散件行占用数量 */
function scatterQtyFromAppShip(app, ship) {
  if (!ship) return 0
  const applyQty = sumSelectedShipQty(ship)
  if (!isShippedApplication(app)) return applyQty
  if (ship.actualShipQty != null && ship.actualShipQty !== '') {
    return Number(ship.actualShipQty) || 0
  }
  const applyTotal =
    (app.lineItems || []).reduce((s, r) => s + (Number(r.shipQty) || 0), 0) +
    (app.scatterShipments || []).reduce((s, sh) => s + sumSelectedShipQty(sh), 0)
  const actualTotal = Number(app.actualShipQty)
  if (applyTotal > 0 && Number.isFinite(actualTotal) && actualTotal >= 0) {
    return Math.round(((applyQty * actualTotal) / applyTotal) * 10000) / 10000
  }
  return applyQty
}

/**
 * 汇总销售明细已占用发货数量
 * - 出库未确认（待发货/待出库）：按申请数量占用，不可再申请同一额度
 * - 已确认出库：按实际出库数量占用；实际少于申请时，差额可再次申请
 */
function sumLineQtyFromApps(order, line, { onlyShipped = false, excludeIds = [] } = {}) {
  if (!line) return 0
  const lineId = line.id
  const exclude = new Set((excludeIds || []).filter(Boolean).map(String))
  let total = 0

  for (const app of order?.deliveryApplications || []) {
    if (exclude.has(String(app.id))) continue
    const shipped = isShippedApplication(app)
    if (onlyShipped && !shipped) continue
    for (const li of app.lineItems || []) {
      if (lineIdMatches(li, lineId)) {
        total += lineQtyFromAppLine(app, li)
      }
    }
    for (const ship of app.scatterShipments || []) {
      if (lineIdMatches(ship, lineId)) {
        total += scatterQtyFromAppShip(app, ship)
      }
    }
  }
  return Math.round(total * 10000) / 10000
}

/** 汇总销售明细已确认出库数量（仅已发货申请，按实际出库口径） */
export function calcSalesLineShippedQty(order, line, opts = {}) {
  if (!line) return 0
  const shippedFromApps = sumLineQtyFromApps(order, line, { ...opts, onlyShipped: true })
  if (shippedFromApps > 0 || opts.excludeIds?.length) return shippedFromApps
  return Number(line.shippedQty ?? line.issueQty ?? 0)
}

/**
 * 汇总销售明细已占用发货数量（含待出库申请占用 + 已确认实际出库）
 * 用于可发数量与置灰判断
 */
export function calcSalesLineAppliedShipQty(order, line, opts = {}) {
  if (!line) return 0
  const fromApps = sumLineQtyFromApps(order, line, { ...opts, onlyShipped: false })
  if (fromApps > 0 || opts.excludeIds?.length) return fromApps
  return Number(line.shippedQty ?? line.issueQty ?? 0)
}

/** 剩余可申请发货数量 = 订单数量 − 已占用（待出库申请 + 已确认实际出库） */
export function calcSalesLineAvailableQty(order, line, opts = {}) {
  const orderQty = Number(line.salesQty ?? line.qty ?? line.orderQty) || 0
  const occupiedQty = calcSalesLineAppliedShipQty(order, line, opts)
  return Math.max(0, orderQty - occupiedQty)
}

/** 散件物料：从历史发货申请汇总已申请/占用数量 */
export function calcScatterMaterialAppliedQty(order, salesLineId, materialId, opts = {}) {
  if (!order || !salesLineId || !materialId) return 0
  const exclude = new Set((opts.excludeIds || []).filter(Boolean).map(String))
  let total = 0

  for (const app of order.deliveryApplications || []) {
    if (exclude.has(String(app.id))) continue
    const shipped = isShippedApplication(app)
    if (opts.onlyShipped && !shipped) continue
    for (const ship of app.scatterShipments || []) {
      if (!lineIdMatches(ship, salesLineId)) continue
      for (const pick of ship.materialPicks || []) {
        if (String(pick.materialId) !== String(materialId) && pick.code !== materialId) continue
        if (pick.selected === false) continue
        if (shipped && pick.actualShipQty != null && pick.actualShipQty !== '') {
          total += Number(pick.actualShipQty) || 0
        } else {
          total += Number(pick.shipQty) || 0
        }
      }
    }
  }

  return Math.round(total * 10000) / 10000
}

export function calcScatterMaterialShippedQty(order, salesLineId, materialId, opts = {}) {
  return calcScatterMaterialAppliedQty(order, salesLineId, materialId, {
    ...opts,
    onlyShipped: true,
  })
}
