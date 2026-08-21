/**
 * 外协订单 mock / 筛选 / 单号
 */
import dayjs from 'dayjs'
import { formatLineBarcodeBatchNo } from '@/utils/outboundIssueLines'

export const outsourcingStatusOptions = ['待提交', '待审核', '已拒绝', '进行中', '已完成', '已作废']

export const outsourcingIssueStatusOptions = ['待出库', '部分出库', '已出库']
export const outsourcingReturnStatusOptions = ['待入库', '部分入库', '已入库']
export const outsourcingOverdueStatusOptions = ['未逾期', '已逾期']
export const outsourcingBillingMethodOptions = ['按重量', '按件数']

export function createOutsourcingLine(partial = {}) {
  const planQty = Number(partial.planQty) || 0
  const unitPriceExTax = Number(partial.unitPriceExTax) || 0
  const taxRate = partial.taxRate ?? 13
  const unitPriceInTax =
    partial.unitPriceInTax != null
      ? Number(partial.unitPriceInTax)
      : Math.round(unitPriceExTax * (1 + taxRate / 100) * 100) / 100
  return {
    id: `wx-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productName: '',
    productCode: '',
    itemCode: '',
    itemName: '',
    specModel: '',
    variantSummary: '',
    material: '',
    drawingNo: '',
    stockQty: 0,
    planQty,
    unit: '个',
    purchaseUnit: '',
    inventoryUnit: '',
    unitOptions: [],
    shipWarehouse: '',
    billingMethod: '按件数',
    taxRate,
    unitPriceExTax,
    unitPriceInTax,
    totalPriceExTax: Math.round(planQty * unitPriceExTax * 100) / 100,
    totalPriceInTax: Math.round(planQty * unitPriceInTax * 100) / 100,
    receivedQty: 0,
    appliedReceiptQty: 0,
    issuedQty: 0,
    appliedIssueQty: 0,
    blankSizeText: '',
    barcodeType: '',
    remark: '',
    ...partial,
  }
}

export function createOutsourcingOrder(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const lineItems = partial.lineItems || []
  const totalQty = lineItems.reduce((s, l) => s + (Number(l.planQty) || 0), 0)
  const amountExTax = lineItems.reduce((s, l) => s + (Number(l.totalPriceExTax) || 0), 0)
  const amountInTax = lineItems.reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0)
  return {
    id: `wx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orderNo: '',
    workOrderName: '',
    salesOrderNo: '',
    salesOrderId: '',
    supplier: '',
    /** 兼容旧字段：结束日期 */
    planDate: '',
    planStartDate: '',
    planEndDate: '',
    /** 按仓库拆分的发料出库单 */
    issueOrders: [],
    contactPerson: '',
    contactPhone: '',
    leadTimeDays: undefined,
    settlementType: '先款后货',
    settlementCycle: '月结',
    settlementMethod: '现金结算',
    remark: '',
    status: '待提交',
    issueStatus: '待出库',
    returnStatus: '待入库',
    overdueStatus: '未逾期',
    approvalResult: '',
    approverName: '',
    approvalRecords: [],
    totalQty,
    amountExTax,
    amountInTax,
    lineItems,
    creator: 'admin1',
    createdAt: now,
    updater: 'admin1',
    updatedAt: now,
    ...partial,
  }
}

export function recalcOutsourcingTotals(order) {
  const lines = order.lineItems || []
  order.totalQty = lines.reduce((s, l) => s + (Number(l.planQty) || 0), 0)
  order.amountExTax = lines.reduce((s, l) => s + (Number(l.totalPriceExTax) || 0), 0)
  order.amountInTax = lines.reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0)
  return order
}

export function recalcOutsourcingLine(line, { fromInTax = false } = {}) {
  const qty = Number(line.planQty) || 0
  const rate = Number(line.taxRate) || 13
  if (fromInTax) {
    const inTax = Number(line.unitPriceInTax) || 0
    line.unitPriceExTax = Math.round((inTax / (1 + rate / 100)) * 100) / 100
    line.unitPriceInTax = inTax
  } else {
    const ex = Number(line.unitPriceExTax) || 0
    line.unitPriceExTax = ex
    line.unitPriceInTax = Math.round(ex * (1 + rate / 100) * 100) / 100
  }
  line.totalPriceExTax = Math.round(qty * (Number(line.unitPriceExTax) || 0) * 100) / 100
  line.totalPriceInTax = Math.round(qty * (Number(line.unitPriceInTax) || 0) * 100) / 100
  return line
}

export function calcOutsourcingQtySummary(order) {
  const lines = order?.lineItems || []
  const lineCount = lines.length
  const totalQty = lines.reduce((s, l) => s + (Number(l.planQty) || 0), 0)
  return { lineCount, totalQty }
}

/** 发料信息 Tab：一物料一行（对齐采购退货「出库信息」） */
export function flattenOutsourcingIssueOutboundLines(order) {
  const orders = order?.issueOrders || []
  const rows = []
  orders.forEach((issueOrder) => {
    const lines = issueOrder.lineItems || []
    const outboundOrderNo = issueOrder.issueOrderNo || issueOrder.outboundOrderNo || ''
    if (!lines.length) {
      rows.push({
        id: `${issueOrder.id}-empty`,
        outboundStatus: issueOrder.outboundStatus || '',
        outboundOrderNo,
        productName: '',
        productCode: '',
        specModel: '',
        material: '',
        applyQty: null,
        actualQty: null,
        barcodeBatchNo: '',
        unit: '',
        confirmedAt: issueOrder.confirmedAt || '',
        confirmer: issueOrder.confirmer || '',
        createdAt: issueOrder.createdAt || '',
        creator: issueOrder.creator || '',
        shipWarehouse: issueOrder.shipWarehouse || '',
      })
      return
    }
    lines.forEach((line, idx) => {
      const applyQty = line.applyQty != null ? line.applyQty : line.issueQty
      rows.push({
        id: line.id || `${issueOrder.id}-${idx}`,
        outboundStatus: issueOrder.outboundStatus || '',
        outboundOrderNo,
        productName: line.productName || '',
        productCode: line.productCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty,
        actualQty: line.actualQty,
        barcodeBatchNo: formatLineBarcodeBatchNo(line),
        unit: line.unit || '',
        confirmedAt: issueOrder.confirmedAt || '',
        confirmer: issueOrder.confirmer || '',
        createdAt: issueOrder.createdAt || '',
        creator: issueOrder.creator || '',
        shipWarehouse: issueOrder.shipWarehouse || '',
      })
    })
  })
  return rows
}

export function formatOutsourcingQtySummary(order) {
  const { lineCount, totalQty } = calcOutsourcingQtySummary(order)
  const qtyText = Number.isFinite(totalQty) ? String(Number(totalQty.toFixed(4)).toString()) : '0'
  return `${lineCount}行/${qtyText}`
}

/** WX- + YYMMDD + 3位流水，流水按月重置 */
export function generateOutsourcingOrderNo(existingList = [], at = dayjs()) {
  const d = dayjs(at)
  const ymd = d.format('YYMMDD')
  const ym = d.format('YYMM')
  let maxSeq = 0
  ;(existingList || []).forEach((row) => {
    const no = String(row?.orderNo || '')
    const m = no.match(/^WX-(\d{6})(\d{3})$/)
    if (!m) return
    if (!String(m[1]).startsWith(ym)) return
    maxSeq = Math.max(maxSeq, Number(m[2]) || 0)
  })
  return `WX-${ymd}${String(maxSeq + 1).padStart(3, '0')}`
}

export function formatOutsourcingPlanDateDisplay(order) {
  const start = String(order?.planStartDate || '').trim()
  const end = String(order?.planEndDate || order?.planDate || '').trim()
  if (start && end) return start === end ? start : `${start} ~ ${end}`
  return end || start || ''
}

export function computeOutsourcingOverdueStatus(order, now = dayjs()) {
  const end = order?.planEndDate || order?.planDate
  if (!end) return '未逾期'
  if (order.status === '已完成' || order.status === '已作废') return '未逾期'
  const plan = dayjs(end)
  if (!plan.isValid()) return '未逾期'
  return now.isAfter(plan, 'day') ? '已逾期' : '未逾期'
}

export function cloneOutsourcingOrders() {
  return mockOutsourcingOrders.map((row) => ({
    ...row,
    lineItems: (row.lineItems || []).map((l) => ({ ...l })),
    approvalRecords: (row.approvalRecords || []).map((r) => ({ ...r })),
    issueOrders: (row.issueOrders || []).map((o) => ({
      ...o,
      productSets: (o.productSets || []).map((p) => ({ ...p })),
      lineItems: (o.lineItems || []).map((l) => ({ ...l })),
    })),
  }))
}

export function filterOutsourcingOrders(list, filters = {}) {
  const status = filters.status
  const orderNo = String(filters.orderNo || '').trim()
  const salesOrderNo = String(filters.salesOrderNo || '').trim()
  const supplier = filters.supplier
  const issueStatus = filters.issueStatus
  const returnStatus = filters.returnStatus
  const overdueStatus = filters.overdueStatus
  const operator = filters.operator
  const range = filters.createdAtRange

  return (list || []).filter((row) => {
    if (status && row.status !== status) return false
    if (orderNo && !String(row.orderNo || '').includes(orderNo)) return false
    if (salesOrderNo && !String(row.salesOrderNo || '').includes(salesOrderNo)) return false
    if (supplier && row.supplier !== supplier) return false
    if (issueStatus && row.issueStatus !== issueStatus) return false
    if (returnStatus && row.returnStatus !== returnStatus) return false
    const overdue = row.overdueStatus || computeOutsourcingOverdueStatus(row)
    if (overdueStatus && overdue !== overdueStatus) return false
    if (operator) {
      const ops = [row.creator, row.updater].filter(Boolean)
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

function line(partial) {
  const item = createOutsourcingLine(partial)
  item.productName = item.productName || item.itemName
  item.productCode = item.productCode || item.itemCode
  item.itemName = item.itemName || item.productName
  item.itemCode = item.itemCode || item.productCode
  return recalcOutsourcingLine(item)
}

export const mockOutsourcingOrders = [
  createOutsourcingOrder({
    id: 'wx-1',
    orderNo: 'WX-260808001',
    workOrderName: '法兰外协加工',
    salesOrderNo: 'SO-20260801-001',
    supplier: '多功能供应商01',
    planDate: '2026-08-25',
    planStartDate: '2026-08-18',
    planEndDate: '2026-08-25',
    contactPerson: '张经理',
    contactPhone: '13800138001',
    leadTimeDays: 10,
    status: '待提交',
    issueStatus: '待出库',
    returnStatus: '待入库',
    createdAt: '2026-08-08 09:10:00',
    updatedAt: '2026-08-08 09:10:00',
    lineItems: [
      line({
        productName: '碳钢法兰',
        productCode: 'MAT-FLG-80',
        specModel: 'DN80 PN16',
        material: 'Q235B',
        stockQty: 12,
        planQty: 20,
        unit: '片',
        shipWarehouse: '原材料仓',
        billingMethod: '按件数',
        unitPriceExTax: 35,
      }),
      line({
        productName: '橡胶密封垫',
        productCode: 'MAT-SEAL-80',
        specModel: 'DN80',
        material: '丁腈橡胶',
        stockQty: 40,
        planQty: 40,
        unit: '片',
        shipWarehouse: '原材料仓',
        billingMethod: '按件数',
        unitPriceExTax: 8,
      }),
    ],
  }),
  createOutsourcingOrder({
    id: 'wx-2',
    orderNo: 'WX-260807001',
    workOrderName: '轴套外协',
    salesOrderNo: 'SO-20260801-002',
    supplier: '采购供应商A',
    planDate: '2026-08-12',
    planStartDate: '2026-08-05',
    planEndDate: '2026-08-12',
    status: '进行中',
    issueStatus: '部分出库',
    returnStatus: '部分入库',
    approvalResult: '审核通过',
    approverName: '张三',
    createdAt: '2026-08-07 11:00:00',
    updatedAt: '2026-08-08 14:00:00',
    issueOrders: [
      {
        id: 'wx-2-issue-1',
        issueOrderNo: 'CKWX-260807-011',
        outsourcingOrderId: 'wx-2',
        outsourcingOrderNo: 'WX-260807001',
        supplier: '采购供应商A',
        workOrderName: '轴套外协',
        shipWarehouse: '原料仓',
        shipDate: '2026-08-07',
        outboundStatus: '部分出库',
        creator: 'admin1',
        createdAt: '2026-08-07 14:00:00',
        confirmer: '张三',
        confirmedAt: '2026-08-07 16:30:00',
        remark: '',
        productSets: [{ lineId: 'wx-2-line-1', setQty: 15 }],
        lineItems: [
          {
            id: 'wx-2-issue-1-l1',
            lineId: 'wx-2-line-1',
            sourceProductLineIds: ['wx-2-line-1'],
            sourceProductText: '轴承套',
            productName: '圆钢棒料',
            productCode: 'MAT-STEEL-ROUND-50',
            specModel: 'φ50',
            material: '45#',
            drawingNo: '',
            blankSizeText: '',
            unitUsage: 2.5,
            applyQty: 37.5,
            actualQty: 25,
            unit: 'kg',
            shipWarehouse: '原料仓',
            remark: '',
          },
          {
            id: 'wx-2-issue-1-l2',
            lineId: 'wx-2-line-1',
            sourceProductLineIds: ['wx-2-line-1'],
            sourceProductText: '轴承套',
            productName: '润滑脂',
            productCode: 'MAT-GREASE-01',
            specModel: '通用',
            material: '',
            drawingNo: '',
            blankSizeText: '',
            unitUsage: 0.05,
            applyQty: 0.75,
            actualQty: 0.5,
            unit: 'kg',
            shipWarehouse: '原料仓',
            remark: '',
          },
          {
            id: 'wx-2-issue-1-l3',
            lineId: 'wx-2-line-1',
            sourceProductLineIds: ['wx-2-line-1', 'wx-2-line-2'],
            sourceProductText: '轴承套、端盖',
            productName: '紧固螺栓 M8',
            productCode: 'MAT-BOLT-M8',
            specModel: 'M8×30',
            material: '8.8级',
            drawingNo: '',
            blankSizeText: '',
            unitUsage: 4,
            applyQty: 60,
            actualQty: 40,
            unit: '个',
            shipWarehouse: '原料仓',
            remark: '',
          },
        ],
      },
    ],
    lineItems: [
      line({
        id: 'wx-2-line-1',
        productName: '轴承套',
        productCode: 'MAT-BRG-SLEEVE',
        specModel: 'φ50',
        material: '45#',
        drawingNo: 'TZ-BRG-050',
        bom: '轴承套发料BOM V1',
        stockQty: 8,
        planQty: 30,
        unit: '件',
        shipWarehouse: '半成品仓',
        receivedQty: 10,
        appliedReceiptQty: 10,
        issuedQty: 10,
        appliedIssueQty: 15,
        unitPriceExTax: 22,
        componentLines: [
          {
            id: 'wx-2-bom-1',
            itemName: '圆钢棒料',
            itemCode: 'MAT-STEEL-ROUND-50',
            specModel: 'φ50',
            material: '45#',
            drawingNo: '',
            unit: 'kg',
            unitUsage: 2.5,
            shipWarehouse: '原料仓',
          },
          {
            id: 'wx-2-bom-2',
            itemName: '润滑脂',
            itemCode: 'MAT-GREASE-01',
            specModel: '通用',
            material: '',
            unit: 'kg',
            unitUsage: 0.05,
            shipWarehouse: '原料仓',
          },
          {
            id: 'wx-2-bom-shared',
            itemName: '紧固螺栓 M8',
            itemCode: 'MAT-BOLT-M8',
            specModel: 'M8×30',
            material: '8.8级',
            unit: '件',
            unitUsage: 4,
            shipWarehouse: '原料仓',
          },
        ],
      }),
      line({
        id: 'wx-2-line-2',
        productName: '端盖',
        productCode: 'MAT-END-COVER',
        specModel: 'φ80',
        material: 'Q235B',
        drawingNo: 'TZ-COVER-080',
        bom: '端盖发料BOM V1',
        stockQty: 20,
        planQty: 20,
        unit: '件',
        shipWarehouse: '半成品仓',
        receivedQty: 0,
        appliedReceiptQty: 0,
        issuedQty: 0,
        appliedIssueQty: 0,
        unitPriceExTax: 18,
        componentLines: [
          {
            id: 'wx-2-cover-1',
            itemName: '钢板下料件',
            itemCode: 'MAT-PLATE-Q235-8',
            specModel: '8mm',
            material: 'Q235B',
            unit: '件',
            unitUsage: 1,
            shipWarehouse: '原料仓',
          },
          {
            id: 'wx-2-bom-shared',
            itemName: '紧固螺栓 M8',
            itemCode: 'MAT-BOLT-M8',
            specModel: 'M8×30',
            material: '8.8级',
            unit: '件',
            unitUsage: 6,
            shipWarehouse: '原料仓',
          },
        ],
      }),
    ],
  }),
  createOutsourcingOrder({
    id: 'wx-3',
    orderNo: 'WX-260806001',
    workOrderName: '表面处理外协',
    salesOrderNo: 'SO-20260728-001',
    supplier: '标准件供应商',
    planDate: '2026-08-20',
    planStartDate: '2026-08-15',
    planEndDate: '2026-08-20',
    status: '待审核',
    issueStatus: '待出库',
    returnStatus: '待入库',
    approvalResult: '待审核',
    createdAt: '2026-08-06 16:20:00',
    updatedAt: '2026-08-06 16:20:00',
    lineItems: [
      line({
        productName: '钢板件',
        productCode: 'MAT-PLATE-10',
        specModel: '10mm',
        material: 'Q235B',
        planQty: 15,
        unit: '张',
        shipWarehouse: '原材料仓',
        billingMethod: '按重量',
        unitPriceExTax: 12,
      }),
    ],
  }),
  createOutsourcingOrder({
    id: 'wx-4',
    orderNo: 'WX-260805001',
    workOrderName: '精加工外协',
    supplier: '多功能供应商02',
    planDate: '2026-08-05',
    planStartDate: '2026-07-30',
    planEndDate: '2026-08-05',
    status: '已完成',
    issueStatus: '已出库',
    returnStatus: '已入库',
    approvalResult: '审核通过',
    approverName: '李四',
    createdAt: '2026-08-05 10:00:00',
    updatedAt: '2026-08-07 18:00:00',
    issueOrders: [
      {
        id: 'wx-4-issue-1',
        issueOrderNo: 'CKWX-260805-008',
        outsourcingOrderId: 'wx-4',
        outsourcingOrderNo: 'WX-260805001',
        supplier: '多功能供应商02',
        workOrderName: '精加工外协',
        shipWarehouse: '半成品仓',
        shipDate: '2026-08-05',
        outboundStatus: '已出库',
        creator: 'admin1',
        createdAt: '2026-08-05 11:00:00',
        confirmer: '李四',
        confirmedAt: '2026-08-05 15:00:00',
        remark: '',
        productSets: [{ lineId: 'wx-4-line-1', setQty: 10 }],
        lineItems: [
          {
            id: 'wx-4-issue-1-l1',
            lineId: 'wx-4-line-1',
            sourceProductLineIds: ['wx-4-line-1'],
            sourceProductText: '精密轴',
            productName: '精密轴毛坯',
            productCode: 'MAT-SHAFT-BLANK',
            specModel: 'φ30',
            material: '40Cr',
            drawingNo: '',
            blankSizeText: '',
            unitUsage: 1,
            applyQty: 10,
            actualQty: 10,
            unit: '根',
            shipWarehouse: '半成品仓',
            remark: '',
            issuedBatchNo: 'B-260805-008',
            barcodeBatchNo: 'B-260805-008',
          },
        ],
      },
    ],
    lineItems: [
      line({
        id: 'wx-4-line-1',
        productName: '精密轴',
        productCode: 'SEMI-SHAFT-01',
        planQty: 10,
        unit: '根',
        shipWarehouse: '半成品仓',
        receivedQty: 10,
        appliedReceiptQty: 10,
        issuedQty: 10,
        appliedIssueQty: 10,
        unitPriceExTax: 80,
      }),
    ],
  }),
]
