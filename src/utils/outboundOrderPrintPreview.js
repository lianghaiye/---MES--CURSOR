/**
 * 出库单打印预览：sessionStorage + 新窗口预览
 */

import { outboundSourceLabel } from '@/mock/outboundOptions'
import { enrichOutboundLine, resolveOutboundStockUnit } from '@/utils/outboundLineHelpers'
import { formatQtyWithUnit } from '@/utils/numberFormat'

const STORAGE_PREFIX = 'outbound-order-print-preview:'

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

function formatShipQty(line) {
  const unit = resolveOutboundStockUnit(line)
  if (unit) return formatQtyWithUnit(line.shipQty, unit)
  return formatPrintQty(line.shipQty)
}

/** 构建单张出库单打印数据（含明细） */
export function buildOutboundOrderPrintPayload(row, options = {}) {
  if (!row) return null

  const lineItems = (row.lineItems || []).map((raw, index) => {
    const line = enrichOutboundLine({ ...raw })
    return {
      seq: index + 1,
      lineStatus: formatPrintFieldValue(line.lineStatus || '待出库'),
      itemCode: formatPrintFieldValue(line.itemCode),
      itemName: formatPrintFieldValue(line.itemName),
      specModel: formatPrintFieldValue(line.specModel),
      material: formatPrintFieldValue(line.material),
      variantAttr: formatPrintFieldValue(line.variantSummary || line.variantAttr),
      drawingNo: formatPrintFieldValue(line.drawingNo),
      blankSizeText: formatPrintFieldValue(line.blankSizeText),
      shipWarehouse: formatPrintFieldValue(line.shipWarehouse || row.warehouse),
      locationNo: formatPrintFieldValue(line.locationNo),
      shipQty: formatShipQty(line),
      packagingForm: formatPrintFieldValue(line.packagingForm),
      unitPrice: formatPrintMoney(line.unitPrice),
      totalPrice: formatPrintMoney(line.totalPrice),
      remark: formatPrintFieldValue(line.deliveryRemark || line.remark),
    }
  })

  const basicFields = [
    { label: '状态', value: row.status },
    { label: '出库类型', value: row.outboundType },
    { label: '来源', value: outboundSourceLabel(row.sourceChannel) },
    { label: '出库仓库', value: row.warehouse },
    { label: '领入仓库', value: row.receiveWarehouse },
    { label: '申请部门', value: row.requisitionDept },
    { label: '出库时间', value: row.outboundTime },
    { label: '源单编号', value: row.sourceOrderNo },
    { label: '销售订单', value: row.salesOrderNo },
    { label: '合同编号', value: row.contractNo },
    { label: '创建人', value: row.creator },
    { label: '创建时间', value: row.createdAt },
    { label: '操作人', value: row.auditor || row.handler },
    { label: '操作时间', value: row.auditDate },
    { label: '出库总重量(kg)', value: row.totalWeight },
    { label: '备注', value: row.remark, wide: true },
  ]
    .filter((field) => field.value != null && String(field.value).trim() !== '')
    .map((field) => ({
      ...field,
      value: formatPrintFieldValue(field.value),
    }))

  const totalShipQty = (row.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0)
  const totalPrice = (row.lineItems || []).reduce((s, l) => s + (Number(l.totalPrice) || 0), 0)

  return {
    docNo: formatPrintFieldValue(row.docNo),
    orderNo: formatPrintFieldValue(row.docNo),
    title: '出库单',
    outboundType: formatPrintFieldValue(row.outboundType),
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalShipQty),
      totalPrice: formatPrintMoney(totalPrice),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildOutboundOrderBatchPrintPayload(rows, options = {}) {
  const sheets = (rows || [])
    .map((row) => buildOutboundOrderPrintPayload(row, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveOutboundOrderPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadOutboundOrderPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openOutboundOrderPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveOutboundOrderPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'inventory-outbound-preview', query })
  window.open(href, '_blank')
}
