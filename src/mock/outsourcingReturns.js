/**
 * 外协异常处理单 mock / 筛选
 */
import dayjs from 'dayjs'
import { formatLineBarcodeBatchNo } from '@/utils/outboundIssueLines'

export const outsourcingReturnStatusOptions = ['新建', '进行中', '已完成', '作废']

export const outsourcingReturnOutboundStatusOptions = ['待出库', '出库中', '部分出库', '已出库']

export function createOutsourcingReturn(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const outsourcingOrderNo = partial.outsourcingOrderNo || partial.purchaseOrderNo || ''
  const outsourcingOrderId = partial.outsourcingOrderId || partial.purchaseOrderId || ''
  return {
    id: `wxrtn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    returnNo: '',
    outsourcingOrderNo,
    outsourcingOrderId,
    purchaseOrderNo: outsourcingOrderNo,
    purchaseOrderId: outsourcingOrderId,
    supplier: '',
    contactPerson: '',
    purchaser: '',
    returnAddress: '',
    remark: '',
    status: '新建',
    outboundStatus: '待出库',
    shipWarehouse: '',
    outboundOrderNo: '',
    outboundOrderId: '',
    outboundOrders: [],
    lineItems: [],
    creator: 'admin1',
    createdAt: now,
    updater: 'admin1',
    updatedAt: now,
    ...partial,
  }
}

export function createOutsourcingReturnOutboundLine(partial = {}) {
  return {
    id: `wxrtn-out-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    returnLineId: '',
    productName: '',
    productCode: '',
    specModel: '',
    material: '',
    applyQty: 0,
    actualQty: 0,
    unit: '',
    ...partial,
  }
}

export function createOutsourcingReturnOutboundOrder(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  return {
    id: `wxrtn-out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    outboundOrderNo: '',
    shipWarehouse: '',
    outboundStatus: '待出库',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    lineItems: [],
    ...partial,
  }
}

export function flattenReturnOutboundLines(row) {
  const orders = row?.outboundOrders || []
  const rows = []
  orders.forEach((order) => {
    const lines = order.lineItems || []
    if (!lines.length) {
      rows.push({
        id: `${order.id}-empty`,
        outboundStatus: order.outboundStatus || '',
        outboundOrderNo: order.outboundOrderNo || '',
        productName: '',
        productCode: '',
        specModel: '',
        material: '',
        applyQty: null,
        actualQty: null,
        barcodeBatchNo: '',
        unit: '',
        confirmedAt: order.confirmedAt || '',
        confirmer: order.confirmer || '',
        createdAt: order.createdAt || '',
        creator: order.creator || '',
        shipWarehouse: order.shipWarehouse || '',
      })
      return
    }
    lines.forEach((line, idx) => {
      rows.push({
        id: line.id || `${order.id}-${idx}`,
        outboundStatus: order.outboundStatus || '',
        outboundOrderNo: order.outboundOrderNo || '',
        productName: line.productName || '',
        productCode: line.productCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty: line.applyQty,
        actualQty: line.actualQty,
        barcodeBatchNo: formatLineBarcodeBatchNo(line),
        unit: line.unit || '',
        confirmedAt: order.confirmedAt || '',
        confirmer: order.confirmer || '',
        createdAt: order.createdAt || '',
        creator: order.creator || '',
        shipWarehouse: order.shipWarehouse || '',
      })
    })
  })
  return rows
}

export function deriveHeaderOutboundStatus(outboundOrders = []) {
  if (!outboundOrders.length) return '待出库'
  const statuses = outboundOrders.map((o) => o.outboundStatus || '出库中')
  if (statuses.every((s) => s === '已出库')) return '已出库'
  if (statuses.some((s) => s === '已出库' || s === '部分出库')) return '部分出库'
  return '出库中'
}

export function createOutsourcingReturnLine(partial = {}) {
  return {
    id: `wxrtn-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    wxLineId: '',
    poLineId: '',
    productName: '',
    productCode: '',
    specModel: '',
    variantSummary: '',
    material: '',
    drawingNo: '',
    planQty: 0,
    purchaseQty: 0,
    purchaseUnit: '',
    receivedQty: 0,
    returnQty: 0,
    unit: '',
    unitOptions: [],
    shipWarehouse: '',
    returnType: '返工',
    compensationMethod: '',
    compensationAmount: null,
    remark: '',
    ...partial,
  }
}

export function calcReturnQtySummary(row) {
  const lines = row?.lineItems || []
  const lineCount = lines.length
  const totalQty = lines.reduce((s, l) => s + (Number(l.returnQty) || 0), 0)
  return { lineCount, totalQty }
}

export function formatReturnQtySummary(row) {
  const { lineCount, totalQty } = calcReturnQtySummary(row)
  const qtyText = Number.isFinite(totalQty) ? String(Number(totalQty.toFixed(4)).toString()) : '0'
  return `${lineCount}行/${qtyText}`
}

export function generateOutsourcingReturnNo(existingList = [], at = dayjs()) {
  const d = dayjs(at)
  const ymd = d.format('YYMMDD')
  const ym = d.format('YYMM')
  let maxSeq = 0
  ;(existingList || []).forEach((row) => {
    const no = String(row?.returnNo || '')
    const m = no.match(/^WXTH-(\d{6})(\d{3})$/)
    if (!m) return
    if (!String(m[1]).startsWith(ym)) return
    maxSeq = Math.max(maxSeq, Number(m[2]) || 0)
  })
  return `WXTH-${ymd}${String(maxSeq + 1).padStart(3, '0')}`
}

export function cloneOutsourcingReturns() {
  return mockOutsourcingReturns.map((row) => ({
    ...row,
    lineItems: (row.lineItems || []).map((l) => ({ ...l })),
    outboundOrders: (row.outboundOrders || []).map((o) => ({
      ...o,
      lineItems: (o.lineItems || []).map((l) => ({ ...l })),
    })),
  }))
}

export function filterOutsourcingReturns(list, filters = {}) {
  const status = filters.status
  const returnNo = String(filters.returnNo || '').trim()
  const orderNo = filters.outsourcingOrderNo || filters.purchaseOrderNo
  const orderNoStr = String(orderNo || '').trim()
  const supplier = filters.supplier
  const shipWarehouse = filters.shipWarehouse
  const outboundStatus = filters.outboundStatus
  const operator = filters.operator
  const range = filters.createdAtRange

  return (list || []).filter((row) => {
    if (status && row.status !== status) return false
    if (returnNo && !String(row.returnNo || '').includes(returnNo)) return false
    if (orderNoStr) {
      const no = row.outsourcingOrderNo || row.purchaseOrderNo || ''
      if (!String(no).includes(orderNoStr)) return false
    }
    if (supplier && row.supplier !== supplier) return false
    if (shipWarehouse) {
      const whs = new Set(
        [
          row.shipWarehouse,
          ...(row.lineItems || []).map((l) => l.shipWarehouse),
          ...(row.outboundOrders || []).map((o) => o.shipWarehouse),
        ].filter(Boolean),
      )
      if (!whs.has(shipWarehouse)) return false
    }
    if (outboundStatus && row.outboundStatus !== outboundStatus) return false
    if (operator) {
      const ops = [row.creator, row.updater, row.purchaser, row.contactPerson].filter(Boolean)
      if (!ops.includes(operator)) return false
    }
    if (Array.isArray(range) && range.length === 2 && range[0] && range[1]) {
      const start = dayjs(range[0]).startOf('day')
      const end = dayjs(range[1]).endOf('day')
      const created = dayjs(row.createdAt)
      if (!created.isValid() || created.isBefore(start) || created.isAfter(end)) return false
    }
    return true
  })
}

export const mockOutsourcingReturns = [
  createOutsourcingReturn({
    id: 'wxrtn-1',
    returnNo: 'WXTH-260807001',
    outsourcingOrderNo: 'WX-260807001',
    outsourcingOrderId: 'wx-2',
    supplier: '采购供应商A',
    contactPerson: '张经理',
    purchaser: 'admin1',
    status: '新建',
    outboundStatus: '待出库',
    shipWarehouse: '半成品仓',
    returnAddress: '供应商仓库退回',
    createdAt: '2026-08-07 11:00',
    updatedAt: '2026-08-07 11:00',
    lineItems: [
      createOutsourcingReturnLine({
        id: 'wxrtn-1-l1',
        wxLineId: 'wx-2-line',
        productName: '轴承套',
        productCode: 'MAT-BRG-SLEEVE',
        specModel: 'φ50',
        material: '45#',
        planQty: 30,
        purchaseQty: 30,
        purchaseUnit: '件',
        receivedQty: 10,
        returnQty: 2,
        unit: '件',
        unitOptions: ['件'],
        shipWarehouse: '半成品仓',
        returnType: '返工',
        compensationMethod: '赔料',
        compensationAmount: null,
      }),
    ],
  }),
  createOutsourcingReturn({
    id: 'wxrtn-2',
    returnNo: 'WXTH-260805001',
    outsourcingOrderNo: 'WX-260805001',
    outsourcingOrderId: 'wx-4',
    supplier: '多功能供应商02',
    contactPerson: '李四',
    purchaser: 'admin1',
    status: '进行中',
    outboundStatus: '部分出库',
    shipWarehouse: '半成品仓',
    outboundOrderNo: 'CKWXTH-260805-001',
    createdAt: '2026-08-05 14:10',
    updatedAt: '2026-08-05 16:20',
    lineItems: [
      createOutsourcingReturnLine({
        id: 'wxrtn-2-l1',
        productName: '精密轴',
        productCode: 'SEMI-SHAFT-01',
        planQty: 10,
        purchaseQty: 10,
        purchaseUnit: '根',
        receivedQty: 10,
        returnQty: 1,
        unit: '根',
        unitOptions: ['根'],
        shipWarehouse: '半成品仓',
        returnType: '料废索赔',
        compensationMethod: '赔款',
        compensationAmount: 500,
      }),
    ],
    outboundOrders: [
      createOutsourcingReturnOutboundOrder({
        id: 'wxrtn-2-out-1',
        outboundOrderNo: 'CKWXTH-260805-001',
        shipWarehouse: '半成品仓',
        outboundStatus: '部分出库',
        creator: 'admin1',
        createdAt: '2026-08-05 14:30',
        confirmer: '张三',
        confirmedAt: '2026-08-05 16:20',
        lineItems: [
          createOutsourcingReturnOutboundLine({
            id: 'wxrtn-2-out-1-l1',
            returnLineId: 'wxrtn-2-l1',
            productName: '精密轴',
            productCode: 'SEMI-SHAFT-01',
            specModel: '',
            material: '',
            applyQty: 1,
            actualQty: 0,
            unit: '根',
          }),
        ],
      }),
    ],
  }),
]
