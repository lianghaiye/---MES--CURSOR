import dayjs from 'dayjs'
import { OUTBOUND_SOURCE } from '@/mock/outboundOptions'

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
    status: '待出库',
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
    sourceChannel: 'manual',
    refuseReason: '',
    refusedBy: '',
    refusedAt: '',
    operationLogs: [],
    /** 领料/发料：领入仓库（线边仓）；确认出库后 A→B 调入 */
    receiveWarehouse: '',
    stockTransferredToReceive: false,
    /** 领料出库关联工单清单（来自领料申请） */
    workOrders: [],
    materialReqId: '',
    materialReqNo: '',
    /** 发料出库关联外协订单 */
    outsourcingOrders: [],
    outsourcingOrderId: '',
    outsourcingOrderNo: '',
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
        needsBlankingSettle: true,
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
        needsBlankingSettle: true,
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
        needsBlankingSettle: true,
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
        needsBlankingSettle: true,
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
    sourceOrderNo: 'WX-260807001',
    outsourcingOrderId: 'wx-2',
    outsourcingOrderNo: 'WX-260807001',
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
    factoryQcId: 'fqc-delivery-seed-1',
    remark: '关联发货单 SH20260513001（待出库）',
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
    linkedDeliveryId: 'do-seed-2',
    linkedDeliveryCode: 'SH20260529111',
    customerName: '测试人员',
    status: '待出库',
    createdAt: '2026-06-02',
    totalWeight: 1.6,
    remark: '关联发货单 SH20260529111 自提（待出库）',
    lineItems: [
      createOutboundLine({
        itemName: '测试产品00002',
        itemCode: 'SPARE-50*30-001',
        itemType: '产品',
        specModel: '50*30',
        shipQty: 2,
        shipWarehouse: '库库仓',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-so-shipped-1',
    docNo: 'OUT202608010088',
    outboundType: '销售出库',
    warehouse: '成品仓',
    sourceOrderNo: 'SH20260801001',
    salesOrderNo: '1-20260810-001',
    linkedDeliveryId: 'do-seed-shipped-1',
    linkedDeliveryCode: 'SH20260801001',
    customerName: '华东流体设备',
    status: '已出库',
    createdAt: '2026-08-01',
    completedAt: '2026-08-02',
    outboundTime: '2026-08-02 10:30:00',
    remark: '关联发货单 SH20260801001（已出库 → 发货单已发货）',
    lineItems: [
      createOutboundLine({
        itemName: '闸阀 DN50',
        itemCode: 'VLV-GATE-50',
        itemType: '产品',
        specModel: 'DN50 PN16',
        shipQty: 5,
        shipWarehouse: '成品仓',
        packagingForm: '木箱',
        lineStatus: '已出库',
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
  /** 业务来源：领料出库（待出库）— 用于验证类型/领入仓/申请部门锁定、明细不可删 */
  createOutboundOrder({
    id: 'ob-biz-ll-pending-1',
    docNo: 'OUT202609160101',
    outboundType: '领料出库',
    warehouse: '原料仓',
    receiveWarehouse: '库线边仓',
    requisitionDept: '机加车间',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'LL20260916001',
    materialReqId: 'mr-biz-seed-1',
    materialReqNo: 'LL20260916001',
    status: '待出库',
    createdAt: '2026-09-16',
    outboundTime: '2026-09-16 09:30:00',
    totalWeight: 86.5,
    remark: '业务来源演示：领料申请驱动，头字段锁定、明细不可删',
    workOrders: [
      {
        workOrderId: 'wo-biz-1',
        workOrderNo: 'GD20260916001',
        productName: '泵体焊接件',
      },
    ],
    lineItems: [
      createOutboundLine({
        id: 'ob-biz-ll-pending-1-l1',
        itemName: '无缝钢管 Q235 φ50×3',
        itemCode: 'WL-PIPE-Q235-50',
        shipQty: 8,
        weight: 48.2,
        unit: '米',
        shipWarehouse: '原料仓',
        locationNo: 'YL-A-01',
        blankSizeText: '长 4000 mm',
        blankSizeMode: 'length',
        lineStatus: '待出库',
      }),
      createOutboundLine({
        id: 'ob-biz-ll-pending-1-l2',
        itemName: '钢板 Q235 10mm',
        itemCode: 'WL-PLATE-Q235-10',
        shipQty: 2,
        weight: 38.3,
        unit: '㎡',
        shipWarehouse: '原料仓',
        locationNo: 'YL-A-02',
        blankSizeText: '长 1200 mm × 宽 1000 mm',
        blankSizeMode: 'plate',
        lineStatus: '待出库',
      }),
    ],
  }),
  /** 业务来源：发料出库（待出库，含已拒绝行）— 验证整单确认跳过已拒绝 */
  createOutboundOrder({
    id: 'ob-biz-wx-pending-1',
    docNo: 'OUT202609160102',
    outboundType: '发料出库',
    warehouse: '半成品仓',
    receiveWarehouse: '外协线边仓',
    requisitionDept: '外协组',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'WX-260916001',
    outsourcingOrderId: 'wx-biz-1',
    outsourcingOrderNo: 'WX-260916001',
    status: '待出库',
    createdAt: '2026-09-16',
    outboundTime: '2026-09-16 11:00:00',
    totalWeight: 12.0,
    remark: '业务来源演示：外协发料，一行已拒绝、一行待出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-biz-wx-pending-1-l1',
        itemName: '轴承座',
        itemCode: 'MAT-001',
        shipQty: 10,
        weight: 8.5,
        shipWarehouse: '半成品仓',
        locationNo: 'BCP-01',
        lineStatus: '待出库',
      }),
      createOutboundLine({
        id: 'ob-biz-wx-pending-1-l2',
        itemName: '密封垫片',
        itemCode: 'MAT-SEAL-01',
        shipQty: 20,
        weight: 3.5,
        shipWarehouse: '半成品仓',
        locationNo: 'BCP-02',
        lineStatus: '已拒绝',
      }),
    ],
  }),
  /** 业务来源：领料出库（部分出库） */
  createOutboundOrder({
    id: 'ob-biz-ll-partial-1',
    docNo: 'OUT202609150088',
    outboundType: '领料出库',
    warehouse: '原料仓',
    receiveWarehouse: '库线边仓',
    stockTransferredToReceive: true,
    requisitionDept: '装配车间',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'LL20260915008',
    materialReqId: 'mr-biz-seed-2',
    materialReqNo: 'LL20260915008',
    status: '部分出库',
    createdAt: '2026-09-15',
    outboundTime: '2026-09-15 14:20:00',
    totalWeight: 25.6,
    remark: '业务来源演示：部分明细已出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-biz-ll-partial-1-l1',
        itemName: '圆钢 45# φ20',
        itemCode: 'WL-BAR-45-20',
        shipQty: 4,
        weight: 18.0,
        unit: '米',
        shipWarehouse: '原料仓',
        lineStatus: '已出库',
      }),
      createOutboundLine({
        id: 'ob-biz-ll-partial-1-l2',
        itemName: '槽钢 10#',
        itemCode: 'WL-CHANNEL-10',
        shipQty: 3,
        weight: 7.6,
        unit: '米',
        shipWarehouse: '原料仓',
        lineStatus: '待出库',
      }),
    ],
  }),
  /** 业务来源：销售出库（待出库，关联发货） */
  createOutboundOrder({
    id: 'ob-biz-so-pending-1',
    docNo: 'OUT202609160201',
    outboundType: '销售出库',
    warehouse: '成品仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'SH20260916001',
    salesOrderNo: '1-20260916-001',
    salesOrderId: 'so-biz-seed-1',
    linkedDeliveryId: 'do-biz-seed-1',
    linkedDeliveryCode: 'SH20260916001',
    customerName: '江南泵业',
    contractNo: 'HT-20260916-01',
    status: '待出库',
    createdAt: '2026-09-16',
    outboundTime: '2026-09-16 16:00:00',
    totalWeight: 120,
    remark: '业务来源演示：发货单驱动销售出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-biz-so-pending-1-l1',
        itemName: '清水离心泵',
        itemCode: 'CP2610001',
        itemType: '产品',
        shipQty: 2,
        weight: 96,
        shipWarehouse: '成品仓',
        packagingForm: '木箱',
        deliveryRemark: '含底座附件',
        lineStatus: '待出库',
      }),
      createOutboundLine({
        id: 'ob-biz-so-pending-1-l2',
        itemName: '联轴器',
        itemCode: 'PRD-COUPLING-01',
        itemType: '产品',
        shipQty: 2,
        weight: 24,
        shipWarehouse: '成品仓',
        packagingForm: '纸箱',
        lineStatus: '待出库',
      }),
    ],
  }),
  /** 采购退货出库（关联采购退货单 CGTH-260807001） */
  createOutboundOrder({
    id: 'ob-prtn-1',
    docNo: 'CKTH-260807001',
    outboundType: '采购退货',
    warehouse: '原材料仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'CGTH-260807001',
    purchaseReturnId: 'prtn-1',
    requisitionDept: '采购部',
    status: '待出库',
    createdAt: '2026-08-07',
    outboundTime: '2026-08-07 11:30:00',
    remark: '由采购退货单 CGTH-260807001 生成',
    lineItems: [
      createOutboundLine({
        id: 'ob-prtn-1-l1',
        itemName: '钢板',
        itemCode: 'MAT-PLATE-10',
        specModel: '10mm',
        material: 'Q235B',
        shipQty: 5,
        unit: '张',
        shipWarehouse: '原材料仓',
        lineStatus: '待出库',
      }),
      createOutboundLine({
        id: 'ob-prtn-1-l2',
        itemName: '钢板',
        itemCode: 'MAT-PLATE-16',
        specModel: '16mm',
        material: 'Q235B',
        shipQty: 2,
        unit: '张',
        shipWarehouse: '原材料仓',
        lineStatus: '待出库',
      }),
    ],
  }),

  // ——— 类型覆盖：补齐选项中尚缺演示单的出库类型 ———
  createOutboundOrder({
    id: 'ob-type-stocktake-1',
    docNo: 'PDCK-20260920001',
    outboundType: '盘点出库',
    warehouse: '原料仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'PD20260920001',
    sourceType: '库存盘点',
    status: '已出库',
    createdAt: '2026-09-20',
    completedAt: '2026-09-20',
    outboundTime: '2026-09-20 09:20:00',
    remark: '类型覆盖：盘点盘亏出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-stocktake-1-l1',
        itemName: '六角螺栓 M12',
        itemCode: 'MAT-BOLT-M12',
        shipQty: 3,
        unit: '件',
        shipWarehouse: '原料仓',
        lineStatus: '已出库',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-type-semi-1',
    docNo: 'OUT202609200301',
    outboundType: '半成品出库',
    warehouse: '半成品仓',
    sourceChannel: OUTBOUND_SOURCE.MANUAL,
    requisitionDept: '总装车间',
    status: '待出库',
    createdAt: '2026-09-20',
    outboundTime: '2026-09-20 10:00:00',
    remark: '类型覆盖：半成品出库待出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-semi-1-l1',
        itemName: '泵体半成品',
        itemCode: 'SF-PUMP-BODY-01',
        itemType: '产品',
        shipQty: 6,
        unit: '件',
        shipWarehouse: '半成品仓',
        lineStatus: '待出库',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-type-asm-ll-1',
    docNo: 'OUT202609200302',
    outboundType: '总装领料出库',
    warehouse: '原料仓',
    receiveWarehouse: '总装线边仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'LL-ASM-2026092001',
    requisitionDept: '总装车间',
    status: '已出库',
    createdAt: '2026-09-20',
    completedAt: '2026-09-20',
    outboundTime: '2026-09-20 11:15:00',
    remark: '类型覆盖：总装领料出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-asm-ll-1-l1',
        itemName: '联轴器',
        itemCode: 'PRD-COUPLING-01',
        itemType: '产品',
        shipQty: 4,
        unit: '套',
        shipWarehouse: '原料仓',
        lineStatus: '已出库',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-type-sub-ll-1',
    docNo: 'OUT202609200303',
    outboundType: '部装领料出库',
    warehouse: '原料仓',
    receiveWarehouse: '部装线边仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'LL-SUB-2026092001',
    requisitionDept: '部装车间',
    status: '待出库',
    createdAt: '2026-09-20',
    outboundTime: '2026-09-20 11:40:00',
    remark: '类型覆盖：部装领料出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-sub-ll-1-l1',
        itemName: '密封垫片',
        itemCode: 'MAT-GASKET-50',
        shipQty: 20,
        unit: '片',
        shipWarehouse: '原料仓',
        lineStatus: '待出库',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-type-transfer-1',
    docNo: 'DBCK-20260920001',
    outboundType: '调拨出库',
    warehouse: '原料仓',
    receiveWarehouse: '半成品仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'DB20260920001',
    sourceType: '库存调拨',
    transferOrderId: 'tf-type-seed-1',
    transferDocNo: 'DB20260920001',
    status: '已出库',
    createdAt: '2026-09-20',
    completedAt: '2026-09-20',
    outboundTime: '2026-09-20 13:00:00',
    remark: '类型覆盖：调拨出库（关联调拨入库）',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-transfer-1-l1',
        itemName: '轴承 6205',
        itemCode: 'MAT-BEARING-6205',
        shipQty: 10,
        unit: '套',
        shipWarehouse: '原料仓',
        lineStatus: '已出库',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-type-pack-1',
    docNo: 'OUT202609200304',
    outboundType: '装箱出库',
    warehouse: '成品仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'ZX20260920001',
    salesOrderNo: '1-20260920-088',
    customerName: '华东泵业',
    status: '待出库',
    createdAt: '2026-09-20',
    outboundTime: '2026-09-20 14:10:00',
    remark: '类型覆盖：装箱出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-pack-1-l1',
        itemName: '清水离心泵',
        itemCode: 'CP2610001',
        itemType: '产品',
        shipQty: 1,
        unit: '台',
        shipWarehouse: '成品仓',
        packagingForm: '木箱',
        lineStatus: '待出库',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-type-scrap-1',
    docNo: 'BFCK-20260920001',
    outboundType: '报废出库',
    warehouse: '报废仓',
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: 'BF20260920001',
    sourceType: '报废单',
    status: '已出库',
    createdAt: '2026-09-20',
    completedAt: '2026-09-20',
    outboundTime: '2026-09-20 15:00:00',
    remark: '类型覆盖：报废出库',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-scrap-1-l1',
        itemName: '不合格叶轮',
        itemCode: 'SF-IMPELLER-NG',
        itemType: '产品',
        shipQty: 2,
        unit: '件',
        shipWarehouse: '报废仓',
        lineStatus: '已出库',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-type-other-1',
    docNo: 'OUT202609200306',
    outboundType: '其他出库',
    warehouse: '原料仓',
    sourceChannel: OUTBOUND_SOURCE.MANUAL,
    requisitionDept: '行政部',
    status: '已出库',
    createdAt: '2026-09-20',
    completedAt: '2026-09-20',
    outboundTime: '2026-09-20 16:00:00',
    remark: '类型覆盖：其他出库（样品领用）',
    lineItems: [
      createOutboundLine({
        id: 'ob-type-other-1-l1',
        itemName: '样品铭牌',
        itemCode: 'MAT-NAMEPLATE-S',
        shipQty: 5,
        unit: '张',
        shipWarehouse: '原料仓',
        lineStatus: '已出库',
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

/** 出库单数量（单据计划量） */
export function calcOutboundOrderQty(order) {
  return calcOutboundShipQty(order)
}

/** 已出库数量（明细已确认出库部分；整单已出库/待确认视为全部已出） */
export function calcOutboundShippedQty(order) {
  const status = order?.status
  if (status === '已出库' || status === '待申领人确认') {
    return calcOutboundOrderQty(order)
  }
  return (order?.lineItems || []).reduce((sum, line) => {
    if ((line.lineStatus || '待出库') === '已出库') {
      return sum + (Number(line.shipQty) || 0)
    }
    return sum
  }, 0)
}

/** 列表/导出展示：已出库数量/出库单数量 */
export function formatOutboundQtyRatio(order, formatFn) {
  const fmt = typeof formatFn === 'function' ? formatFn : (v) => String(v ?? 0)
  return `${fmt(calcOutboundShippedQty(order))}/${fmt(calcOutboundOrderQty(order))}`
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
    if (filters.salesOrderNo && !item.salesOrderNo?.includes(filters.salesOrderNo)) return false
    if (filters.status && item.status !== filters.status) return false
    if (!matchOutboundTimeRange(item, filters)) return false
    return true
  })
}
