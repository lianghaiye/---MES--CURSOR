/**
 * 结算单位演示：采购申请 + 采购订单
 * - 铸件：采购/库存=件，结算=kg（有标准单重 → 可预估）
 * - 三口径管：采购=根，库存=米，结算=kg（有率，按现状公式估）
 * - 无单重：仅有结算单位、无标准单重 → 预计结算为空
 */
import dayjs from 'dayjs'
import { createLineItem } from '@/mock/purchaseRequisitions'
import { createPoLineItem } from '@/mock/purchaseOrders'
import {
  CASTING_BLANK_SETTLE_CODE,
  CASTING_BLANK_SETTLE_NAME,
  CASTING_NORATE_SETTLE_CODE,
  CASTING_NORATE_SETTLE_NAME,
  PIPE_TRIPLE_UNIT_CODE,
  PIPE_TRIPLE_UNIT_NAME,
} from '@/mock/stockBatchSeed'

export const SETTLE_DEMO_PR_IDS = {
  pending: 'pr-settle-demo-pending',
  linked: 'pr-settle-demo-linked',
}

export const SETTLE_DEMO_PO_IDS = {
  draft: 'po-settle-demo-draft',
  inProgress: 'po-settle-demo-in-progress',
}

export const SETTLE_DEMO_REQ_NOS = {
  pending: 'CGSQ-SETTLE-DEMO-001',
  linked: 'CGSQ-SETTLE-DEMO-002',
}

export const SETTLE_DEMO_PO_NOS = {
  draft: 'CG-SETTLE-DEMO-001',
  inProgress: 'CG-SETTLE-DEMO-002',
}

const ALL_DEMO_IDS = [...Object.values(SETTLE_DEMO_PR_IDS), ...Object.values(SETTLE_DEMO_PO_IDS)]

function stripDemoByIds(list) {
  return (list || []).filter((row) => !ALL_DEMO_IDS.includes(row?.id))
}

function withTax(ex, qty, taxRate = 13) {
  const unitEx = Number(ex) || 0
  const q = Number(qty) || 0
  const inTax = Math.round(unitEx * (1 + taxRate / 100) * 100) / 100
  return {
    unitPriceExTax: unitEx,
    taxRate,
    unitPriceInTax: inTax,
    totalPriceExTax: Math.round(q * unitEx * 100) / 100,
    totalPriceInTax: Math.round(q * inTax * 100) / 100,
  }
}

/** 行：铸件 件→kg，有标准单重 12.5 */
function castingPrLine(partial = {}) {
  const planPurchaseQty = partial.planPurchaseQty ?? 10
  const settleQty = partial.settleQty ?? planPurchaseQty * 12.5
  const price = withTax(8.2, settleQty)
  return createLineItem({
    id: 'pr-settle-line-cast',
    inventoryName: CASTING_BLANK_SETTLE_NAME,
    inventoryCode: CASTING_BLANK_SETTLE_CODE,
    productName: CASTING_BLANK_SETTLE_NAME,
    productCode: CASTING_BLANK_SETTLE_CODE,
    specModel: '泵体',
    material: 'HT250',
    materialType: '原材料',
    supplyType: '外购件',
    unit: '件',
    purchaseUnit: '件',
    inventoryUnit: '件',
    stockQty: 8,
    demandQty: planPurchaseQty,
    planPurchaseQty,
    settleUnit: 'kg',
    standardUnitWeight: 12.5,
    settleQty,
    packageContent: 1,
    convertHint: '',
    supplierName: '铸造厂示范供应商',
    receivingWarehouse: '原材料仓',
    remark: '结算演示：件采购 / kg 结算；预计=件数×12.5',
    ...price,
    ...partial,
  })
}

/** 行：三口径 根/米/kg */
function pipeTriplePrLine(partial = {}) {
  const planPurchaseQty = partial.planPurchaseQty ?? 20
  const settleQty = partial.settleQty ?? planPurchaseQty * 18.5
  const price = withTax(6.8, settleQty)
  return createLineItem({
    id: 'pr-settle-line-pipe',
    inventoryName: PIPE_TRIPLE_UNIT_NAME,
    inventoryCode: PIPE_TRIPLE_UNIT_CODE,
    productName: PIPE_TRIPLE_UNIT_NAME,
    productCode: PIPE_TRIPLE_UNIT_CODE,
    specModel: 'φ50×3',
    material: 'Q235',
    materialType: '原材料',
    supplyType: '外购件',
    unit: '根',
    purchaseUnit: '根',
    inventoryUnit: '米',
    stockQty: 36,
    demandQty: 120,
    planPurchaseQty,
    settleUnit: 'kg',
    standardUnitWeight: 18.5,
    settleQty,
    packageContent: 6,
    convertHint: '1 根=6 米',
    supplierName: '管材示范供应商',
    receivingWarehouse: '原材料仓',
    remark: '三口径：采购根 / 库存米 / 结算kg；现状预估=根数×18.5',
    ...price,
    ...partial,
  })
}

/** 行：有结算单位、无标准单重 → 预估回退最近批次单量（演示批 11.2 kg/件） */
function noRatePrLine(partial = {}) {
  const planPurchaseQty = partial.planPurchaseQty ?? 5
  return createLineItem({
    id: 'pr-settle-line-norate',
    inventoryName: CASTING_NORATE_SETTLE_NAME,
    inventoryCode: CASTING_NORATE_SETTLE_CODE,
    productName: CASTING_NORATE_SETTLE_NAME,
    productCode: CASTING_NORATE_SETTLE_CODE,
    specModel: '异形',
    material: 'HT200',
    materialType: '原材料',
    supplyType: '外购件',
    unit: '件',
    purchaseUnit: '件',
    inventoryUnit: '件',
    stockQty: 5,
    demandQty: planPurchaseQty,
    planPurchaseQty,
    settleUnit: 'kg',
    standardUnitWeight: undefined,
    settleQty: undefined,
    supplierName: '铸造厂示范供应商',
    receivingWarehouse: '原材料仓',
    remark: '无主数据默认率：打开/生成时按最近批次单量 11.2 kg/件预估',
    unitPriceExTax: 9.5,
    taxRate: 13,
    unitPriceInTax: Math.round(9.5 * 1.13 * 100) / 100,
    totalPriceExTax: 0,
    totalPriceInTax: 0,
    ...partial,
  })
}

function castingPoLine(partial = {}) {
  const purchaseQty = partial.purchaseQty ?? 10
  return createPoLineItem({
    id: 'po-settle-line-cast',
    itemCode: CASTING_BLANK_SETTLE_CODE,
    itemName: CASTING_BLANK_SETTLE_NAME,
    productCode: CASTING_BLANK_SETTLE_CODE,
    productName: CASTING_BLANK_SETTLE_NAME,
    specModel: '泵体',
    material: 'HT250',
    purchaseQty,
    unit: '件',
    purchaseUnit: '件',
    inventoryUnit: '件',
    settleUnit: 'kg',
    standardUnitWeight: 12.5,
    settleQty: purchaseQty * 12.5,
    unitPriceExTax: 8.2,
    receivingWarehouse: '原材料仓',
    remark: '预计结算 125 kg（10×12.5）；单价按 kg',
    ...partial,
  })
}

function pipeTriplePoLine(partial = {}) {
  const purchaseQty = partial.purchaseQty ?? 20
  return createPoLineItem({
    id: 'po-settle-line-pipe',
    itemCode: PIPE_TRIPLE_UNIT_CODE,
    itemName: PIPE_TRIPLE_UNIT_NAME,
    productCode: PIPE_TRIPLE_UNIT_CODE,
    productName: PIPE_TRIPLE_UNIT_NAME,
    specModel: 'φ50×3',
    material: 'Q235',
    purchaseQty,
    unit: '根',
    purchaseUnit: '根',
    inventoryUnit: '米',
    settleUnit: 'kg',
    standardUnitWeight: 18.5,
    settleQty: purchaseQty * 18.5,
    packageContent: 6,
    purchaseConvertRate: 6,
    convertHint: '1 根=6 米',
    unitPriceExTax: 6.8,
    receivingWarehouse: '原材料仓',
    remark: '预计结算 370 kg（20×18.5）；单价按 kg',
    ...partial,
  })
}

function noRatePoLine(partial = {}) {
  return createPoLineItem({
    id: 'po-settle-line-norate',
    itemCode: CASTING_NORATE_SETTLE_CODE,
    itemName: CASTING_NORATE_SETTLE_NAME,
    productCode: CASTING_NORATE_SETTLE_CODE,
    productName: CASTING_NORATE_SETTLE_NAME,
    specModel: '异形',
    material: 'HT200',
    purchaseQty: 5,
    unit: '件',
    purchaseUnit: '件',
    inventoryUnit: '件',
    settleUnit: 'kg',
    standardUnitWeight: undefined,
    settleQty: undefined,
    unitPriceExTax: 9.5,
    receivingWarehouse: '原材料仓',
    remark: '无主数据默认率：预估取最近批次单量 11.2 → 5×11.2=56 kg',
    ...partial,
  })
}

export function createSettleUnitDemoPurchaseRequisitions() {
  const today = dayjs().format('YYYY-MM-DD')
  return [
    {
      id: SETTLE_DEMO_PR_IDS.pending,
      reqNo: SETTLE_DEMO_REQ_NOS.pending,
      docStatus: '待处理',
      overdueStatus: '未逾期',
      urgency: '正常',
      salesOrderNo: '',
      purchaseOrderNo: '',
      orderDate: today,
      deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      estimatedArrivalDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      source: '新增',
      receivingWarehouse: '原材料仓',
      operator: 'admin1',
      creator: 'admin1',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      remark:
        '【结算单位演示】未转采购：铸件(有预估) / 三口径管(有预估) / 无单重(不预估)。打开明细看结算单位与预计结算数量。',
      lineItems: [
        castingPrLine({
          id: 'pr-settle-pending-cast',
          poGenStatus: '未生成采购',
          deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
        }),
        pipeTriplePrLine({
          id: 'pr-settle-pending-pipe',
          poGenStatus: '未生成采购',
          deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
        }),
        noRatePrLine({
          id: 'pr-settle-pending-norate',
          poGenStatus: '未生成采购',
          deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
        }),
      ],
    },
    {
      id: SETTLE_DEMO_PR_IDS.linked,
      reqNo: SETTLE_DEMO_REQ_NOS.linked,
      docStatus: '处理中',
      overdueStatus: '未逾期',
      urgency: '正常',
      salesOrderNo: '',
      purchaseOrderNo: SETTLE_DEMO_PO_NOS.inProgress,
      orderDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      estimatedArrivalDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      source: '新增',
      receivingWarehouse: '原材料仓',
      operator: 'admin1',
      creator: 'admin1',
      createdAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      remark: '【结算单位演示】已生成采购订单 CG-SETTLE-DEMO-002（进行中）',
      lineItems: [
        castingPrLine({
          id: 'pr-settle-linked-cast',
          planPurchaseQty: 8,
          settleQty: 100,
          poGenStatus: '已生成采购',
          purchaseOrderNos: SETTLE_DEMO_PO_NOS.inProgress,
          deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
          ...withTax(8.2, 100),
        }),
        pipeTriplePrLine({
          id: 'pr-settle-linked-pipe',
          planPurchaseQty: 12,
          settleQty: 222,
          poGenStatus: '已生成采购',
          purchaseOrderNos: SETTLE_DEMO_PO_NOS.inProgress,
          deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
          ...withTax(6.8, 222),
        }),
      ],
    },
  ].map((req) => {
    const lineItems = req.lineItems || []
    return {
      ...req,
      plannedQty: lineItems.reduce((s, i) => s + (Number(i.planPurchaseQty) || 0), 0),
      amountWan: lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0) / 10000,
    }
  })
}

export function createSettleUnitDemoPurchaseOrders() {
  const today = dayjs().format('YYYY-MM-DD')
  const draftLines = [
    castingPoLine({
      id: 'po-settle-draft-cast',
      sourceReqNos: [SETTLE_DEMO_REQ_NOS.pending],
      deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    }),
    pipeTriplePoLine({
      id: 'po-settle-draft-pipe',
      sourceReqNos: [SETTLE_DEMO_REQ_NOS.pending],
      deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    }),
    noRatePoLine({
      id: 'po-settle-draft-norate',
      sourceReqNos: [SETTLE_DEMO_REQ_NOS.pending],
      deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    }),
  ]
  const progressLines = [
    castingPoLine({
      id: 'po-settle-prog-cast',
      purchaseQty: 8,
      settleQty: 100,
      sourceReqNos: [SETTLE_DEMO_REQ_NOS.linked],
      deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      receivedQty: 0,
      remark: '手改预计结算 100 kg（略低于 8×12.5）；单价按 kg',
    }),
    pipeTriplePoLine({
      id: 'po-settle-prog-pipe',
      purchaseQty: 12,
      settleQty: 222,
      sourceReqNos: [SETTLE_DEMO_REQ_NOS.linked],
      deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      receivedQty: 0,
      remark: '预计结算 222 kg（12×18.5）；单价按 kg',
    }),
  ]

  function wrapOrder(partial, lines) {
    return {
      status: '待提交',
      orderSource: '采购申请',
      applyType: '日常采购',
      inboundStatus: '待入库',
      overdueStatus: '未逾期',
      settlementType: '货到付款',
      settlementCycle: '月结',
      settlementMethod: '银行转账',
      deliveryMethod: '定时交货',
      leadTimeDays: 12,
      purchaser: 'admin1',
      creator: 'admin1',
      updater: 'admin1',
      receivingWarehouse: '原材料仓',
      documentDate: today,
      deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      lineItems: lines,
      totalQty: lines.reduce((s, i) => s + (Number(i.purchaseQty) || 0), 0),
      amountExTax: lines.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0),
      amountInTax: lines.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0),
      ...partial,
    }
  }

  return [
    wrapOrder(
      {
        id: SETTLE_DEMO_PO_IDS.draft,
        orderNo: SETTLE_DEMO_PO_NOS.draft,
        reqNo: SETTLE_DEMO_REQ_NOS.pending,
        supplier: '铸造厂示范供应商',
        status: '待提交',
        remark:
          '【结算单位演示】待提交：有默认率行用主数据估；无默认率行用最近批次单量 11.2 kg/件估。',
      },
      draftLines,
    ),
    wrapOrder(
      {
        id: SETTLE_DEMO_PO_IDS.inProgress,
        orderNo: SETTLE_DEMO_PO_NOS.inProgress,
        reqNo: SETTLE_DEMO_REQ_NOS.linked,
        supplier: '铸造厂示范供应商',
        status: '进行中',
        inboundStatus: '待入库',
        documentDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
        deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
        approvedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
        approverName: '采购主管',
        remark: '【结算单位演示】进行中：可从此单生成收货/入库，体验结算数量实填。',
      },
      progressLines,
    ),
  ]
}

export function ensureSettleUnitDemoPurchaseRequisitions(list) {
  const rest = stripDemoByIds(list)
  return [...createSettleUnitDemoPurchaseRequisitions(), ...rest]
}

export function ensureSettleUnitDemoPurchaseOrders(list) {
  const rest = stripDemoByIds(list)
  return [...createSettleUnitDemoPurchaseOrders(), ...rest]
}
