/** 待出库列表：出库单展平为明细行 + 订单级 rowspan */

import dayjs from 'dayjs'
import {
  calcOutboundOrderQty,
  calcOutboundShippedQty,
  formatOutboundQtyRatio,
} from '@/mock/outboundOrders'
import { normalizeOutboundStatus, outboundSourceLabel } from '@/mock/outboundOptions'

export const PENDING_OUTBOUND_STATUSES = ['待出库', '部分出库']

/** 订单级可合并列 */
export const PENDING_OUTBOUND_ORDER_MERGE_KEYS = [
  'status',
  'docNo',
  'outboundType',
  'shipQtyTotal',
  'sourceOrderNo',
  'salesOrderNo',
  'requisitionDept',
  'outboundTime',
  'sourceChannel',
  'createdAt',
  'creator',
  'auditDate',
  'auditor',
  'warehouseKeeper',
  'action',
]

function includesText(haystack, needle) {
  if (!needle) return true
  return String(haystack || '')
    .toLowerCase()
    .includes(String(needle).trim().toLowerCase())
}

function matchCreatedAtRange(createdAt, range) {
  if (!range?.length || !range[0] || !range[1]) return true
  if (!createdAt) return false
  const d = dayjs(createdAt)
  if (!d.isValid()) return false
  const start = dayjs(range[0]).startOf('day')
  const end = dayjs(range[1]).endOf('day')
  if (!start.isValid() || !end.isValid()) return true
  return !d.isBefore(start) && !d.isAfter(end)
}

/** 待出库/部分出库单据 → 明细行 */
export function flattenPendingOutboundLines(orders = []) {
  const rows = []
  for (const order of orders || []) {
    const status = normalizeOutboundStatus(order.status)
    if (!PENDING_OUTBOUND_STATUSES.includes(status)) continue
    const shipQtyTotalText = formatOutboundQtyRatio(order, (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? String(n) : '0'
    })
    const lines = order.lineItems || []
    if (!lines.length) {
      rows.push({
        id: `${order.id}__empty`,
        orderId: order.id,
        lineId: '',
        status,
        docNo: order.docNo || '',
        outboundType: order.outboundType || '',
        shipQtyTotal: shipQtyTotalText,
        shipQtyTotalNum: calcOutboundOrderQty(order),
        shippedQtyNum: calcOutboundShippedQty(order),
        sourceOrderNo: order.sourceOrderNo || '',
        salesOrderNo: order.salesOrderNo || '',
        requisitionDept: order.requisitionDept || '',
        outboundTime: order.outboundTime || '',
        sourceChannel: order.sourceChannel || '',
        sourceChannelLabel: outboundSourceLabel(order.sourceChannel),
        createdAt: order.createdAt || '',
        creator: order.creator || '',
        auditDate: order.auditDate || '',
        auditor: order.auditor || '',
        warehouseKeeper: order.warehouseKeeper || '',
        itemCode: '',
        itemName: '',
        specModel: '',
        material: '',
        drawingNo: '',
        variantSummary: '',
        lineStatus: '',
        shipQty: null,
        warehouse: order.warehouse || '',
        unit: '',
      })
      continue
    }
    lines.forEach((line, lineIndex) => {
      rows.push({
        id: `${order.id}__${line.id || lineIndex}`,
        orderId: order.id,
        lineId: line.id || '',
        lineIndex,
        status,
        docNo: order.docNo || '',
        outboundType: order.outboundType || '',
        shipQtyTotal: shipQtyTotalText,
        shipQtyTotalNum: calcOutboundOrderQty(order),
        shippedQtyNum: calcOutboundShippedQty(order),
        sourceOrderNo: order.sourceOrderNo || '',
        salesOrderNo: order.salesOrderNo || '',
        requisitionDept: order.requisitionDept || '',
        outboundTime: order.outboundTime || '',
        sourceChannel: order.sourceChannel || '',
        sourceChannelLabel: outboundSourceLabel(order.sourceChannel),
        createdAt: order.createdAt || '',
        creator: order.creator || '',
        auditDate: order.auditDate || '',
        auditor: order.auditor || '',
        warehouseKeeper: order.warehouseKeeper || '',
        itemCode: line.itemCode || '',
        itemName: line.itemName || '',
        specModel: line.specModel || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        variantSummary: line.variantSummary || '',
        lineStatus: line.lineStatus || '待出库',
        shipQty: line.shipQty,
        warehouse: line.shipWarehouse || line.warehouse || order.warehouse || '',
        unit: line.unit || line.stockUnit || '',
      })
    })
  }
  return rows
}

export function filterPendingOutboundLines(rows = [], filters = {}) {
  const f = filters || {}
  return rows.filter((row) => {
    if (f.docNo && !includesText(row.docNo, f.docNo)) return false
    if (f.outboundType && row.outboundType !== f.outboundType) return false
    if (f.status && row.status !== f.status) return false
    if (f.sourceOrderNo && !includesText(row.sourceOrderNo, f.sourceOrderNo)) return false
    if (f.itemName && !includesText(row.itemName, f.itemName)) return false
    if (f.itemCode && !includesText(row.itemCode, f.itemCode)) return false
    if (f.specModel && !includesText(row.specModel, f.specModel)) return false
    if (f.material && !includesText(row.material, f.material)) return false
    if (f.warehouse && row.warehouse !== f.warehouse) return false
    if (!matchCreatedAtRange(row.createdAt, f.createdAtRange)) return false
    return true
  })
}

export function comparePendingOutboundLinesDefault(a, b) {
  const noCmp = String(b.docNo || '').localeCompare(String(a.docNo || ''), 'zh-CN')
  if (noCmp) return noCmp
  const idA = String(a.orderId || a.docNo || '')
  const idB = String(b.orderId || b.docNo || '')
  if (idA !== idB) return idA.localeCompare(idB)
  return (a.lineIndex || 0) - (b.lineIndex || 0)
}

export function buildPendingOutboundLineRowSpans(rows = []) {
  const spans = new Array(rows.length).fill(1)
  let i = 0
  while (i < rows.length) {
    const key = String(rows[i]?.orderId || rows[i]?.docNo || '')
    let j = i + 1
    while (j < rows.length) {
      const next = String(rows[j]?.orderId || rows[j]?.docNo || '')
      if (next !== key) break
      j += 1
    }
    spans[i] = j - i
    for (let k = i + 1; k < j; k += 1) spans[k] = 0
    i = j
  }
  return spans
}
