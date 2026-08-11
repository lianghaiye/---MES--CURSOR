/**
 * 采购退货单打印预览：与采购订单打印同款 sessionStorage + 新窗口预览逻辑
 */

const STORAGE_PREFIX = 'purchase-return-print-preview:'

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

/** 构建单张采购退货单打印数据（含明细） */
export function buildPurchaseReturnPrintPayload(row, options = {}) {
  if (!row) return null

  const lineItems = (row.lineItems || []).map((line, index) => ({
    seq: index + 1,
    productName: formatPrintFieldValue(line.productName || line.itemName),
    productCode: formatPrintFieldValue(line.productCode || line.itemCode),
    specModel: formatPrintFieldValue(line.specModel),
    material: formatPrintFieldValue(line.material),
    drawingNo: formatPrintFieldValue(line.drawingNo),
    variantSummary: formatPrintFieldValue(line.variantSummary),
    purchaseQty: formatPrintQty(line.purchaseQty),
    receivedQty: formatPrintQty(line.receivedQty),
    returnQty: formatPrintQty(line.returnQty),
    unit: formatPrintFieldValue(line.unit || line.purchaseUnit),
    shipWarehouse: formatPrintFieldValue(line.shipWarehouse),
    returnType: formatPrintFieldValue(line.returnType),
    remark: formatPrintFieldValue(line.remark),
  }))

  const basicFields = [
    { label: '采购单号', value: row.purchaseOrderNo },
    { label: '供应商', value: row.supplier },
    { label: '采购员', value: row.purchaser },
    { label: '状态', value: row.status },
    { label: '出库状态', value: row.outboundStatus },
    { label: '出库单号', value: row.outboundOrderNo },
    { label: '退货地址', value: row.returnAddress, wide: true },
    { label: '备注', value: row.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalReturnQty = (row.lineItems || []).reduce((s, l) => s + (Number(l.returnQty) || 0), 0)

  return {
    returnNo: formatPrintFieldValue(row.returnNo),
    orderNo: formatPrintFieldValue(row.returnNo),
    supplier: formatPrintFieldValue(row.supplier),
    title: '采购退货单',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalReturnQty),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

/** 批量：多张退货单各打一页 */
export function buildPurchaseReturnBatchPrintPayload(rows, options = {}) {
  const sheets = (rows || [])
    .map((row) => buildPurchaseReturnPrintPayload(row, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function savePurchaseReturnPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadPurchaseReturnPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openPurchaseReturnPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = savePurchaseReturnPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'procurement-purchase-return-preview', query })
  window.open(href, '_blank')
}
