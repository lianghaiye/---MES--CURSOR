import dayjs from 'dayjs'

function lineProductName(line) {
  return line.productName || line.itemName || ''
}

function lineProductCode(line) {
  return line.productCode || line.itemCode || ''
}

/** 根据采购入库单汇总明细行的入库日期 */
export function resolveInboundDatesForPoLine(
  inboundOrders,
  purchaseOrderId,
  orderNo,
  poLineId,
  itemCode,
) {
  const dates = []
  for (const inbound of inboundOrders || []) {
    const matchedPo =
      (purchaseOrderId && inbound.purchaseOrderId === purchaseOrderId) ||
      (orderNo &&
        inbound.sourceOrderNo === orderNo &&
        (inbound.sourceType === '采购订单' ||
          inbound.sourceType === '采购单' ||
          inbound.inboundType === '采购入库'))
    if (!matchedPo) continue
    for (const line of inbound.lineItems || []) {
      const lineMatched =
        (poLineId && line.poLineId === poLineId) || (itemCode && line.itemCode === itemCode)
      if (lineMatched && inbound.inboundDate) {
        dates.push(String(inbound.inboundDate).slice(0, 10))
      }
    }
  }
  return [...new Set(dates)].sort().join('、')
}

/** 将采购订单明细展开为行级列表 */
export function buildPurchaseDetailLines(orders = [], inboundOrders = []) {
  const rows = []
  for (const order of orders) {
    for (const line of order.lineItems || []) {
      const itemCode = lineProductCode(line)
      rows.push({
        id: `${order.id}-${line.id}`,
        orderId: order.id,
        lineId: line.id,
        orderNo: order.orderNo,
        productName: lineProductName(line),
        productCode: itemCode,
        specModel: line.specModel || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        purchaseQty: Number(line.purchaseQty) || 0,
        unitPriceExTax: line.unitPriceExTax,
        taxRate: line.taxRate,
        unitPriceInTax: line.unitPriceInTax,
        totalPriceInTax: line.totalPriceInTax,
        totalPriceExTax: line.totalPriceExTax,
        receivingWarehouse: line.receivingWarehouse || order.receivingWarehouse || '',
        receivedQty: Number(line.receivedQty) || 0,
        deliveryDate: line.deliveryDate || order.deliveryDate || '',
        inboundDate: resolveInboundDatesForPoLine(
          inboundOrders,
          order.id,
          order.orderNo,
          line.id,
          itemCode,
        ),
        workOrderNo: order.workOrderNo || '',
        salesOrderNo: order.salesOrderNo || '',
        purchaser: order.purchaser || '',
        documentDate: order.documentDate || '',
        supplier: order.supplier || '',
      })
    }
  }
  return rows
}

export function filterPurchaseDetailLines(rows, filters = {}) {
  return rows.filter((row) => {
    if (filters.orderNo && !String(row.orderNo).includes(String(filters.orderNo).trim())) {
      return false
    }
    if (filters.supplier && row.supplier !== filters.supplier) {
      return false
    }
    if (
      filters.productName &&
      !String(row.productName).includes(String(filters.productName).trim())
    ) {
      return false
    }
    if (filters.specModel && !String(row.specModel).includes(String(filters.specModel).trim())) {
      return false
    }
    if (filters.material && !String(row.material).includes(String(filters.material).trim())) {
      return false
    }
    if (filters.drawingNo && !String(row.drawingNo).includes(String(filters.drawingNo).trim())) {
      return false
    }
    if (filters.receivingWarehouse && row.receivingWarehouse !== filters.receivingWarehouse) {
      return false
    }
    if (filters.purchaser && row.purchaser !== filters.purchaser) {
      return false
    }
    if (filters.documentDateRange?.length === 2) {
      const [start, end] = filters.documentDateRange
      const startStr = typeof start === 'string' ? start : start?.format?.('YYYY-MM-DD')
      const endStr = typeof end === 'string' ? end : end?.format?.('YYYY-MM-DD')
      if (!row.documentDate || !startStr || !endStr) return false
      if (
        dayjs(row.documentDate).isBefore(startStr, 'day') ||
        dayjs(row.documentDate).isAfter(endStr, 'day')
      ) {
        return false
      }
    }
    return true
  })
}

export function formatPurchaseDetailQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export function formatPurchaseDetailMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPurchaseDetailDate(val) {
  if (!val) return '—'
  return String(val).slice(0, 10)
}
