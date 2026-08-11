/**
 * 采购收货单打印预览：与采购订单打印同款 sessionStorage + 新窗口预览逻辑
 */

const STORAGE_PREFIX = 'purchase-receipt-print-preview:'

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

/** 构建单张采购收货单打印数据（含明细） */
export function buildPurchaseReceiptPrintPayload(receipt, options = {}) {
  if (!receipt) return null

  const lineItems = (receipt.lineItems || []).map((line, index) => ({
    seq: index + 1,
    productName: formatPrintFieldValue(line.itemName || line.productName),
    productCode: formatPrintFieldValue(line.itemCode || line.productCode),
    specModel: formatPrintFieldValue(line.specModel),
    material: formatPrintFieldValue(line.material),
    drawingNo: formatPrintFieldValue(line.drawingNo),
    variantSummary: formatPrintFieldValue(line.variantSummary),
    purchaseQty: formatPrintQty(line.purchaseQty),
    receiptQty: formatPrintQty(line.receiptQty),
    unit: formatPrintFieldValue(line.unit || line.purchaseUnit),
    receivingWarehouse: formatPrintFieldValue(line.receivingWarehouse),
    receivingMode: formatPrintFieldValue(line.receivingMode),
    remark: formatPrintFieldValue(line.remark),
  }))

  // 单号已在页眉展示，表头不再重复收货单号；单据状态紧跟单号之后
  const basicFields = [
    { label: '单据状态', value: receipt.receiptStatus },
    { label: '采购单号', value: receipt.purchaseOrderNo },
    { label: '供应商', value: receipt.supplier },
    { label: '采购员', value: receipt.purchaser },
    { label: '质检结果', value: receipt.qcStatus },
    { label: '入库状态', value: receipt.inboundStatus },
    { label: '入库单号', value: receipt.inboundOrderNo },
    { label: '质检单号', value: receipt.qcNo },
    { label: '创建人', value: receipt.creator },
    { label: '创建时间', value: receipt.createdAt },
    { label: '更新人', value: receipt.updater },
    { label: '更新时间', value: receipt.updatedAt },
    { label: '备注', value: receipt.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalReceiptQty = (receipt.lineItems || []).reduce(
    (s, l) => s + (Number(l.receiptQty) || 0),
    0,
  )

  return {
    receiptNo: formatPrintFieldValue(receipt.receiptNo),
    orderNo: formatPrintFieldValue(receipt.receiptNo),
    supplier: formatPrintFieldValue(receipt.supplier),
    title: '采购收货单',
    subtitle: '',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalReceiptQty),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

/** 批量：多张收货单各打一页 */
export function buildPurchaseReceiptBatchPrintPayload(receipts, options = {}) {
  const sheets = (receipts || [])
    .map((receipt) => buildPurchaseReceiptPrintPayload(receipt, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function savePurchaseReceiptPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadPurchaseReceiptPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openPurchaseReceiptPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = savePurchaseReceiptPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'procurement-purchase-receipt-preview', query })
  window.open(href, '_blank')
}
