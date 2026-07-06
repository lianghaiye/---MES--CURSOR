import dayjs from 'dayjs'

export function createInboundLine(partial = {}) {
  const locationNo =
    partial.locationNo ||
    [partial.shelf, partial.binLocation].filter(Boolean).join('-') ||
    ''
  return {
    id: `ib-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: '',
    itemName: '',
    specAttr: '',
    specModel: '',
    material: '',
    drawingNo: '',
    qty: 1,
    weight: null,
    unit: '件',
    unitPrice: null,
    totalPrice: null,
    lineSource: '',
    sourceDocNo: '',
    stockQty: null,
    warehouseStockQty: null,
    barcodeBatchNo: '',
    productionDate: '',
    expiryDate: '',
    lineRemark: '',
    warehouse: '',
    poLineId: '',
    ...partial,
    locationNo,
  }
}

export function createInboundOrder(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    docNo: '',
    inboundType: '其他入库',
    status: '待处理',
    warehouse: undefined,
    warehouseKeeper: '',
    inboundDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate: '',
    itemType: '产品',
    supplier: undefined,
    sourceOrderNo: '',
    sourceType: '',
    sourceWorkshop: '',
    invoiceNo: '',
    handler: 'admin1',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    approver: '',
    approvedAt: '',
    remark: '',
    miniProgramTaskId: '',
    purchaseOrderId: '',
    lineItems: [],
    ...partial,
  }
}

export function cloneInboundSeedOrders() {
  const baseDate = dayjs().format('YYYY-MM-DD')
  return [
    createInboundOrder({
      id: 'ib-001',
      docNo: '1-20260609-00001',
      inboundType: '采购入库',
      status: '待处理',
      warehouse: '原料仓',
      warehouseKeeper: 'admin1',
      inboundDate: baseDate,
      deliveryDate: baseDate,
      itemType: '物料',
      supplier: '采购供应商A',
      sourceOrderNo: 'PO20260528001',
      sourceType: '采购订单',
      invoiceNo: 'FP202606001',
      handler: 'admin1',
      creator: '管理员',
      createdAt: '2026-06-08 10:00:00',
      lineItems: [
        createInboundLine({
          itemCode: 'WL100001',
          itemName: '铸铁叶轮 HT250',
          specModel: 'HT250',
          material: '铸铁',
          qty: 50,
          unit: '件',
          unitPrice: 120,
          warehouse: '原料仓',
          locationNo: 'A-01-03',
          barcodeBatchNo: 'BC20260608001',
          productionDate: '2026-06-01',
          expiryDate: '2028-06-01',
        }),
      ],
    }),
    createInboundOrder({
      id: 'ib-002',
      docNo: '1-20260609-00002',
      inboundType: '成品入库',
      status: '待审批',
      warehouse: '成品主仓',
      warehouseKeeper: 'admin1',
      inboundDate: baseDate,
      itemType: '产品',
      sourceOrderNo: 'WO20260608001',
      sourceType: '生产工单',
      sourceWorkshop: '总装车间',
      handler: '张三',
      creator: '张三',
      createdAt: '2026-06-09 08:30:00',
      miniProgramTaskId: 'mp-task-001',
      lineItems: [
        createInboundLine({
          itemCode: 'CP2610001',
          itemName: '清水离心泵 ISG50-160',
          specAttr: '标准',
          specModel: 'ISG50-160',
          qty: 10,
          weight: 85,
          unit: '台',
          unitPrice: 3200,
        }),
      ],
    }),
    createInboundOrder({
      id: 'ib-003',
      docNo: '1-20260609-00003',
      inboundType: '半成品入库',
      status: '已完成',
      warehouse: '库线边仓',
      warehouseKeeper: 'admin1',
      inboundDate: '2026-06-07',
      itemType: '产品',
      sourceOrderNo: 'WO20260607002',
      sourceType: '生产工单',
      sourceWorkshop: '机加车间',
      handler: '李四',
      creator: '李四',
      createdAt: '2026-06-07 14:00:00',
      confirmer: 'admin1',
      confirmedAt: '2026-06-07 16:00:00',
      lineItems: [
        createInboundLine({
          itemCode: 'CP2610008',
          itemName: '立式多级离心泵 CDL4-40',
          specModel: 'CDL4-40',
          qty: 5,
          unit: '台',
        }),
      ],
    }),
    createInboundOrder({
      id: 'ib-004',
      docNo: '1-20260609-00004',
      inboundType: '报废入库',
      status: '待处理',
      warehouse: '报废仓',
      warehouseKeeper: 'admin1',
      inboundDate: baseDate,
      itemType: '物料',
      sourceOrderNo: 'BF20260528001',
      sourceType: '报废单',
      handler: 'admin1',
      creator: '管理员',
      createdAt: '2026-06-09 09:00:00',
      lineItems: [
        createInboundLine({
          itemCode: 'WL100015',
          itemName: '轴承 6205',
          specModel: '6205',
          qty: 2,
          unit: '件',
        }),
      ],
    }),
  ]
}

export function filterInboundOrders(list, filters = {}) {
  return list.filter((o) => {
    if (filters.status && o.status !== filters.status) return false
    if (filters.docNo && !o.docNo?.includes(filters.docNo)) return false
    if (filters.warehouse && o.warehouse !== filters.warehouse) return false
    if (filters.inboundType && o.inboundType !== filters.inboundType) return false
    if (filters.invoiceNo && !o.invoiceNo?.includes(filters.invoiceNo)) return false
    if (filters.inboundDateRange?.length === 2) {
      const [start, end] = filters.inboundDateRange
      const d = o.inboundDate || ''
      if (d < start || d > end) return false
    }
    return true
  })
}
