/**
 * 出库信息列表：一物料一行（字段对齐外协订单「发料信息」）
 */

function isOutboundCompleted(order) {
  const status = order?.status || ''
  return status === '已出库' || status === '已完成'
}

/**
 * @param {object[]} orders 出库单列表
 * @returns {Array<object>}
 */
export function flattenOutboundOrdersToIssueLines(orders = []) {
  const rows = []
  ;(orders || []).forEach((order) => {
    if (!order) return
    const outboundOrderNo = order.docNo || order.issueOrderNo || order.outboundOrderNo || ''
    const outboundId = order.id || ''
    const outboundStatus = order.status || order.outboundStatus || ''
    const completed = isOutboundCompleted(order) || outboundStatus === '已出库'
    const confirmedAt = completed
      ? order.completedAt || order.outboundTime || order.confirmedAt || ''
      : order.confirmedAt || ''
    const confirmer = completed
      ? order.confirmer || order.warehouseKeeper || order.handler || ''
      : order.confirmer || ''
    const createdAt = order.createdAt || ''
    const creator = order.creator || order.handler || ''
    const lines = order.lineItems || []

    if (!lines.length) {
      rows.push({
        id: `${outboundId || outboundOrderNo || 'empty'}-empty`,
        outboundId,
        outboundStatus,
        outboundOrderNo,
        productName: '',
        productCode: '',
        specModel: '',
        material: '',
        applyQty: null,
        actualQty: null,
        unit: '',
        confirmedAt,
        confirmer,
        createdAt,
        creator,
      })
      return
    }

    lines.forEach((line, idx) => {
      const applyQty =
        line.applyQty != null
          ? Number(line.applyQty)
          : line.issueQty != null
            ? Number(line.issueQty)
            : Number(line.shipQty) || null
      const actualQty = completed
        ? Number(line.actualQty ?? line.shippedQty ?? line.shipQty) || 0
        : line.actualQty != null
          ? Number(line.actualQty)
          : null
      rows.push({
        id: line.id || `${outboundId}-${idx}`,
        outboundId,
        outboundStatus,
        outboundOrderNo,
        productName: line.itemName || line.productName || '',
        productCode: line.itemCode || line.productCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty,
        actualQty,
        unit: line.unit || '',
        confirmedAt,
        confirmer,
        createdAt,
        creator,
      })
    })
  })
  return rows
}
