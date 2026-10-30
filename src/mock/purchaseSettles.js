import dayjs from 'dayjs'
import { roundNumber } from '@/utils/numberFormat'

export const PURCHASE_SETTLE_STATUS = {
  DRAFT: '草稿',
  RECONCILING: '对账中',
  CONFIRMED: '已确认',
}

export const PURCHASE_SETTLE_GENERATE_MODE = {
  PO: 'po',
  PERIOD: 'period',
}

/** 行争议状态：open 待处理；resolved 已闭环 */
export const PURCHASE_SETTLE_LINE_DISPUTE_STATUS = {
  NONE: '',
  OPEN: 'open',
  RESOLVED: 'resolved',
}

/**
 * 处理结论（对方主张模型）：
 * - ours / cancelled：按本行账面
 * - theirs：按对方主张
 * - split：按谈妥金额
 */
export const PURCHASE_SETTLE_LINE_DISPUTE_RESULT = {
  OURS: 'ours',
  THEIRS: 'theirs',
  SPLIT: 'split',
  CANCELLED: 'cancelled',
}

/** 挂起性质：差额只记主张差；整笔整行先不计入确认应付 */
export const PURCHASE_SETTLE_LINE_DISPUTE_SCOPE = {
  DIFF: 'diff',
  FULL: 'full',
}

export const PURCHASE_SETTLE_LINE_DISPUTE_SCOPE_LABEL = {
  diff: '差额',
  full: '整笔',
}

export function createPurchaseSettleLine(partial = {}) {
  const settleQty = Number(partial.settleQty) || 0
  const unitPrice = Number(partial.unitPrice) || 0
  const amount =
    partial.amount != null ? Number(partial.amount) : roundNumber(settleQty * unitPrice, 4)
  return {
    id: partial.id || `ps-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    /** inbound | purchase | return */
    sourceType: '',
    inboundOrderId: '',
    inboundDocNo: '',
    inboundLineId: '',
    poLineId: '',
    purchaseOrderId: '',
    purchaseOrderNo: '',
    returnOrderId: '',
    returnOrderNo: '',
    returnLineId: '',
    outboundOrderId: '',
    outboundDocNo: '',
    itemCode: '',
    itemName: '',
    specModel: '',
    material: '',
    settleUnit: '',
    /** diff=差额 / full=整笔 */
    disputeScope: '',
    /** 对方主张金额（差额必填；整笔可选） */
    disputeClaimAmount: null,
    /** 差异类型：磅差/价差/量差… */
    disputeDiffType: '',
    /** 折中谈妥金额 */
    disputeAgreedAmount: null,
    /**
     * 兼容旧字段：现表示「账面 − 行确认额」的净扣减（可被 sync 覆盖）
     * 新逻辑请用 disputeClaimAmount / 工具函数
     */
    disputeAmount: 0,
    disputeRemark: '',
    disputeStatus: '',
    disputeResult: '',
    disputeResolutionRemark: '',
    disputeResolvedAt: '',
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
  const bookAmount = rest.bookAmount != null ? Number(rest.bookAmount) : totalAmount
  // 挂起·差额仍按账面；挂起·整笔=0；核销后按结论
  let inferredConfirm = bookAmount
  if (rest.confirmedAmount == null) {
    inferredConfirm = roundNumber(
      lineItems.reduce((s, l) => {
        const book = Number(l.amount) || 0
        if (!l.disputeStatus) return s + book
        if (l.disputeStatus === 'open') {
          return s + (l.disputeScope === 'full' ? 0 : book)
        }
        if (l.disputeStatus === 'resolved') {
          if (l.disputeResult === 'ours' || l.disputeResult === 'cancelled') return s + book
          if (l.disputeResult === 'split' && l.disputeAgreedAmount != null) {
            return s + (Number(l.disputeAgreedAmount) || 0)
          }
          if (l.disputeResult === 'theirs' && l.disputeClaimAmount != null) {
            return s + (Number(l.disputeClaimAmount) || 0)
          }
          return s + book
        }
        return s + book
      }, 0),
      4,
    )
  }
  const confirmedAmount =
    rest.confirmedAmount != null ? Number(rest.confirmedAmount) : inferredConfirm
  const disputeAmount =
    rest.disputeAmount != null
      ? Number(rest.disputeAmount)
      : roundNumber(bookAmount - confirmedAmount, 4)
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
    settleTarget: '',
    paymentTermStart: '',
    paymentTermDays: null,
    plannedPaymentDate: '',
    /** 资金概览：期初应付余额（元）；空则详情按同供应商历史确认未付估算 */
    openingBalance: null,
    /** 已冲抵的期初金额（账龄付款可先冲期初） */
    openingPaidAmount: 0,
    /** 本单本期确认额已登记实付合计 */
    paidAmount: 0,
    paymentStatus: '', // '' | 部分付款 | 已付款
    paymentRecords: [],
    lastPaidAt: '',
    lastPaidBy: '',
    lastPaidRemark: '',
    /** '' | 部分收票 | 已开票；多笔见 invoiceRecords */
    invoiceStatus: '',
    invoiceRecords: [],
    invoiceNo: '',
    invoiceDate: '',
    invoiceAmount: null,
    invoiceTaxAmount: null,
    invoiceRemark: '',
    invoicer: '',
    invoicedAt: '',
    disputeRemark: '',
    remark: '',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    ...rest,
    lineItems,
    totalAmount,
    bookAmount,
    disputeAmount,
    confirmedAmount,
  }
}

/**
 * 演示结算单（对照结算规则讲解）：
 * 1–5) 9 月账期等既有场景
 * 6–8) 10 月账期（草稿 / 已确认部分付款 / 对账中）
 * 9–11) 11 月账期（草稿 / 对账中 / 已确认；#11 含冲抵往期#7 的付款批次）
 */
export function seedPurchaseSettles() {
  return [
    // 1. 月结 + 账期生成 + 草稿（规则「扫上月·适用月结」典型结果）
    createPurchaseSettle({
      id: 'ps-demo-month-draft',
      settleNo: 'PS20261001001',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-1',
      supplier: '多功能供应商01',
      settlementCycle: '月结',
      periodKey: '2026-09',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      settleDate: '2026-10-01',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      plannedPaymentDate: '',
      openingBalance: 8600,
      purchaseOrderNos: ['CG20260804001', 'CG20260715001'],
      purchaseOrderNo: 'CG20260804001',
      remark: '演示：月初规则扫上月入库·月结供应商·草稿待确认；叶轮行有待处理争议',
      creator: '规则自动',
      createdAt: '2026-10-01 02:00:12',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-1-l1',
          sourceType: 'inbound',
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
          sourceType: 'inbound',
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
          // 差额：账面 12800，主张 12600；挂起时确认额仍含 12800
          disputeScope: 'diff',
          disputeClaimAmount: 12600,
          disputeRemark: '供应商主张单价按框架协议，本行应按 12600 结算',
          disputeStatus: 'open',
        }),
      ],
    }),

    // 2. 月结 + 账期 + 已确认（对完账、可进入开票/账期付款）
    createPurchaseSettle({
      id: 'ps-demo-month-confirmed',
      settleNo: 'PS20261001002',
      status: PURCHASE_SETTLE_STATUS.CONFIRMED,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-3',
      supplier: '采购供应商A',
      settlementCycle: '月结',
      periodKey: '2026-09',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      settleDate: '2026-10-01',
      paymentTermStart: '开票日',
      paymentTermDays: 60,
      plannedPaymentDate: '',
      openingBalance: 12000,
      paidAmount: 0,
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
          sourceType: 'inbound',
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
          sourceType: 'inbound',
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
        // 演示：已入库退货出库冲减对账（来源=退货，来源单号=退货单号）
        createPurchaseSettleLine({
          id: 'ps-demo-2-l3',
          sourceType: 'return',
          returnOrderId: 'prtn-settle-done',
          returnOrderNo: 'CGTH-260918001',
          returnLineId: 'prtn-settle-done-l1',
          outboundOrderId: 'ob-prtn-settle-done',
          outboundDocNo: 'CKTH-260918001',
          purchaseOrderId: 'po-4',
          purchaseOrderNo: 'CG20260802001',
          itemCode: 'MAT-PLATE-10',
          itemName: '钢板',
          settleUnit: '张',
          settleQty: -5,
          unitPrice: 280,
        }),
      ],
    }),

    // 3. 周结 + 账期 + 草稿（每周一规则扫上周，不会进「适用月结」那条）
    createPurchaseSettle({
      id: 'ps-demo-week-draft',
      settleNo: 'PS20260929001',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
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
      settleTarget: 'purchase_order',
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
          sourceType: 'purchase',
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
      settleTarget: 'inbound',
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
          inboundOrderId: 'ib-demo-ps-5a',
          inboundDocNo: 'RK20260912001',
          inboundLineId: 'ibl-ps-5b',
          purchaseOrderId: 'po-demo-ps-6',
          purchaseOrderNo: 'CG20260803001',
          itemCode: 'MAT-CAST-01',
          itemName: '泵体铸件（按重结算）',
          settleUnit: 'kg',
          settleQty: 1260.5,
          unitPrice: 8.6,
        }),
      ],
    }),

    // 6. 10 月账期 · 草稿
    createPurchaseSettle({
      id: 'ps-demo-month-oct-draft',
      settleNo: 'PS20261101001',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-1',
      supplier: '多功能供应商01',
      settlementCycle: '月结',
      periodKey: '2026-10',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      settleDate: '2026-11-01',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      plannedPaymentDate: '',
      openingBalance: 19580,
      purchaseOrderNos: ['CG20260910001'],
      purchaseOrderNo: 'CG20260910001',
      remark: '演示：10 月账期月初生成草稿',
      creator: '规则自动',
      createdAt: '2026-11-01 02:00:10',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-10-l1',
          sourceType: 'inbound',
          inboundOrderId: 'ib-demo-ps-10a',
          inboundDocNo: 'RK20261008001',
          inboundLineId: 'ibl-ps-10a',
          purchaseOrderId: 'po-demo-ps-10',
          purchaseOrderNo: 'CG20260910001',
          itemCode: '010040045',
          itemName: '泵轴套',
          settleUnit: '件',
          settleQty: 80,
          unitPrice: 56.5,
        }),
      ],
    }),

    // 7. 10 月账期 · 已确认
    createPurchaseSettle({
      id: 'ps-demo-month-oct-confirmed',
      settleNo: 'PS20261101002',
      status: PURCHASE_SETTLE_STATUS.CONFIRMED,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-3',
      supplier: '采购供应商A',
      settlementCycle: '月结',
      periodKey: '2026-10',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      settleDate: '2026-11-01',
      paymentTermStart: '对账日',
      paymentTermDays: 45,
      plannedPaymentDate: '2026-12-16',
      openingBalance: 2360,
      // 确认额 840：首笔自付 500 + 11 月单登记付款冲入 340 → 已付清
      paidAmount: 840,
      paymentStatus: '已付款',
      lastPaidAt: '2026-12-08 10:30:00',
      lastPaidBy: 'admin1',
      lastPaidRemark: '由 11 月对账单登记付款冲入尾款',
      paymentRecords: [
        {
          id: 'pay-demo-cross-oct',
          batchId: 'pay-batch-demo-cross-aging',
          amount: 340,
          targetType: 'period',
          targetSettleId: 'ps-demo-month-oct-confirmed',
          targetSettleNo: 'PS20261101002',
          entrySettleId: 'ps-demo-month-nov-confirmed',
          entrySettleNo: 'PS20261201003',
          paidAt: '2026-12-08 10:30:00',
          paidBy: 'admin1',
          remark: '11 月账期登记付款 1000，按先旧后新冲本单尾款',
        },
        {
          id: 'pay-demo-oct-1',
          batchId: 'pay-batch-demo-oct-1',
          amount: 500,
          targetType: 'period',
          targetSettleId: 'ps-demo-month-oct-confirmed',
          targetSettleNo: 'PS20261101002',
          entrySettleId: 'ps-demo-month-oct-confirmed',
          entrySettleNo: 'PS20261101002',
          paidAt: '2026-11-05 11:20:00',
          paidBy: 'admin1',
          remark: '首笔按票付款',
        },
      ],
      invoiceStatus: '部分收票',
      invoiceNo: 'FP-202611-050',
      invoiceDate: '2026-11-04',
      invoiceAmount: 500,
      invoicer: 'admin1',
      invoicedAt: '2026-11-04 16:00:00',
      invoiceRecords: [
        {
          id: 'inv-demo-oct-1',
          invoiceNo: 'FP-202611-050',
          invoiceDate: '2026-11-04',
          invoiceAmount: 500,
          invoiceTaxAmount: null,
          invoiceRemark: '首张半额发票',
          invoicer: 'admin1',
          invoicedAt: '2026-11-04 16:00:00',
        },
      ],
      purchaseOrderNos: ['CG20260915001'],
      purchaseOrderNo: 'CG20260915001',
      remark: '演示：本单确认额 840；曾自付 500，尾款 340 由 11 月单登记付款冲入',
      creator: '规则自动',
      createdAt: '2026-11-01 02:00:18',
      confirmer: 'admin1',
      confirmedAt: '2026-11-02 09:30:00',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-10-l2',
          sourceType: 'inbound',
          inboundOrderId: 'ib-demo-ps-10b',
          inboundDocNo: 'RK20261018001',
          inboundLineId: 'ibl-ps-10b',
          purchaseOrderId: 'po-demo-ps-10b',
          purchaseOrderNo: 'CG20260915001',
          itemCode: '010040010',
          itemName: '密封垫片',
          settleUnit: '件',
          settleQty: 300,
          unitPrice: 2.8,
        }),
      ],
    }),

    // 8. 10 月账期 · 对账中
    createPurchaseSettle({
      id: 'ps-demo-month-oct-reconciling',
      settleNo: 'PS20261101003',
      status: PURCHASE_SETTLE_STATUS.RECONCILING,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-2',
      supplier: '多功能供应商02',
      settlementCycle: '月结',
      periodKey: '2026-10',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      settleDate: '2026-11-01',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      openingBalance: 4200,
      purchaseOrderNos: ['CG20260920001'],
      purchaseOrderNo: 'CG20260920001',
      remark: '演示：10 月账期对账中',
      creator: '规则自动',
      createdAt: '2026-11-01 02:00:25',
      reconcilingAt: '2026-11-03 14:00:00',
      reconciler: 'admin1',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-10-l3',
          sourceType: 'inbound',
          inboundOrderId: 'ib-demo-ps-10c',
          inboundDocNo: 'RK20261025001',
          inboundLineId: 'ibl-ps-10c',
          purchaseOrderId: 'po-demo-ps-10c',
          purchaseOrderNo: 'CG20260920001',
          itemCode: '010050004',
          itemName: '机械密封组件',
          settleUnit: '套',
          settleQty: 8,
          unitPrice: 680,
        }),
      ],
    }),

    // 9. 11 月账期 · 草稿
    createPurchaseSettle({
      id: 'ps-demo-month-nov-draft',
      settleNo: 'PS20261201001',
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-1',
      supplier: '多功能供应商01',
      settlementCycle: '月结',
      periodKey: '2026-11',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
      settleDate: '2026-12-01',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      openingBalance: 24000,
      purchaseOrderNos: ['CG20261008001'],
      purchaseOrderNo: 'CG20261008001',
      remark: '演示：11 月账期草稿',
      creator: '规则自动',
      createdAt: '2026-12-01 02:00:10',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-11-l1',
          sourceType: 'inbound',
          inboundOrderId: 'ib-demo-ps-11a',
          inboundDocNo: 'RK20261105001',
          inboundLineId: 'ibl-ps-11a',
          purchaseOrderId: 'po-demo-ps-11',
          purchaseOrderNo: 'CG20261008001',
          itemCode: '010050003',
          itemName: '叶轮',
          settleUnit: '件',
          settleQty: 25,
          unitPrice: 320,
        }),
      ],
    }),

    // 10. 11 月账期 · 对账中
    createPurchaseSettle({
      id: 'ps-demo-month-nov-reconciling',
      settleNo: 'PS20261201002',
      status: PURCHASE_SETTLE_STATUS.RECONCILING,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-6',
      supplier: '标准件供应商',
      settlementCycle: '月结',
      periodKey: '2026-11',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
      settleDate: '2026-12-01',
      paymentTermStart: '对账日',
      paymentTermDays: 15,
      plannedPaymentDate: '2026-12-16',
      openingBalance: 860,
      purchaseOrderNos: ['CG20261012001'],
      purchaseOrderNo: 'CG20261012001',
      remark: '演示：11 月账期对账中',
      creator: '规则自动',
      createdAt: '2026-12-01 02:00:18',
      reconcilingAt: '2026-12-02 10:00:00',
      reconciler: 'admin1',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-11-l2',
          sourceType: 'inbound',
          inboundOrderId: 'ib-demo-ps-11b',
          inboundDocNo: 'RK20261112001',
          inboundLineId: 'ibl-ps-11b',
          purchaseOrderId: 'po-demo-ps-11b',
          purchaseOrderNo: 'CG20261012001',
          itemCode: 'STD-M8-20',
          itemName: '六角螺栓 M8×20',
          settleUnit: '件',
          settleQty: 5000,
          unitPrice: 0.35,
        }),
      ],
    }),

    // 11. 11 月账期 · 已确认已开票；登记付款 1000 冲往期 10 月单尾款 340 + 本单 660
    createPurchaseSettle({
      id: 'ps-demo-month-nov-confirmed',
      settleNo: 'PS20261201003',
      status: PURCHASE_SETTLE_STATUS.CONFIRMED,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      settleTarget: 'inbound',
      supplierId: 'sup-3',
      supplier: '采购供应商A',
      settlementCycle: '月结',
      periodKey: '2026-11',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
      settleDate: '2026-12-01',
      paymentTermStart: '开票日',
      paymentTermDays: 60,
      plannedPaymentDate: '2027-02-05',
      openingBalance: 0,
      paidAmount: 660,
      paymentStatus: '部分付款',
      lastPaidAt: '2026-12-08 10:30:00',
      lastPaidBy: 'admin1',
      lastPaidRemark: '先旧后新：冲 10 月尾款 340 + 本单 660',
      paymentRecords: [
        {
          id: 'pay-demo-cross-nov',
          batchId: 'pay-batch-demo-cross-aging',
          amount: 660,
          targetType: 'period',
          targetSettleId: 'ps-demo-month-nov-confirmed',
          targetSettleNo: 'PS20261201003',
          entrySettleId: 'ps-demo-month-nov-confirmed',
          entrySettleNo: 'PS20261201003',
          paidAt: '2026-12-08 10:30:00',
          paidBy: 'admin1',
          remark: '先旧后新：冲 10 月尾款 340 + 本单 660',
        },
      ],
      invoiceStatus: '已开票',
      invoiceNo: 'FP-202612-088',
      invoiceDate: '2026-12-06',
      invoiceAmount: 1440,
      invoicer: 'admin1',
      invoicedAt: '2026-12-06 15:40:00',
      invoiceRecords: [
        {
          id: 'inv-demo-nov-1',
          invoiceNo: 'FP-202612-088',
          invoiceDate: '2026-12-06',
          invoiceAmount: 1440,
          taxRate: 13,
          invoiceTaxAmount: 165.84,
          invoiceRemark: '',
          invoicer: 'admin1',
          invoicedAt: '2026-12-06 15:40:00',
        },
      ],
      purchaseOrderNos: ['CG20261018001'],
      purchaseOrderNo: 'CG20261018001',
      remark:
        '演示：在本单登记付款 ¥1000（先旧后新）→ 冲往期 PS20261101002 尾款 ¥340 + 本单 ¥660；付款信息可展开看关联',
      creator: '规则自动',
      createdAt: '2026-12-01 02:00:25',
      confirmer: 'admin1',
      confirmedAt: '2026-12-03 11:00:00',
      lineItems: [
        createPurchaseSettleLine({
          id: 'ps-demo-11-l3',
          sourceType: 'inbound',
          inboundOrderId: 'ib-demo-ps-11c',
          inboundDocNo: 'RK20261120001',
          inboundLineId: 'ibl-ps-11c',
          purchaseOrderId: 'po-demo-ps-11c',
          purchaseOrderNo: 'CG20261018001',
          itemCode: '010040012',
          itemName: 'O型圈',
          settleUnit: '件',
          settleQty: 1200,
          unitPrice: 1.2,
        }),
      ],
    }),
  ]
}
