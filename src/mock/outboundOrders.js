import dayjs from 'dayjs'

export function createOutboundLine(partial = {}) {
  return {
    id: `ob-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemName: '',
    itemCode: '',
    itemType: '物料',
    specAttr: '',
    specModel: '',
    material: '',
    drawingNo: '',
    barcodeBatchNo: '',
    shipQty: 1,
    weight: null,
    shipWarehouse: '',
    locationNo: '',
    unit: '件',
    packagingForm: '',
    unitPrice: null,
    totalPrice: null,
    lineSource: '',
    costAmount: null,
    costUnitPrice: null,
    purpose: '',
    sourceDocNo: '',
    itemId: '',
    stockQty: null,
    warehouseStockQty: null,
    /** 来自销售发货明细备注，只读 */
    deliveryRemark: '',
    /** 下料尺寸（领料/工单带出，说明核对用；扣账看 shipQty） */
    blankSize: null,
    blankSizeText: '',
    blankSizeMode: '',
    blankLength: null,
    blankArea: null,
    /** 明细出库状态 */
    lineStatus: '待出库',
    ...partial,
  }
}

export function createOutboundOrder(partial) {
  return {
    projectNo: '',
    outboundType: '销售出库',
    docNo: '',
    warehouse: '成品仓',
    handler: 'admin1',
    requisitionDept: '',
    sourceOrderNo: '',
    salesOrderNo: '',
    salesOrderId: '',
    contractNo: '',
    customerName: '',
    itemType: '',
    totalWeight: null,
    status: '待处理',
    createdAt: dayjs().format('YYYY-MM-DD'),
    completedAt: '',
    auditDate: '',
    auditor: '',
    warehouseKeeper: 'admin1',
    workshop: '默认工厂',
    remark: '',
    outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    creator: 'admin1',
    lineItems: [],
    factoryQcId: '',
    sourceChannel: '',
    /** 领料/发料：领入仓库（线边仓）；确认出库后 A→B 调入 */
    receiveWarehouse: '',
    stockTransferredToReceive: false,
    /** 领料出库关联工单清单（来自领料申请） */
    workOrders: [],
    materialReqId: '',
    materialReqNo: '',
    ...partial,
  }
}

export const mockOutboundOrders = [
  createOutboundOrder({
    id: 'ob-cut-seed-1',
    docNo: 'OUT202607280101',
    outboundType: '领料出库',
    warehouse: '原料仓',
    receiveWarehouse: '库线边仓',
    stockTransferredToReceive: true,
    requisitionDept: '机加车间',
    sourceOrderNo: 'LL20260728001',
    status: '已出库',
    createdAt: '2026-07-28',
    completedAt: '2026-07-28',
    auditDate: '2026-07-28',
    outboundTime: '2026-07-28 10:05:00',
    remark: '整出演示：钢管领入线边仓，供下料结算',
    lineItems: [
      createOutboundLine({
        id: 'ob-cut-seed-1-l1',
        itemName: '无缝钢管 Q235 φ50×3',
        itemCode: 'WL-PIPE-Q235-50',
        shipQty: 12,
        unit: '米',
        shipWarehouse: '原料仓',
        receiveWarehouse: '库线边仓',
        isVariableLength: true,
        demandMeters: 5,
        blankSizeText: '长 5000 mm',
        blankSizeMode: 'length',
        dualUnitIssueStrategy: 'whole_with_remnant',
        pickedBatchId: 'bat-seed-pipe-12',
        pickedBatchNo: 'B-260701-001',
        pickedLength: 12,
        issuedBatchNo: 'B-260701-001',
        receiveBatchIds: ['bat-seed-line-pipe-12'],
        batchAllocations: [
          { batchId: 'bat-seed-pipe-12', batchNo: 'B-260701-001', qty: 12, unit: '米' },
        ],
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-cut-seed-2',
    docNo: 'OUT202607270088',
    outboundType: '领料出库',
    warehouse: '原料仓',
    receiveWarehouse: '库线边仓',
    stockTransferredToReceive: true,
    requisitionDept: '下料班',
    sourceOrderNo: 'LL20260727008',
    status: '已出库',
    createdAt: '2026-07-27',
    completedAt: '2026-07-27',
    auditDate: '2026-07-27',
    outboundTime: '2026-07-27 15:20:00',
    lineItems: [
      createOutboundLine({
        id: 'ob-cut-seed-2-l1',
        itemName: '钢板 Q235 10mm',
        itemCode: 'WL-PLATE-Q235-10',
        shipQty: 3,
        unit: '㎡',
        shipWarehouse: '原料仓',
        receiveWarehouse: '库线边仓',
        isVariableLength: true,
        demandMeters: 1.2,
        blankSizeText: '长 1200 mm × 宽 1000 mm',
        blankSizeMode: 'plate',
        dualUnitIssueStrategy: 'whole_with_remnant',
        pickedBatchId: 'bat-seed-line-plate-3',
        pickedBatchNo: 'B-260727-088',
        pickedLength: 3,
        receiveBatchIds: ['bat-seed-line-plate-3'],
        batchAllocations: [
          { batchId: 'bat-seed-line-plate-3', batchNo: 'B-260727-088', qty: 3, unit: '㎡' },
        ],
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-cut-seed-3',
    docNo: 'OUT202607260055',
    outboundType: '领料出库',
    warehouse: '原料仓',
    receiveWarehouse: '库线边仓',
    stockTransferredToReceive: true,
    requisitionDept: '机加车间',
    sourceOrderNo: 'LL20260726005',
    status: '已出库',
    createdAt: '2026-07-26',
    completedAt: '2026-07-26',
    auditDate: '2026-07-26',
    outboundTime: '2026-07-26 08:50:00',
    lineItems: [
      createOutboundLine({
        id: 'ob-cut-seed-3-l1',
        itemName: '圆钢 45# φ20',
        itemCode: 'WL-BAR-45-20',
        shipQty: 6,
        unit: '米',
        shipWarehouse: '原料仓',
        receiveWarehouse: '库线边仓',
        isVariableLength: true,
        demandMeters: 4,
        blankSizeText: '长 4000 mm',
        pickedBatchId: 'bat-seed-line-bar-6',
        pickedBatchNo: 'B-260726-055',
        pickedLength: 6,
        receiveBatchIds: ['bat-seed-line-bar-6'],
        batchAllocations: [
          { batchId: 'bat-seed-line-bar-6', batchNo: 'B-260726-055', qty: 6, unit: '米' },
        ],
      }),
      createOutboundLine({
        id: 'ob-cut-seed-3-l2',
        itemName: '槽钢 10#',
        itemCode: 'WL-CHANNEL-10',
        shipQty: 5,
        unit: '米',
        shipWarehouse: '半成品仓',
        receiveWarehouse: '库线边仓',
        isVariableLength: true,
        demandMeters: 5,
        blankSizeText: '长 5000 mm',
        pickedBatchId: 'bat-seed-line-channel-5',
        pickedBatchNo: 'B-260726-056',
        pickedLength: 5,
        receiveBatchIds: ['bat-seed-line-channel-5'],
        batchAllocations: [
          { batchId: 'bat-seed-line-channel-5', batchNo: 'B-260726-056', qty: 5, unit: '米' },
        ],
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-1',
    docNo: 'OUT202606020001',
    outboundType: '发料出库',
    warehouse: '库A仓',
    requisitionDept: '机加车间',
    sourceOrderNo: 'VX-20260519-001',
    status: '待出库',
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
        packagingForm: '纸箱',
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

export function calcOutboundShipQty(order) {
  return (order?.lineItems || []).reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0)
}

function matchOutboundTimeRange(item, filters) {
  const range = filters.outboundTimeRange
  if (!range?.length || !range[0] || !range[1]) return true
  const raw = item.outboundTime || item.createdAt
  if (!raw) return false
  const d = dayjs(raw)
  if (!d.isValid()) return false
  const unit = filters.outboundTimeUnit || 'day'
  const start =
    unit === 'month'
      ? dayjs(range[0]).startOf('month')
      : unit === 'year'
        ? dayjs(range[0]).startOf('year')
        : dayjs(range[0]).startOf('day')
  const end =
    unit === 'month'
      ? dayjs(range[1]).endOf('month')
      : unit === 'year'
        ? dayjs(range[1]).endOf('year')
        : dayjs(range[1]).endOf('day')
  return !d.isBefore(start) && !d.isAfter(end)
}

export function filterOutboundOrders(list, filters) {
  return list.filter((item) => {
    if (filters.docNo && !item.docNo.includes(filters.docNo)) return false
    if (filters.outboundType && item.outboundType !== filters.outboundType) return false
    if (filters.warehouse && item.warehouse !== filters.warehouse) return false
    if (filters.handler && item.handler !== filters.handler) return false
    if (filters.requisitionDept && item.requisitionDept !== filters.requisitionDept) return false
    if (filters.sourceOrderNo && !item.sourceOrderNo?.includes(filters.sourceOrderNo)) return false
    if (filters.status && item.status !== filters.status) return false
    if (!matchOutboundTimeRange(item, filters)) return false
    return true
  })
}
