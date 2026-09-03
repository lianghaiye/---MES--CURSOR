import dayjs from 'dayjs'

function createLineItem(partial = {}) {
  const salesQty = partial.salesQty ?? partial.qty ?? 1
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productAttr: '',
    productId: '',
    productName: '',
    productCode: '',
    bomId: '',
    specAttr: '',
    specModel: '',
    material: '',
    drawingNo: '',
    deliveryDate: '',
    unit: '件',
    issueQty: 0,
    bomName: '',
    bomVersion: '',
    listUnitPriceExTax: 0,
    lineDiscountRate: 1,
    lineDiscountAmount: 0,
    priceSource: 'product',
    unitPriceExTax: 0,
    taxRate: 13,
    unitPriceInTax: 0,
    totalPriceExTax: 0,
    totalPriceInTax: 0,
    techParams: '',
    matchingRequirements: '',
    packagingForm: '',
    category: '',
    shippedQty: 0,
    itemWeightKg: 0,
    lineRemark: '',
    supplementDesc: '',
    attachment: '',
    lineAttachments: [],
    deliveryMode: '整机',
    /** 库存履约：prefer_stock | force_mto | stock_only */
    stockFulfillmentMode: 'prefer_stock',
    stockTakeQty: null,
    planProduceQty: null,
    /** 是否需要工业标识（默认跟产品主数据） */
    needIndustrialLabel: false,
    industrialLabelStatus: '—',
    industrialLabelSuccessCount: 0,
    industrialLabelFailCount: 0,
    industrialLabelRequestNo: '',
    lineAccessoryKits: [],
    ebomSnapshot: null,
    businessType: '自产销售',
    isManualLine: false,
    isOutsourcingLine: false,
    isSpuLine: false,
    spuId: '',
    spuName: '',
    variantValues: {},
    variantSummary: '',
    materialGradeId: '',
    ...partial,
    salesQty,
    qty: salesQty,
  }
}

function createSalesOrder(partial) {
  const lineItems = partial.lineItems || []
  const totalQty = lineItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)
  const amountExTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0)
  const amountInTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0)

  return {
    status: '',
    deliveryStatus: '未发货',
    progressStatus: '待提交',
    inventoryStatus: '充足',
    totalIssuedQty: 0,
    orderSource: '内部新增',
    region: '华北',
    salesChannel: '直销',
    settlementType: '',
    paymentRatio: '',
    downPaymentAmount: null,
    settlementCurrency: '人民币',
    contractType: '标准合同',
    orderType: '国内订单',
    deliveryMethod: '送货',
    businessType: '自产销售',
    fulfillmentMethod: '整机成品发货',
    urgency: '正常',
    orderAmount: amountInTax,
    totalQty,
    amountExTax,
    amountInTax,
    lineItems,
    purchaseRequisitionNo: '',
    purchaseRequisitionId: '',
    deliveryApplications: [],
    attachments: [],
    creator: 'admin1',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    approver: '',
    approvedAt: '',
    deliveryAddress: '',
    techSpecCode: '',
    ...partial,
  }
}

export const mockSalesOrders = [
  createSalesOrder({
    id: 'so-1',
    orderNo: '1-20260529-002',
    contractNo: '1-20260522-002',
    customerName: '测试人员',
    region: '华北',
    salesperson: 'admin1',
    progressStatus: '进行中',
    documentDate: '2026-05-29',
    reminderDate: '',
    urgency: '正常',
    remark: '自动同步',
    inventoryStatus: '充足',
    totalIssuedQty: 0,
    contactPerson: 'TEST',
    contactPhone: '16522033362',
    lineItems: [
      createLineItem({
        id: 'line-1',
        productName: '测试产品00002',
        productCode: 'SPARE-50*30-001',
        specAttr: '标准',
        specModel: '50*30',
        material: '钢',
        techParams: '',
        packagingForm: '纸箱',
        category: '离心泵',
        unit: '个',
        unitPriceExTax: 28.77,
        qty: 3,
        salesQty: 3,
        shippedQty: 0,
        totalPriceExTax: 86.31,
        totalPriceInTax: 86.31,
      }),
    ],
  }),
  createSalesOrder({
    id: 'so-2',
    orderNo: '1-20260528-001',
    contractNo: 'HT-20260528-001',
    customerName: '人纷纷',
    region: '华东',
    salesperson: 'admin1',
    progressStatus: '待提交',
    documentDate: '2026-05-28',
    urgency: '正常',
    remark: '',
    inventoryStatus: '缺货',
    totalIssuedQty: 0,
    lineItems: [
      createLineItem({
        id: 'line-2',
        productName: '潜水电机',
        productCode: 'PRD-YQST250',
        specModel: '750kW',
        qty: 2,
        totalPriceExTax: 120000,
        totalPriceInTax: 135600,
      }),
    ],
  }),
  createSalesOrder({
    id: 'so-3',
    orderNo: '1-20260527-003',
    contractNo: '',
    customerName: '华东机械制造有限公司',
    region: '华东',
    salesperson: '张三',
    progressStatus: '进行中',
    documentDate: '2026-05-27',
    urgency: '紧急',
    inventoryStatus: '充足',
    totalIssuedQty: 5,
    deliveryStatus: '部分发货',
    lineItems: [
      createLineItem({
        id: 'line-3',
        productName: '精密模芯',
        productCode: 'MD-200-BLK',
        specModel: '200mm',
        category: '模具',
        unit: '件',
        qty: 6,
        salesQty: 6,
        shippedQty: 5,
        unitPriceExTax: 8000,
        totalPriceExTax: 48000,
        totalPriceInTax: 54240,
      }),
    ],
  }),
]

export function cloneSalesOrders() {
  return JSON.parse(JSON.stringify(mockSalesOrders))
}

export function filterSalesOrders(list, filters) {
  return list.filter((order) => {
    if (filters.orderNo && !order.orderNo.includes(filters.orderNo)) return false
    if (filters.contractNo && !(order.contractNo || '').includes(filters.contractNo)) return false
    if (filters.customerName && order.customerName !== filters.customerName) return false
    if (filters.orderSource && order.orderSource !== filters.orderSource) return false
    if (filters.salesperson && order.salesperson !== filters.salesperson) return false
    if (filters.progressStatus && order.progressStatus !== filters.progressStatus) return false
    if (filters.deliveryStatus && order.deliveryStatus !== filters.deliveryStatus) return false
    if (filters.documentDateRange?.length === 2) {
      const [start, end] = filters.documentDateRange
      if (
        dayjs(order.documentDate).isBefore(start, 'day') ||
        dayjs(order.documentDate).isAfter(end, 'day')
      )
        return false
    }
    return true
  })
}

export { createLineItem, createSalesOrder }
