/**
 * 采购对账演示入库单：与 purchaseSettles seed 中 inboundOrderId / inboundLineId 对齐，
 * 避免确认时报「关联入库明细不存在」。
 */
import { createInboundOrder, createInboundLine } from '@/mock/inboundOrders'

const DEMO_INBOUND_IDS = [
  'ib-demo-ps-1a',
  'ib-demo-ps-1b',
  'ib-demo-ps-2a',
  'ib-demo-ps-2b',
  'ib-demo-ps-3a',
  'ib-demo-ps-3b',
  'ib-demo-ps-4a',
  'ib-demo-ps-5a',
  'ib-demo-ps-10a',
  'ib-demo-ps-10b',
  'ib-demo-ps-10c',
  'ib-demo-ps-11a',
  'ib-demo-ps-11b',
  'ib-demo-ps-11c',
]

function stripDemo(list) {
  return (list || []).filter((row) => !DEMO_INBOUND_IDS.includes(row?.id))
}

function inboundLine(partial) {
  const qty = Number(partial.qty ?? partial.purchaseQty) || 0
  return createInboundLine({
    unit: '件',
    warehouse: '原材料仓',
    lineStatus: '已入库',
    lineSource: '采购',
    purchaseQty: qty,
    qty,
    settledSettleQty: 0,
    ...partial,
  })
}

function inboundOrder(partial) {
  return createInboundOrder({
    inboundType: '采购入库',
    status: '已入库',
    warehouse: '原材料仓',
    warehouseKeeper: 'admin1',
    itemType: '物料',
    sourceType: '采购订单',
    handler: 'admin1',
    confirmer: 'admin1',
    ...partial,
  })
}

export function createPurchaseSettleDemoInboundOrders() {
  return [
    // —— 对应 PS20261001001（9 月账期草稿）——
    inboundOrder({
      id: 'ib-demo-ps-1a',
      docNo: 'RK20260908001',
      inboundDate: '2026-09-08',
      deliveryDate: '2026-09-08',
      supplier: '多功能供应商01',
      sourceOrderNo: 'CG20260804001',
      purchaseOrderId: 'po-demo-ps-1',
      confirmedAt: '2026-09-08 16:00:00',
      createdAt: '2026-09-08 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-1a',
          itemCode: '010040045',
          itemName: '泵轴套',
          qty: 120,
          unitPrice: 56.5,
          totalPrice: 6780,
          sourceDocNo: 'CG20260804001',
          poLineId: 'po-demo-ps-1-l1',
        }),
      ],
    }),
    inboundOrder({
      id: 'ib-demo-ps-1b',
      docNo: 'RK20260922001',
      inboundDate: '2026-09-22',
      deliveryDate: '2026-09-22',
      supplier: '多功能供应商01',
      sourceOrderNo: 'CG20260715001',
      purchaseOrderId: 'po-demo-ps-2',
      confirmedAt: '2026-09-22 16:00:00',
      createdAt: '2026-09-22 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-1b',
          itemCode: '010050003',
          itemName: '叶轮',
          qty: 40,
          unitPrice: 320,
          totalPrice: 12800,
          sourceDocNo: 'CG20260715001',
          poLineId: 'po-demo-ps-2-l1',
        }),
      ],
    }),

    // —— 对应 PS20261001002（已确认，占量写满）——
    inboundOrder({
      id: 'ib-demo-ps-2a',
      docNo: 'RK20260915001',
      inboundDate: '2026-09-15',
      deliveryDate: '2026-09-15',
      supplier: '采购供应商A',
      sourceOrderNo: 'CG20260802001',
      purchaseOrderId: 'po-demo-ps-3',
      confirmedAt: '2026-09-15 16:00:00',
      createdAt: '2026-09-15 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-2a',
          itemCode: '010040010',
          itemName: '密封垫片',
          qty: 500,
          unitPrice: 2.8,
          totalPrice: 1400,
          sourceDocNo: 'CG20260802001',
          poLineId: 'po-demo-ps-3-l1',
          settledSettleQty: 500,
        }),
      ],
    }),
    inboundOrder({
      id: 'ib-demo-ps-2b',
      docNo: 'RK20260928001',
      inboundDate: '2026-09-28',
      deliveryDate: '2026-09-28',
      supplier: '采购供应商A',
      sourceOrderNo: 'CG20260802001',
      purchaseOrderId: 'po-demo-ps-3',
      confirmedAt: '2026-09-28 16:00:00',
      createdAt: '2026-09-28 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-2b',
          itemCode: '010040012',
          itemName: 'O型圈',
          qty: 800,
          unitPrice: 1.2,
          totalPrice: 960,
          sourceDocNo: 'CG20260802001',
          poLineId: 'po-demo-ps-3-l2',
          settledSettleQty: 800,
        }),
      ],
    }),

    // —— 对应 PS20260929001 周结草稿 ——
    inboundOrder({
      id: 'ib-demo-ps-3a',
      docNo: 'RK20260924001',
      inboundDate: '2026-09-24',
      deliveryDate: '2026-09-24',
      supplier: '标准件供应商',
      sourceOrderNo: 'CG20260728001',
      purchaseOrderId: 'po-demo-ps-4',
      confirmedAt: '2026-09-24 16:00:00',
      createdAt: '2026-09-24 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-3a',
          itemCode: 'STD-M8-20',
          itemName: '六角螺栓 M8×20',
          qty: 2000,
          unitPrice: 0.35,
          totalPrice: 700,
          sourceDocNo: 'CG20260728001',
          poLineId: 'po-demo-ps-4-l1',
        }),
      ],
    }),
    inboundOrder({
      id: 'ib-demo-ps-3b',
      docNo: 'RK20260926001',
      inboundDate: '2026-09-26',
      deliveryDate: '2026-09-26',
      supplier: '标准件供应商',
      sourceOrderNo: 'CG20260728001',
      purchaseOrderId: 'po-demo-ps-4',
      confirmedAt: '2026-09-26 16:00:00',
      createdAt: '2026-09-26 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-3b',
          itemCode: 'STD-W-M8',
          itemName: '平垫圈 M8',
          qty: 2000,
          unitPrice: 0.08,
          totalPrice: 160,
          sourceDocNo: 'CG20260728001',
          poLineId: 'po-demo-ps-4-l2',
        }),
      ],
    }),

    // —— 对应 PS20260920001 按采购单 ——
    inboundOrder({
      id: 'ib-demo-ps-4a',
      docNo: 'RK20260918001',
      inboundDate: '2026-09-18',
      deliveryDate: '2026-09-18',
      supplier: '多功能供应商02',
      sourceOrderNo: 'CG20260803001',
      purchaseOrderId: 'po-demo-ps-5',
      confirmedAt: '2026-09-18 16:00:00',
      createdAt: '2026-09-18 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-4a',
          itemCode: '010050004',
          itemName: '机械密封组件',
          qty: 15,
          unit: '套',
          unitPrice: 680,
          totalPrice: 10200,
          sourceDocNo: 'CG20260803001',
          poLineId: 'po-demo-ps-5-l1',
        }),
      ],
    }),

    // —— 对应 PS20261001003 ——
    inboundOrder({
      id: 'ib-demo-ps-5a',
      docNo: 'RK20260912001',
      inboundDate: '2026-09-12',
      deliveryDate: '2026-09-12',
      supplier: '多功能供应商02',
      sourceOrderNo: 'CG20260803001',
      purchaseOrderId: 'po-demo-ps-6',
      confirmedAt: '2026-09-12 16:00:00',
      createdAt: '2026-09-12 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-5a',
          itemCode: '010050006',
          itemName: '地脚螺栓组',
          qty: 30,
          unit: '套',
          unitPrice: 45,
          totalPrice: 1350,
          sourceDocNo: 'CG20260803001',
          poLineId: 'po-demo-ps-6-l1',
        }),
        inboundLine({
          id: 'ibl-ps-5b',
          itemCode: 'MAT-CAST-01',
          itemName: '泵体铸件（按重结算）',
          qty: 1260.5,
          settleQty: 1260.5,
          settleUnit: 'kg',
          unit: 'kg',
          unitPrice: 8.6,
          totalPrice: 10840.3,
          sourceDocNo: 'CG20260803001',
          poLineId: 'po-demo-ps-6-l2',
        }),
      ],
    }),

    // —— 10 月账期演示入库 ——
    inboundOrder({
      id: 'ib-demo-ps-10a',
      docNo: 'RK20261008001',
      inboundDate: '2026-10-08',
      deliveryDate: '2026-10-08',
      supplier: '多功能供应商01',
      sourceOrderNo: 'CG20260910001',
      purchaseOrderId: 'po-demo-ps-10',
      confirmedAt: '2026-10-08 16:00:00',
      createdAt: '2026-10-08 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-10a',
          itemCode: '010040045',
          itemName: '泵轴套',
          qty: 80,
          unitPrice: 56.5,
          totalPrice: 4520,
          sourceDocNo: 'CG20260910001',
          poLineId: 'po-demo-ps-10-l1',
        }),
      ],
    }),
    inboundOrder({
      id: 'ib-demo-ps-10b',
      docNo: 'RK20261018001',
      inboundDate: '2026-10-18',
      deliveryDate: '2026-10-18',
      supplier: '采购供应商A',
      sourceOrderNo: 'CG20260915001',
      purchaseOrderId: 'po-demo-ps-10b',
      confirmedAt: '2026-10-18 16:00:00',
      createdAt: '2026-10-18 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-10b',
          itemCode: '010040010',
          itemName: '密封垫片',
          qty: 300,
          unitPrice: 2.8,
          totalPrice: 840,
          sourceDocNo: 'CG20260915001',
          poLineId: 'po-demo-ps-10b-l1',
          settledSettleQty: 300,
        }),
      ],
    }),
    inboundOrder({
      id: 'ib-demo-ps-10c',
      docNo: 'RK20261025001',
      inboundDate: '2026-10-25',
      deliveryDate: '2026-10-25',
      supplier: '多功能供应商02',
      sourceOrderNo: 'CG20260920001',
      purchaseOrderId: 'po-demo-ps-10c',
      confirmedAt: '2026-10-25 16:00:00',
      createdAt: '2026-10-25 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-10c',
          itemCode: '010050004',
          itemName: '机械密封组件',
          qty: 8,
          unit: '套',
          unitPrice: 680,
          totalPrice: 5440,
          sourceDocNo: 'CG20260920001',
          poLineId: 'po-demo-ps-10c-l1',
        }),
      ],
    }),

    // —— 11 月账期演示入库 ——
    inboundOrder({
      id: 'ib-demo-ps-11a',
      docNo: 'RK20261105001',
      inboundDate: '2026-11-05',
      deliveryDate: '2026-11-05',
      supplier: '多功能供应商01',
      sourceOrderNo: 'CG20261008001',
      purchaseOrderId: 'po-demo-ps-11',
      confirmedAt: '2026-11-05 16:00:00',
      createdAt: '2026-11-05 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-11a',
          itemCode: '010050003',
          itemName: '叶轮',
          qty: 25,
          unitPrice: 320,
          totalPrice: 8000,
          sourceDocNo: 'CG20261008001',
          poLineId: 'po-demo-ps-11-l1',
        }),
      ],
    }),
    inboundOrder({
      id: 'ib-demo-ps-11b',
      docNo: 'RK20261112001',
      inboundDate: '2026-11-12',
      deliveryDate: '2026-11-12',
      supplier: '标准件供应商',
      sourceOrderNo: 'CG20261012001',
      purchaseOrderId: 'po-demo-ps-11b',
      confirmedAt: '2026-11-12 16:00:00',
      createdAt: '2026-11-12 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-11b',
          itemCode: 'STD-M8-20',
          itemName: '六角螺栓 M8×20',
          qty: 5000,
          unitPrice: 0.35,
          totalPrice: 1750,
          sourceDocNo: 'CG20261012001',
          poLineId: 'po-demo-ps-11b-l1',
        }),
      ],
    }),
    inboundOrder({
      id: 'ib-demo-ps-11c',
      docNo: 'RK20261120001',
      inboundDate: '2026-11-20',
      deliveryDate: '2026-11-20',
      supplier: '采购供应商A',
      sourceOrderNo: 'CG20261018001',
      purchaseOrderId: 'po-demo-ps-11c',
      confirmedAt: '2026-11-20 16:00:00',
      createdAt: '2026-11-20 15:00:00',
      lineItems: [
        inboundLine({
          id: 'ibl-ps-11c',
          itemCode: '010040012',
          itemName: 'O型圈',
          qty: 1200,
          unitPrice: 1.2,
          totalPrice: 1440,
          sourceDocNo: 'CG20261018001',
          poLineId: 'po-demo-ps-11c-l1',
          settledSettleQty: 1200,
        }),
      ],
    }),
  ]
}

export function ensurePurchaseSettleDemoInboundOrders(list) {
  return [...createPurchaseSettleDemoInboundOrders(), ...stripDemo(list)]
}
