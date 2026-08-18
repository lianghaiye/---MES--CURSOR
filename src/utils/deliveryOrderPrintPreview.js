/**
 * 发货单打印预览：与采购订单打印同款 sessionStorage + 新窗口预览逻辑
 */

import { getSalesOrderById } from '@/store/salesOrderStore'
import { enrichDeliveryLineForDisplay, recalcDeliveryLine } from '@/utils/deliveryLine'

const STORAGE_PREFIX = 'delivery-order-print-preview:'

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

/** 构建单张发货单打印数据（含明细） */
export function buildDeliveryOrderPrintPayload(row, options = {}) {
  if (!row) return null

  const salesOrder = row.salesOrderId ? getSalesOrderById(row.salesOrderId) : null
  const lineItems = (row.lineItems || []).map((line, index) => {
    const enriched = enrichDeliveryLineForDisplay(line, salesOrder, {
      outboundWarehouse: row.outboundWarehouse,
    })
    recalcDeliveryLine(enriched)
    return {
      seq: index + 1,
      productName: formatPrintFieldValue(enriched.productName || enriched.itemName),
      productCode: formatPrintFieldValue(enriched.productCode || enriched.itemCode),
      specModel: formatPrintFieldValue(enriched.specModel),
      material: formatPrintFieldValue(enriched.material),
      variantAttr: formatPrintFieldValue(enriched.variantAttr || enriched.variantSummary),
      unit: formatPrintFieldValue(enriched.unit),
      shipQty: formatPrintQty(enriched.shipQty),
      shipWarehouse: formatPrintFieldValue(enriched.shipWarehouse || row.outboundWarehouse),
      packagingForm: formatPrintFieldValue(enriched.packagingForm),
      unitPriceInTax: formatPrintMoney(enriched.deliveryUnitPriceInTax),
      amountInTax: formatPrintMoney(enriched.deliveryAmountInTax),
      remark: formatPrintFieldValue(enriched.lineRemark || enriched.remark),
    }
  })

  const basicFields = [
    { label: '源单号', value: row.sourceOrderNo },
    { label: '发货状态', value: row.deliveryStatus },
    { label: '客户', value: row.customerName },
    { label: '业务员', value: row.salesperson },
    { label: '单据日期', value: row.documentDate },
    { label: '交货方式', value: row.shipmentMethod },
    { label: '物流单号', value: row.logisticsNo },
    { label: '客户联系人', value: row.contactPerson },
    { label: '联系方式', value: row.contactPhone },
    { label: '司机姓名', value: row.driverName },
    { label: '司机联系方式', value: row.driverPhone },
    { label: '车牌号', value: row.plateNo },
    { label: '交货地址', value: row.deliveryAddress, wide: true },
    { label: '备注', value: row.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalShipQty = (row.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0)
  const amountInTax = (row.lineItems || []).reduce((s, l) => {
    const amt = Number(l.deliveryAmountInTax)
    if (Number.isFinite(amt)) return s + amt
    const qty = Number(l.shipQty) || 0
    const price = Number(l.deliveryUnitPriceInTax ?? l.unitPriceInTax) || 0
    return s + qty * price
  }, 0)

  return {
    deliveryCode: formatPrintFieldValue(row.deliveryCode),
    orderNo: formatPrintFieldValue(row.deliveryCode),
    title: '发货单',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalShipQty),
      amountInTax: formatPrintMoney(amountInTax),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildDeliveryOrderBatchPrintPayload(rows, options = {}) {
  const sheets = (rows || [])
    .map((row) => buildDeliveryOrderPrintPayload(row, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveDeliveryOrderPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadDeliveryOrderPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openDeliveryOrderPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveDeliveryOrderPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'sales-delivery-preview', query })
  window.open(href, '_blank')
}
