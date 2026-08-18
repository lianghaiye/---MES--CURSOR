/**
 * 销售订单打印预览：与采购订单打印同款 sessionStorage + 新窗口预览逻辑
 */

import { DISCOUNT_STRATEGY_LABELS } from '@/utils/salesOrderPricing'

const STORAGE_PREFIX = 'sales-order-print-preview:'

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

function formatPrintTaxRate(val) {
  if (val == null || val === '') return ''
  const text = String(val).trim()
  if (!text) return ''
  if (text.endsWith('%')) return text
  const n = Number(text)
  if (!Number.isFinite(n)) return text
  return `${n}%`
}

/** 构建单张销售订单打印数据（含明细） */
export function buildSalesOrderPrintPayload(order, options = {}) {
  if (!order) return null

  const lineItems = (order.lineItems || []).map((line, index) => ({
    seq: index + 1,
    productName: formatPrintFieldValue(line.productName || line.itemName),
    productCode: formatPrintFieldValue(line.productCode || line.itemCode),
    specModel: formatPrintFieldValue(line.specModel),
    material: formatPrintFieldValue(line.material),
    variantAttr: formatPrintFieldValue(line.variantSummary || line.variantAttr),
    drawingNo: formatPrintFieldValue(line.drawingNo),
    salesQty: formatPrintQty(line.salesQty ?? line.qty),
    unit: formatPrintFieldValue(line.unit),
    unitPriceExTax: formatPrintMoney(line.unitPriceExTax),
    unitPriceInTax: formatPrintMoney(line.unitPriceInTax),
    taxRate: formatPrintTaxRate(line.taxRate),
    totalPriceExTax: formatPrintMoney(line.totalPriceExTax),
    totalPriceInTax: formatPrintMoney(line.totalPriceInTax ?? line.amountInTax),
    deliveryDate: formatPrintFieldValue(line.deliveryDate),
    deliveryMode: formatPrintFieldValue(line.deliveryMode || '整机'),
    remark: formatPrintFieldValue(line.supplementDesc || line.remark || line.lineRemark),
  }))

  const basicFields = [
    { label: '客户名称', value: order.customerName },
    { label: '业务员', value: order.salesperson },
    { label: '订单类型', value: order.orderType },
    { label: '合同编号', value: order.contractNo },
    { label: '紧急度', value: order.urgency },
    { label: '状态', value: order.progressStatus },
    { label: '发货状态', value: order.deliveryStatus || '未发货' },
    { label: '结算币种', value: order.settlementCurrency },
    { label: '结算类型', value: order.settlementType },
    { label: '交货方式', value: order.deliveryMethod },
    {
      label: '折扣策略',
      value: DISCOUNT_STRATEGY_LABELS[order.discountStrategy] || '无折扣',
    },
    { label: '联系人', value: order.contactPerson },
    { label: '联系电话', value: order.contactPhone },
    { label: '创建人', value: order.creator },
    { label: '创建时间', value: order.createdAt },
    { label: '交货地址', value: order.deliveryAddress, wide: true },
    { label: '备注', value: order.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalQty = (order.lineItems || []).reduce(
    (s, l) => s + (Number(l.salesQty ?? l.qty) || 0),
    0,
  )

  return {
    orderNo: formatPrintFieldValue(order.orderNo),
    title: '销售订单',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalQty),
      amountExTax: formatPrintMoney(order.amountExTax ?? order.orderAmountExTax),
      amountInTax: formatPrintMoney(order.amountInTax ?? order.orderAmount),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildSalesOrderBatchPrintPayload(rows, options = {}) {
  const sheets = (rows || [])
    .map((row) => buildSalesOrderPrintPayload(row, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveSalesOrderPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadSalesOrderPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openSalesOrderPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveSalesOrderPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'sales-order-preview', query })
  window.open(href, '_blank')
}
