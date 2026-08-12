import dayjs from 'dayjs'
import { ensureOrderSizeDefaults } from '@/utils/orderSize'

export function createPoLineItem(partial = {}) {
  const purchaseQty = partial.purchaseQty ?? 1
  const ex = Number(partial.unitPriceExTax) || 0
  const rate = partial.taxRate ?? 13
  const inTax = Math.round(ex * (1 + rate / 100) * 100) / 100
  const sourceReqNos = Array.isArray(partial.sourceReqNos)
    ? [...partial.sourceReqNos]
    : String(partial.sourceReqNo || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
  return ensureOrderSizeDefaults({
    id: `po-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productName: '',
    productCode: '',
    itemCode: '',
    itemName: '',
    itemType: '物料',
    category: '',
    specModel: '',
    specAttr: '',
    material: '',
    drawingNo: '',
    variantSummary: '',
    stockQty: 0,
    purchaseQty,
    unit: '个',
    blankSizeText: '',
    blankSize: null,
    blankSizeMode: '',
    orderSizeText: '',
    orderSize: null,
    orderSizeMode: '',
    unitPriceExTax: ex,
    taxRate: rate,
    unitPriceInTax: inTax,
    totalPriceExTax: Math.round(purchaseQty * ex * 100) / 100,
    totalPriceInTax: Math.round(purchaseQty * inTax * 100) / 100,
    deliveryDate: '',
    urgency: '正常',
    receivingMode: '正常收货',
    receivingWarehouse: '',
    receivedQty: 0,
    inboundQcRequirement: '',
    productionDate: '',
    expiryDate: '',
    remark: '',
    ...partial,
    /** 来源采购申请单号（合并生成时写入；不含销售订单关联） */
    sourceReqNos,
    sourceReqNo: sourceReqNos.join(','),
  })
}

function line(partial) {
  const item = createPoLineItem(partial)
  item.productName = item.productName || item.itemName
  item.productCode = item.productCode || item.itemCode
  item.itemName = item.itemName || item.productName
  item.itemCode = item.itemCode || item.productCode
  return item
}

function createPurchaseOrder(partial) {
  const lineItems = partial.lineItems || []
  const totalQty = lineItems.reduce((s, i) => s + (Number(i.purchaseQty) || 0), 0)
  const amountExTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0)
  const amountInTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0)

  return {
    status: '待提交',
    orderSource: '新增',
    applyType: '日常采购',
    inboundStatus: '待入库',
    overdueStatus: '未逾期',
    approvalResult: '',
    approverName: '',
    settlementType: '先款后货',
    settlementCycle: '月结',
    settlementMethod: '现金结算',
    deliveryMethod: '定时交货',
    leadTimeDays: 12,
    contractNo: '',
    salesOrderNo: '',
    workOrderNo: '',
    reqNo: '',
    purchaser: 'admin1',
    creator: 'admin1',
    updater: 'admin1',
    contactPerson: '',
    contactPhone: '',
    shippingAddress: '',
    receivingWarehouse: '原材料仓',
    reminderDate: '',
    shippingDate: '',
    contractFile: '',
    remark: '',
    totalQty,
    amountExTax,
    amountInTax,
    lineItems,
    documentDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate: '',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    approvedAt: '',
    ...partial,
  }
}

export const mockPurchaseOrders = [
  createPurchaseOrder({
    id: 'po-1',
    orderNo: 'CG20260804001',
    reqNo: 'CGSQ-20260804-0001',
    salesOrderNo: 'SO-20260801-001',
    supplier: '多功能供应商01',
    contractNo: 'HT-20260801',
    status: '待提交',
    applyType: '日常采购',
    orderSource: '采购申请',
    deliveryDate: '2026-08-20',
    leadTimeDays: 10,
    documentDate: '2026-08-04',
    remark: '待提交：法兰/密封件/垫片一批',
    lineItems: [
      line({
        itemCode: 'MAT-FLG-80',
        itemName: '碳钢法兰',
        specModel: 'DN80 PN16',
        material: 'Q235B',
        purchaseQty: 20,
        unit: '片',
        unitPriceExTax: 85,
        orderSizeText: '外径 200 mm',
        receivingWarehouse: '原材料仓',
      }),
      line({
        itemCode: 'MAT-SEAL-80',
        itemName: '橡胶密封垫',
        specModel: 'DN80',
        material: '丁腈橡胶',
        purchaseQty: 40,
        unit: '片',
        unitPriceExTax: 12.5,
        receivingWarehouse: '原材料仓',
      }),
      line({
        itemCode: 'MAT-BOLT-M16',
        itemName: '高强度螺栓',
        specModel: 'M16×70',
        material: '35CrMo',
        purchaseQty: 200,
        unit: '套',
        unitPriceExTax: 3.2,
        receivingWarehouse: '原材料仓',
      }),
      line({
        itemCode: 'MAT-NUT-M16',
        itemName: '配套螺母',
        specModel: 'M16',
        material: '35CrMo',
        purchaseQty: 200,
        unit: '个',
        unitPriceExTax: 0.8,
        receivingWarehouse: '原材料仓',
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-2',
    orderNo: 'CG20260804002',
    reqNo: 'CGSQ-20260804-0002',
    supplier: 'SKF代理商',
    status: '待审核',
    applyType: '紧急采购',
    orderSource: '采购申请',
    deliveryDate: '2026-08-10',
    leadTimeDays: 3,
    documentDate: '2026-08-04',
    urgencyNote: '产线急用',
    remark: '待审核紧急：轴承与润滑脂',
    lineItems: [
      line({
        itemCode: 'MAT-EXT-001',
        itemName: '进口轴承',
        specModel: '6312-2RS',
        material: '轴承钢',
        purchaseQty: 16,
        unit: '套',
        unitPriceExTax: 800,
      }),
      line({
        itemCode: 'MAT-EXT-002',
        itemName: '深沟球轴承',
        specModel: '6208-2Z',
        material: '轴承钢',
        purchaseQty: 30,
        unit: '套',
        unitPriceExTax: 45,
      }),
      line({
        itemCode: 'MAT-GREASE-01',
        itemName: '润滑脂',
        specModel: 'LGHP 2/1',
        purchaseQty: 12,
        unit: '桶',
        unitPriceExTax: 180,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-3',
    orderNo: 'CG20260803001',
    reqNo: 'CGSQ-20260803-0001',
    supplier: '多功能供应商02',
    status: '进行中',
    applyType: '日常采购',
    orderSource: '采购申请',
    approvalResult: '审核通过',
    approverName: 'admin1',
    approvedAt: '2026-08-03 14:20',
    inboundStatus: '待入库',
    deliveryDate: '2026-08-18',
    documentDate: '2026-08-03',
    remark: '进行中待入库：可反审',
    approvalRecords: [
      {
        name: 'admin1',
        role: '采购审核',
        result: '已通过',
        time: '2026-08-03 14:20',
        opinion: '同意采购',
      },
    ],
    lineItems: [
      line({
        itemCode: 'MAT-PIPE-50',
        itemName: '无缝钢管',
        specModel: 'φ50×5',
        material: '20#',
        purchaseQty: 80,
        unit: '根',
        unitPriceExTax: 120,
        orderSizeText: '长 6000 mm',
        inboundQcRequirement: '全检',
      }),
      line({
        itemCode: 'MAT-PIPE-80',
        itemName: '无缝钢管',
        specModel: 'φ80×6',
        material: '20#',
        purchaseQty: 40,
        unit: '根',
        unitPriceExTax: 210,
        orderSizeText: '长 6000 mm',
        inboundQcRequirement: '抽检',
      }),
      line({
        itemCode: 'MAT-ELB-50',
        itemName: '90°弯头',
        specModel: 'DN50',
        material: '20#',
        purchaseQty: 60,
        unit: '只',
        unitPriceExTax: 28,
        inboundQcRequirement: '免检',
      }),
      line({
        itemCode: 'MAT-TEE-50',
        itemName: '等径三通',
        specModel: 'DN50',
        material: '20#',
        purchaseQty: 24,
        unit: '只',
        unitPriceExTax: 45,
      }),
      line({
        itemCode: 'MAT-VALVE-50',
        itemName: '闸阀',
        specModel: 'Z41H-16C DN50',
        material: 'WCB',
        purchaseQty: 10,
        unit: '台',
        unitPriceExTax: 320,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-4',
    orderNo: 'CG20260802001',
    reqNo: 'CGSQ-20260802-0001',
    supplier: '采购供应商A',
    status: '进行中',
    applyType: '日常采购',
    orderSource: '采购申请',
    approvalResult: '审核通过',
    approverName: '张三',
    approvedAt: '2026-08-02 15:00',
    inboundStatus: '部分入库',
    deliveryDate: '2026-08-15',
    documentDate: '2026-08-02',
    shippingDate: '2026-08-12',
    remark: '部分入库：不可反审',
    lineItems: [
      line({
        itemCode: 'MAT-PLATE-10',
        itemName: '钢板',
        specModel: '10mm',
        material: 'Q235B',
        purchaseQty: 50,
        unit: '张',
        unitPriceExTax: 680,
        receivedQty: 20,
        orderSizeText: '长 2000 mm × 宽 1000 mm',
      }),
      line({
        itemCode: 'MAT-PLATE-16',
        itemName: '钢板',
        specModel: '16mm',
        material: 'Q235B',
        purchaseQty: 30,
        unit: '张',
        unitPriceExTax: 980,
        receivedQty: 10,
        orderSizeText: '长 2000 mm × 宽 1250 mm',
      }),
      line({
        itemCode: 'MAT-ANGLE-50',
        itemName: '角钢',
        specModel: 'L50×5',
        material: 'Q235B',
        purchaseQty: 100,
        unit: '根',
        unitPriceExTax: 55,
        receivedQty: 100,
        orderSizeText: '长 6000 mm',
      }),
      line({
        itemCode: 'MAT-CH-10',
        itemName: '槽钢',
        specModel: '10#',
        material: 'Q235B',
        purchaseQty: 40,
        unit: '根',
        unitPriceExTax: 145,
        receivedQty: 0,
        orderSizeText: '长 6000 mm',
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-5',
    orderNo: 'CG20260728001',
    reqNo: 'CGSQ-20260725-0001',
    supplier: '标准件供应商',
    status: '已拒绝',
    applyType: '紧急采购',
    orderSource: '新增',
    approvalResult: '已拒绝',
    approverName: '李四',
    approvedAt: '2026-07-28 16:30',
    inboundStatus: '待入库',
    deliveryDate: '2026-08-05',
    documentDate: '2026-07-28',
    remark: '已拒绝：单价偏高，可改后重审',
    lineItems: [
      line({
        itemCode: 'MAT-STD-100',
        itemName: '标准螺栓组',
        specModel: 'M12×40',
        material: '钢',
        purchaseQty: 500,
        unit: '件',
        unitPriceExTax: 1.2,
      }),
      line({
        itemCode: 'MAT-STD-101',
        itemName: '平垫圈',
        specModel: 'M12',
        material: '钢',
        purchaseQty: 500,
        unit: '件',
        unitPriceExTax: 0.15,
      }),
      line({
        itemCode: 'MAT-STD-102',
        itemName: '弹簧垫圈',
        specModel: 'M12',
        material: '65Mn',
        purchaseQty: 500,
        unit: '件',
        unitPriceExTax: 0.18,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-6',
    orderNo: 'CG20260720001',
    reqNo: 'CGSQ-20260718-0001',
    salesOrderNo: 'SO-20260710-008',
    supplier: '采购供应商B',
    status: '已完成',
    applyType: '日常采购',
    orderSource: '外购销售',
    approvalResult: '审核通过',
    approverName: 'admin1',
    approvedAt: '2026-07-20 11:00',
    inboundStatus: '已入库',
    deliveryDate: '2026-07-25',
    documentDate: '2026-07-20',
    shippingDate: '2026-07-24',
    remark: '已完成且已入库',
    lineItems: [
      line({
        itemCode: 'MAT-MOTOR-01',
        itemName: '三相异步电机',
        specModel: 'Y132M-4 7.5kW',
        purchaseQty: 4,
        unit: '台',
        unitPriceExTax: 1850,
        receivedQty: 4,
      }),
      line({
        itemCode: 'MAT-COUPL-01',
        itemName: '弹性联轴器',
        specModel: 'LM9',
        purchaseQty: 4,
        unit: '套',
        unitPriceExTax: 260,
        receivedQty: 4,
      }),
      line({
        itemCode: 'MAT-BASE-01',
        itemName: '电机底座',
        specModel: '132M',
        purchaseQty: 4,
        unit: '件',
        unitPriceExTax: 420,
        receivedQty: 4,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-7',
    orderNo: 'CG20260715001',
    reqNo: 'CGSQ-20260714-0001',
    supplier: '多功能供应商01',
    status: '已作废',
    applyType: '日常采购',
    orderSource: '采购申请',
    approvalResult: '待审核',
    inboundStatus: '待入库',
    deliveryDate: '2026-07-30',
    documentDate: '2026-07-15',
    remark: '已作废：需求取消',
    lineItems: [
      line({
        itemCode: 'MAT-PAINT-01',
        itemName: '防腐油漆',
        specModel: '环氧富锌',
        purchaseQty: 20,
        unit: '桶',
        unitPriceExTax: 95,
      }),
      line({
        itemCode: 'MAT-THINNER-01',
        itemName: '稀释剂',
        specModel: '配套型',
        purchaseQty: 10,
        unit: '桶',
        unitPriceExTax: 48,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-8',
    orderNo: 'CG20260801001',
    reqNo: 'CGSQ-20260730-0001,CGSQ-20260730-0002',
    supplier: '采购供应商A',
    status: '进行中',
    applyType: '紧急采购',
    orderSource: '采购申请',
    approvalResult: '审核通过',
    approverName: 'admin1',
    approvedAt: '2026-08-01 10:30',
    inboundStatus: '待入库',
    deliveryDate: '2026-08-08',
    documentDate: '2026-08-01',
    remark: '紧急进行中待入库：可反审',
    lineItems: [
      line({
        itemCode: 'MAT-O-RING-01',
        itemName: 'O型密封圈',
        specModel: 'φ50×3.5',
        material: '氟橡胶',
        purchaseQty: 300,
        unit: '个',
        unitPriceExTax: 2.5,
      }),
      line({
        itemCode: 'MAT-O-RING-02',
        itemName: 'O型密封圈',
        specModel: 'φ80×3.5',
        material: '氟橡胶',
        purchaseQty: 200,
        unit: '个',
        unitPriceExTax: 3.8,
      }),
      line({
        itemCode: 'MAT-GASKET-01',
        itemName: '缠绕垫片',
        specModel: 'DN100',
        material: '不锈钢+石墨',
        purchaseQty: 40,
        unit: '片',
        unitPriceExTax: 18,
      }),
      line({
        itemCode: 'MAT-PACK-01',
        itemName: '填料',
        specModel: '石墨盘根 10×10',
        purchaseQty: 15,
        unit: 'kg',
        unitPriceExTax: 65,
      }),
      line({
        itemCode: 'MAT-FILTER-01',
        itemName: '空气滤芯',
        specModel: 'AF-200',
        purchaseQty: 8,
        unit: '只',
        unitPriceExTax: 120,
      }),
      line({
        itemCode: 'MAT-FILTER-02',
        itemName: '油滤芯',
        specModel: 'OF-150',
        purchaseQty: 8,
        unit: '只',
        unitPriceExTax: 95,
      }),
    ],
  }),
]

export function clonePurchaseOrders() {
  return JSON.parse(JSON.stringify(mockPurchaseOrders))
}

export function filterPurchaseOrders(list, filters) {
  return list.filter((item) => {
    if (filters.orderNo && !item.orderNo.includes(filters.orderNo)) return false
    if (filters.supplier && item.supplier !== filters.supplier) return false
    if (filters.reqNo && !item.reqNo?.includes(filters.reqNo)) return false
    if (filters.salesOrderNo && !item.salesOrderNo?.includes(filters.salesOrderNo)) return false
    if (filters.status && item.status !== filters.status) return false
    if (filters.orderSource && item.orderSource !== filters.orderSource) return false
    if (filters.overdueStatus) {
      const overdue = item.overdueStatus || computePurchaseOrderOverdueStatus(item)
      if (overdue !== filters.overdueStatus) return false
    }
    if (filters.documentDateRange?.length === 2) {
      const [start, end] = filters.documentDateRange
      if (
        dayjs(item.documentDate).isBefore(start, 'day') ||
        dayjs(item.documentDate).isAfter(end, 'day')
      )
        return false
    }
    return true
  })
}

/**
 * 超过交货日期且仍未完成入库 → 已逾期（仅进行中单据）
 */
export function computePurchaseOrderOverdueStatus(order, now = dayjs()) {
  if (!order) return '未逾期'
  if (order.inboundStatus === '已入库') return '未逾期'
  if (order.status !== '进行中') return '未逾期'
  const deliveryDate = String(order.deliveryDate || '').slice(0, 10)
  if (!deliveryDate) return '未逾期'
  const plan = dayjs(deliveryDate)
  if (!plan.isValid()) return '未逾期'
  return now.isAfter(plan, 'day') ? '已逾期' : '未逾期'
}

export function recalcPurchaseOrderTotals(order) {
  const lineItems = order.lineItems || []
  order.totalQty = lineItems.reduce((s, i) => s + (Number(i.purchaseQty) || 0), 0)
  order.amountExTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0)
  order.amountInTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0)
  return order
}
