import dayjs from 'dayjs'
import { ensureOrderSizeDefaults } from '@/utils/orderSize'

export function createLineItem(partial = {}) {
  const planPurchaseQty = partial.planPurchaseQty ?? partial.demandQty ?? 1
  return ensureOrderSizeDefaults({
    id: `pr-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productName: '',
    productCode: '',
    inventoryName: '',
    inventoryCode: '',
    specModel: '',
    material: '',
    drawingNo: '',
    materialType: '零部件',
    supplyType: '',
    unit: '件',
    inventoryUnit: '',
    purchaseUnit: '',
    blankSizeText: '',
    blankSize: null,
    blankSizeMode: '',
    orderSizeText: '',
    orderSize: null,
    orderSizeMode: '',
    packageContent: 1,
    convertHint: '',
    packagingMethod: '',
    supplierType: '',
    stockQty: 0,
    demandQty: planPurchaseQty,
    planPurchaseQty,
    designatedSupplier: false,
    supplierName: '',
    settlementType: '预付款+货到付',
    unitPriceExTax: 0,
    taxRate: 13,
    unitPriceInTax: 0,
    totalPriceExTax: 0,
    totalPriceInTax: 0,
    receivingMode: '正常收货',
    leadTimeDays: 12,
    expectedArrivalDate: '',
    deliveryDate: '',
    receivingWarehouse: '',
    /** 行级销售订单号（计划/外购销售带入；合并生成 PO 时按此拆分） */
    salesOrderNo: '',
    remark: '',
    ...partial,
  })
}

/** 把头上的销售单号回填到未带销售单号的明细行 */
export function stampRequisitionLineSalesOrderNos(requisition) {
  if (!requisition?.lineItems?.length) return requisition
  const headerSo = String(requisition.salesOrderNo || '').trim()
  if (!headerSo) return requisition
  requisition.lineItems.forEach((line) => {
    if (!String(line.salesOrderNo || '').trim()) {
      line.salesOrderNo = headerSo
    }
  })
  return requisition
}

function prLine(partial) {
  const item = createLineItem(partial)
  item.productName = item.productName || item.inventoryName
  item.productCode = item.productCode || item.inventoryCode
  item.inventoryName = item.inventoryName || item.productName
  item.inventoryCode = item.inventoryCode || item.productCode
  item.purchaseUnit = item.purchaseUnit || item.unit
  item.inventoryUnit = item.inventoryUnit || item.unit
  return item
}

function createRequisition(partial) {
  const lineItems = partial.lineItems || []
  const plannedQty = lineItems.reduce((s, i) => s + (Number(i.planPurchaseQty) || 0), 0)
  const amountWan = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0) / 10000

  const requisition = {
    docStatus: '待处理',
    overdueStatus: '未逾期',
    purchaseOrderNo: '',
    salesOrderNo: '',
    urgency: '正常',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate: '',
    estimatedArrivalDate: '',
    source: '新增',
    operator: '管理员',
    creator: '管理员',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    remark: '',
    receivingWarehouse: '',
    plannedQty,
    amountWan,
    lineItems,
    ...partial,
  }
  return stampRequisitionLineSalesOrderNos(requisition)
}

export const mockPurchaseRequisitions = [
  createRequisition({
    id: 'pr-1',
    reqNo: 'CGSQ-20260804-0001',
    salesOrderNo: 'SO-20260801-001',
    docStatus: '待处理',
    urgency: '正常',
    estimatedArrivalDate: '2026-08-20',
    orderDate: '2026-08-04',
    source: '生产计划',
    receivingWarehouse: '原材料仓',
    remark: '待处理：法兰密封件等',
    lineItems: [
      prLine({
        inventoryName: '碳钢法兰',
        inventoryCode: 'MAT-FLG-80',
        specModel: 'DN80 PN16',
        material: 'Q235B',
        unit: '片',
        demandQty: 20,
        planPurchaseQty: 20,
        supplierName: '多功能供应商01',
        unitPriceExTax: 85,
        orderSizeText: '外径 200 mm',
      }),
      prLine({
        inventoryName: '橡胶密封垫',
        inventoryCode: 'MAT-SEAL-80',
        specModel: 'DN80',
        material: '丁腈橡胶',
        unit: '片',
        demandQty: 40,
        planPurchaseQty: 40,
        supplierName: '多功能供应商01',
        unitPriceExTax: 12.5,
      }),
      prLine({
        inventoryName: '高强度螺栓',
        inventoryCode: 'MAT-BOLT-M16',
        specModel: 'M16×70',
        material: '35CrMo',
        unit: '套',
        demandQty: 200,
        planPurchaseQty: 200,
        supplierName: '多功能供应商01',
        unitPriceExTax: 3.2,
      }),
      prLine({
        inventoryName: '配套螺母',
        inventoryCode: 'MAT-NUT-M16',
        specModel: 'M16',
        material: '35CrMo',
        unit: '个',
        demandQty: 200,
        planPurchaseQty: 200,
        supplierName: '多功能供应商01',
        unitPriceExTax: 0.8,
      }),
    ],
  }),
  createRequisition({
    id: 'pr-2',
    reqNo: 'CGSQ-20260804-0002',
    docStatus: '待处理',
    urgency: '紧急',
    estimatedArrivalDate: '2026-08-10',
    orderDate: '2026-08-04',
    source: '新增',
    remark: '紧急待处理：轴承',
    lineItems: [
      prLine({
        inventoryName: '进口轴承',
        inventoryCode: 'MAT-EXT-001',
        specModel: '6312-2RS',
        material: '轴承钢',
        unit: '套',
        demandQty: 16,
        planPurchaseQty: 16,
        supplierName: 'SKF代理商',
        unitPriceExTax: 800,
      }),
      prLine({
        inventoryName: '深沟球轴承',
        inventoryCode: 'MAT-EXT-002',
        specModel: '6208-2Z',
        material: '轴承钢',
        unit: '套',
        demandQty: 30,
        planPurchaseQty: 30,
        supplierName: 'SKF代理商',
        unitPriceExTax: 45,
      }),
      prLine({
        inventoryName: '润滑脂',
        inventoryCode: 'MAT-GREASE-01',
        specModel: 'LGHP 2/1',
        unit: '桶',
        demandQty: 12,
        planPurchaseQty: 12,
        supplierName: 'SKF代理商',
        unitPriceExTax: 180,
      }),
    ],
  }),
  createRequisition({
    id: 'pr-3',
    reqNo: 'CGSQ-20260803-0001',
    docStatus: '处理中',
    urgency: '正常',
    purchaseOrderNo: 'CG20260803001',
    estimatedArrivalDate: '2026-08-18',
    orderDate: '2026-08-03',
    source: '生产计划',
    remark: '处理中：已生成采购单',
    lineItems: [
      prLine({
        inventoryName: '无缝钢管',
        inventoryCode: 'MAT-PIPE-50',
        specModel: 'φ50×5',
        material: '20#',
        unit: '根',
        demandQty: 80,
        planPurchaseQty: 80,
        supplierName: '多功能供应商02',
        unitPriceExTax: 120,
        orderSizeText: '长 6000 mm',
      }),
      prLine({
        inventoryName: '无缝钢管',
        inventoryCode: 'MAT-PIPE-80',
        specModel: 'φ80×6',
        material: '20#',
        unit: '根',
        demandQty: 40,
        planPurchaseQty: 40,
        supplierName: '多功能供应商02',
        unitPriceExTax: 210,
        orderSizeText: '长 6000 mm',
      }),
      prLine({
        inventoryName: '90°弯头',
        inventoryCode: 'MAT-ELB-50',
        specModel: 'DN50',
        material: '20#',
        unit: '只',
        demandQty: 60,
        planPurchaseQty: 60,
        supplierName: '多功能供应商02',
        unitPriceExTax: 28,
      }),
      prLine({
        inventoryName: '等径三通',
        inventoryCode: 'MAT-TEE-50',
        specModel: 'DN50',
        material: '20#',
        unit: '只',
        demandQty: 24,
        planPurchaseQty: 24,
        supplierName: '多功能供应商02',
        unitPriceExTax: 45,
      }),
      prLine({
        inventoryName: '闸阀',
        inventoryCode: 'MAT-VALVE-50',
        specModel: 'Z41H-16C DN50',
        material: 'WCB',
        unit: '台',
        demandQty: 10,
        planPurchaseQty: 10,
        supplierName: '多功能供应商02',
        unitPriceExTax: 320,
      }),
    ],
  }),
  createRequisition({
    id: 'pr-4',
    reqNo: 'CGSQ-20260802-0001',
    docStatus: '处理中',
    urgency: '正常',
    purchaseOrderNo: 'CG20260802001',
    estimatedArrivalDate: '2026-08-15',
    orderDate: '2026-08-02',
    source: '生产计划',
    lineItems: [
      prLine({
        inventoryName: '钢板',
        inventoryCode: 'MAT-PLATE-10',
        specModel: '10mm',
        material: 'Q235B',
        unit: '张',
        demandQty: 50,
        planPurchaseQty: 50,
        supplierName: '采购供应商A',
        unitPriceExTax: 680,
        orderSizeText: '长 2000 mm × 宽 1000 mm',
      }),
      prLine({
        inventoryName: '钢板',
        inventoryCode: 'MAT-PLATE-16',
        specModel: '16mm',
        material: 'Q235B',
        unit: '张',
        demandQty: 30,
        planPurchaseQty: 30,
        supplierName: '采购供应商A',
        unitPriceExTax: 980,
        orderSizeText: '长 2000 mm × 宽 1250 mm',
      }),
      prLine({
        inventoryName: '角钢',
        inventoryCode: 'MAT-ANGLE-50',
        specModel: 'L50×5',
        material: 'Q235B',
        unit: '根',
        demandQty: 100,
        planPurchaseQty: 100,
        supplierName: '采购供应商A',
        unitPriceExTax: 55,
        orderSizeText: '长 6000 mm',
      }),
      prLine({
        inventoryName: '槽钢',
        inventoryCode: 'MAT-CH-10',
        specModel: '10#',
        material: 'Q235B',
        unit: '根',
        demandQty: 40,
        planPurchaseQty: 40,
        supplierName: '采购供应商A',
        unitPriceExTax: 145,
        orderSizeText: '长 6000 mm',
      }),
    ],
  }),
  createRequisition({
    id: 'pr-5',
    reqNo: 'CGSQ-20260725-0001',
    docStatus: '处理完成',
    urgency: '紧急',
    purchaseOrderNo: 'CG20260728001',
    estimatedArrivalDate: '2026-08-05',
    orderDate: '2026-07-25',
    source: '新增',
    remark: '对应采购单已拒绝',
    lineItems: [
      prLine({
        inventoryName: '标准螺栓组',
        inventoryCode: 'MAT-STD-100',
        specModel: 'M12×40',
        material: '钢',
        unit: '件',
        demandQty: 500,
        planPurchaseQty: 500,
        supplierName: '标准件供应商',
        unitPriceExTax: 1.2,
      }),
      prLine({
        inventoryName: '平垫圈',
        inventoryCode: 'MAT-STD-101',
        specModel: 'M12',
        material: '钢',
        unit: '件',
        demandQty: 500,
        planPurchaseQty: 500,
        supplierName: '标准件供应商',
        unitPriceExTax: 0.15,
      }),
      prLine({
        inventoryName: '弹簧垫圈',
        inventoryCode: 'MAT-STD-102',
        specModel: 'M12',
        material: '65Mn',
        unit: '件',
        demandQty: 500,
        planPurchaseQty: 500,
        supplierName: '标准件供应商',
        unitPriceExTax: 0.18,
      }),
    ],
  }),
  createRequisition({
    id: 'pr-6',
    reqNo: 'CGSQ-20260718-0001',
    salesOrderNo: 'SO-20260710-008',
    docStatus: '处理完成',
    urgency: '正常',
    purchaseOrderNo: 'CG20260720001',
    estimatedArrivalDate: '2026-07-25',
    orderDate: '2026-07-18',
    source: '生产计划',
    remark: '已完成入库',
    lineItems: [
      prLine({
        inventoryName: '三相异步电机',
        inventoryCode: 'MAT-MOTOR-01',
        specModel: 'Y132M-4 7.5kW',
        unit: '台',
        demandQty: 4,
        planPurchaseQty: 4,
        supplierName: '采购供应商B',
        unitPriceExTax: 1850,
      }),
      prLine({
        inventoryName: '弹性联轴器',
        inventoryCode: 'MAT-COUPL-01',
        specModel: 'LM9',
        unit: '套',
        demandQty: 4,
        planPurchaseQty: 4,
        supplierName: '采购供应商B',
        unitPriceExTax: 260,
      }),
      prLine({
        inventoryName: '电机底座',
        inventoryCode: 'MAT-BASE-01',
        specModel: '132M',
        unit: '件',
        demandQty: 4,
        planPurchaseQty: 4,
        supplierName: '采购供应商B',
        unitPriceExTax: 420,
      }),
    ],
  }),
  createRequisition({
    id: 'pr-7',
    reqNo: 'CGSQ-20260714-0001',
    docStatus: '已作废',
    urgency: '正常',
    purchaseOrderNo: 'CG20260715001',
    estimatedArrivalDate: '2026-07-30',
    orderDate: '2026-07-14',
    source: '新增',
    remark: '需求取消已作废',
    lineItems: [
      prLine({
        inventoryName: '防腐油漆',
        inventoryCode: 'MAT-PAINT-01',
        specModel: '环氧富锌',
        unit: '桶',
        demandQty: 20,
        planPurchaseQty: 20,
        supplierName: '多功能供应商01',
        unitPriceExTax: 95,
      }),
      prLine({
        inventoryName: '稀释剂',
        inventoryCode: 'MAT-THINNER-01',
        specModel: '配套型',
        unit: '桶',
        demandQty: 10,
        planPurchaseQty: 10,
        supplierName: '多功能供应商01',
        unitPriceExTax: 48,
      }),
    ],
  }),
  createRequisition({
    id: 'pr-8',
    reqNo: 'CGSQ-20260730-0001',
    docStatus: '处理完成',
    urgency: '特急',
    purchaseOrderNo: 'CG20260801001',
    estimatedArrivalDate: '2026-08-08',
    orderDate: '2026-07-30',
    source: '生产计划',
    overdueStatus: '未逾期',
    remark: '合并生成紧急采购单（密封件）',
    lineItems: [
      prLine({
        inventoryName: 'O型密封圈',
        inventoryCode: 'MAT-O-RING-01',
        specModel: 'φ50×3.5',
        material: '氟橡胶',
        unit: '个',
        demandQty: 300,
        planPurchaseQty: 300,
        supplierName: '采购供应商A',
        unitPriceExTax: 2.5,
      }),
      prLine({
        inventoryName: 'O型密封圈',
        inventoryCode: 'MAT-O-RING-02',
        specModel: 'φ80×3.5',
        material: '氟橡胶',
        unit: '个',
        demandQty: 200,
        planPurchaseQty: 200,
        supplierName: '采购供应商A',
        unitPriceExTax: 3.8,
      }),
      prLine({
        inventoryName: '缠绕垫片',
        inventoryCode: 'MAT-GASKET-01',
        specModel: 'DN100',
        material: '不锈钢+石墨',
        unit: '片',
        demandQty: 40,
        planPurchaseQty: 40,
        supplierName: '采购供应商A',
        unitPriceExTax: 18,
      }),
    ],
  }),
  createRequisition({
    id: 'pr-9',
    reqNo: 'CGSQ-20260730-0002',
    docStatus: '处理完成',
    urgency: '特急',
    purchaseOrderNo: 'CG20260801001',
    estimatedArrivalDate: '2026-08-08',
    orderDate: '2026-07-30',
    source: '新增',
    remark: '合并生成紧急采购单（滤芯）',
    lineItems: [
      prLine({
        inventoryName: '填料',
        inventoryCode: 'MAT-PACK-01',
        specModel: '石墨盘根 10×10',
        unit: 'kg',
        demandQty: 15,
        planPurchaseQty: 15,
        supplierName: '采购供应商A',
        unitPriceExTax: 65,
      }),
      prLine({
        inventoryName: '空气滤芯',
        inventoryCode: 'MAT-FILTER-01',
        specModel: 'AF-200',
        unit: '只',
        demandQty: 8,
        planPurchaseQty: 8,
        supplierName: '采购供应商A',
        unitPriceExTax: 120,
      }),
      prLine({
        inventoryName: '油滤芯',
        inventoryCode: 'MAT-FILTER-02',
        specModel: 'OF-150',
        unit: '只',
        demandQty: 8,
        planPurchaseQty: 8,
        supplierName: '采购供应商A',
        unitPriceExTax: 95,
      }),
    ],
  }),
]

export function clonePurchaseRequisitions() {
  return JSON.parse(JSON.stringify(mockPurchaseRequisitions))
}

export function filterPurchaseRequisitions(list, filters) {
  return list.filter((item) => {
    if (filters.reqNo && !item.reqNo.includes(filters.reqNo)) return false
    if (filters.salesOrderNo && !item.salesOrderNo?.includes(filters.salesOrderNo)) return false
    if (filters.urgency && item.urgency !== filters.urgency) return false
    if (filters.docStatus && item.docStatus !== filters.docStatus) return false
    if (filters.overdueStatus && item.overdueStatus !== filters.overdueStatus) return false
    if (filters.operator && item.operator !== filters.operator) return false
    if (filters.orderDateRange?.length === 2) {
      const [start, end] = filters.orderDateRange
      if (dayjs(item.orderDate).isBefore(start, 'day') || dayjs(item.orderDate).isAfter(end, 'day'))
        return false
    }
    if (filters.deliveryDateRange?.length === 2) {
      const [start, end] = filters.deliveryDateRange
      if (
        dayjs(item.deliveryDate).isBefore(start, 'day') ||
        dayjs(item.deliveryDate).isAfter(end, 'day')
      )
        return false
    }
    return true
  })
}

export function recalcRequisitionTotals(req) {
  const lineItems = req.lineItems || []
  req.plannedQty = lineItems.reduce((s, i) => s + (Number(i.planPurchaseQty) || 0), 0)
  req.amountWan = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0) / 10000
  return req
}
