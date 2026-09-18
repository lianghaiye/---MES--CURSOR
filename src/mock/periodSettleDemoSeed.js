/**
 * 账期结算演示：同一月结供应商、两张采购单、两张已入库（入库日落在 2026-08）
 */
import { createPurchaseOrder, createPoLineItem } from '@/mock/purchaseOrders'
import { createInboundOrder, createInboundLine } from '@/mock/inboundOrders'

/** 演示用常量；入库日期写死在 create* 中 */
export const PERIOD_SETTLE_DEMO = {
  poAId: 'po-period-settle-a',
  poBId: 'po-period-settle-b',
  poANo: 'CG-PERIOD-202608-A',
  poBNo: 'CG-PERIOD-202608-B',
  inboundAId: 'ib-period-settle-a',
  inboundBId: 'ib-period-settle-b',
  inboundANo: 'RK-PERIOD-202608-A',
  inboundBNo: 'RK-PERIOD-202608-B',
  supplier: '多功能供应商01',
  yearMonth: '2026-08',
}

const DEMO_IDS = [
  PERIOD_SETTLE_DEMO.poAId,
  PERIOD_SETTLE_DEMO.poBId,
  PERIOD_SETTLE_DEMO.inboundAId,
  PERIOD_SETTLE_DEMO.inboundBId,
]

function stripByIds(list) {
  return (list || []).filter((row) => !DEMO_IDS.includes(row?.id))
}

function poLine(partial) {
  return createPoLineItem({
    itemType: '物料',
    unit: '件',
    unitPriceExTax: 50,
    unitPriceInTax: 56.5,
    taxRate: 13,
    receivingWarehouse: '原材料仓',
    ...partial,
  })
}

export function createPeriodSettleDemoPurchaseOrders() {
  const lineA = poLine({
    id: `${PERIOD_SETTLE_DEMO.poAId}-l1`,
    itemCode: 'MAT-PERIOD-001',
    itemName: '账期结算演示件A',
    specModel: 'A-100',
    purchaseQty: 10,
    receivedQty: 10,
  })
  const lineB = poLine({
    id: `${PERIOD_SETTLE_DEMO.poBId}-l1`,
    itemCode: 'MAT-PERIOD-002',
    itemName: '账期结算演示件B',
    specModel: 'B-200',
    purchaseQty: 6,
    receivedQty: 6,
    unitPriceExTax: 80,
    unitPriceInTax: 90.4,
  })

  return [
    createPurchaseOrder({
      id: PERIOD_SETTLE_DEMO.poAId,
      orderNo: PERIOD_SETTLE_DEMO.poANo,
      supplier: PERIOD_SETTLE_DEMO.supplier,
      status: '已完成',
      inboundStatus: '已入库',
      settlementCycle: '月结',
      settlementType: '货到付款',
      settlementMethod: '银行转账',
      documentDate: '2026-08-05',
      deliveryDate: '2026-08-20',
      completedAt: '2026-08-20 18:00:00',
      remark: '【账期结算演示】采购单 A，入库日 2026-08-10',
      lineItems: [lineA],
      totalQty: 10,
      amountExTax: 500,
      amountInTax: 565,
    }),
    createPurchaseOrder({
      id: PERIOD_SETTLE_DEMO.poBId,
      orderNo: PERIOD_SETTLE_DEMO.poBNo,
      supplier: PERIOD_SETTLE_DEMO.supplier,
      status: '已完成',
      inboundStatus: '已入库',
      settlementCycle: '月结',
      settlementType: '货到付款',
      settlementMethod: '银行转账',
      documentDate: '2026-08-12',
      deliveryDate: '2026-08-25',
      completedAt: '2026-08-25 18:00:00',
      remark: '【账期结算演示】采购单 B，入库日 2026-08-18',
      lineItems: [lineB],
      totalQty: 6,
      amountExTax: 480,
      amountInTax: 542.4,
    }),
  ]
}

export function createPeriodSettleDemoInboundOrders() {
  return [
    createInboundOrder({
      id: PERIOD_SETTLE_DEMO.inboundAId,
      docNo: PERIOD_SETTLE_DEMO.inboundANo,
      inboundType: '采购入库',
      status: '已入库',
      warehouse: '原材料仓',
      warehouseKeeper: 'admin1',
      inboundDate: '2026-08-10',
      deliveryDate: '2026-08-10',
      itemType: '物料',
      supplier: PERIOD_SETTLE_DEMO.supplier,
      sourceOrderNo: PERIOD_SETTLE_DEMO.poANo,
      sourceType: '采购订单',
      purchaseOrderId: PERIOD_SETTLE_DEMO.poAId,
      handler: 'admin1',
      confirmer: 'admin1',
      confirmedAt: '2026-08-10 15:00:00',
      createdAt: '2026-08-10 14:00:00',
      remark: '【账期结算演示】2026-08 上旬入库',
      lineItems: [
        createInboundLine({
          id: `${PERIOD_SETTLE_DEMO.inboundAId}-l1`,
          itemCode: 'MAT-PERIOD-001',
          itemName: '账期结算演示件A',
          specModel: 'A-100',
          qty: 10,
          purchaseQty: 10,
          unit: '件',
          unitPrice: 56.5,
          totalPrice: 565,
          lineSource: '采购',
          sourceDocNo: PERIOD_SETTLE_DEMO.poANo,
          poLineId: `${PERIOD_SETTLE_DEMO.poAId}-l1`,
          warehouse: '原材料仓',
          lineStatus: '已入库',
          settledSettleQty: 0,
        }),
      ],
    }),
    createInboundOrder({
      id: PERIOD_SETTLE_DEMO.inboundBId,
      docNo: PERIOD_SETTLE_DEMO.inboundBNo,
      inboundType: '采购入库',
      status: '已入库',
      warehouse: '原材料仓',
      warehouseKeeper: 'admin1',
      inboundDate: '2026-08-18',
      deliveryDate: '2026-08-18',
      itemType: '物料',
      supplier: PERIOD_SETTLE_DEMO.supplier,
      sourceOrderNo: PERIOD_SETTLE_DEMO.poBNo,
      sourceType: '采购订单',
      purchaseOrderId: PERIOD_SETTLE_DEMO.poBId,
      handler: 'admin1',
      confirmer: 'admin1',
      confirmedAt: '2026-08-18 16:00:00',
      createdAt: '2026-08-18 15:00:00',
      remark: '【账期结算演示】2026-08 中旬入库',
      lineItems: [
        createInboundLine({
          id: `${PERIOD_SETTLE_DEMO.inboundBId}-l1`,
          itemCode: 'MAT-PERIOD-002',
          itemName: '账期结算演示件B',
          specModel: 'B-200',
          qty: 6,
          purchaseQty: 6,
          unit: '件',
          unitPrice: 90.4,
          totalPrice: 542.4,
          lineSource: '采购',
          sourceDocNo: PERIOD_SETTLE_DEMO.poBNo,
          poLineId: `${PERIOD_SETTLE_DEMO.poBId}-l1`,
          warehouse: '原材料仓',
          lineStatus: '已入库',
          settledSettleQty: 0,
        }),
      ],
    }),
  ]
}

export function ensurePeriodSettleDemoPurchaseOrders(list) {
  return [...createPeriodSettleDemoPurchaseOrders(), ...stripByIds(list)]
}

export function ensurePeriodSettleDemoInboundOrders(list) {
  return [...createPeriodSettleDemoInboundOrders(), ...stripByIds(list)]
}
