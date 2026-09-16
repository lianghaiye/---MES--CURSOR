/** 待入库列表：入库单展平为明细行 + 订单级 rowspan */

import dayjs from 'dayjs'

export const PENDING_INBOUND_STATUSES = ['待处理', '部分入库']

/** 订单级可合并列 */
export const PENDING_INBOUND_ORDER_MERGE_KEYS = [
  'status',
  'docNo',
  'inboundType',
  'inboundQtyTotal',
  'sourceOrderNo',
  'salesOrderNo',
  'supplier',
  'inboundDate',
  'createdAt',
  'creator',
  'confirmedAt',
  'confirmer',
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

export function calcInboundOrderQty(order) {
  return (order?.lineItems || []).reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
}

export function calcInboundReceivedQty(order) {
  if (order?.status === '已完成') return calcInboundOrderQty(order)
  return (order?.lineItems || []).reduce((sum, line) => {
    if ((line.lineStatus || '待入库') === '已入库') {
      return sum + (Number(line.qty) || 0)
    }
    return sum
  }, 0)
}

export function formatInboundQtyRatio(order, formatFn) {
  const fmt = typeof formatFn === 'function' ? formatFn : (v) => String(v ?? 0)
  return `${fmt(calcInboundReceivedQty(order))}/${fmt(calcInboundOrderQty(order))}`
}

/** 待处理/部分入库单据 → 明细行 */
export function flattenPendingInboundLines(orders = []) {
  const rows = []
  for (const order of orders || []) {
    const status = order.status || '待处理'
    if (!PENDING_INBOUND_STATUSES.includes(status)) continue
    const inboundQtyTotalText = formatInboundQtyRatio(order, (v) => {
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
        inboundType: order.inboundType || '',
        inboundQtyTotal: inboundQtyTotalText,
        sourceOrderNo: order.sourceOrderNo || '',
        salesOrderNo: order.salesOrderNo || '',
        supplier: order.supplier || '',
        inboundDate: order.inboundDate || '',
        createdAt: order.createdAt || '',
        creator: order.creator || '',
        confirmedAt: order.confirmedAt || '',
        confirmer: order.confirmer || '',
        warehouseKeeper: order.warehouseKeeper || '',
        itemCode: '',
        itemName: '',
        specModel: '',
        material: '',
        drawingNo: '',
        lineStatus: '',
        qty: null,
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
        inboundType: order.inboundType || '',
        inboundQtyTotal: inboundQtyTotalText,
        sourceOrderNo: order.sourceOrderNo || '',
        salesOrderNo: order.salesOrderNo || '',
        supplier: order.supplier || '',
        inboundDate: order.inboundDate || '',
        createdAt: order.createdAt || '',
        creator: order.creator || '',
        confirmedAt: order.confirmedAt || '',
        confirmer: order.confirmer || '',
        warehouseKeeper: order.warehouseKeeper || '',
        itemCode: line.itemCode || '',
        itemName: line.itemName || '',
        specModel: line.specModel || line.specAttr || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        lineStatus: line.lineStatus || '待入库',
        qty: line.qty,
        warehouse: line.warehouse || order.warehouse || '',
        unit: line.unit || '',
      })
    })
  }
  return rows
}

export function filterPendingInboundLines(rows = [], filters = {}) {
  const f = filters || {}
  return rows.filter((row) => {
    if (f.docNo && !includesText(row.docNo, f.docNo)) return false
    if (f.inboundType && row.inboundType !== f.inboundType) return false
    if (f.status && row.status !== f.status) return false
    if (f.sourceOrderNo && !includesText(row.sourceOrderNo, f.sourceOrderNo)) return false
    if (f.itemName && !includesText(row.itemName, f.itemName)) return false
    if (f.itemCode && !includesText(row.itemCode, f.itemCode)) return false
    if (f.specModel && !includesText(row.specModel, f.specModel)) return false
    if (f.material && !includesText(row.material, f.material)) return false
    if (f.warehouse && row.warehouse !== f.warehouse) return false
    if (f.supplier && row.supplier !== f.supplier) return false
    if (!matchCreatedAtRange(row.createdAt, f.createdAtRange)) return false
    return true
  })
}

export function comparePendingInboundLinesDefault(a, b) {
  const noCmp = String(b.docNo || '').localeCompare(String(a.docNo || ''), 'zh-CN')
  if (noCmp) return noCmp
  const idA = String(a.orderId || a.docNo || '')
  const idB = String(b.orderId || b.docNo || '')
  if (idA !== idB) return idA.localeCompare(idB)
  return (a.lineIndex || 0) - (b.lineIndex || 0)
}

export function buildPendingInboundLineRowSpans(rows = []) {
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
