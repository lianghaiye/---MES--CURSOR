import dayjs from 'dayjs'
import { roundNumber } from '@/utils/numberFormat'

export const PURCHASE_SETTLE_STATUS = {
  DRAFT: '草稿',
  CONFIRMED: '已确认',
}

export const PURCHASE_SETTLE_GENERATE_MODE = {
  PO: 'po',
  PERIOD: 'period',
}

export function createPurchaseSettleLine(partial = {}) {
  const settleQty = Number(partial.settleQty) || 0
  const unitPrice = Number(partial.unitPrice) || 0
  const amount =
    partial.amount != null ? Number(partial.amount) : roundNumber(settleQty * unitPrice, 4)
  return {
    id: partial.id || `ps-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    inboundOrderId: '',
    inboundDocNo: '',
    inboundLineId: '',
    poLineId: '',
    purchaseOrderId: '',
    purchaseOrderNo: '',
    itemCode: '',
    itemName: '',
    settleUnit: '',
    ...partial,
    settleQty,
    unitPrice,
    amount,
  }
}

export function createPurchaseSettle(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const { lineItems: rawLines, totalAmount: rawTotal, ...rest } = partial
  const lineItems = (rawLines || []).map((l) => createPurchaseSettleLine(l))
  const totalAmount =
    rawTotal != null
      ? Number(rawTotal)
      : roundNumber(
          lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0),
          4,
        )
  return {
    id: '',
    settleNo: '',
    status: PURCHASE_SETTLE_STATUS.DRAFT,
    generateMode: PURCHASE_SETTLE_GENERATE_MODE.PO,
    purchaseOrderId: '',
    purchaseOrderNo: '',
    purchaseOrderNos: [],
    supplierId: '',
    supplier: '',
    settlementCycle: '',
    periodKey: '',
    periodStart: '',
    periodEnd: '',
    settleDate: dayjs().format('YYYY-MM-DD'),
    remark: '',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    ...rest,
    lineItems,
    totalAmount,
  }
}

/**
 * 演示结算单（对照结算规则讲解）：
 * 1) 月结·账期·草稿 — 多功能供应商01（上月入库汇总）
 * 2) 月结·账期·已确认 — 采购供应商A
 * 3) 周结·账期·草稿 — 标准件供应商（上周）
 * 4) 按采购单·草稿 — 多功能供应商02（整单完成后结算）
 * 5) 月结·账期·草稿 — 多功能供应商02（另一月结供应商，同月初对账）
 */
export function seedPurchaseSettles() {
  return [
    // 1. 月结 + 账期生成 + 草稿（规则「扫上月·适用月结」典型结果）
    createPurchaseSettle({
      id: 'ps-demo-month-draft',
      settleNo: 'PS20261001001',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      supplierId: 'sup-1',
      supplier: '多功能供应商01',
      settlementCycle: '月结',
      periodKey: '2026-09',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      settleDate: '2026-10-01',
      purchaseOrderNos: ['CG20260804001', 'CG20260715001'],
      purchaseOrderNo: 'CG20260804001',
      remark: '演示：月初规则扫上月入库·月结供应商·草稿待确认',
      creator: '规则自动',
      createdAt: '2026-10-01 02:00:12',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-1-l1',
          inboundOrderId: 'ib-demo-ps-1a',
          inboundDocNo: 'RK20260908001',
          inboundLineId: 'ibl-ps-1a',
          purchaseOrderId: 'po-demo-ps-1',
          purchaseOrderNo: 'CG20260804001',
          itemCode: '010040045',
          itemName: '泵轴套',
          settleUnit: '件',
          settleQty: 120,
          unitPrice: 56.5,
        }),
        createPurchaseSettleLine({
          id: 'ps-demo-1-l2',
          inboundOrderId: 'ib-demo-ps-1b',
          inboundDocNo: 'RK20260922001',
          inboundLineId: 'ibl-ps-1b',
          purchaseOrderId: 'po-demo-ps-2',
          purchaseOrderNo: 'CG20260715001',
          itemCode: '010050003',
          itemName: '叶轮',
          settleUnit: '件',
          settleQty: 40,
          unitPrice: 320,
        }),
      ],
    }),

    // 2. 月结 + 账期 + 已确认（对完账、可进入开票/账期付款）
    createPurchaseSettle({
      id: 'ps-demo-month-confirmed',
      settleNo: 'PS20261001002',
      status: PURCHASE_SETTLE_STATUS.CONFIRMED,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      supplierId: 'sup-3',
      supplier: '采购供应商A',
      settlementCycle: '月结',
      periodKey: '2026-09',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      settleDate: '2026-10-01',
      purchaseOrderNos: ['CG20260802001'],
      purchaseOrderNo: 'CG20260802001',
      remark: '演示：月结已确认（账期起算开票日+60天，付款在开票后）',
      creator: '规则自动',
      createdAt: '2026-10-01 02:00:18',
      confirmer: 'admin1',
      confirmedAt: '2026-10-03 10:20:00',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-2-l1',
          inboundOrderId: 'ib-demo-ps-2a',
          inboundDocNo: 'RK20260915001',
          inboundLineId: 'ibl-ps-2a',
          purchaseOrderId: 'po-demo-ps-3',
          purchaseOrderNo: 'CG20260802001',
          itemCode: '010040010',
          itemName: '密封垫片',
          settleUnit: '件',
          settleQty: 500,
          unitPrice: 2.8,
        }),
        createPurchaseSettleLine({
          id: 'ps-demo-2-l2',
          inboundOrderId: 'ib-demo-ps-2b',
          inboundDocNo: 'RK20260928001',
          inboundLineId: 'ibl-ps-2b',
          purchaseOrderId: 'po-demo-ps-3',
          purchaseOrderNo: 'CG20260802001',
          itemCode: '010040012',
          itemName: 'O型圈',
          settleUnit: '件',
          settleQty: 800,
          unitPrice: 1.2,
        }),
      ],
    }),

    // 3. 周结 + 账期 + 草稿（每周一规则扫上周，不会进「适用月结」那条）
    createPurchaseSettle({
      id: 'ps-demo-week-draft',
      settleNo: 'PS20260929001',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      supplierId: 'sup-6',
      supplier: '标准件供应商',
      settlementCycle: '周结',
      periodKey: '2026-W39',
      periodStart: '2026-09-22',
      periodEnd: '2026-09-28',
      settleDate: '2026-09-29',
      purchaseOrderNos: ['CG20260728001'],
      purchaseOrderNo: 'CG20260728001',
      remark: '演示：周结规则每周一扫上周；10/1 月结规则不会扫到本供应商',
      creator: '规则自动',
      createdAt: '2026-09-29 02:00:05',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-3-l1',
          inboundOrderId: 'ib-demo-ps-3a',
          inboundDocNo: 'RK20260924001',
          inboundLineId: 'ibl-ps-3a',
          purchaseOrderId: 'po-demo-ps-4',
          purchaseOrderNo: 'CG20260728001',
          itemCode: 'STD-M8-20',
          itemName: '六角螺栓 M8×20',
          settleUnit: '件',
          settleQty: 2000,
          unitPrice: 0.35,
        }),
        createPurchaseSettleLine({
          id: 'ps-demo-3-l2',
          inboundOrderId: 'ib-demo-ps-3b',
          inboundDocNo: 'RK20260926001',
          inboundLineId: 'ibl-ps-3b',
          purchaseOrderId: 'po-demo-ps-4',
          purchaseOrderNo: 'CG20260728001',
          itemCode: 'STD-W-M8',
          itemName: '平垫圈 M8',
          settleUnit: '件',
          settleQty: 2000,
          unitPrice: 0.08,
        }),
      ],
    }),

    // 4. 按采购单生成（整单完成后结算）
    createPurchaseSettle({
      id: 'ps-demo-po-draft',
      settleNo: 'PS20260920001',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PO,
      supplierId: 'sup-2',
      supplier: '多功能供应商02',
      settlementCycle: '月结',
      periodKey: '',
      periodStart: '',
      periodEnd: '',
      settleDate: '2026-09-20',
      purchaseOrderId: 'po-demo-ps-5',
      purchaseOrderNo: 'CG20260803001',
      purchaseOrderNos: ['CG20260803001'],
      remark: '演示：按采购单（已完成）生成，一单一张结算单',
      creator: 'admin1',
      createdAt: '2026-09-20 14:30:00',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-4-l1',
          inboundOrderId: 'ib-demo-ps-4a',
          inboundDocNo: 'RK20260918001',
          inboundLineId: 'ibl-ps-4a',
          purchaseOrderId: 'po-demo-ps-5',
          purchaseOrderNo: 'CG20260803001',
          itemCode: '010050004',
          itemName: '机械密封组件',
          settleUnit: '套',
          settleQty: 15,
          unitPrice: 680,
        }),
      ],
    }),

    // 5. 另一家月结·账期草稿（与单1同日对账，说明工厂节奏下多家月结并行）
    createPurchaseSettle({
      id: 'ps-demo-month-draft-2',
      settleNo: 'PS20261001003',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      supplierId: 'sup-2',
      supplier: '多功能供应商02',
      settlementCycle: '月结',
      periodKey: '2026-09',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      settleDate: '2026-10-01',
      purchaseOrderNos: ['CG20260803001'],
      purchaseOrderNo: 'CG20260803001',
      remark: '演示：与 PS20261001001 同日由月结规则生成，一供应商一张账期结算单',
      creator: '规则自动',
      createdAt: '2026-10-01 02:00:25',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-5-l1',
          inboundOrderId: 'ib-demo-ps-5a',
          inboundDocNo: 'RK20260912001',
          inboundLineId: 'ibl-ps-5a',
          purchaseOrderId: 'po-demo-ps-6',
          purchaseOrderNo: 'CG20260803001',
          itemCode: '010050006',
          itemName: '地脚螺栓组',
          settleUnit: '套',
          settleQty: 30,
          unitPrice: 45,
        }),
        createPurchaseSettleLine({
          id: 'ps-demo-5-l2',
          inboundDocNo: 'RK20260912001',
          inboundLineId: 'ibl-ps-5b',
          purchaseOrderNo: 'CG20260803001',
          itemCode: 'MAT-CAST-01',
          itemName: '泵体铸件（按重结算）',
          settleUnit: 'kg',
          settleQty: 1260.5,
          unitPrice: 8.6,
        }),
      ],
    }),
  ]
}
