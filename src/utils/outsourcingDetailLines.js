import dayjs from 'dayjs'
import {
  calcWxLineAppliedOccupyQty,
  calcWxLineReceivedQty,
  formatWxInboundProgress,
} from '@/utils/outsourcingInbound'
import { formatOutsourcingPlanDateDisplay } from '@/mock/outsourcingOrders'

function lineProductName(line) {
  return line.productName || line.itemName || ''
}

function lineProductCode(line) {
  return line.productCode || line.itemCode || ''
}

/** 根据外协入库单汇总明细行的入库日期 */
export function resolveInboundDatesForWxLine(
  inboundOrders,
  outsourcingOrderId,
  orderNo,
  wxLineId,
  itemCode,
) {
  const dates = []
  for (const inbound of inboundOrders || []) {
    const matchedOrder =
      (outsourcingOrderId && inbound.outsourcingOrderId === outsourcingOrderId) ||
      (orderNo &&
        inbound.sourceOrderNo === orderNo &&
        (inbound.sourceType === '外协订单' ||
          inbound.sourceType === '外协单' ||
          inbound.inboundType === '外协入库'))
    if (!matchedOrder) continue
    for (const line of inbound.lineItems || []) {
      const lineMatched =
        (wxLineId && (line.wxLineId === wxLineId || line.poLineId === wxLineId)) ||
        (itemCode && line.itemCode === itemCode)
      if (lineMatched && inbound.inboundDate) {
        dates.push(String(inbound.inboundDate).slice(0, 10))
      }
    }
  }
  return [...new Set(dates)].sort().join('、')
}

/** 将外协订单明细展开为行级列表 */
export function buildOutsourcingDetailLines(orders = [], inboundOrders = []) {
  const rows = []
  for (const order of orders) {
    for (const line of order.lineItems || []) {
      const itemCode = lineProductCode(line)
      const planQty = Number(line.planQty) || 0
      const receivedQty = calcWxLineReceivedQty(order, line)
      const appliedInboundQty = calcWxLineAppliedOccupyQty(order, line)
      rows.push({
        id: `${order.id}-${line.id}`,
        orderId: order.id,
        lineId: line.id,
        orderNo: order.orderNo,
        inboundProgress: formatWxInboundProgress(receivedQty, appliedInboundQty, planQty),
        productName: lineProductName(line),
        productCode: itemCode,
        specModel: line.specModel || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        planQty,
        purchaseQty: planQty,
        unitPriceExTax: line.unitPriceExTax,
        taxRate: line.taxRate,
        unitPriceInTax: line.unitPriceInTax,
        totalPriceInTax: line.totalPriceInTax,
        totalPriceExTax: line.totalPriceExTax,
        receivingWarehouse: line.shipWarehouse || '',
        receivedQty,
        deliveryDate: formatOutsourcingPlanDateDisplay(order),
        inboundDate: resolveInboundDatesForWxLine(
          inboundOrders,
          order.id,
          order.orderNo,
          line.id,
          itemCode,
        ),
        workOrderName: order.workOrderName || '',
        salesOrderNo: order.salesOrderNo || '',
        contactPerson: order.contactPerson || '',
        creator: order.creator || '',
        createdAt: order.createdAt || '',
        documentDate: order.planEndDate || order.planDate || '',
        supplier: order.supplier || '',
        status: order.status || '',
      })
    }
  }
  return rows
}

export function filterOutsourcingDetailLines(rows, filters = {}) {
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
    if (filters.contactPerson && row.contactPerson !== filters.contactPerson) {
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

export function formatOutsourcingDetailQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export function formatOutsourcingDetailMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatOutsourcingDetailDate(val) {
  if (!val) return '—'
  return String(val).slice(0, 10)
}
