/**
 * 采购订单详情 — 入库信息行（一物料一行）
 */
function isConfirmedInbound(order) {
  const status = order?.status || ''
  return status === '已完成' || status === '已入库' || status === '已确认'
}

export function flattenPurchaseOrderInboundLines(orders = []) {
  const rows = []
  ;(orders || []).forEach((order) => {
    const confirmed = isConfirmedInbound(order)
    ;(order.lineItems || []).forEach((line, idx) => {
      const applyQty = Number(line.applyQty ?? line.qty) || 0
      const actualQty = confirmed
        ? Number(line.actualQty ?? line.receivedQty ?? line.qty) || 0
        : Number(line.actualQty ?? line.receivedQty) || 0
      rows.push({
        id: `${order.id}-${line.id || idx}`,
        orderId: order.id,
        inboundStatus: order.status || '',
        docNo: order.docNo || '',
        itemName: line.itemName || line.productName || '',
        itemCode: line.itemCode || line.productCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty,
        actualQty,
        inboundAt: order.confirmedAt || order.inboundDate || '',
        confirmer: order.confirmer || '',
        createdAt: order.createdAt || '',
        creator: order.creator || order.handler || '',
      })
    })
  })
  return rows
}
