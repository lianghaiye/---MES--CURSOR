/** 采购订单详情页汇总 */
export function calcPurchaseOrderDetailSummary(record) {
  const lines = record?.lineItems || []
  const totalQty = lines.reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0)
  const totalAmountExTax = lines.reduce((s, l) => s + (Number(l.totalPriceExTax) || 0), 0)
  const totalAmountInTax = lines.reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0)
  return { totalQty, totalAmountExTax, totalAmountInTax }
}
