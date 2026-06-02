/** 将销售订单明细转为申请发货明细行 */
export function mapSalesLineToDeliveryLine(line) {
  const orderQty = Number(line.salesQty ?? line.qty ?? 0)
  const shippedQty = Number(line.shippedQty ?? line.issueQty ?? 0)
  const remain = Math.max(0, orderQty - shippedQty)
  const unitPriceExTax = Number(line.unitPriceExTax ?? 0)
  const shipQty = remain > 0 ? remain : orderQty

  return {
    ...JSON.parse(JSON.stringify(line)),
    orderQty,
    productUnitPrice: unitPriceExTax,
    shippedQty,
    shipQty,
    deliveryUnitPriceExTax: unitPriceExTax,
    deliveryAmountExTax: calcDeliveryAmount(shipQty, unitPriceExTax),
    itemWeightKg: Number(line.itemWeightKg ?? 0),
    plannedDeliveryDate: line.deliveryDate || line.plannedDeliveryDate || '',
    lineRemark: line.lineRemark || '',
    category: line.category || line.productAttr || '',
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
