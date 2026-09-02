/**
 * 一类一码 / 一批一码：按入库填写方式挂件码
 *
 * 规则（与 docs/入库批次生成规则.md 一致）：
 * - 采购单位 ≠ 库存单位 + 统一单件 / 逐件 → 1 父批 + N 个四位 SN
 * - 采购单位 ≠ 库存单位 + 直接填合计 → 仅父批、无 SN（本文件不改这些对照批）
 * - 采购单位 = 库存单位 → 无件码（螺栓等现有种子）
 *
 * 建议验证：库存明细搜 角钢 / 不锈钢管 / 无缝钢管 Q235 / 铝板 5052，查看批次后展开。
 */

import { roundMeters } from '@/utils/variableLengthMaterial'
import {
  STEEL_PIPE_CODE,
  STEEL_PIPE_NAME,
  STEEL_WEIGHT_BAR_CODE,
  STEEL_WEIGHT_BAR_NAME,
  PIPE_TRIPLE_UNIT_CODE,
  PIPE_TRIPLE_UNIT_NAME,
  PIPE_TRIPLE_CAT_CODE,
  PIPE_TRIPLE_CAT_NAME,
} from '@/mock/stockBatchSeed'

export const CBP_ANGLE_CODE = 'WL-ANGLE-40x4'
export const CBP_ANGLE_NAME = '角钢 Q235 40×40×4'
export const CBP_SS_PIPE_CODE = 'WL-PIPE-304-25'
export const CBP_SS_PIPE_NAME = '不锈钢管 304 φ25×2'
export const CBP_AL_CODE = 'WL-AL-6063-4040'
export const CBP_AL_NAME = '铝型材 6063 4040'
export const CBP_PLATE_SS_CODE = 'WL-PLATE-304-3'
export const CBP_PLATE_SS_NAME = '不锈钢板 304 3mm'
export const CBP_PLATE_AL_CODE = 'WL-PLATE-AL-5052-2'
export const CBP_PLATE_AL_NAME = '铝板 5052 2mm'
export const CBP_CU_CODE = 'WL-CU-T2-30'
export const CBP_CU_NAME = '紫铜棒 T2 φ30'

export const CBP_IDS = {
  pipeUniform: 'bat-cbp-pipe-uniform',
  pipePiece: 'bat-cbp-pipe-piece',
  pipeRemnant: 'bat-cbp-pipe-remnant',
  anglePiece: 'bat-cbp-angle-piece',
  tripleUniform: 'bat-cbp-triple-uniform',
  triplePiece: 'bat-cbp-triple-piece',
  tripleTotal: 'bat-cbp-triple-total',
  catTriplePiece: 'bat-cbp-cat-triple-piece',
  catTripleUniform: 'bat-cbp-cat-triple-uniform',
}

function upsertById(list, demos, idKey = 'id') {
  const out = Array.isArray(list) ? [...list] : []
  demos.forEach((demo) => {
    const idx = out.findIndex((row) => row?.[idKey] === demo[idKey])
    if (idx === -1) out.unshift(demo)
    else out[idx] = { ...out[idx], ...demo, [idKey]: demo[idKey] }
  })
  return out
}

function seedBatch(partial) {
  const currentLength = Number(partial.currentLength) || 0
  return {
    parentBatchId: '',
    status: '在库',
    sourceType: '采购入库',
    inboundQty: partial.inboundQty ?? currentLength,
    inboundPurchaseQty: partial.inboundPurchaseQty ?? null,
    purchaseUnit: partial.purchaseUnit || '',
    salesOrderId: '',
    salesOrderNo: '',
    salesLineId: '',
    workOrderNo: '',
    uomConvert: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...partial,
  }
}

function seedPiece(partial) {
  return {
    remnant: false,
    remnantFromSerialNo: '',
    salesOrderId: '',
    salesOrderNo: '',
    salesLineId: '',
    workOrderNo: '',
    issuedAt: '',
    issueDocNo: '',
    sourceType: '采购入库',
    status: '在库',
    ...partial,
  }
}

function pieceManagedAttrs({ barcodeType, inboundEntryMode, pieceCount, extra = {} }) {
  return {
    barcodeType,
    inboundEntryMode,
    manageByPiece: true,
    pieceCount,
    ...extra,
  }
}

function settleSnap({
  pieceCount,
  settleQty,
  stockQty,
  stockUnit = '米',
  purchaseUnit = '根',
  standardUnitWeight = 18.5,
}) {
  const n = Number(pieceCount) || 0
  return {
    convertType: 'batch',
    pieceCount: n,
    purchaseUnit,
    settleQty,
    settleUnit: 'kg',
    actualUnitWeight: n > 0 ? Math.round((settleQty / n) * 10000) / 10000 : 0,
    standardUnitWeight,
    stockQty,
    stockUnit,
  }
}

function makeParent({
  id,
  batchNo,
  warehouse,
  itemCode,
  itemName,
  unit,
  purchaseUnit,
  sourceDocNo,
  createdAt,
  barcodeType,
  inboundEntryMode,
  pieceValues,
  extraAttrs,
  remark,
  inboundQty,
  uomConvert,
}) {
  const stockTotal = roundMeters(pieceValues.reduce((s, v) => s + Number(v), 0))
  return seedBatch({
    id,
    batchNo,
    warehouse,
    itemCode,
    itemName,
    currentLength: stockTotal,
    inboundQty: inboundQty ?? stockTotal,
    inboundPurchaseQty: pieceValues.length,
    purchaseUnit,
    unit,
    sourceDocNo,
    createdAt,
    updatedAt: createdAt,
    uomConvert: uomConvert || null,
    attrs: pieceManagedAttrs({
      barcodeType,
      inboundEntryMode,
      pieceCount: pieceValues.length,
      extra: extraAttrs,
    }),
    remark,
  })
}

function makePieces(batch, pieceValues, perIndex = []) {
  return pieceValues.map((qty, i) => {
    const extra = perIndex[i] || {}
    return seedPiece({
      id: extra.id || `pc-cbp-${batch.id}-${String(i + 1).padStart(4, '0')}`,
      serialNo: extra.serialNo || `${batch.batchNo}-${String(i + 1).padStart(4, '0')}`,
      batchId: batch.id,
      batchNo: batch.batchNo,
      warehouse: batch.warehouse,
      itemCode: batch.itemCode,
      itemName: batch.itemName,
      pieceQty: qty,
      unit: batch.unit,
      sourceDocNo: extra.sourceDocNo || batch.sourceDocNo,
      sourceType: extra.sourceType || batch.sourceType || '采购入库',
      index: i + 1,
      createdAt: extra.createdAt || batch.createdAt,
      updatedAt: extra.updatedAt || extra.issuedAt || batch.updatedAt,
      ...extra,
    })
  })
}

/** 覆盖/新增的父批（含把原「填合计」期初改成统一单件/逐件） */
export function createCategoryBatchPieceDemoBatches() {
  const t1 = '2026-09-01T09:00:00.000Z'
  const t2 = '2026-09-01T09:30:00.000Z'
  const t3 = '2026-09-01T10:00:00.000Z'
  const tSemi = '2026-07-12T10:00:00.000Z'

  return [
    // —— 一批一码 根→米：新批，避免动到已出库占用的 bat-seed-pipe-12 ——
    makeParent({
      id: CBP_IDS.pipeUniform,
      batchNo: 'B-260901-101',
      warehouse: '原料仓',
      itemCode: STEEL_PIPE_CODE,
      itemName: STEEL_PIPE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-PIPE-UNI',
      createdAt: t1,
      barcodeType: '一批一码',
      inboundEntryMode: 'uniform',
      pieceValues: [6, 6, 6],
      extraAttrs: { material: 'Q235', specModel: 'φ50×3' },
      remark: '一批一码 + 统一单件：3 根 × 6 米',
    }),
    makeParent({
      id: CBP_IDS.pipePiece,
      batchNo: 'B-260901-102',
      warehouse: '原料仓',
      itemCode: STEEL_PIPE_CODE,
      itemName: STEEL_PIPE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-PIPE-PC',
      createdAt: t2,
      barcodeType: '一批一码',
      inboundEntryMode: 'piece',
      pieceValues: [6.2, 5.8, 4.5],
      extraAttrs: { material: 'Q235', specModel: 'φ50×3' },
      remark: '一批一码 + 逐件：三根长度不同',
    }),
    makeParent({
      id: CBP_IDS.pipeRemnant,
      batchNo: 'B-260901-103',
      warehouse: '原料仓',
      itemCode: STEEL_PIPE_CODE,
      itemName: STEEL_PIPE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-PIPE-REM',
      createdAt: t3,
      barcodeType: '一批一码',
      inboundEntryMode: 'piece',
      pieceValues: [6, 2.4],
      inboundQty: 12,
      extraAttrs: { material: 'Q235', specModel: 'φ50×3' },
      remark: '一批一码逐件：一根整出、一根拆件余料仍挂本批',
    }),

    // —— 一类一码 根→米：把 6 米期初改为统一单件 2×3；另增逐件批 ——
    makeParent({
      id: 'bat-seed-angle-6',
      batchNo: 'B-260701-006',
      warehouse: '原料仓',
      itemCode: CBP_ANGLE_CODE,
      itemName: CBP_ANGLE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-ANGLE',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一类一码',
      inboundEntryMode: 'uniform',
      pieceValues: [3, 3],
      extraAttrs: { material: 'Q235', specModel: '40×40×4' },
      remark: '一类一码 + 统一单件：2 根 × 3 米',
    }),
    makeParent({
      id: CBP_IDS.anglePiece,
      batchNo: 'B-260901-201',
      warehouse: '原料仓',
      itemCode: CBP_ANGLE_CODE,
      itemName: CBP_ANGLE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-ANGLE-PC',
      createdAt: t1,
      barcodeType: '一类一码',
      inboundEntryMode: 'piece',
      pieceValues: [6.1, 5.4, 4.8],
      extraAttrs: { material: 'Q235', specModel: '40×40×4' },
      remark: '一类一码 + 逐件：三根长度不同',
    }),
    makeParent({
      id: 'bat-semi-angle-4',
      batchNo: 'B-260712-104',
      warehouse: '半成品仓',
      itemCode: CBP_ANGLE_CODE,
      itemName: CBP_ANGLE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-SEMI',
      createdAt: tSemi,
      barcodeType: '一类一码',
      inboundEntryMode: 'uniform',
      pieceValues: [2, 2],
      extraAttrs: { material: 'Q235', specModel: '40×40×4' },
      remark: '半成品仓一类一码统一单件',
    }),
    makeParent({
      id: 'bat-semi-angle-7',
      batchNo: 'B-260712-107',
      warehouse: '半成品仓',
      itemCode: CBP_ANGLE_CODE,
      itemName: CBP_ANGLE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-SEMI',
      createdAt: tSemi,
      barcodeType: '一类一码',
      inboundEntryMode: 'piece',
      pieceValues: [4, 3],
      extraAttrs: { material: 'Q235', specModel: '40×40×4' },
      remark: '半成品仓一类一码逐件',
    }),

    // —— 一批一码 不锈钢管：原料仓 6 米改为统一单件；库线边仓已有 2×6 保持 ——
    makeParent({
      id: 'bat-seed-ss-6',
      batchNo: 'B-260701-010',
      warehouse: '原料仓',
      itemCode: CBP_SS_PIPE_CODE,
      itemName: CBP_SS_PIPE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-SSPIPE',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一批一码',
      inboundEntryMode: 'uniform',
      pieceValues: [3, 3],
      extraAttrs: { material: '304', specModel: 'φ25×2' },
      remark: '一批一码 + 统一单件：2 根 × 3 米',
    }),
    makeParent({
      id: 'bat-ib-demo-ss-6a',
      batchNo: 'B-260713-002',
      warehouse: '库线边仓',
      itemCode: CBP_SS_PIPE_CODE,
      itemName: CBP_SS_PIPE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: '1-20260713-00004',
      createdAt: '2026-07-13T15:20:00.000Z',
      barcodeType: '一批一码',
      inboundEntryMode: 'uniform',
      pieceValues: [6, 6],
      extraAttrs: { material: '304', specModel: 'φ25×2' },
      remark: '库线边仓一批一码统一单件：2 根 × 6 米',
    }),
    makeParent({
      id: 'bat-semi-ss-6',
      batchNo: 'B-260712-206',
      warehouse: '半成品仓',
      itemCode: CBP_SS_PIPE_CODE,
      itemName: CBP_SS_PIPE_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-SEMI',
      createdAt: tSemi,
      barcodeType: '一批一码',
      inboundEntryMode: 'piece',
      pieceValues: [3.2, 2.8],
      extraAttrs: { material: '304', specModel: 'φ25×2' },
      remark: '半成品仓一批一码逐件',
    }),

    // —— 一批一码 铝型材 根→米 统一单件 ——
    makeParent({
      id: 'bat-seed-al-6',
      batchNo: 'B-260701-018',
      warehouse: '原料仓',
      itemCode: CBP_AL_CODE,
      itemName: CBP_AL_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-AL',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一批一码',
      inboundEntryMode: 'uniform',
      pieceValues: [3, 3],
      extraAttrs: { material: '6063', specModel: '4040' },
      remark: '一批一码铝型材统一单件',
    }),

    // —— 一批一码 板材 张→㎡ 统一单件 ——
    makeParent({
      id: 'bat-seed-plate-304-6',
      batchNo: 'B-260701-024',
      warehouse: '原料仓',
      itemCode: CBP_PLATE_SS_CODE,
      itemName: CBP_PLATE_SS_NAME,
      unit: '㎡',
      purchaseUnit: '张',
      sourceDocNo: 'INIT-PLATE-SS',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一批一码',
      inboundEntryMode: 'uniform',
      pieceValues: [2, 2, 2],
      extraAttrs: { material: '304', specModel: 'δ3' },
      remark: '一批一码板材统一单件：3 张 × 2㎡',
    }),

    // —— 一类一码 铝板 张→㎡ 逐件（面积不同） ——
    makeParent({
      id: 'bat-seed-plate-al-4',
      batchNo: 'B-260701-025',
      warehouse: '原料仓',
      itemCode: CBP_PLATE_AL_CODE,
      itemName: CBP_PLATE_AL_NAME,
      unit: '㎡',
      purchaseUnit: '张',
      sourceDocNo: 'INIT-PLATE-AL',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一类一码',
      inboundEntryMode: 'piece',
      pieceValues: [2.4, 1.6],
      extraAttrs: { material: '5052', specModel: 'δ2' },
      remark: '一类一码铝板逐件：两张面积不同',
    }),

    // —— 一类一码 铜棒 根→kg ——
    makeParent({
      id: 'bat-seed-cu-15kg',
      batchNo: 'B-260701-016',
      warehouse: '原料仓',
      itemCode: CBP_CU_CODE,
      itemName: CBP_CU_NAME,
      unit: 'kg',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-CU',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一类一码',
      inboundEntryMode: 'uniform',
      pieceValues: [7.8, 7.8],
      extraAttrs: { material: 'T2', specModel: 'φ30' },
      remark: '一类一码铜棒统一单件：2 根 × 7.8kg',
    }),
    makeParent({
      id: 'bat-seed-cu-11kg',
      batchNo: 'B-260701-017',
      warehouse: '原料仓',
      itemCode: CBP_CU_CODE,
      itemName: CBP_CU_NAME,
      unit: 'kg',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-CU',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一类一码',
      inboundEntryMode: 'piece',
      pieceValues: [6.5, 4.8],
      extraAttrs: { material: 'T2', specModel: 'φ30' },
      remark: '一类一码铜棒逐件：两根重量不同',
    }),

    // —— 一批一码 圆钢按重 根→kg：原先标了 pieceCount=2 却无件码 ——
    makeParent({
      id: 'bat-seed-weight-bar-18kg',
      batchNo: 'B-260701-012',
      warehouse: '原料仓',
      itemCode: STEEL_WEIGHT_BAR_CODE,
      itemName: STEEL_WEIGHT_BAR_NAME,
      unit: 'kg',
      purchaseUnit: '根',
      sourceDocNo: 'INIT-WEIGHT-BAR',
      createdAt: '2026-07-01T00:00:00.000Z',
      barcodeType: '一批一码',
      inboundEntryMode: 'uniform',
      pieceValues: [9.3, 9.3],
      extraAttrs: { material: '40Cr', specModel: 'φ40' },
      remark: '一批一码按重统一单件：2 根 × 9.3kg',
    }),

    // —— 三口径 一批一码：根 / 米 / kg ——
    makeParent({
      id: CBP_IDS.tripleUniform,
      batchNo: 'B-260901-301',
      warehouse: '原料仓',
      itemCode: PIPE_TRIPLE_UNIT_CODE,
      itemName: PIPE_TRIPLE_UNIT_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-TRI-UNI',
      createdAt: t1,
      barcodeType: '一批一码',
      inboundEntryMode: 'uniform',
      pieceValues: [6, 6, 6],
      extraAttrs: { material: 'Q235', specModel: 'φ50×3' },
      uomConvert: settleSnap({
        pieceCount: 3,
        settleQty: 333,
        stockQty: 18,
      }),
      remark: '三口径一批一码统一单件：3 根 × 6 米 / 过磅 333kg',
    }),
    makeParent({
      id: CBP_IDS.triplePiece,
      batchNo: 'B-260901-302',
      warehouse: '原料仓',
      itemCode: PIPE_TRIPLE_UNIT_CODE,
      itemName: PIPE_TRIPLE_UNIT_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-TRI-PC',
      createdAt: t2,
      barcodeType: '一批一码',
      inboundEntryMode: 'piece',
      pieceValues: [7.2, 5.8],
      extraAttrs: { material: 'Q235', specModel: 'φ50×3' },
      uomConvert: settleSnap({
        pieceCount: 2,
        settleQty: 240.5,
        stockQty: 13,
      }),
      remark: '三口径一批一码逐件：7.2+5.8 米 / 过磅 240.5kg',
    }),
    seedBatch({
      id: CBP_IDS.tripleTotal,
      batchNo: 'B-260901-303',
      warehouse: '原料仓',
      itemCode: PIPE_TRIPLE_UNIT_CODE,
      itemName: PIPE_TRIPLE_UNIT_NAME,
      currentLength: 12,
      inboundQty: 12,
      inboundPurchaseQty: 2,
      purchaseUnit: '根',
      unit: '米',
      sourceDocNo: 'RK-CBP-TRI-TOT',
      createdAt: t3,
      updatedAt: t3,
      uomConvert: settleSnap({
        pieceCount: 2,
        settleQty: 223,
        stockQty: 12,
      }),
      attrs: {
        material: 'Q235',
        specModel: 'φ50×3',
        barcodeType: '一批一码',
        inboundEntryMode: 'total',
      },
      remark: '对照：三口径一批一码填合计，无件码',
    }),

    // —— 三口径 一类一码：根 / 米 / kg ——
    makeParent({
      id: CBP_IDS.catTripleUniform,
      batchNo: 'B-260901-311',
      warehouse: '原料仓',
      itemCode: PIPE_TRIPLE_CAT_CODE,
      itemName: PIPE_TRIPLE_CAT_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-CAT-TRI-UNI',
      createdAt: t1,
      barcodeType: '一类一码',
      inboundEntryMode: 'uniform',
      pieceValues: [5, 5],
      extraAttrs: { material: 'Q235', specModel: 'φ50×3' },
      uomConvert: settleSnap({
        pieceCount: 2,
        settleQty: 185,
        stockQty: 10,
      }),
      remark: '三口径一类一码统一单件：2 根 × 5 米 / 过磅 185kg',
    }),
    makeParent({
      id: CBP_IDS.catTriplePiece,
      batchNo: 'B-260901-312',
      warehouse: '原料仓',
      itemCode: PIPE_TRIPLE_CAT_CODE,
      itemName: PIPE_TRIPLE_CAT_NAME,
      unit: '米',
      purchaseUnit: '根',
      sourceDocNo: 'RK-CBP-CAT-TRI-PC',
      createdAt: t2,
      barcodeType: '一类一码',
      inboundEntryMode: 'piece',
      pieceValues: [6.4, 5.1],
      extraAttrs: { material: 'Q235', specModel: 'φ50×3' },
      uomConvert: settleSnap({
        pieceCount: 2,
        settleQty: 213,
        stockQty: 11.5,
      }),
      remark: '三口径一类一码逐件：6.4+5.1 米 / 过磅 213kg',
    }),

    // —— 对照：直接填合计，无 SN（只改 attrs，不要走 seedBatch 以免 inboundQty 被写成 0） ——
    {
      id: 'bat-seed-pipe-6',
      attrs: {
        material: 'Q235',
        specModel: 'φ50×3',
        barcodeType: '一批一码',
        inboundEntryMode: 'total',
      },
      remark: '对照：一批一码直接填合计，无件码',
    },
    {
      id: 'bat-seed-angle-5p5',
      attrs: {
        material: 'Q235',
        specModel: '40×40×4',
        barcodeType: '一类一码',
        inboundEntryMode: 'total',
      },
      remark: '对照：一类一码直接填合计，无件码',
    },
    {
      id: 'bat-seed-ss-3',
      attrs: {
        material: '304',
        specModel: 'φ25×2',
        barcodeType: '一批一码',
        inboundEntryMode: 'total',
      },
      remark: '对照：一批一码直接填合计，无件码',
    },
    {
      id: 'bat-ib-demo-al-12',
      attrs: {
        material: '6063',
        specModel: '4040',
        inboundEntryMode: 'total',
        barcodeType: '一批一码',
      },
      remark: '对照：一批一码铝型材填合计，无件码',
    },
    {
      id: 'bat-seed-weight-bar-12kg',
      attrs: {
        material: '40Cr',
        specModel: 'φ40',
        barcodeType: '一批一码',
        inboundEntryMode: 'total',
      },
      remark: '对照：一批一码按重填合计，无件码',
    },
  ]
}

export function createCategoryBatchPieceDemoPieces() {
  const batches = createCategoryBatchPieceDemoBatches()
  const byId = Object.fromEntries(batches.map((b) => [b.id, b]))
  const pieces = []

  const pieceMap = {
    [CBP_IDS.pipeUniform]: [6, 6, 6],
    [CBP_IDS.pipePiece]: [6.2, 5.8, 4.5],
    'bat-seed-angle-6': [3, 3],
    [CBP_IDS.anglePiece]: [6.1, 5.4, 4.8],
    'bat-semi-angle-4': [2, 2],
    'bat-semi-angle-7': [4, 3],
    'bat-seed-ss-6': [3, 3],
    'bat-ib-demo-ss-6a': [6, 6],
    'bat-semi-ss-6': [3.2, 2.8],
    'bat-seed-al-6': [3, 3],
    'bat-seed-plate-304-6': [2, 2, 2],
    'bat-seed-plate-al-4': [2.4, 1.6],
    'bat-seed-cu-15kg': [7.8, 7.8],
    'bat-seed-cu-11kg': [6.5, 4.8],
    'bat-seed-weight-bar-18kg': [9.3, 9.3],
    [CBP_IDS.tripleUniform]: [6, 6, 6],
    [CBP_IDS.triplePiece]: [7.2, 5.8],
    [CBP_IDS.catTripleUniform]: [5, 5],
    [CBP_IDS.catTriplePiece]: [6.4, 5.1],
  }

  Object.entries(pieceMap).forEach(([id, values]) => {
    const batch = byId[id]
    if (batch) pieces.push(...makePieces(batch, values))
  })

  const remnantBatch = byId[CBP_IDS.pipeRemnant]
  if (remnantBatch) {
    pieces.push(
      ...makePieces(
        remnantBatch,
        [6, 6, 2.4],
        [
          {},
          {
            status: '已出库',
            issuedAt: '2026-09-02T08:30:00.000Z',
            issueDocNo: 'OUT-CBP-PIPE-001',
            updatedAt: '2026-09-02T08:30:00.000Z',
          },
          {
            remnant: true,
            remnantFromSerialNo: 'B-260901-103-0002',
            createdAt: '2026-09-02T08:30:00.000Z',
            updatedAt: '2026-09-02T08:30:00.000Z',
            sourceType: '余料拆件',
            sourceDocNo: 'OUT-CBP-PIPE-001',
          },
        ],
      ),
    )
  }

  // 兼容旧件码 id（库线边仓不锈钢管）
  return pieces.map((p) => {
    if (p.batchId === 'bat-ib-demo-ss-6a' && p.index === 1) {
      return { ...p, id: 'pc-seed-ss-pipe-0001' }
    }
    if (p.batchId === 'bat-ib-demo-ss-6a' && p.index === 2) {
      return { ...p, id: 'pc-seed-ss-pipe-0002' }
    }
    return p
  })
}

export function ensureCategoryBatchPieceBatches(batches = []) {
  return upsertById(batches, createCategoryBatchPieceDemoBatches())
}

export function ensureCategoryBatchPiecePieces(pieces = []) {
  return upsertById(pieces, createCategoryBatchPieceDemoPieces())
}

export const CBP_INV_STOCK_SYNC_ROWS = [
  { warehouse: '原料仓', itemCode: STEEL_PIPE_CODE, itemName: STEEL_PIPE_NAME, unit: '米' },
  { warehouse: '原料仓', itemCode: CBP_ANGLE_CODE, itemName: CBP_ANGLE_NAME, unit: '米' },
  { warehouse: '半成品仓', itemCode: CBP_ANGLE_CODE, itemName: CBP_ANGLE_NAME, unit: '米' },
  { warehouse: '原料仓', itemCode: CBP_SS_PIPE_CODE, itemName: CBP_SS_PIPE_NAME, unit: '米' },
  { warehouse: '库线边仓', itemCode: CBP_SS_PIPE_CODE, itemName: CBP_SS_PIPE_NAME, unit: '米' },
  { warehouse: '半成品仓', itemCode: CBP_SS_PIPE_CODE, itemName: CBP_SS_PIPE_NAME, unit: '米' },
  { warehouse: '原料仓', itemCode: CBP_AL_CODE, itemName: CBP_AL_NAME, unit: '米' },
  { warehouse: '原料仓', itemCode: CBP_PLATE_SS_CODE, itemName: CBP_PLATE_SS_NAME, unit: '㎡' },
  { warehouse: '原料仓', itemCode: CBP_PLATE_AL_CODE, itemName: CBP_PLATE_AL_NAME, unit: '㎡' },
  { warehouse: '原料仓', itemCode: CBP_CU_CODE, itemName: CBP_CU_NAME, unit: 'kg' },
  {
    warehouse: '原料仓',
    itemCode: STEEL_WEIGHT_BAR_CODE,
    itemName: STEEL_WEIGHT_BAR_NAME,
    unit: 'kg',
  },
  {
    warehouse: '原料仓',
    itemCode: PIPE_TRIPLE_UNIT_CODE,
    itemName: PIPE_TRIPLE_UNIT_NAME,
    unit: '米',
  },
  {
    warehouse: '原料仓',
    itemCode: PIPE_TRIPLE_CAT_CODE,
    itemName: PIPE_TRIPLE_CAT_NAME,
    unit: '米',
  },
]
