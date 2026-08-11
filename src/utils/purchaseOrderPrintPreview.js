/**
 * 采购订单打印预览：与工单打印同款 sessionStorage + 新窗口预览逻辑
 */

import { computePurchaseOrderOverdueStatus } from '@/mock/purchaseOrders'

const STORAGE_PREFIX = 'purchase-order-print-preview:'

function formatPrintFieldValue(value) {
  if (value === 0) return '0'
  return String(value ?? '').trim()
}

function formatPrintQty(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Math.round(n * 10000) / 10000)
}

function formatPrintMoney(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** 构建单张采购订单打印数据（含明细） */
export function buildPurchaseOrderPrintPayload(order, options = {}) {
  if (!order) return null

  const lineItems = (order.lineItems || []).map((line, index) => ({
    seq: index + 1,
    productName: formatPrintFieldValue(line.productName || line.itemName),
    productCode: formatPrintFieldValue(line.productCode || line.itemCode),
    specModel: formatPrintFieldValue(line.specModel),
    material: formatPrintFieldValue(line.material),
    drawingNo: formatPrintFieldValue(line.drawingNo),
    orderSizeText: formatPrintFieldValue(line.orderSizeText || line.blankSizeText),
    purchaseQty: formatPrintQty(line.purchaseQty),
    unit: formatPrintFieldValue(line.unit || line.purchaseUnit),
    unitPriceExTax: formatPrintMoney(line.unitPriceExTax),
    taxRate: formatPrintFieldValue(line.taxRate),
    unitPriceInTax: formatPrintMoney(line.unitPriceInTax),
    totalPriceExTax: formatPrintMoney(line.totalPriceExTax),
    totalPriceInTax: formatPrintMoney(line.totalPriceInTax),
    deliveryDate: formatPrintFieldValue(line.deliveryDate),
    receivingWarehouse: formatPrintFieldValue(line.receivingWarehouse),
    remark: formatPrintFieldValue(line.remark),
  }))

  const basicFields = [
    { label: '采购单号', value: order.orderNo },
    { label: '供应商', value: order.supplier },
    { label: '采购类型', value: order.applyType },
    { label: '采购申请单号', value: order.reqNo },
    { label: '销售单号', value: order.salesOrderNo },
    { label: '生产工单号', value: order.workOrderNo },
    { label: '合同编号', value: order.contractNo },
    { label: '订单来源', value: order.orderSource },
    { label: '状态', value: order.status },
    { label: '入库状态', value: order.inboundStatus },
    {
      label: '逾期状态',
      value: order.overdueStatus || computePurchaseOrderOverdueStatus(order),
    },
    { label: '结算类型', value: order.settlementType },
    { label: '结算周期', value: order.settlementCycle },
    { label: '结算方式', value: order.settlementMethod },
    { label: '交货方式', value: order.deliveryMethod },
    { label: '供货期/天', value: order.leadTimeDays },
    { label: '交货日期', value: order.deliveryDate },
    { label: '收货仓库', value: order.receivingWarehouse },
    { label: '采购员', value: order.purchaser },
    { label: '创建人', value: order.creator },
    { label: '创建日期', value: order.documentDate },
    { label: '联系人', value: order.contactPerson },
    { label: '联系方式', value: order.contactPhone },
    { label: '收货地址', value: order.shippingAddress, wide: true },
    { label: '备注', value: order.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalQty = order.totalQty ?? lineItems.reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0)
  const amountExTax =
    order.amountExTax ??
    (order.lineItems || []).reduce((s, l) => s + (Number(l.totalPriceExTax) || 0), 0)
  const amountInTax =
    order.amountInTax ??
    (order.lineItems || []).reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0)

  return {
    orderNo: formatPrintFieldValue(order.orderNo),
    supplier: formatPrintFieldValue(order.supplier),
    title: '采购订单',
    subtitle: formatPrintFieldValue(order.supplier) || '采购订单明细',
    basicFields,
    lineItems,
    summary: {
      totalQty: formatPrintQty(totalQty),
      amountExTax: formatPrintMoney(amountExTax),
      amountInTax: formatPrintMoney(amountInTax),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

/** 批量：多张采购订单各打一页 */
export function buildPurchaseOrderBatchPrintPayload(orders, options = {}) {
  const sheets = (orders || [])
    .map((order) => buildPurchaseOrderPrintPayload(order, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function savePurchaseOrderPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadPurchaseOrderPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openPurchaseOrderPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = savePurchaseOrderPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'procurement-purchase-order-preview', query })
  window.open(href, '_blank')
}
