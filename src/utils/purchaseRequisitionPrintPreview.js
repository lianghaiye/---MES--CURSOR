/**
 * 采购申请明细打印预览：与工单/采购订单打印同款 sessionStorage + 新窗口预览
 */

import { formatNumber } from '@/utils/numberFormat'

const STORAGE_PREFIX = 'purchase-requisition-print-preview:'

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
  return formatNumber(n, 4, { empty: '' })
}

function formatPrintTaxRate(val) {
  if (val == null || val === '') return ''
  const text = String(val).trim()
  if (!text) return ''
  if (text.endsWith('%')) return text
  const n = Number(text)
  if (!Number.isFinite(n)) return text
  return `${formatNumber(n, 4, { empty: '' })}%`
}

/** 构建单张采购申请打印数据（含明细） */
export function buildPurchaseRequisitionPrintPayload(requisition, options = {}) {
  if (!requisition) return null

  const headerWarehouse = formatPrintFieldValue(requisition.receivingWarehouse)

  const lineItems = (requisition.lineItems || []).map((line, index) => ({
    seq: index + 1,
    productName: formatPrintFieldValue(line.productName || line.inventoryName),
    productCode: formatPrintFieldValue(line.productCode || line.inventoryCode),
    specModel: formatPrintFieldValue(line.specModel),
    material: formatPrintFieldValue(line.material),
    drawingNo: formatPrintFieldValue(line.drawingNo),
    orderSizeText: formatPrintFieldValue(line.orderSizeText || line.blankSizeText),
    planPurchaseQty: formatPrintQty(line.planPurchaseQty),
    unit: formatPrintFieldValue(line.unit || line.purchaseUnit),
    unitPriceExTax: formatPrintMoney(line.unitPriceExTax),
    taxRate: formatPrintTaxRate(line.taxRate),
    unitPriceInTax: formatPrintMoney(line.unitPriceInTax),
    totalPriceExTax: formatPrintMoney(line.totalPriceExTax),
    totalPriceInTax: formatPrintMoney(line.totalPriceInTax),
    supplierName: formatPrintFieldValue(line.supplierName),
    receivingWarehouse: formatPrintFieldValue(line.receivingWarehouse) || headerWarehouse,
    salesOrderNo: formatPrintFieldValue(line.salesOrderNo || requisition.salesOrderNo),
    remark: formatPrintFieldValue(line.remark),
  }))

  const basicFields = [
    { label: '单据状态', value: requisition.docStatus },
    { label: '紧急度', value: requisition.urgency },
    { label: '销售单号', value: requisition.salesOrderNo },
    { label: '采购单号', value: requisition.purchaseOrderNo },
    { label: '来源', value: requisition.source },
    { label: '交货日期', value: requisition.deliveryDate },
    { label: '期望到货日期', value: requisition.estimatedArrivalDate },
    { label: '逾期状态', value: requisition.overdueStatus },
    { label: '创建人', value: requisition.creator },
    { label: '创建时间', value: requisition.createdAt },
    { label: '更新人', value: requisition.updater || requisition.operator },
    { label: '更新时间', value: requisition.updatedAt },
    { label: '备注', value: requisition.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalPlanQty =
    requisition.plannedQty ??
    (requisition.lineItems || []).reduce((s, l) => s + (Number(l.planPurchaseQty) || 0), 0)
  const amountExTax = (requisition.lineItems || []).reduce(
    (s, l) => s + (Number(l.totalPriceExTax) || 0),
    0,
  )
  const amountInTax = (requisition.lineItems || []).reduce(
    (s, l) => s + (Number(l.totalPriceInTax) || 0),
    0,
  )

  return {
    reqNo: formatPrintFieldValue(requisition.reqNo),
    title: '采购申请明细',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalPlanQty: formatPrintQty(totalPlanQty),
      amountExTax: formatPrintMoney(amountExTax),
      amountInTax: formatPrintMoney(amountInTax),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildPurchaseRequisitionBatchPrintPayload(requisitions, options = {}) {
  const sheets = (requisitions || [])
    .map((req) => buildPurchaseRequisitionPrintPayload(req, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function savePurchaseRequisitionPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadPurchaseRequisitionPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openPurchaseRequisitionPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = savePurchaseRequisitionPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'procurement-purchase-req-preview', query })
  window.open(href, '_blank')
}
