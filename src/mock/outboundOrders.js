import dayjs from 'dayjs'

export function createOutboundLine(partial = {}) {
  return {
    id: `ob-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemName: '',
    itemCode: '',
    itemType: '物料',
    specModel: '',
    shipQty: 0,
    shipWarehouse: '成品仓',
    unit: '件',
    ...partial,
  }
}

function createOutboundOrder(partial) {
  return {
    projectNo: '',
    outboundType: '销售出库',
    docNo: '',
    warehouse: '成品仓',
    handler: 'admin1',
    requisitionDept: '',
    sourceOrderNo: '',
    salesOrderNo: '',
    customerName: '',
    itemType: '',
    totalWeight: null,
    status: '待处理',
    createdAt: dayjs().format('YYYY-MM-DD'),
    completedAt: '',
    auditDate: '',
    warehouseKeeper: 'admin1',
    workshop: '默认工厂',
    remark: '',
    creator: 'admin1',
    lineItems: [],
    factoryQcId: '',
    ...partial,
  }
}

export const mockOutboundOrders = [
  createOutboundOrder({
    id: 'ob-1',
    docNo: 'OUT202606020001',
    outboundType: '发料出库',
    warehouse: '库A仓',
    requisitionDept: '机加车间',
    sourceOrderNo: 'VX-20260519-001',
    status: '待处理',
    createdAt: '2026-06-02',
    lineItems: [
      createOutboundLine({
        itemName: '轴承座',
        itemCode: 'MAT-001',
        shipQty: 20,
        shipWarehouse: '库A仓',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-so-seed-1',
    docNo: 'OUT202605130001',
    outboundType: '销售出库',
    warehouse: '成品仓',
    sourceOrderNo: 'SH20260513001',
    salesOrderNo: '1-20260512-005',
    linkedDeliveryId: 'do-seed-1',
    linkedDeliveryCode: 'SH20260513001',
    customerName: '测试人员',
    status: '待出库',
    createdAt: '2026-05-13',
    lineItems: [
      createOutboundLine({
        itemName: '清水离心泵',
        itemCode: 'CP2610001',
        itemType: '产品',
        shipQty: 3,
        shipWarehouse: '成品仓',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-2',
    docNo: 'OUT202606020002',
    outboundType: '销售出库',
    warehouse: '库库仓',
    sourceOrderNo: 'SH20260529111',
    salesOrderNo: '1-20260529-002',
    customerName: '测试人员',
    status: '待出库',
    createdAt: '2026-06-02',
    totalWeight: 125.5,
    lineItems: [
      createOutboundLine({
        itemName: '测试产品00002',
        itemCode: 'SPARE-50*30-001',
        itemType: '产品',
        specModel: '50*30',
        shipQty: 10,
        shipWarehouse: '库库仓',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-3',
    docNo: 'OUT202606010003',
    outboundType: '领料出库',
    warehouse: '半成品仓',
    requisitionDept: '装配车间',
    sourceOrderNo: 'LL20260530001',
    status: '待出库',
    createdAt: '2026-06-01',
    lineItems: [
      createOutboundLine({
        itemName: '螺栓组',
        itemCode: 'MAT-STD-100',
        shipQty: 100,
        shipWarehouse: '半成品仓',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-4',
    docNo: 'OUT202605280004',
    outboundType: '投料出库',
    warehouse: '原材料仓',
    requisitionDept: '默认工厂',
    sourceOrderNo: 'TL20260528001',
    status: '已出库',
    createdAt: '2026-05-28',
    completedAt: '2026-05-28',
    auditDate: '2026-05-28',
    lineItems: [
      createOutboundLine({
        itemName: '钢锭',
        itemCode: 'RAW-STEEL-01',
        shipQty: 500,
        shipWarehouse: '原材料仓',
        unit: 'kg',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-5',
    docNo: 'OUT202605280005',
    outboundType: '销售出库',
    warehouse: '成品仓',
    sourceOrderNo: 'SH20260528002',
    salesOrderNo: '1-20260528-001',
    customerName: '人纷纷',
    status: '待出库',
    createdAt: '2026-05-28',
    factoryQcId: 'fqc-2',
    lineItems: [
      createOutboundLine({
        itemName: '潜水电机',
        itemCode: 'PRD-YQST250',
        itemType: '产品',
        shipQty: 2,
        shipWarehouse: '成品仓',
        unit: '台',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-6',
    docNo: 'OUT202606030006',
    outboundType: '销售出库',
    warehouse: '成品仓',
    sourceOrderNo: 'SH20260603001',
    salesOrderNo: '1-20260603-001',
    customerName: '复检客户',
    status: '待出库',
    createdAt: '2026-06-03',
    factoryQcId: 'fqc-3',
    lineItems: [
      createOutboundLine({
        id: 'ob-6-line-a',
        itemName: '法兰盘',
        itemCode: 'PRD-FLANGE-01',
        itemType: '产品',
        shipQty: 8,
        shipWarehouse: '成品仓',
      }),
      createOutboundLine({
        id: 'ob-6-line-b',
        itemName: '密封圈',
        itemCode: 'PRD-SEAL-02',
        itemType: '产品',
        shipQty: 20,
        shipWarehouse: '成品仓',
      }),
    ],
  }),
]

export function cloneOutboundOrders() {
  return JSON.parse(JSON.stringify(mockOutboundOrders))
}

export function filterOutboundOrders(list, filters) {
  return list.filter((item) => {
    if (filters.docNo && !item.docNo.includes(filters.docNo)) return false
    if (filters.outboundType && item.outboundType !== filters.outboundType) return false
    if (filters.itemType) {
      const matchHeader = item.itemType === filters.itemType
      const matchLine = item.lineItems?.some((l) => l.itemType === filters.itemType)
      if (!matchHeader && !matchLine) return false
    }
    if (filters.warehouse && item.warehouse !== filters.warehouse) return false
    if (filters.handler && item.handler !== filters.handler) return false
    if (filters.requisitionDept && item.requisitionDept !== filters.requisitionDept) return false
    if (filters.sourceOrderNo && !item.sourceOrderNo?.includes(filters.sourceOrderNo)) return false
    if (filters.status && item.status !== filters.status) return false
    return true
  })
}
