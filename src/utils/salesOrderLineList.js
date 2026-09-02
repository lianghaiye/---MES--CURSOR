import dayjs from 'dayjs'
import { calcSalesLineShippedQty } from '@/utils/salesLineShipped'
import { normalizeSalesOrderProgressStatus } from '@/utils/salesOrderStatus'
import { stockFulfillmentModeLabel } from '@/utils/salesStockFulfillment'

/** 行发货状态（与订单头发货状态口径一致） */
export const SALES_LINE_DELIVERY_STATUS = {
  NOT_SHIPPED: '未发货',
  PARTIAL: '部分发货',
  SHIPPED: '已发货',
}

export const SALES_LINE_DELIVERY_STATUS_OPTIONS = [
  SALES_LINE_DELIVERY_STATUS.NOT_SHIPPED,
  SALES_LINE_DELIVERY_STATUS.PARTIAL,
  SALES_LINE_DELIVERY_STATUS.SHIPPED,
]

/**
 * 按已确认出库数量相对销售数量推导行发货状态
 * @param {object} order
 * @param {object} line
 * @returns {'未发货'|'部分发货'|'已发货'}
 */
export function resolveSalesLineDeliveryStatus(order, line) {
  const salesQty = Number(line?.salesQty ?? line?.qty) || 0
  const shippedQty = calcSalesLineShippedQty(order, line)
  if (shippedQty <= 1e-9) return SALES_LINE_DELIVERY_STATUS.NOT_SHIPPED
  if (salesQty > 0 && shippedQty + 1e-9 >= salesQty) return SALES_LINE_DELIVERY_STATUS.SHIPPED
  return SALES_LINE_DELIVERY_STATUS.PARTIAL
}

/**
 * 将销售订单展平为销售明细行（头字段冗余到行）
 * @param {object[]} orders
 * @returns {object[]}
 */
export function flattenSalesOrderLines(orders = []) {
  const rows = []
  for (const order of orders || []) {
    const lines = order.lineItems || []
    lines.forEach((line, lineIndex) => {
      const salesQty = Number(line.salesQty ?? line.qty) || 0
      const shippedQty = calcSalesLineShippedQty(order, line)
      const lineDeliveryStatus = resolveSalesLineDeliveryStatus(order, line)
      rows.push({
        id: `${order.id}__${line.id || lineIndex}`,
        lineId: line.id || '',
        lineIndex,
        orderId: order.id,
        orderNo: order.orderNo || '',
        progressStatus: normalizeSalesOrderProgressStatus(order.progressStatus),
        customerName: order.customerName || '',
        salesperson: order.salesperson || '',
        contractNo: order.contractNo || '',
        orderSource: order.orderSource || '',
        urgency: order.urgency || '',
        createdAt: order.createdAt || '',
        creator: order.creator || '',
        documentDate: order.documentDate || '',
        productName: line.productName || '',
        productCode: line.productCode || '',
        businessType: line.businessType || order.businessType || '',
        productAttr: line.productAttr || '',
        specModel: line.specModel || '',
        material: line.material || '',
        variantSummary: line.variantSummary || '',
        drawingNo: line.drawingNo || '',
        techParams: line.techParams || '',
        matchingRequirements: line.matchingRequirements || '',
        salesQty,
        shippedQty,
        unshippedQty: Math.max(0, salesQty - shippedQty),
        lineDeliveryStatus,
        deliveryMode: line.deliveryMode || '',
        stockFulfillmentMode: line.stockFulfillmentMode || '',
        stockFulfillmentModeLabel: stockFulfillmentModeLabel(line.stockFulfillmentMode),
        stockTakeQty: line.stockTakeQty,
        planProduceQty: line.planProduceQty,
        deliveryDate: line.deliveryDate || '',
        unit: line.unit || '',
        bomName: line.bomName || '',
        bomVersion: line.bomVersion || '',
        unitPriceExTax: line.unitPriceExTax,
        unitPriceInTax: line.unitPriceInTax,
        taxRate: line.taxRate,
        totalPriceExTax: line.totalPriceExTax,
        totalPriceInTax: line.totalPriceInTax,
        lineDiscountRate: line.lineDiscountRate,
        lineDiscountAmount: line.lineDiscountAmount,
        packagingForm: line.packagingForm || '',
        supplementDesc: line.supplementDesc || '',
        lineRemark: line.lineRemark || '',
      })
    })
  }
  return rows
}

function includesText(haystack, needle) {
  if (!needle) return true
  return String(haystack || '')
    .toLowerCase()
    .includes(String(needle).trim().toLowerCase())
}

function inDateRange(value, range) {
  if (!range || range.length !== 2) return true
  if (!value) return false
  const d = dayjs(value)
  if (!d.isValid()) return false
  const start = dayjs(range[0]).startOf('day')
  const end = dayjs(range[1]).endOf('day')
  return (d.isAfter(start) || d.isSame(start)) && (d.isBefore(end) || d.isSame(end))
}

/**
 * @param {object[]} rows flattenSalesOrderLines 结果
 * @param {object} filters
 */
export function filterSalesOrderLines(rows = [], filters = {}) {
  const f = filters || {}
  return rows.filter((row) => {
    if (f.orderNo && !includesText(row.orderNo, f.orderNo)) return false
    if (f.customerName && row.customerName !== f.customerName) return false
    if (f.productName && !includesText(row.productName, f.productName)) return false
    if (f.productCode && !includesText(row.productCode, f.productCode)) return false
    if (f.salesperson && row.salesperson !== f.salesperson) return false
    if (f.progressStatus && row.progressStatus !== f.progressStatus) return false
    if (f.lineDeliveryStatus && row.lineDeliveryStatus !== f.lineDeliveryStatus) return false
    if (f.businessType && row.businessType !== f.businessType) return false
    if (f.deliveryMode && row.deliveryMode !== f.deliveryMode) return false
    if (!inDateRange(row.deliveryDate, f.deliveryDateRange)) return false
    return true
  })
}

/** 默认排序：交货日期升序（空值靠后），再按销售单号、行序 */
export function compareSalesOrderLinesDefault(a, b) {
  const da = a.deliveryDate ? dayjs(a.deliveryDate).valueOf() : Number.POSITIVE_INFINITY
  const db = b.deliveryDate ? dayjs(b.deliveryDate).valueOf() : Number.POSITIVE_INFINITY
  if (da !== db) return da - db
  const noCmp = String(b.orderNo || '').localeCompare(String(a.orderNo || ''), 'zh-CN')
  if (noCmp) return noCmp
  return (a.lineIndex || 0) - (b.lineIndex || 0)
}
