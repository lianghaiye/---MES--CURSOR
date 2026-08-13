/**
 * 采购退货单 mock / 筛选
 */
import dayjs from 'dayjs'

/** 单据状态 */
export const purchaseReturnStatusOptions = ['新建', '进行中', '已完成', '作废']

/** 出库状态 */
export const purchaseReturnOutboundStatusOptions = ['待出库', '出库中', '部分出库', '已出库']

export function createPurchaseReturn(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: `prtn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    returnNo: '',
    purchaseOrderNo: '',
    purchaseOrderId: '',
    supplier: '',
    purchaser: '',
    returnAddress: '',
    remark: '',
    /** 单据状态：新建 | 进行中 | 已完成 | 作废 */
    status: '新建',
    /** 出库状态 */
    outboundStatus: '待出库',
    shipWarehouse: '',
    outboundOrderNo: '',
    outboundOrderId: '',
    /** 按出货仓库拆分的退货出库单 */
    outboundOrders: [],
    lineItems: [],
    creator: 'admin1',
    createdAt: now,
    updater: 'admin1',
    updatedAt: now,
    ...partial,
  }
}

export function createPurchaseReturnOutboundLine(partial = {}) {
  return {
    id: `prtn-out-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

export function createPurchaseReturnOutboundOrder(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: `prtn-out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

/** 出库信息 Tab：一物料一行 */
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
  // 已生成出库单且尚未实际出库 → 出库中
  return '出库中'
}

export function createPurchaseReturnLine(partial = {}) {
  return {
    id: `prtn-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    poLineId: '',
    productName: '',
    productCode: '',
    specModel: '',
    variantSummary: '',
    material: '',
    drawingNo: '',
    purchaseQty: 0,
    purchaseUnit: '',
    receivedQty: 0,
    returnQty: 0,
    unit: '',
    unitOptions: [],
    shipWarehouse: '',
    /** 退货类型：换货 | 退货 */
    returnType: '退货',
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

/**
 * 单号：CGTH- + 6位年月日(YYMMDD) + 3位流水；流水按月重置
 */
export function generatePurchaseReturnNo(existingList = [], at = dayjs()) {
  const d = dayjs(at)
  const ymd = d.format('YYMMDD')
  const ym = d.format('YYMM')
  let maxSeq = 0
  ;(existingList || []).forEach((row) => {
    const no = String(row?.returnNo || '')
    const m = no.match(/^CGTH-(\d{6})(\d{3})$/)
    if (!m) return
    if (!String(m[1]).startsWith(ym)) return
    maxSeq = Math.max(maxSeq, Number(m[2]) || 0)
  })
  return `CGTH-${ymd}${String(maxSeq + 1).padStart(3, '0')}`
}

export function clonePurchaseReturns() {
  return mockPurchaseReturns.map((row) => ({
    ...row,
    lineItems: (row.lineItems || []).map((l) => ({ ...l })),
    outboundOrders: (row.outboundOrders || []).map((o) => ({
      ...o,
      lineItems: (o.lineItems || []).map((l) => ({ ...l })),
    })),
  }))
}

export function filterPurchaseReturns(list, filters = {}) {
  const status = filters.status
  const returnNo = String(filters.returnNo || '').trim()
  const purchaseOrderNo = String(filters.purchaseOrderNo || '').trim()
  const supplier = filters.supplier
  const shipWarehouse = filters.shipWarehouse
  const outboundStatus = filters.outboundStatus
  const operator = filters.operator
  const range = filters.createdAtRange

  return (list || []).filter((row) => {
    if (status && row.status !== status) return false
    if (returnNo && !String(row.returnNo || '').includes(returnNo)) return false
    if (purchaseOrderNo && !String(row.purchaseOrderNo || '').includes(purchaseOrderNo))
      return false
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
      const ops = [row.creator, row.updater, row.purchaser].filter(Boolean)
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

export const mockPurchaseReturns = [
  createPurchaseReturn({
    id: 'prtn-1',
    returnNo: 'CGTH-260807001',
    purchaseOrderNo: 'CG20260802001',
    purchaseOrderId: 'po-4',
    supplier: '采购供应商A',
    purchaser: 'admin1',
    status: '新建',
    outboundStatus: '待出库',
    shipWarehouse: '原材料仓',
    returnAddress: '供应商仓库退回',
    createdAt: '2026-08-07 11:00:00',
    updatedAt: '2026-08-07 11:00:00',
    lineItems: [
      createPurchaseReturnLine({
        id: 'prtn-1-l1',
        poLineId: 'seed',
        productName: '钢板',
        productCode: 'MAT-PLATE-10',
        specModel: '10mm',
        material: 'Q235B',
        purchaseQty: 50,
        purchaseUnit: '张',
        receivedQty: 20,
        returnQty: 5,
        unit: '张',
        unitOptions: ['张'],
        shipWarehouse: '原材料仓',
        returnType: '退货',
      }),
      createPurchaseReturnLine({
        id: 'prtn-1-l2',
        poLineId: 'seed2',
        productName: '钢板',
        productCode: 'MAT-PLATE-16',
        specModel: '16mm',
        material: 'Q235B',
        purchaseQty: 30,
        purchaseUnit: '张',
        receivedQty: 10,
        returnQty: 2,
        unit: '张',
        unitOptions: ['张'],
        shipWarehouse: '原材料仓',
        returnType: '换货',
      }),
    ],
  }),
  createPurchaseReturn({
    id: 'prtn-2',
    returnNo: 'CGTH-260806001',
    purchaseOrderNo: 'CG20260803001',
    purchaseOrderId: 'po-3',
    supplier: '多功能供应商02',
    purchaser: 'admin1',
    status: '进行中',
    outboundStatus: '部分出库',
    shipWarehouse: '原材料仓',
    outboundOrderNo: 'CKTH-260806-011',
    createdAt: '2026-08-06 09:30:00',
    updatedAt: '2026-08-06 16:20:00',
    lineItems: [
      createPurchaseReturnLine({
        id: 'prtn-2-l1',
        productName: '轴承',
        productCode: 'MAT-BRG-01',
        purchaseQty: 100,
        purchaseUnit: '套',
        receivedQty: 80,
        returnQty: 10,
        unit: '套',
        unitOptions: ['套'],
        shipWarehouse: '原材料仓',
        returnType: '退货',
      }),
    ],
    outboundOrders: [
      createPurchaseReturnOutboundOrder({
        id: 'prtn-2-out-1',
        outboundOrderNo: 'CKTH-260806-011',
        shipWarehouse: '原材料仓',
        outboundStatus: '部分出库',
        creator: 'admin1',
        createdAt: '2026-08-06 10:00:00',
        confirmer: '张三',
        confirmedAt: '2026-08-06 16:20:00',
        lineItems: [
          createPurchaseReturnOutboundLine({
            id: 'prtn-2-out-1-l1',
            returnLineId: 'prtn-2-l1',
            productName: '轴承',
            productCode: 'MAT-BRG-01',
            specModel: '6205',
            material: '轴承钢',
            applyQty: 10,
            actualQty: 6,
            unit: '套',
          }),
        ],
      }),
    ],
  }),
  createPurchaseReturn({
    id: 'prtn-3',
    returnNo: 'CGTH-260805001',
    purchaseOrderNo: 'CG20260728002',
    purchaseOrderId: 'po-6',
    supplier: '标准件供应商',
    purchaser: 'admin1',
    status: '已完成',
    outboundStatus: '已出库',
    shipWarehouse: '原材料仓',
    outboundOrderNo: 'CKTH-260805-008',
    createdAt: '2026-08-05 14:10:00',
    updatedAt: '2026-08-05 18:00:00',
    lineItems: [
      createPurchaseReturnLine({
        id: 'prtn-3-l1',
        productName: '垫片',
        productCode: 'MAT-GASKET-01',
        purchaseQty: 200,
        purchaseUnit: '片',
        receivedQty: 200,
        returnQty: 20,
        unit: '片',
        unitOptions: ['片'],
        shipWarehouse: '原材料仓',
        returnType: '换货',
      }),
    ],
    outboundOrders: [
      createPurchaseReturnOutboundOrder({
        id: 'prtn-3-out-1',
        outboundOrderNo: 'CKTH-260805-008',
        shipWarehouse: '原材料仓',
        outboundStatus: '已出库',
        creator: 'admin1',
        createdAt: '2026-08-05 14:30:00',
        confirmer: '李四',
        confirmedAt: '2026-08-05 18:00:00',
        lineItems: [
          createPurchaseReturnOutboundLine({
            id: 'prtn-3-out-1-l1',
            returnLineId: 'prtn-3-l1',
            productName: '垫片',
            productCode: 'MAT-GASKET-01',
            specModel: 'DN80',
            material: '丁腈橡胶',
            applyQty: 20,
            actualQty: 20,
            unit: '片',
          }),
        ],
      }),
    ],
  }),
  /** 多仓库拆单：关联多张退货出库单 */
  createPurchaseReturn({
    id: 'prtn-4',
    returnNo: 'CGTH-260804001',
    purchaseOrderNo: 'CG20260802001',
    purchaseOrderId: 'po-4',
    supplier: '采购供应商A',
    purchaser: 'admin1',
    status: '进行中',
    outboundStatus: '部分出库',
    shipWarehouse: '原材料仓',
    outboundOrderNo: 'CKTH-260804-101,CKTH-260804-102',
    returnAddress: '供应商退货收货点',
    remark: '明细分属原材料仓/半成品仓，已按仓拆成两张出库单',
    createdAt: '2026-08-04 09:20:00',
    updatedAt: '2026-08-04 16:40:00',
    lineItems: [
      createPurchaseReturnLine({
        id: 'prtn-4-l1',
        productName: '钢板',
        productCode: 'MAT-PLATE-10',
        specModel: '10mm',
        material: 'Q235B',
        purchaseQty: 50,
        purchaseUnit: '张',
        receivedQty: 20,
        returnQty: 5,
        unit: '张',
        unitOptions: ['张'],
        shipWarehouse: '原材料仓',
        returnType: '退货',
      }),
      createPurchaseReturnLine({
        id: 'prtn-4-l2',
        productName: '角钢',
        productCode: 'MAT-ANGLE-50',
        specModel: 'L50×5',
        material: 'Q235B',
        purchaseQty: 100,
        purchaseUnit: '根',
        receivedQty: 100,
        returnQty: 8,
        unit: '根',
        unitOptions: ['根'],
        shipWarehouse: '原材料仓',
        returnType: '换货',
      }),
      createPurchaseReturnLine({
        id: 'prtn-4-l3',
        productName: '法兰半成品',
        productCode: 'SEMI-FLG-80',
        specModel: 'DN80',
        material: 'Q235B',
        purchaseQty: 20,
        purchaseUnit: '片',
        receivedQty: 15,
        returnQty: 3,
        unit: '片',
        unitOptions: ['片'],
        shipWarehouse: '半成品仓',
        returnType: '退货',
      }),
      createPurchaseReturnLine({
        id: 'prtn-4-l4',
        productName: '密封组件',
        productCode: 'SEMI-SEAL-80',
        specModel: 'DN80',
        material: '丁腈橡胶',
        purchaseQty: 40,
        purchaseUnit: '套',
        receivedQty: 30,
        returnQty: 4,
        unit: '套',
        unitOptions: ['套'],
        shipWarehouse: '半成品仓',
        returnType: '换货',
      }),
    ],
    outboundOrders: [
      createPurchaseReturnOutboundOrder({
        id: 'prtn-4-out-1',
        outboundOrderNo: 'CKTH-260804-101',
        shipWarehouse: '原材料仓',
        outboundStatus: '已出库',
        creator: 'admin1',
        createdAt: '2026-08-04 10:05:00',
        confirmer: '张三',
        confirmedAt: '2026-08-04 15:20:00',
        lineItems: [
          createPurchaseReturnOutboundLine({
            id: 'prtn-4-out-1-l1',
            returnLineId: 'prtn-4-l1',
            productName: '钢板',
            productCode: 'MAT-PLATE-10',
            specModel: '10mm',
            material: 'Q235B',
            applyQty: 5,
            actualQty: 5,
            unit: '张',
          }),
          createPurchaseReturnOutboundLine({
            id: 'prtn-4-out-1-l2',
            returnLineId: 'prtn-4-l2',
            productName: '角钢',
            productCode: 'MAT-ANGLE-50',
            specModel: 'L50×5',
            material: 'Q235B',
            applyQty: 8,
            actualQty: 8,
            unit: '根',
          }),
        ],
      }),
      createPurchaseReturnOutboundOrder({
        id: 'prtn-4-out-2',
        outboundOrderNo: 'CKTH-260804-102',
        shipWarehouse: '半成品仓',
        outboundStatus: '出库中',
        creator: 'admin1',
        createdAt: '2026-08-04 10:05:00',
        confirmer: '',
        confirmedAt: '',
        lineItems: [
          createPurchaseReturnOutboundLine({
            id: 'prtn-4-out-2-l1',
            returnLineId: 'prtn-4-l3',
            productName: '法兰半成品',
            productCode: 'SEMI-FLG-80',
            specModel: 'DN80',
            material: 'Q235B',
            applyQty: 3,
            actualQty: 0,
            unit: '片',
          }),
          createPurchaseReturnOutboundLine({
            id: 'prtn-4-out-2-l2',
            returnLineId: 'prtn-4-l4',
            productName: '密封组件',
            productCode: 'SEMI-SEAL-80',
            specModel: 'DN80',
            material: '丁腈橡胶',
            applyQty: 4,
            actualQty: 0,
            unit: '套',
          }),
        ],
      }),
    ],
  }),
]
