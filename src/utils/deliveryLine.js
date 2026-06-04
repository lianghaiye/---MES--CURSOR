import { isWholeMachineLine, isScatterLine, normalizeDeliveryMode } from '@/utils/salesDeliveryMode'

/** 行级发货状态：未发货、部分发货、已发完 */
export function calcLineShipStatus(shippedQty, orderQty) {
  const shipped = Number(shippedQty) || 0
  const order = Number(orderQty) || 0
  if (order <= 0 || shipped <= 0) return '未发货'
  if (shipped >= order - 1e-9) return '已发完'
  return '部分发货'
}

export function lineShipStatusColor(status) {
  const map = {
    未发货: 'default',
    部分发货: 'processing',
    已发完: 'success',
  }
  return map[status] || 'default'
}

/** 数量展示为整数（发货进度等） */
export function formatDeliveryQtyInt(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return '-'
  return String(Math.round(n))
}

/** 发货进度：已发货数量/订单数量（整数） */
export function formatShipProgress(shippedQty, orderQty) {
  return `${formatDeliveryQtyInt(shippedQty)} / ${formatDeliveryQtyInt(orderQty)}`
}

function buildDeliveryLineBase(line, order) {
  const orderQty = Number(line.salesQty ?? line.qty ?? 0)
  const shippedQty = Number(line.shippedQty ?? line.issueQty ?? 0)
  const remain = Math.max(0, orderQty - shippedQty)
  const unitPriceExTax = Number(line.unitPriceExTax ?? 0)
  const shipQty = remain > 0 ? remain : 0

  return {
    ...JSON.parse(JSON.stringify(line)),
    orderQty,
    shippedQty,
    lineShipStatus: calcLineShipStatus(shippedQty, orderQty),
    unitPriceExTax,
    shipQty,
    deliveryUnitPriceExTax: unitPriceExTax,
    deliveryAmountExTax: calcDeliveryAmount(shipQty, unitPriceExTax),
    deliveryMode: normalizeDeliveryMode(line, order),
    packagingForm: line.packagingForm || '',
    lineRemark: line.lineRemark || '',
  }
}

/** 将销售订单明细转为申请发货明细行（仅整机行） */
export function mapSalesLineToDeliveryLine(line, order) {
  if (order && !isWholeMachineLine(line, order)) return null
  return buildDeliveryLineBase(line, order)
}

/** 散件发运产品行展示（字段与整机一致，不含本次发货数量列） */
export function mapScatterShipDisplayLine(line, order) {
  if (order && !isScatterLine(line, order)) return null
  const base = buildDeliveryLineBase(line, order)
  return {
    ...base,
    id: line.id,
    salesLineId: line.id,
  }
}

export function calcDeliveryAmount(shipQty, unitPriceExTax) {
  const qty = Number(shipQty) || 0
  const price = Number(unitPriceExTax) || 0
  return Math.round(qty * price * 10000) / 10000
}

export function recalcDeliveryLine(line) {
  line.deliveryAmountExTax = calcDeliveryAmount(line.shipQty, line.deliveryUnitPriceExTax)
}

export function formatDeliveryQty(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return '-'
  return n.toFixed(3)
}

export function formatDeliveryPrice(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return '-'
  return n.toFixed(4)
}

export function formatDeliveryWeight(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}
