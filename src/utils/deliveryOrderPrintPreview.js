/**
 * 发货单打印预览：与采购订单打印同款 sessionStorage + 新窗口预览逻辑
 */

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

  const lineItems = (row.lineItems || []).map((line, index) => ({
    seq: index + 1,
    productName: formatPrintFieldValue(line.productName || line.itemName),
    productCode: formatPrintFieldValue(line.productCode || line.itemCode),
    shipQty: formatPrintQty(line.shipQty),
    unitPriceExTax: formatPrintMoney(line.deliveryUnitPriceExTax ?? line.unitPriceExTax),
    amountExTax: formatPrintMoney(line.deliveryAmountExTax ?? line.amountExTax),
    remark: formatPrintFieldValue(line.remark),
  }))

  const basicFields = [
    { label: '发货单号', value: row.deliveryCode },
    { label: '源单号', value: row.sourceOrderNo },
    { label: '发货状态', value: row.deliveryStatus },
    { label: '客户', value: row.customerName },
    { label: '业务员', value: row.salesperson },
    { label: '单据日期', value: row.documentDate },
    { label: '申请发货数量', value: formatPrintQty(row.applyShipQty) },
    { label: '实际出库数量', value: formatPrintQty(row.actualOutboundQty) },
    { label: '发货重量', value: row.shipWeight },
    { label: '发货总金额（不含税）', value: formatPrintMoney(row.totalAmountExTax) },
    { label: '交货方式', value: row.shipmentMethod },
    { label: '物流单号', value: row.logisticsNo },
    { label: '出库仓库', value: row.outboundWarehouse },
    { label: '客户联系人', value: row.contactPerson },
    { label: '联系方式', value: row.contactPhone },
    { label: '司机姓名', value: row.driverName },
    { label: '司机联系方式', value: row.driverPhone },
    { label: '交货地址', value: row.deliveryAddress, wide: true },
    { label: '备注', value: row.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalShipQty = (row.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0)

  return {
    deliveryCode: formatPrintFieldValue(row.deliveryCode),
    orderNo: formatPrintFieldValue(row.deliveryCode),
    title: '发货单',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalShipQty),
      amountExTax: formatPrintMoney(row.totalAmountExTax),
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
