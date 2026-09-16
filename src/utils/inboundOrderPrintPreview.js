/**
 * 入库单打印预览：sessionStorage + 新窗口预览
 */

import { inboundSourceLabel } from '@/mock/inboundOptions'
import {
  enrichInboundLine,
  getStockUnitQtyValue,
  resolveInboundStockUnit,
} from '@/utils/inboundLineHelpers'
import { formatQtyWithUnit } from '@/utils/numberFormat'

const STORAGE_PREFIX = 'inbound-order-print-preview:'

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

function formatInboundQty(line) {
  const qty = getStockUnitQtyValue(line)
  const unit = resolveInboundStockUnit(line)
  if (unit) return formatQtyWithUnit(qty, unit)
  return formatPrintQty(qty)
}

/** 构建单张入库单打印数据（含明细） */
export function buildInboundOrderPrintPayload(row, options = {}) {
  if (!row) return null

  const lineItems = (row.lineItems || []).map((raw, index) => {
    const line = enrichInboundLine({ ...raw })
    return {
      seq: index + 1,
      lineStatus: formatPrintFieldValue(line.lineStatus || '待入库'),
      itemCode: formatPrintFieldValue(line.itemCode),
      itemName: formatPrintFieldValue(line.itemName),
      specModel: formatPrintFieldValue(line.specModel || line.specAttr),
      material: formatPrintFieldValue(line.material),
      variantAttr: formatPrintFieldValue(line.variantSummary || line.variantAttr),
      drawingNo: formatPrintFieldValue(line.drawingNo),
      warehouse: formatPrintFieldValue(line.warehouse || row.warehouse),
      locationNo: formatPrintFieldValue(line.locationNo),
      qty: formatInboundQty(line),
      unitPrice: formatPrintMoney(line.unitPrice),
      totalPrice: formatPrintMoney(line.totalPrice),
      remark: formatPrintFieldValue(line.lineRemark || line.remark),
    }
  })

  const basicFields = [
    { label: '状态', value: row.status },
    { label: '入库类型', value: row.inboundType },
    { label: '来源', value: inboundSourceLabel(row.sourceChannel) },
    { label: '入库仓库', value: row.warehouse },
    { label: '仓管员', value: row.warehouseKeeper },
    { label: '入库日期', value: row.inboundDate },
    { label: '交货日期', value: row.deliveryDate },
    { label: '源单编号', value: row.sourceOrderNo },
    { label: '销售订单', value: row.salesOrderNo },
    { label: '合同编号', value: row.contractNo },
    { label: '申请部门', value: row.requisitionDept },
    { label: '供应商', value: row.supplier },
    { label: '创建人', value: row.creator },
    { label: '创建时间', value: row.createdAt },
    { label: '确认人', value: row.confirmer },
    { label: '确认时间', value: row.confirmedAt },
    { label: '备注', value: row.remark, wide: true },
  ]
    .filter((field) => field.value != null && String(field.value).trim() !== '')
    .map((field) => ({
      ...field,
      value: formatPrintFieldValue(field.value),
    }))

  const totalQty = (row.lineItems || []).reduce((s, l) => {
    const line = enrichInboundLine({ ...l })
    return s + (Number(getStockUnitQtyValue(line)) || 0)
  }, 0)
  const totalPrice = (row.lineItems || []).reduce((s, l) => s + (Number(l.totalPrice) || 0), 0)

  return {
    docNo: formatPrintFieldValue(row.docNo),
    orderNo: formatPrintFieldValue(row.docNo),
    title: '入库单',
    inboundType: formatPrintFieldValue(row.inboundType),
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalQty),
      totalPrice: formatPrintMoney(totalPrice),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildInboundOrderBatchPrintPayload(rows, options = {}) {
  const sheets = (rows || [])
    .map((row) => buildInboundOrderPrintPayload(row, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveInboundOrderPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadInboundOrderPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openInboundOrderPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveInboundOrderPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'inventory-inbound-preview', query })
  window.open(href, '_blank')
}
