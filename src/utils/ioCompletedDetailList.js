/**
 * 已完成出入库明细行（只读查询）：从真实出入库单展平 + 演示种子兜底
 */
import dayjs from 'dayjs'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { outboundState } from '@/store/outboundStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { mockInOutDetails } from '@/mock/inOutDetails'
import { normalizeInboundStatus } from '@/mock/inboundOptions'
import { MATERIAL_TYPE_OPTIONS } from '@/utils/masterDataMigrate'

const COMPLETED_INBOUND = new Set(['已入库', '已完成'])
const COMPLETED_OUTBOUND = new Set(['已出库', '已完成'])

/** 同单合并列：单号 / 出入库类型 / 单据状态 / 仓库 */
export const IO_DETAIL_ORDER_MERGE_KEYS = ['docNo', 'docType', 'docStatus', 'warehouse']

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : ''
}

function postingDateOf(order) {
  return (
    display(order.confirmedAt).slice(0, 10) ||
    display(order.auditDate).slice(0, 10) ||
    display(order.completedAt).slice(0, 10) ||
    display(order.inboundDate).slice(0, 10) ||
    display(order.outboundTime).slice(0, 10) ||
    display(order.outboundDate).slice(0, 10) ||
    ''
  )
}

function batchNoOf(line) {
  if (Array.isArray(line.batchNos) && line.batchNos.length) return line.batchNos.join('、')
  return display(line.batchNo || line.barcodeBatchNo)
}

function findMasterByCode(code) {
  if (!code) return null
  const mat = (materialInfoState.materials || []).find((m) => m.code === code)
  if (mat) return mat
  return (productInfoState.products || []).find((p) => p.code === code) || null
}

/** 物品类型列展示产品信息「类型」(materialType) */
function resolveMaterialType(line = {}, fallbackCode = '') {
  const direct = display(line.materialType)
  if (MATERIAL_TYPE_OPTIONS.includes(direct)) return direct
  if (direct) return direct

  const code = display(line.itemCode || line.productCode || fallbackCode)
  const master = findMasterByCode(code)
  if (master?.materialType) return display(master.materialType)

  // 兼容旧演示种子：产成品→成品
  const legacy = display(line.itemType)
  if (legacy === '产成品' || legacy === '产品') return '成品'
  if (MATERIAL_TYPE_OPTIONS.includes(legacy)) return legacy
  return ''
}

function resolveProductAttrs(line = {}, itemCode = '') {
  const master = findMasterByCode(itemCode) || {}
  return {
    specModel: display(line.specModel || master.specModel || line.specAttr),
    material: display(line.material || master.material),
    variantSummary: display(line.variantSummary || master.variantSummary),
    drawingNo: display(line.drawingNo || master.drawingNo),
  }
}

function enrichMockRow(row) {
  const attrs = resolveProductAttrs(row, row.itemCode)
  return {
    ...row,
    itemType: resolveMaterialType(row, row.itemCode),
    ...attrs,
    creator: display(row.creator),
    createdAt: display(row.createdAt),
  }
}

/** 已入库成功的入库明细行 */
export function listCompletedInboundDetailRows() {
  void inboundOrderState.orders
  void materialInfoState.materials
  void productInfoState.products
  const rows = []
  ;(inboundOrderState.orders || []).forEach((order) => {
    const status = normalizeInboundStatus(order.status) || order.status
    if (!COMPLETED_INBOUND.has(status)) return
    ;(order.lineItems || []).forEach((line, idx) => {
      const lineStatus = line.lineStatus || '已入库'
      if (lineStatus === '已拒绝') return
      const itemCode = line.itemCode || line.productCode || ''
      const attrs = resolveProductAttrs(line, itemCode)
      rows.push({
        id: `ib-line-${order.id}-${line.id || idx}`,
        headerId: order.id,
        docNo: order.docNo || '',
        businessType: '入库单',
        docType: order.inboundType || '其它入库',
        docStatus: status === '已完成' ? '已入库' : status,
        ioStatus: '全部入库',
        itemType: resolveMaterialType(line, itemCode),
        itemName: line.itemName || line.productName || '',
        itemCode,
        ...attrs,
        qty: Number(line.qty) || 0,
        stockAfter: line.stockAfter ?? '',
        unit: line.unit || line.stockUnit || '件',
        barcodeBatchNo: batchNoOf(line),
        productionDate: display(line.productionDate),
        postingDate: postingDateOf(order),
        expiryDate: display(line.expiryDate),
        warehouse: order.warehouse || line.warehouse || '',
        operator: order.confirmer || order.handler || order.creator || '',
        creator: order.creator || '',
        createdAt: order.createdAt || '',
        remark: line.remark || order.remark || '',
      })
    })
  })

  // 演示种子：仅保留入库且已成功的行
  mockInOutDetails.forEach((row) => {
    if (row.businessType !== '入库单') return
    if (!isInboundSuccessRow(row)) return
    if (rows.some((r) => r.id === row.id || (r.docNo === row.docNo && r.itemName === row.itemName)))
      return
    rows.push({ ...enrichMockRow(row), businessType: '入库单' })
  })

  return rows
}

/** 已出库成功的出库明细行 */
export function listCompletedOutboundDetailRows() {
  void outboundState.orders
  void materialInfoState.materials
  void productInfoState.products
  const rows = []
  ;(outboundState.orders || []).forEach((order) => {
    const status = order.status || ''
    if (!COMPLETED_OUTBOUND.has(status)) return
    ;(order.lineItems || []).forEach((line, idx) => {
      const lineStatus = line.lineStatus || '已出库'
      if (lineStatus === '已拒绝') return
      const qty = Number(line.shipQty ?? line.qty) || 0
      const itemCode = line.itemCode || line.productCode || ''
      const attrs = resolveProductAttrs(line, itemCode)
      rows.push({
        id: `ob-line-${order.id}-${line.id || idx}`,
        headerId: order.id,
        docNo: order.docNo || '',
        businessType: '出库单',
        docType: order.outboundType || '其它出库',
        docStatus: status === '已完成' ? '已出库' : status,
        ioStatus: '',
        itemType: resolveMaterialType(line, itemCode),
        itemName: line.itemName || line.productName || '',
        itemCode,
        ...attrs,
        qty: qty > 0 ? -Math.abs(qty) : qty,
        stockAfter: line.stockAfter ?? '',
        unit: line.unit || line.stockUnit || '件',
        barcodeBatchNo: batchNoOf(line),
        productionDate: display(line.productionDate),
        postingDate: postingDateOf(order),
        expiryDate: display(line.expiryDate),
        warehouse: order.warehouse || line.warehouse || '',
        operator: order.auditor || order.warehouseKeeper || order.creator || '',
        creator: order.creator || '',
        createdAt: order.createdAt || '',
        remark: line.remark || order.remark || '',
      })
    })
  })

  mockInOutDetails.forEach((row) => {
    if (row.businessType !== '出库单') return
    if (!isOutboundSuccessRow(row)) return
    if (rows.some((r) => r.id === row.id || (r.docNo === row.docNo && r.itemName === row.itemName)))
      return
    rows.push({ ...enrichMockRow(row), businessType: '出库单' })
  })

  return rows
}

function isInboundSuccessRow(row) {
  const st = row.docStatus || ''
  const io = row.ioStatus || ''
  return (
    COMPLETED_INBOUND.has(st) ||
    st === '已过账' ||
    io === '全部入库' ||
    (st === '已审核' && io === '全部入库')
  )
}

function isOutboundSuccessRow(row) {
  const st = row.docStatus || ''
  return COMPLETED_OUTBOUND.has(st) || st === '已过账'
}

export function filterIoDetailRows(list, filters = {}) {
  return (list || []).filter((row) => {
    if (filters.docType && row.docType !== filters.docType) return false
    if (filters.itemName && !String(row.itemName || '').includes(String(filters.itemName).trim()))
      return false
    if (
      filters.barcodeBatchNo &&
      !String(row.barcodeBatchNo || '').includes(String(filters.barcodeBatchNo).trim())
    )
      return false
    if (filters.docNo && !String(row.docNo || '').includes(String(filters.docNo).trim()))
      return false
    if (filters.itemType && row.itemType !== filters.itemType) return false
    if (filters.warehouse && row.warehouse !== filters.warehouse) return false
    if (filters.postingDateRange?.length === 2) {
      const d = String(row.postingDate || '').slice(0, 10)
      const [a, b] = filters.postingDateRange.map((x) =>
        dayjs.isDayjs(x) ? x.format('YYYY-MM-DD') : String(x).slice(0, 10),
      )
      if (!d || d < a || d > b) return false
    }
    return true
  })
}

export function summarizeIoDetailRows(list = []) {
  const qty = list.reduce((s, r) => s + (Number(r.qty) || 0), 0)
  return { count: list.length, qty }
}

/** 当前页内按单据合并 rowspan：首行 = 连续行数，后续行 = 0 */
export function buildIoDetailOrderRowSpans(rows = []) {
  const spans = new Array(rows.length).fill(1)
  let i = 0
  while (i < rows.length) {
    const key = String(rows[i]?.headerId || rows[i]?.docNo || '')
    let j = i + 1
    while (j < rows.length) {
      const next = String(rows[j]?.headerId || rows[j]?.docNo || '')
      if (next !== key) break
      j += 1
    }
    const span = j - i
    spans[i] = span
    for (let k = i + 1; k < j; k += 1) spans[k] = 0
    i = j
  }
  return spans
}
