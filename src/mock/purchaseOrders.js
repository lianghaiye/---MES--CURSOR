import dayjs from 'dayjs'
import { ensureOrderSizeDefaults } from '@/utils/orderSize'

export function createPoLineItem(partial = {}) {
  const purchaseQty = partial.purchaseQty ?? 1
  const ex = Number(partial.unitPriceExTax) || 0
  const rate = partial.taxRate ?? 13
  const inTax = Math.round(ex * (1 + rate / 100) * 100) / 100
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
    receivingMode: '正常收货',
    receivingWarehouse: '',
    receivedQty: 0,
    productionDate: '',
    expiryDate: '',
    remark: '',
    ...partial,
  })
}

function createPurchaseOrder(partial) {
  const lineItems = partial.lineItems || []
  const totalQty = lineItems.reduce((s, i) => s + (Number(i.purchaseQty) || 0), 0)
  const amountExTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0)
  const amountInTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0)

  return {
    status: '待审批',
    orderSource: '新增',
    applyType: '日常采购申请',
    inboundStatus: '未入库',
    approvalResult: '待审批',
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
    contactPerson: '',
    contactPhone: '',
    shippingAddress: '',
    receivingWarehouse: '',
    logisticsNo: '',
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
    ...partial,
  }
}

export const mockPurchaseOrders = [
  createPurchaseOrder({
    id: 'po-1',
    orderNo: 'CG20260529003',
    reqNo: 'CGSQ-20260527-0002',
    salesOrderNo: '1-20260526-002',
    supplier: '多功能供应商01',
    contractNo: 'HT-20260501',
    status: '待审批',
    orderSource: '采购申请',
    deliveryDate: '2026-05-31',
    leadTimeDays: 2,
    totalQty: 10,
    amountExTax: 5000,
    amountInTax: 5650,
    lineItems: [
      createPoLineItem({
        itemCode: '20260304001',
        itemName: '欧阳测试',
        itemType: '物料',
        specModel: '4242',
        purchaseQty: 10,
        unit: '个',
        unitPriceExTax: 500,
        totalPriceExTax: 5000,
        totalPriceInTax: 5650,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-2',
    orderNo: 'CG20260529002',
    reqNo: 'CGSQ-20260527-0001',
    supplier: '多功能供应商02',
    status: '进行中',
    orderSource: '采购申请',
    approvalResult: '审批通过',
    approverName: 'admin1',
    deliveryDate: '2026-05-27',
    leadTimeDays: 0,
    totalQty: 2900,
    amountExTax: 29000,
    amountInTax: 32770,
    lineItems: [
      createPoLineItem({
        itemCode: '20260304002',
        itemName: '测试用002',
        itemType: '物料',
        specModel: '1232',
        purchaseQty: 2900,
        unit: '个',
        unitPriceExTax: 10,
        totalPriceExTax: 29000,
        totalPriceInTax: 32770,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-3',
    orderNo: 'CG20260518001',
    reqNo: 'CGSQ-20260430-0002',
    supplier: 'SKF代理商',
    status: '已完成',
    orderSource: '采购申请',
    approvalResult: '审批通过',
    approverName: 'admin1',
    inboundStatus: '已入库',
    deliveryDate: '2026-04-30',
    leadTimeDays: 13,
    totalQty: 10,
    amountExTax: 8000,
    amountInTax: 9040,
    lineItems: [
      createPoLineItem({
        itemCode: 'MAT-EXT-001',
        itemName: '进口轴承',
        itemType: '物料',
        specModel: '6312-2RS',
        purchaseQty: 10,
        unit: '套',
        receivedQty: 10,
        unitPriceExTax: 800,
        totalPriceExTax: 8000,
        totalPriceInTax: 9040,
      }),
    ],
  }),
  createPurchaseOrder({
    id: 'po-4',
    orderNo: 'CG20260518002',
    reqNo: 'CGSQ-20260430-0001',
    salesOrderNo: '1-20260522-002',
    supplier: '标准件供应商',
    status: '已完成',
    orderSource: '外购销售',
    approvalResult: '审批通过',
    approverName: 'admin1',
    inboundStatus: '未入库',
    deliveryDate: '2026-04-28',
    leadTimeDays: 12,
    totalQty: 21,
    amountExTax: 1500,
    amountInTax: 1695,
    lineItems: [
      createPoLineItem({
        itemCode: 'MAT-STD-100',
        itemName: '标准螺栓组',
        itemType: '物料',
        specModel: 'M12×40',
        purchaseQty: 21,
        unit: '件',
        unitPriceExTax: 71.43,
        totalPriceExTax: 1500,
        totalPriceInTax: 1695,
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

export function recalcPurchaseOrderTotals(order) {
  const lineItems = order.lineItems || []
  order.totalQty = lineItems.reduce((s, i) => s + (Number(i.purchaseQty) || 0), 0)
  order.amountExTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0)
  order.amountInTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0)
  return order
}
