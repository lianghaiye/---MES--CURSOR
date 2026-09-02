/**
 * 跨模块演示数据（2026-08 场景）
 * 覆盖：生产计划物料库存 / 采购申请(未转单) / 采购订单(在途) /
 *       采购入库 / 领料出库 / 库存扣减 / 工单占用 / 库存台账
 *
 * 锚点销售/计划号沿用树演示：1-20260512-005
 */

import dayjs from 'dayjs'
import { createLineItem } from '@/mock/purchaseRequisitions'
import { createPoLineItem } from '@/mock/purchaseOrders'
import { createOutboundOrder, createOutboundLine } from '@/mock/outboundOrders'
import { createInboundOrder, createInboundLine } from '@/mock/inboundOrders'
import { MATERIAL_DEDUCT_STATUS, MATERIAL_DEDUCT_SOURCES } from '@/mock/materialRequisitionRecords'
import { buildProcessesFromRoute } from '@/mock/processRoutes'

export const CROSS_DEMO = {
  salesOrderNo: '1-20260512-005',
  planRemark: '跨模块演示：螺栓/垫圈包装采购 + 工单占用',
  warehouse: '原料仓',
  lineWarehouse: '库线边仓',
  supplier: '标准件供应商',
  /** 开立工单（计占用） */
  woId: 'wo-cross-demo-001',
  woCode: 'SCGD20260802001',
  /** 采购申请：未转单 → 在途申请侧 */
  prOpenId: 'pr-cross-demo-open',
  prOpenNo: 'CGSQ20260802001',
  /** 采购申请：已转单 */
  prDoneId: 'pr-cross-demo-done',
  prDoneNo: 'CGSQ20260802002',
  /** 采购订单：进行中待入库 → 在途订单侧 */
  poId: 'po-cross-demo-001',
  poNo: 'CG20260802001',
  /** 采购订单：部分已入库 */
  poInboundId: 'po-cross-demo-002',
  poPartialNo: 'CG20260802002',
  inboundId: 'ib-cross-demo-001',
  inboundNo: 'RK20260802001',
  outboundId: 'ob-cross-demo-001',
  outboundNo: 'OUT20260802001',
  deductId: 'dr-cross-demo-001',
  deductNo: 'DR-20260802-001',
}

const DEMO_IDS = new Set([
  CROSS_DEMO.woId,
  CROSS_DEMO.prOpenId,
  CROSS_DEMO.prDoneId,
  CROSS_DEMO.poId,
  CROSS_DEMO.poPartialId,
  CROSS_DEMO.inboundId,
  CROSS_DEMO.outboundId,
  'ob-inv-detail-washer-1',
  'ob-inv-detail-bearing-1',
  'ob-inv-detail-casting-1',
  CROSS_DEMO.deductId,
])

export const CROSS_DEMO_STOCK = [
  {
    warehouse: CROSS_DEMO.warehouse,
    itemCode: 'MAT-STD-100',
    itemName: '标准螺栓组',
    itemType: '物料',
    unit: '个',
    qty: 200,
  },
  {
    warehouse: CROSS_DEMO.warehouse,
    itemCode: 'MAT-STD-WASHER',
    itemName: '平垫圈 M12',
    itemType: '物料',
    unit: '个',
    qty: 400,
  },
  {
    warehouse: CROSS_DEMO.warehouse,
    itemCode: 'MAT-EXT-001',
    itemName: '进口轴承',
    itemType: '物料',
    unit: '套',
    qty: 36,
  },
  {
    warehouse: '半成品仓',
    itemCode: 'M-001',
    itemName: '泵体铸件',
    itemType: '物料',
    unit: '件',
    qty: 48,
  },
]

/** 计划物料树写回演示现存量 */
export const CROSS_DEMO_MATERIAL_STOCK = {
  'MAT-STD-100': 200,
  'MAT-STD-WASHER': 400,
  'MAT-EXT-001': 36,
}

function stripByIds(list, idKey = 'id') {
  return (list || []).filter((row) => !DEMO_IDS.has(row[idKey]))
}

export function createCrossDemoWorkOrders() {
  const routeName = '机加标准路线'
  return [
    {
      id: CROSS_DEMO.woId,
      code: CROSS_DEMO.woCode,
      name: '离心泵部件加工（跨模块演示）',
      productName: '离心泵部件',
      materialCode: 'PRD-CROSS-DEMO',
      orderCategory: '生产工单',
      status: '执行中',
      scheduleQty: 10,
      planQty: 10,
      workCenter: '机加车间',
      bom: '离心泵部件',
      warehouse: CROSS_DEMO.warehouse,
      urgency: '加急',
      planDateRange: [dayjs().format('YYYY-MM-DD'), dayjs().add(10, 'day').format('YYYY-MM-DD')],
      remark: '演示工单占用：未领完的标准件仍占可用库存',
      processRouteName: routeName,
      source: 'production-plan',
      sourceOrderNo: CROSS_DEMO.salesOrderNo,
      salesLineId: 'line-seed-1a',
      productId: '',
      skipEbom: false,
      componentLines: [
        {
          id: `${CROSS_DEMO.woId}-c1`,
          itemCode: 'MAT-STD-100',
          materialCode: 'MAT-STD-100',
          itemName: '标准螺栓组',
          unit: '个',
          unitQty: 20,
          requiredQty: 200,
          stockQty: 200,
        },
        {
          id: `${CROSS_DEMO.woId}-c2`,
          itemCode: 'MAT-STD-WASHER',
          materialCode: 'MAT-STD-WASHER',
          itemName: '平垫圈 M12',
          unit: '个',
          unitQty: 20,
          requiredQty: 200,
          stockQty: 400,
        },
      ],
      processes: buildProcessesFromRoute(routeName),
      createdAt: dayjs().format('YYYY-MM-DD'),
    },
  ]
}

export function createCrossDemoPurchaseRequisitions() {
  return [
    {
      id: CROSS_DEMO.prOpenId,
      reqNo: CROSS_DEMO.prOpenNo,
      salesOrderNo: CROSS_DEMO.salesOrderNo,
      docStatus: '待处理',
      overdueStatus: '未逾期',
      urgency: '紧急',
      orderDate: dayjs().format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
      estimatedArrivalDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
      receivingWarehouse: CROSS_DEMO.warehouse,
      source: '生产计划',
      operator: '管理员',
      creator: '管理员',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      remark: '产品A计划生成：螺栓 2 盒未转采购订单 → 在途显示申请侧',
      purchaseOrderNo: '',
      plannedQty: 2,
      amountWan: 0.007,
      lineItems: [
        createLineItem({
          id: `${CROSS_DEMO.prOpenId}-l1`,
          inventoryName: '标准螺栓组',
          inventoryCode: 'MAT-STD-100',
          specModel: 'M12×40',
          material: '钢',
          materialType: '标准件',
          supplyType: '外购件',
          unit: '盒',
          purchaseUnit: '盒',
          inventoryUnit: '个',
          packageContent: 100,
          convertHint: '1 盒=100 个',
          stockQty: 200,
          availableStock: 0,
          demandQty: 200,
          planPurchaseQty: 2,
          supplierName: CROSS_DEMO.supplier,
          designatedSupplier: true,
          unitPriceExTax: 30,
          unitPriceInTax: 33.9,
          totalPriceExTax: 60,
          totalPriceInTax: 67.8,
          expectedArrivalDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
          deliveryDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
          receivingWarehouse: CROSS_DEMO.warehouse,
          salesOrderNo: CROSS_DEMO.salesOrderNo,
        }),
      ],
    },
    {
      id: CROSS_DEMO.prDoneId,
      reqNo: CROSS_DEMO.prDoneNo,
      salesOrderNo: CROSS_DEMO.salesOrderNo,
      docStatus: '处理完成',
      overdueStatus: '未逾期',
      urgency: '正常',
      orderDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
      estimatedArrivalDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
      receivingWarehouse: CROSS_DEMO.warehouse,
      source: '生产计划',
      operator: '管理员',
      creator: '管理员',
      createdAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      remark: '已转采购订单，在途计入订单侧',
      purchaseOrderNo: CROSS_DEMO.poNo,
      plannedQty: 1,
      amountWan: 0.0018,
      lineItems: [
        createLineItem({
          id: `${CROSS_DEMO.prDoneId}-l1`,
          inventoryName: '平垫圈 M12',
          inventoryCode: 'MAT-STD-WASHER',
          specModel: 'M12',
          material: '钢',
          materialType: '标准件',
          supplyType: '外购件',
          unit: '盒',
          purchaseUnit: '盒',
          inventoryUnit: '个',
          packageContent: 200,
          convertHint: '1 盒=200 个',
          stockQty: 400,
          demandQty: 200,
          planPurchaseQty: 1,
          supplierName: CROSS_DEMO.supplier,
          designatedSupplier: true,
          unitPriceExTax: 16,
          unitPriceInTax: 18.08,
          totalPriceExTax: 16,
          totalPriceInTax: 18.08,
          expectedArrivalDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
          deliveryDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
          receivingWarehouse: CROSS_DEMO.warehouse,
          salesOrderNo: CROSS_DEMO.salesOrderNo,
        }),
      ],
    },
  ]
}

export function createCrossDemoPurchaseOrders() {
  return [
    {
      id: CROSS_DEMO.poId,
      orderNo: CROSS_DEMO.poNo,
      reqNo: CROSS_DEMO.prDoneNo,
      salesOrderNo: CROSS_DEMO.salesOrderNo,
      supplier: CROSS_DEMO.supplier,
      status: '进行中',
      orderSource: '采购申请',
      applyType: '日常采购',
      inboundStatus: '待入库',
      approvalResult: '审核通过',
      approverName: '管理员',
      purchaser: 'admin1',
      creator: '管理员',
      receivingWarehouse: CROSS_DEMO.warehouse,
      documentDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
      createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
      remark: '垫圈 1 盒在途（待入库）→ 生产计划在途订单侧',
      totalQty: 1,
      amountExTax: 16,
      amountInTax: 18.08,
      lineItems: [
        createPoLineItem({
          id: `${CROSS_DEMO.poId}-l1`,
          itemCode: 'MAT-STD-WASHER',
          itemName: '平垫圈 M12',
          itemType: '物料',
          specModel: 'M12',
          material: '钢',
          purchaseQty: 1,
          unit: '盒',
          purchaseUnit: '盒',
          unitPriceExTax: 16,
          receivingWarehouse: CROSS_DEMO.warehouse,
          receivedQty: 0,
          deliveryDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
          sourceReqNos: [CROSS_DEMO.prDoneNo],
        }),
      ],
    },
    {
      id: CROSS_DEMO.poPartialId,
      orderNo: CROSS_DEMO.poPartialNo,
      reqNo: '',
      salesOrderNo: CROSS_DEMO.salesOrderNo,
      supplier: CROSS_DEMO.supplier,
      status: '进行中',
      orderSource: '新增',
      inboundStatus: '部分入库',
      approvalResult: '审核通过',
      applyType: '日常采购',
      approverName: '管理员',
      purchaser: 'admin1',
      creator: '管理员',
      receivingWarehouse: CROSS_DEMO.warehouse,
      documentDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
      createdAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
      remark: '轴承采购：已部分入库，对应入库单 RK20260802001',
      totalQty: 20,
      amountExTax: 4000,
      amountInTax: 4520,
      lineItems: [
        createPoLineItem({
          id: `${CROSS_DEMO.poPartialId}-l1`,
          itemCode: 'MAT-EXT-001',
          itemName: '进口轴承',
          itemType: '物料',
          specModel: '6312-2RS',
          material: '轴承钢',
          purchaseQty: 20,
          unit: '套',
          unitPriceExTax: 200,
          receivingWarehouse: CROSS_DEMO.warehouse,
          receivedQty: 8,
          deliveryDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
        }),
      ],
    },
  ]
}

export function createCrossDemoInboundOrders() {
  return [
    createInboundOrder({
      id: CROSS_DEMO.inboundId,
      docNo: CROSS_DEMO.inboundNo,
      inboundType: '采购入库',
      status: '已入库',
      warehouse: CROSS_DEMO.warehouse,
      warehouseKeeper: 'admin1',
      inboundDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      deliveryDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      itemType: '物料',
      supplier: CROSS_DEMO.supplier,
      sourceOrderNo: CROSS_DEMO.poPartialNo,
      sourceType: '采购订单',
      purchaseOrderId: CROSS_DEMO.poPartialId,
      handler: 'admin1',
      creator: '管理员',
      confirmer: '管理员',
      confirmedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      remark: '跨模块演示：采购订单部分入库 8 套轴承',
      lineItems: [
        createInboundLine({
          id: `${CROSS_DEMO.inboundId}-l1`,
          itemCode: 'MAT-EXT-001',
          itemName: '进口轴承',
          specModel: '6312-2RS',
          material: '轴承钢',
          qty: 8,
          unit: '套',
          unitPrice: 200,
          totalPrice: 1600,
          lineSource: '采购',
          sourceDocNo: CROSS_DEMO.poPartialNo,
          warehouse: CROSS_DEMO.warehouse,
          warehouseStockQty: 36,
          locationNo: 'B-02-01',
          batchNos: ['B-260801-001'],
          barcodeBatchNo: 'B-260801-001',
        }),
      ],
    }),
  ]
}

export function createCrossDemoOutboundOrders() {
  return [
    createOutboundOrder({
      id: CROSS_DEMO.outboundId,
      docNo: CROSS_DEMO.outboundNo,
      outboundType: '领料出库',
      warehouse: CROSS_DEMO.warehouse,
      receiveWarehouse: CROSS_DEMO.lineWarehouse,
      stockTransferredToReceive: true,
      requisitionDept: '机加车间',
      sourceOrderNo: CROSS_DEMO.woCode,
      status: '已出库',
      createdAt: dayjs().format('YYYY-MM-DD'),
      completedAt: dayjs().format('YYYY-MM-DD'),
      auditDate: dayjs().format('YYYY-MM-DD'),
      outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      remark: '跨模块演示：工单已领螺栓 50 个，占用冲减已领部分',
      lineItems: [
        createOutboundLine({
          id: `${CROSS_DEMO.outboundId}-l1`,
          itemName: '标准螺栓组',
          itemCode: 'MAT-STD-100',
          itemType: '物料',
          shipQty: 50,
          unit: '个',
          shipWarehouse: CROSS_DEMO.warehouse,
          receiveWarehouse: CROSS_DEMO.lineWarehouse,
          workOrderNo: CROSS_DEMO.woCode,
          sourceDocNo: CROSS_DEMO.woCode,
          lineSource: '工单领料',
          sourceWorkOrders: [
            { workOrderId: CROSS_DEMO.woId, workOrderCode: CROSS_DEMO.woCode, qty: 50 },
          ],
          issuedBatchNo: 'B-260705-100',
          batchAllocations: [
            {
              batchId: 'bat-inv-bolt-issued',
              batchNo: 'B-260705-100',
              qty: 50,
              unit: '个',
            },
          ],
        }),
      ],
    }),
    createOutboundOrder({
      id: 'ob-inv-detail-washer-1',
      docNo: 'OUT20260802088',
      outboundType: '领料出库',
      warehouse: CROSS_DEMO.warehouse,
      receiveWarehouse: CROSS_DEMO.lineWarehouse,
      stockTransferredToReceive: true,
      requisitionDept: '机加车间',
      sourceOrderNo: CROSS_DEMO.woCode,
      status: '已出库',
      createdAt: '2026-08-02',
      completedAt: '2026-08-02',
      auditDate: '2026-08-02',
      outboundTime: '2026-08-02 15:40:00',
      remark: '库存明细演示：垫圈 FIFO 扣批',
      lineItems: [
        createOutboundLine({
          id: 'ob-inv-detail-washer-1-l1',
          itemName: '平垫圈 M12',
          itemCode: 'MAT-STD-WASHER',
          itemType: '物料',
          shipQty: 40,
          unit: '个',
          shipWarehouse: CROSS_DEMO.warehouse,
          receiveWarehouse: CROSS_DEMO.lineWarehouse,
          workOrderNo: CROSS_DEMO.woCode,
          sourceDocNo: CROSS_DEMO.woCode,
          lineSource: '工单领料',
          lineStatus: '已出库',
          issuedBatchNo: 'B-260712-201',
          batchAllocations: [
            {
              batchId: 'bat-inv-washer-fifo-1',
              batchNo: 'B-260712-201',
              qty: 40,
              unit: '个',
            },
          ],
        }),
      ],
    }),
    createOutboundOrder({
      id: 'ob-inv-detail-bearing-1',
      docNo: 'OUT20260804066',
      outboundType: '领料出库',
      warehouse: CROSS_DEMO.warehouse,
      receiveWarehouse: CROSS_DEMO.lineWarehouse,
      stockTransferredToReceive: true,
      requisitionDept: '机加车间',
      sourceOrderNo: CROSS_DEMO.woCode,
      status: '已出库',
      createdAt: '2026-08-04',
      completedAt: '2026-08-04',
      auditDate: '2026-08-04',
      outboundTime: '2026-08-04 09:30:00',
      remark: '库存明细演示：轴承一物一码 FIFO 出库',
      lineItems: [
        createOutboundLine({
          id: 'ob-inv-detail-bearing-1-l1',
          itemName: '进口轴承',
          itemCode: 'MAT-EXT-001',
          itemType: '物料',
          shipQty: 6,
          unit: '套',
          shipWarehouse: CROSS_DEMO.warehouse,
          receiveWarehouse: CROSS_DEMO.lineWarehouse,
          workOrderNo: CROSS_DEMO.woCode,
          sourceDocNo: CROSS_DEMO.woCode,
          lineSource: '工单领料',
          lineStatus: '已出库',
          issuedBatchNo: 'B-260718-301',
          issuedPieceSerialNos: [
            'B-260718-301-0031',
            'B-260718-301-0032',
            'B-260718-301-0033',
            'B-260718-301-0034',
            'B-260718-301-0035',
            'B-260718-301-0036',
          ].join('、'),
          batchAllocations: [
            {
              batchId: 'bat-inv-bearing-piece',
              batchNo: 'B-260718-301',
              qty: 6,
              unit: '套',
              pieceSerialNos: [
                'B-260718-301-0031',
                'B-260718-301-0032',
                'B-260718-301-0033',
                'B-260718-301-0034',
                'B-260718-301-0035',
                'B-260718-301-0036',
              ],
            },
          ],
        }),
      ],
    }),
    createOutboundOrder({
      id: 'ob-inv-detail-casting-1',
      docNo: 'OUT20260803055',
      outboundType: '领料出库',
      warehouse: '半成品仓',
      receiveWarehouse: CROSS_DEMO.lineWarehouse,
      stockTransferredToReceive: true,
      requisitionDept: '装配车间',
      sourceOrderNo: CROSS_DEMO.woCode,
      status: '已出库',
      createdAt: '2026-08-03',
      completedAt: '2026-08-03',
      auditDate: '2026-08-03',
      outboundTime: '2026-08-03 09:15:00',
      remark: '库存明细演示：铸件扣批生成余料回仓',
      lineItems: [
        createOutboundLine({
          id: 'ob-inv-detail-casting-1-l1',
          itemName: '泵体铸件',
          itemCode: 'M-001',
          itemType: '物料',
          shipQty: 8,
          unit: '件',
          shipWarehouse: '半成品仓',
          receiveWarehouse: CROSS_DEMO.lineWarehouse,
          workOrderNo: CROSS_DEMO.woCode,
          sourceDocNo: CROSS_DEMO.woCode,
          lineSource: '工单领料',
          lineStatus: '已出库',
          issuedBatchNo: 'B-260715-401',
          batchAllocations: [
            {
              batchId: 'bat-inv-casting-1',
              batchNo: 'B-260715-401',
              qty: 8,
              unit: '件',
            },
          ],
        }),
      ],
    }),
  ]
}

export function createCrossDemoDeductRecords() {
  const S = MATERIAL_DEDUCT_STATUS
  return [
    {
      id: CROSS_DEMO.deductId,
      workOrderNo: CROSS_DEMO.woCode,
      workOrderId: CROSS_DEMO.woId,
      deductNo: CROSS_DEMO.deductNo,
      productName: '离心泵部件',
      productSpec: 'CROSS-DEMO',
      reportQty: 2,
      deductTime: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      confirmedAt: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      warehouseName: CROSS_DEMO.warehouse,
      warehouseCode: 'WH-RAW',
      materialDone: 1,
      materialTotal: 2,
      status: S.PARTIAL,
      stockPhase: 'actual',
      deductSource: MATERIAL_DEDUCT_SOURCES.WORK_ORDER,
      requisitionMode: 'work-order',
      remark: '跨模块演示：完工扣减（领料展示 + 倒冲部分成功）',
      lines: [
        {
          id: `${CROSS_DEMO.deductId}-l0`,
          materialCode: 'M-001',
          materialName: '泵体铸件毛坯',
          specModel: 'HT250',
          material: 'HT250',
          planQty: 2,
          actualQty: 0,
          status: S.SKIPPED,
          failReason: '',
          warehouseStockQty: 999,
          issueMode: '领料',
          isBackflush: false,
          deductible: false,
        },
        {
          id: `${CROSS_DEMO.deductId}-l1`,
          materialCode: 'MAT-STD-WASHER',
          materialName: '平垫圈 M12',
          specModel: 'M12',
          material: '钢',
          planQty: 40,
          actualQty: 40,
          status: S.SUCCESS,
          failReason: '',
          warehouseStockQty: 400,
          issueMode: '倒冲',
          isBackflush: true,
          deductible: true,
        },
        {
          id: `${CROSS_DEMO.deductId}-l2`,
          materialCode: 'MAT-STD-100',
          materialName: '标准螺栓组',
          specModel: 'M12×40',
          material: '钢',
          planQty: 40,
          actualQty: 0,
          status: S.FAILED,
          failReason: '库存不足',
          warehouseStockQty: 20,
          issueMode: '倒冲',
          isBackflush: true,
          deductible: true,
        },
      ],
    },
  ]
}

export function ensureCrossDemoWorkOrders(orders) {
  const rest = stripByIds(orders)
  return [...createCrossDemoWorkOrders(), ...rest]
}

export function ensureCrossDemoPurchaseRequisitions(list) {
  const rest = stripByIds(list)
  return [...createCrossDemoPurchaseRequisitions(), ...rest]
}

export function ensureCrossDemoPurchaseOrders(list) {
  const rest = stripByIds(list)
  return [...createCrossDemoPurchaseOrders(), ...rest]
}

export function ensureCrossDemoInboundOrders(list) {
  const rest = stripByIds(list)
  return [...createCrossDemoInboundOrders(), ...rest]
}

export function ensureCrossDemoOutboundOrders(list) {
  const rest = stripByIds(list)
  return [...createCrossDemoOutboundOrders(), ...rest]
}

export function ensureCrossDemoDeductRecords(list) {
  const rest = stripByIds(list)
  return [...createCrossDemoDeductRecords(), ...rest]
}

export function buildCrossDemoStockRecords() {
  return CROSS_DEMO_STOCK.map((row, index) => ({
    id: `stk-cross-${index + 1}`,
    key: `${row.warehouse}::${row.itemCode}`,
    warehouse: row.warehouse,
    itemCode: row.itemCode,
    itemName: row.itemName,
    itemType: row.itemType,
    unit: row.unit,
    qty: row.qty,
  }))
}

/** 给生产计划物料树写入演示现存量 */
export function applyCrossDemoStockToPlanMaterials(materials) {
  const walk = (nodes) => {
    ;(nodes || []).forEach((node) => {
      if (node?.code && CROSS_DEMO_MATERIAL_STOCK[node.code] != null) {
        const qty = CROSS_DEMO_MATERIAL_STOCK[node.code]
        node.stockQty = qty
        if (node.availableStock == null || node.availableStock === 0) {
          node.availableStock = qty
        }
      }
      if (node?.children?.length) walk(node.children)
    })
  }
  walk(materials)
  return materials
}
