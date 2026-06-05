import dayjs from 'dayjs'

export function createLineItem(partial = {}) {
  const planPurchaseQty = partial.planPurchaseQty ?? partial.demandQty ?? 1
  return {
    id: `pr-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    inventoryName: '',
    inventoryCode: '',
    specModel: '',
    material: '',
    materialType: '零部件',
    supplyType: '',
    unit: '件',
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
    remark: '',
    ...partial,
  }
}

function createRequisition(partial) {
  const lineItems = partial.lineItems || []
  const plannedQty = lineItems.reduce((s, i) => s + (Number(i.planPurchaseQty) || 0), 0)
  const amountWan = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0) / 10000

  return {
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
}

export const mockPurchaseRequisitions = [
  createRequisition({
    id: 'pr-1',
    reqNo: 'CGSQ-20260527-0002',
    salesOrderNo: '',
    docStatus: '待处理',
    urgency: '正常',
    plannedQty: 4,
    amountWan: 0,
    deliveryDate: '',
    estimatedArrivalDate: '2026-05-31',
    orderDate: '2026-05-27',
    source: '生产计划',
    receivingWarehouse: '库库仓',
    operator: 'admin1',
    creator: 'admin1',
    createdAt: '2026-05-27 13:44:41',
    updatedAt: '2026-05-27 13:44:41',
    lineItems: [
      createLineItem({
        inventoryName: '欧阳测试',
        inventoryCode: '010040032',
        specModel: '4242',
        material: '',
        materialType: '零部件',
        supplyType: '',
        supplierType: '',
        unit: '',
        demandQty: 2,
        planPurchaseQty: 2,
        unitPriceInTax: 0,
        totalPriceInTax: 0,
        designatedSupplier: false,
        supplierName: '',
        expectedArrivalDate: '2026-05-31',
      }),
      createLineItem({
        inventoryName: '欧阳测试01',
        inventoryCode: '010040033',
        specModel: '89089',
        material: '',
        materialType: '零部件',
        supplyType: '',
        supplierType: '',
        unit: '',
        demandQty: 2,
        planPurchaseQty: 2,
        unitPriceInTax: 0,
        totalPriceInTax: 0,
        designatedSupplier: false,
        supplierName: '',
        expectedArrivalDate: '2026-05-31',
      }),
    ],
  }),
  createRequisition({
    id: 'pr-2',
    reqNo: 'CGSQ-20260527-0001',
    salesOrderNo: '1-20260526-002',
    docStatus: '处理中',
    urgency: '紧急',
    plannedQty: 2900,
    amountWan: 0,
    deliveryDate: '2026-05-27',
    estimatedArrivalDate: '2026-05-27',
    orderDate: '2026-05-27',
    source: '生产计划',
    lineItems: [
      createLineItem({
        inventoryName: '测试用002',
        inventoryCode: '20260304002',
        specModel: '1232',
        material: '测试材质',
        unit: '个',
        demandQty: 2900,
        planPurchaseQty: 2900,
        supplierName: '采购供应商A',
        designatedSupplier: false,
        expectedArrivalDate: '2026-05-27',
      }),
    ],
  }),
  createRequisition({
    id: 'pr-3',
    reqNo: 'CGSQ-20260430-0003',
    salesOrderNo: '',
    docStatus: '待处理',
    urgency: '正常',
    plannedQty: 63,
    amountWan: 0,
    deliveryDate: '2026-04-30',
    estimatedArrivalDate: '2026-04-30',
    orderDate: '2026-04-30',
    source: '新增',
    lineItems: [
      createLineItem({
        inventoryName: '测试用002',
        inventoryCode: '20260304002',
        specModel: '1232',
        material: '测试材质',
        unit: '个',
        demandQty: 20,
        planPurchaseQty: 20,
        designatedSupplier: true,
        supplierName: '',
        expectedArrivalDate: '2026-04-30',
      }),
      createLineItem({
        inventoryName: '测试用002',
        inventoryCode: '20260304002',
        specModel: '1232',
        material: '测试材质',
        unit: '个',
        demandQty: 43,
        planPurchaseQty: 43,
        designatedSupplier: false,
        supplierName: '采购供应商A',
        expectedArrivalDate: '2026-04-30',
      }),
    ],
  }),
  createRequisition({
    id: 'pr-4',
    reqNo: 'CGSQ-20260430-0002',
    salesOrderNo: '',
    docStatus: '处理完成',
    urgency: '正常',
    plannedQty: 10,
    amountWan: 0,
    purchaseOrderNo: 'CG20260518001',
    deliveryDate: '2026-04-30',
    estimatedArrivalDate: '2026-04-30',
    orderDate: '2026-04-30',
    source: '新增',
    lineItems: [
      createLineItem({
        inventoryName: '进口轴承',
        inventoryCode: 'MAT-EXT-001',
        specModel: '6312-2RS',
        material: '轴承钢',
        unit: '套',
        demandQty: 10,
        planPurchaseQty: 10,
        supplierName: 'SKF代理商',
        expectedArrivalDate: '2026-04-30',
      }),
    ],
  }),
  createRequisition({
    id: 'pr-5',
    reqNo: 'CGSQ-20260430-0001',
    salesOrderNo: '1-20260522-002',
    docStatus: '处理完成',
    urgency: '特急',
    plannedQty: 21,
    amountWan: 0.15,
    purchaseOrderNo: 'CG20260518002',
    deliveryDate: '2026-04-28',
    estimatedArrivalDate: '2026-04-28',
    orderDate: '2026-04-28',
    source: '生产计划',
    overdueStatus: '已逾期',
    lineItems: [
      createLineItem({
        inventoryName: '标准螺栓组',
        inventoryCode: 'MAT-STD-100',
        specModel: 'M12×40',
        material: '钢',
        unit: '件',
        demandQty: 21,
        planPurchaseQty: 21,
        supplierName: '标准件供应商',
        unitPriceInTax: 71.43,
        totalPriceInTax: 1500,
        expectedArrivalDate: '2026-04-28',
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
