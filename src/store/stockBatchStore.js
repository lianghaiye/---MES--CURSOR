import { reactive, watch } from 'vue'
import { roundMeters, shouldInboundManageByPiece } from '@/utils/variableLengthMaterial'
import { adjustStockQty, getStockQty } from '@/store/stockStore'
import {
  cloneStockBatchSeed,
  STEEL_PIPE_CODE,
  STEEL_PIPE_NAME,
  STEEL_PLATE_CODE,
  STEEL_PLATE_NAME,
  STEEL_WEIGHT_BAR_CODE,
  STEEL_WEIGHT_BAR_NAME,
  CASTING_BLANK_SETTLE_CODE,
  CASTING_BLANK_SETTLE_NAME,
  CASTING_NORATE_SETTLE_CODE,
  CASTING_NORATE_SETTLE_NAME,
} from '@/mock/stockBatchSeed'
import {
  createStockPiecesForBatch,
  getStockPieceById,
  isPieceManagedBatch,
  issueStockPieces,
  pickPiecesFifoForQty,
  pickPiecesFifoForPartialQty,
  splitIssueStockPiece,
} from '@/store/stockPieceStore'
import { DEDICATED_SHIP_DEMO, ensureDedicatedShipDemoBatches } from '@/mock/dedicatedShipDemoSeed'
import { ensureMultiUnitFlowBatches } from '@/mock/multiUnitFlowDemoSeed'
import {
  ensureCategoryBatchPieceBatches,
  CBP_INV_STOCK_SYNC_ROWS,
} from '@/mock/categoryBatchPieceDemoSeed'
import {
  ensureOneItemOneCodeInventoryBatches,
  OIOC_INV_STOCK_SYNC_ROWS,
} from '@/mock/oneItemOneCodeInventoryDemoSeed'
import {
  ensureTransferDualOwnershipBatches,
  TRANSFER_DUAL_OWNERSHIP_STOCK_SYNC_ROWS,
} from '@/mock/transferDualOwnershipDemoSeed'
import { allocateBatchUomConvert } from '@/utils/batchUomConvert'
import { registerSettleBatchWeightLookup } from '@/utils/settleUnit'
import { persistJson, safeSetItem } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_stock_batches'
const SEED_VERSION_KEY = 'i_doms_stock_batches_seed_v'
/** v30：批次实际成本 unitCost（库存单位） */
const CURRENT_SEED_VERSION = '30'

function roundMoney4(val) {
  return Math.round((Number(val) || 0) * 10000) / 10000
}

function roundMoney2(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

function normalizeUnitCost(val) {
  if (val == null || val === '') return null
  const n = Number(val)
  return Number.isFinite(n) ? roundMoney4(n) : null
}

export const BATCH_STATUS = {
  IN_STOCK: '在库',
  ISSUED: '已出库',
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.batches)) return parsed.batches
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  persistJson(STORAGE_KEY, { batches: stockBatchState.batches })
  safeSetItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function initBatches() {
  const stored = loadFromStorage()
  if (shouldReseed() || !stored?.length) {
    return {
      batches: ensureTransferDualOwnershipBatches(
        ensureOneItemOneCodeInventoryBatches(
          ensureCategoryBatchPieceBatches(
            ensureMultiUnitFlowBatches(ensureDedicatedShipDemoBatches(cloneStockBatchSeed())),
          ),
        ),
      ),
      reseeded: true,
    }
  }
  return {
    batches: ensureTransferDualOwnershipBatches(
      ensureOneItemOneCodeInventoryBatches(
        ensureCategoryBatchPieceBatches(
          ensureMultiUnitFlowBatches(ensureDedicatedShipDemoBatches(stored)),
        ),
      ),
    ),
    reseeded: false,
  }
}

function nid(prefix = 'bat') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 批次号：B-YYMMDD-流水（3 位，001–999）
 * 例：B-260909-001
 * @param {Date|string|number} [at] 入库时间，默认当前
 */
export function generateBatchNo(at = new Date()) {
  const d = at instanceof Date ? at : new Date(at || Date.now())
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const datePart = `${yy}${mm}${dd}`
  const prefix = `B-${datePart}-`
  let maxSeq = 0
  const list = stockBatchState?.batches || []
  list.forEach((b) => {
    const no = String(b.batchNo || '')
    if (!no.startsWith(prefix)) return
    // 兼容历史 2 位流水，取当日最大序号后续编 3 位
    const m = no.match(/^B-\d{6}-(\d{2,3})$/)
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]) || 0)
  })
  const next = Math.min(maxSeq + 1, 999)
  return `${prefix}${String(next).padStart(3, '0')}`
}

const initialBatchLoad = initBatches()

export const stockBatchState = reactive({
  batches: initialBatchLoad.batches,
})

/** 种子重载后按批次汇总对齐库存数量 */
function syncAllSeedBatchStock() {
  const seen = new Set()
  stockBatchState.batches.forEach((b) => {
    if (b.status !== BATCH_STATUS.IN_STOCK || !b.warehouse || !b.itemCode) return
    const key = `${b.warehouse}::${b.itemCode}`
    if (seen.has(key)) return
    seen.add(key)
    syncAggregateStockFromBatches(b.warehouse, b.itemCode, b.itemName || '', b.unit || '米')
  })
}

if (initialBatchLoad.reseeded) {
  syncAllSeedBatchStock()
  persist()
} else {
  // 幂等补演示批后对齐汇总
  syncAggregateStockFromBatches(
    DEDICATED_SHIP_DEMO.warehouse,
    DEDICATED_SHIP_DEMO.productCode,
    DEDICATED_SHIP_DEMO.productName,
    '件',
  )
  ;[
    { warehouse: '原料仓', itemCode: STEEL_PIPE_CODE, itemName: STEEL_PIPE_NAME, unit: '米' },
    { warehouse: '库线边仓', itemCode: STEEL_PIPE_CODE, itemName: STEEL_PIPE_NAME, unit: '米' },
    { warehouse: '原料仓', itemCode: STEEL_PLATE_CODE, itemName: STEEL_PLATE_NAME, unit: '㎡' },
    {
      warehouse: '原料仓',
      itemCode: STEEL_WEIGHT_BAR_CODE,
      itemName: STEEL_WEIGHT_BAR_NAME,
      unit: 'kg',
    },
    {
      warehouse: '原料仓',
      itemCode: CASTING_BLANK_SETTLE_CODE,
      itemName: CASTING_BLANK_SETTLE_NAME,
      unit: '件',
    },
    {
      warehouse: '原料仓',
      itemCode: CASTING_NORATE_SETTLE_CODE,
      itemName: CASTING_NORATE_SETTLE_NAME,
      unit: '件',
    },
    ...OIOC_INV_STOCK_SYNC_ROWS,
    ...CBP_INV_STOCK_SYNC_ROWS,
    ...TRANSFER_DUAL_OWNERSHIP_STOCK_SYNC_ROWS,
  ].forEach((row) =>
    syncAggregateStockFromBatches(row.warehouse, row.itemCode, row.itemName, row.unit),
  )
  persist()
}

watch(
  () => stockBatchState.batches,
  () => persist(),
  { deep: true },
)

export function syncAggregateStockFromBatches(warehouse, itemCode, itemName = '', unit = '米') {
  const total = getAvailableMeters(warehouse, itemCode)
  const current = getStockQty(warehouse, itemCode)
  const delta = roundMeters(total - current)
  if (delta === 0) return
  adjustStockQty({ warehouse, itemCode, itemName, unit, delta })
}

export function listBatches(filters = {}) {
  return stockBatchState.batches.filter((b) => {
    if (filters.warehouse && b.warehouse !== filters.warehouse) return false
    if (filters.itemCode && b.itemCode !== filters.itemCode) return false
    if (filters.status && b.status !== filters.status) return false
    if (filters.inStockOnly && b.status !== BATCH_STATUS.IN_STOCK) return false
    if (filters.salesOrderId && b.salesOrderId !== filters.salesOrderId) return false
    if (filters.salesOrderNo && String(b.salesOrderNo || '') !== String(filters.salesOrderNo))
      return false
    if (filters.salesLineId && b.salesLineId !== filters.salesLineId) return false
    if (filters.dedicatedOnly && !b.salesOrderId) return false
    if (filters.freeOnly && b.salesOrderId) return false
    return true
  })
}

/** 本销售单（或销售行）在库按单批次 */
export function listDedicatedBatches({
  salesOrderId,
  salesOrderNo,
  salesLineId,
  itemCode,
  warehouse,
  inStockOnly = true,
} = {}) {
  return listBatches({
    warehouse,
    itemCode,
    inStockOnly,
    salesOrderId: salesOrderId || undefined,
    salesOrderNo: salesOrderId ? undefined : salesOrderNo || undefined,
    salesLineId: salesLineId || undefined,
    dedicatedOnly: true,
  }).filter((b) => {
    if (salesOrderId && b.salesOrderId !== salesOrderId) return false
    if (!salesOrderId && salesOrderNo && String(b.salesOrderNo || '') !== String(salesOrderNo))
      return false
    return true
  })
}

/** 自由备货：未挂销售单的在库批 */
export function listFreeBatches({ warehouse, itemCode, inStockOnly = true } = {}) {
  return listBatches({ warehouse, itemCode, inStockOnly, freeOnly: true })
}

export function sumFreeQty(filters = {}) {
  return roundMeters(
    listFreeBatches(filters).reduce((s, b) => s + (Number(b.currentLength) || 0), 0),
  )
}

export function sumDedicatedQty(filters = {}) {
  return roundMeters(
    listDedicatedBatches(filters).reduce((s, b) => s + (Number(b.currentLength) || 0), 0),
  )
}

/**
 * 在库批次实际成本汇总（仅统计已写入 unitCost 的批）
 * @returns {{ totalAmount: number|null, unitCost: number|null, qtyWithCost: number, qtyTotal: number }}
 */
export function sumOnHandBatchCost({ warehouse, itemCode } = {}) {
  const batches = listBatches({ warehouse, itemCode, inStockOnly: true })
  let amount = 0
  let qtyWithCost = 0
  let qtyTotal = 0
  for (const b of batches) {
    const q = Number(b.currentLength) || 0
    qtyTotal += q
    const cost = normalizeUnitCost(b.unitCost)
    if (cost == null || q <= 0) continue
    amount += q * cost
    qtyWithCost += q
  }
  if (!(qtyWithCost > 0)) {
    return { totalAmount: null, unitCost: null, qtyWithCost: 0, qtyTotal: roundMeters(qtyTotal) }
  }
  return {
    totalAmount: roundMoney2(amount),
    unitCost: roundMoney4(amount / qtyWithCost),
    qtyWithCost: roundMeters(qtyWithCost),
    qtyTotal: roundMeters(qtyTotal),
  }
}

/**
 * 按数量从源批切出一块（不改台账总量），用于归属转移。
 * 整批则只改归属；部分则源批减量并新建目标批。
 */
function takeQtyFromBatchWithOwnership(batch, takeQty, ownership = {}) {
  const avail = roundMeters(Number(batch.currentLength) || 0)
  const take = roundMeters(takeQty)
  if (!(take > 0) || take > avail + 1e-9) {
    return { ok: false, message: '转移数量无效' }
  }
  const manageByPiece = Boolean(batch.attrs?.manageByPiece)
  if (manageByPiece && take < avail - 1e-9) {
    return {
      ok: false,
      message: `批次 ${batch.batchNo} 按件管理，请整批转移`,
    }
  }

  const now = new Date().toISOString()
  const targetOwn = {
    salesOrderId: ownership.salesOrderId || '',
    salesOrderNo: ownership.salesOrderNo || '',
    salesLineId: ownership.salesLineId || '',
  }

  if (take >= avail - 1e-9) {
    batch.salesOrderId = targetOwn.salesOrderId
    batch.salesOrderNo = targetOwn.salesOrderNo
    batch.salesLineId = targetOwn.salesLineId
    batch.updatedAt = now
    return { ok: true, batch, created: false }
  }

  batch.currentLength = roundMeters(avail - take)
  batch.updatedAt = now
  const created = {
    id: nid(),
    batchNo: generateBatchNo(),
    warehouse: batch.warehouse || '',
    itemCode: batch.itemCode || '',
    itemName: batch.itemName || '',
    currentLength: take,
    inboundQty: take,
    inboundPurchaseQty: null,
    purchaseUnit: batch.purchaseUnit || '',
    unit: batch.unit || '米',
    status: BATCH_STATUS.IN_STOCK,
    sourceType: batch.sourceType || '归属转移',
    sourceDocNo: batch.sourceDocNo || '',
    salesOrderId: targetOwn.salesOrderId,
    salesOrderNo: targetOwn.salesOrderNo,
    salesLineId: targetOwn.salesLineId,
    workOrderNo: batch.workOrderNo || '',
    attrs: { ...(batch.attrs || {}), ownershipSplitFrom: batch.batchNo },
    uomConvert: batch.uomConvert || null,
    unitCost: normalizeUnitCost(batch.unitCost),
    parentBatchId: batch.id,
    createdAt: now,
    updatedAt: now,
  }
  stockBatchState.batches.unshift(created)
  return { ok: true, batch: created, created: true }
}

/**
 * 跨单 / 转自由：按数量转移批次销售归属（支持拆批；台账数量不变）
 * toSalesOrderId 为空表示转自由备货。
 */
export function transferBatchOwnership({
  batchIds = [],
  toSalesOrderId = '',
  toSalesOrderNo = '',
  toSalesLineId = '',
  qty,
} = {}) {
  const ids = [...new Set((batchIds || []).filter(Boolean))]
  if (!ids.length) return { ok: false, message: '请选择要转移的批次', batches: [] }

  const candidates = []
  for (const id of ids) {
    const b = getBatchById(id)
    if (!b || b.status !== BATCH_STATUS.IN_STOCK) continue
    const avail = roundMeters(Number(b.currentLength) || 0)
    if (!(avail > 0)) continue
    candidates.push(b)
  }
  if (!candidates.length) return { ok: false, message: '所选批次无可转移在库数量', batches: [] }

  const totalAvail = roundMeters(candidates.reduce((s, b) => s + (Number(b.currentLength) || 0), 0))
  const need = Number(qty) > 0 ? roundMeters(Number(qty)) : totalAvail
  if (need > totalAvail + 1e-9) {
    return {
      ok: false,
      message: `可转移数量不足（需 ${need}，可用 ${totalAvail}）`,
      batches: [],
    }
  }

  let left = need
  const transferred = []
  for (const b of candidates) {
    if (!(left > 0)) break
    const avail = roundMeters(Number(b.currentLength) || 0)
    const take = Math.min(avail, left)
    const res = takeQtyFromBatchWithOwnership(b, take, {
      salesOrderId: toSalesOrderId,
      salesOrderNo: toSalesOrderNo,
      salesLineId: toSalesLineId,
    })
    if (!res.ok) return { ok: false, message: res.message, batches: transferred }
    transferred.push(res.batch)
    left = roundMeters(left - take)
  }

  return { ok: true, batches: transferred, qty: need }
}

/** 按单批 → 自由备货 */
export function transferBatchesToFree({ batchIds = [], qty } = {}) {
  return transferBatchOwnership({
    batchIds,
    toSalesOrderId: '',
    toSalesOrderNo: '',
    toSalesLineId: '',
    qty,
  })
}

export function getBatchById(id) {
  return stockBatchState.batches.find((b) => b.id === id) || null
}

export function getAvailableMeters(warehouse, itemCode) {
  return roundMeters(
    listBatches({ warehouse, itemCode, inStockOnly: true }).reduce(
      (s, b) => s + (Number(b.currentLength) || 0),
      0,
    ),
  )
}

export function findBatchesForDemand(itemCode, warehouse, demandMeters) {
  const need = Number(demandMeters) || 0
  return listBatches({ warehouse, itemCode, inStockOnly: true })
    .filter((b) => (Number(b.currentLength) || 0) >= need)
    .sort((a, b) => (Number(a.currentLength) || 0) - (Number(b.currentLength) || 0))
}

export function createBatch(partial = {}) {
  const length = roundMeters(partial.currentLength)
  const row = {
    id: partial.id || nid(),
    batchNo: partial.batchNo || generateBatchNo(partial.createdAt || Date.now()),
    warehouse: partial.warehouse || '',
    itemCode: partial.itemCode || '',
    itemName: partial.itemName || '',
    currentLength: length,
    inboundQty:
      partial.inboundQty != null && partial.inboundQty !== ''
        ? roundMeters(Number(partial.inboundQty))
        : length,
    inboundPurchaseQty:
      partial.inboundPurchaseQty != null && partial.inboundPurchaseQty !== ''
        ? roundMeters(Number(partial.inboundPurchaseQty))
        : null,
    purchaseUnit: partial.purchaseUnit || partial.attrs?.purchaseUnit || '',
    unit: partial.unit || '米',
    status: partial.status || BATCH_STATUS.IN_STOCK,
    sourceType: partial.sourceType || '',
    sourceDocNo: partial.sourceDocNo || '',
    salesOrderId: partial.salesOrderId || '',
    salesOrderNo: partial.salesOrderNo || '',
    salesLineId: partial.salesLineId || '',
    workOrderNo: partial.workOrderNo || '',
    attrs: partial.attrs || {},
    /** 按批次覆盖：入库过磅沉淀的换算快照（库存明细展示，不进主数据） */
    uomConvert: partial.uomConvert || null,
    /** 批次实际成本（每库存单位）；入库时按入库行价写入，库存金额按批汇总 */
    unitCost: normalizeUnitCost(partial.unitCost),
    parentBatchId: partial.parentBatchId || '',
    createdAt: partial.createdAt || new Date().toISOString(),
    updatedAt: partial.updatedAt || new Date().toISOString(),
  }
  stockBatchState.batches.unshift(row)
  if (row.status === BATCH_STATUS.IN_STOCK && row.warehouse && row.itemCode) {
    adjustStockQty({
      warehouse: row.warehouse,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unit: row.unit,
      delta: length,
    })
  }
  return row
}

export function applyInboundBatchesFromRoots(payload) {
  const values = (payload.pieceValues || payload.pieceLengths || payload.pieceWeights || [])
    .map(Number)
    .filter((l) => l > 0)
  if (!payload.warehouse || !payload.itemCode) {
    return { ok: false, message: '缺少仓库或物料编码' }
  }
  if (!values.length) {
    return { ok: false, message: '须录入单件数量' }
  }
  const unit = payload.unit || '米'
  const barcodeType = payload.barcodeType || payload.attrs?.barcodeType || ''
  const baseAttrs = { ...(payload.attrs || {}), barcodeType: barcodeType || undefined }
  const lineage = {
    salesOrderId: payload.salesOrderId || '',
    salesOrderNo: payload.salesOrderNo || '',
    salesLineId: payload.salesLineId || '',
    workOrderNo: payload.workOrderNo || '',
  }
  const lineUomConvert = payload.uomConvert || null
  const unitCost = normalizeUnitCost(payload.unitCost)
  const thisCallStock = roundMeters(values.reduce((s, l) => s + l, 0))
  const lineStockTotal =
    Number(payload.lineStockQty) > 0 ? roundMeters(Number(payload.lineStockQty)) : thisCallStock
  const linePurchaseQty = Number(payload.purchaseQty)
  const purchaseUnit = payload.purchaseUnit || payload.attrs?.purchaseUnit || ''

  function inboundPurchaseFor(batchStockQty, pieceCount) {
    if (Number.isFinite(linePurchaseQty) && linePurchaseQty > 0 && lineStockTotal > 0) {
      if (Math.abs(batchStockQty - lineStockTotal) < 1e-9) return roundMeters(linePurchaseQty)
      return roundMeters(linePurchaseQty * (batchStockQty / lineStockTotal))
    }
    if (pieceCount > 0) return pieceCount
    return null
  }

  // 一物一码；或一类/一批一码在采购≠库存且按单件/逐件填写：1 父批 + N 件码（四位 SN）
  if (
    shouldInboundManageByPiece({
      barcodeType,
      inboundEntryMode: payload.inboundEntryMode || baseAttrs.inboundEntryMode,
      isVariableLength: payload.isVariableLength,
      purchaseUnit: payload.purchaseUnit,
      stockUnit: payload.stockUnit || unit,
      unit,
    })
  ) {
    const total = thisCallStock
    const parent = createBatch({
      warehouse: payload.warehouse,
      itemCode: payload.itemCode,
      itemName: payload.itemName || '',
      currentLength: total,
      inboundPurchaseQty: inboundPurchaseFor(total, values.length),
      purchaseUnit,
      unit,
      unitCost,
      sourceType: payload.sourceType || '采购入库',
      sourceDocNo: payload.sourceDocNo || '',
      ...lineage,
      uomConvert: allocateBatchUomConvert(lineUomConvert, total, lineStockTotal),
      attrs: {
        ...baseAttrs,
        manageByPiece: true,
        pieceCount: values.length,
      },
    })
    const pieces = createStockPiecesForBatch({
      batchId: parent.id,
      batchNo: parent.batchNo,
      warehouse: payload.warehouse,
      itemCode: payload.itemCode,
      itemName: payload.itemName || '',
      pieceValues: values,
      unit,
      sourceDocNo: payload.sourceDocNo || '',
      sourceType: payload.sourceType || '采购入库',
      ...lineage,
    })
    return {
      ok: true,
      batches: [parent],
      pieces,
      totalMeters: total,
      totalQty: total,
      manageByPiece: true,
    }
  }

  const batches = values.map((val) =>
    createBatch({
      warehouse: payload.warehouse,
      itemCode: payload.itemCode,
      itemName: payload.itemName || '',
      currentLength: val,
      inboundPurchaseQty: inboundPurchaseFor(val, 0),
      purchaseUnit,
      unit,
      unitCost,
      sourceType: payload.sourceType || '采购入库',
      sourceDocNo: payload.sourceDocNo || '',
      ...lineage,
      uomConvert: allocateBatchUomConvert(lineUomConvert, val, lineStockTotal),
      attrs: baseAttrs,
    }),
  )
  return {
    ok: true,
    batches,
    pieces: [],
    totalMeters: roundMeters(values.reduce((s, l) => s + l, 0)),
    totalQty: roundMeters(values.reduce((s, l) => s + l, 0)),
  }
}

export function issueWholeBatch(batchId, meta = {}) {
  return issueBatchQty(batchId, null, meta)
}

/**
 * 按数量从批次出库。qty 为空或 ≥ 批次余量时整批出完；否则扣减余量，批次仍在库。
 * 发料规则=部分出+余料留原批时：
 * - 非一物一码：余量留原批
 * - 一物一码：优先整件凑齐；否则整件核销并自动生成余料件码
 */
export function issueBatchQty(batchId, qty, meta = {}) {
  const batch = getBatchById(batchId)
  if (!batch) return { ok: false, message: '批次不存在' }
  if (batch.status !== BATCH_STATUS.IN_STOCK) {
    return { ok: false, message: '批次不在库，无法出库' }
  }
  const available = roundMeters(Number(batch.currentLength) || 0)
  if (!(available > 0)) {
    return { ok: false, message: '批次无可出库数量' }
  }
  const want = qty == null || qty === '' ? available : roundMeters(Number(qty) || 0)
  if (!(want > 0)) {
    return { ok: false, message: '出库数量须大于 0' }
  }
  if (want > available) {
    return {
      ok: false,
      message: `出库数量 ${want} 超过批次余量 ${available}${batch.unit || ''}`,
    }
  }

  // 默认按出库数量扣，件长大于出库量时可拆件留仓内余料
  const allowSplit = meta.allowPieceSplit !== false
  let issuedPieces = []
  let remnantPieces = []
  let pieceSplit = false

  if (isPieceManagedBatch(batch)) {
    const pieceIds = Array.isArray(meta.pieceIds) ? meta.pieceIds.filter(Boolean) : []
    if (pieceIds.length === 1 && (meta.pieceSplit || allowSplit)) {
      const onlyId = pieceIds[0]
      const p = getStockPieceById(onlyId)
      const pq = roundMeters(Number(p?.pieceQty) || 0)
      if (p && pq + 0.0001 >= want && Math.abs(pq - want) > 0.0001) {
        const split = splitIssueStockPiece(onlyId, want, meta)
        if (!split.ok) return split
        issuedPieces = split.pieces || []
        if (split.remnantPiece) remnantPieces = [split.remnantPiece]
        pieceSplit = true
      }
    }

    if (!pieceSplit && pieceIds.length) {
      const pick = issueStockPieces(pieceIds, meta)
      if (!pick.ok) return pick
      const total = roundMeters(pick.total)
      if (Math.abs(total - want) > 0.0001) {
        return {
          ok: false,
          message: `勾选件码合计 ${total} 与出库数量 ${want} 不一致`,
        }
      }
      issuedPieces = pick.pieces
    } else if (!pieceSplit) {
      if (allowSplit) {
        const pick = pickPiecesFifoForPartialQty(batchId, want)
        if (!pick.ok) return pick
        if (pick.split) {
          const split = splitIssueStockPiece(pick.pieces[0].id, want, meta)
          if (!split.ok) return split
          issuedPieces = split.pieces || []
          if (split.remnantPiece) remnantPieces = [split.remnantPiece]
          pieceSplit = true
        } else {
          const issued = issueStockPieces(
            pick.pieces.map((p) => p.id),
            meta,
          )
          if (!issued.ok) return issued
          issuedPieces = issued.pieces
        }
      } else {
        const pick = pickPiecesFifoForQty(batchId, want)
        if (!pick.ok) return pick
        const issued = issueStockPieces(
          pick.pieces.map((p) => p.id),
          meta,
        )
        if (!issued.ok) return issued
        issuedPieces = issued.pieces
      }
    }
  }

  const now = new Date().toISOString()
  const whole = want >= available
  if (whole) {
    batch.status = BATCH_STATUS.ISSUED
    batch.currentLength = 0
    batch.issuedAt = now
    batch.issueDocNo = meta.sourceDocNo || ''
    batch.issueWorkOrderNo = meta.workOrderNo || ''
  } else {
    batch.currentLength = roundMeters(available - want)
  }
  batch.updatedAt = now
  adjustStockQty({
    warehouse: batch.warehouse,
    itemCode: batch.itemCode,
    itemName: batch.itemName,
    unit: batch.unit,
    delta: -want,
  })
  return {
    ok: true,
    batch,
    issuedLength: want,
    whole,
    pieceSplit,
    issuedPieces,
    remnantPieces,
    issuedSerialNos: issuedPieces.map((p) => p.serialNo),
    remnantSerialNos: remnantPieces.map((p) => p.serialNo),
  }
}

export function receiveRemnantBatch({
  sourceBatchId,
  remnantLength,
  warehouse,
  sourceDocNo = '',
  sourceType = '余料入库',
}) {
  const source = getBatchById(sourceBatchId)
  if (!source) return { ok: false, message: '原批次不存在' }
  const len = roundMeters(remnantLength)
  if (len <= 0) return { ok: false, message: '余料长度须大于 0' }

  const batch = createBatch({
    warehouse: warehouse || source.warehouse,
    itemCode: source.itemCode,
    itemName: source.itemName,
    currentLength: len,
    inboundQty: len,
    purchaseUnit: source.purchaseUnit || '',
    unit: source.unit || '米',
    unitCost: source.unitCost,
    sourceType,
    sourceDocNo,
    // 原批已整出离仓：余料用新批次号，但血缘挂回原批，并标识余料
    parentBatchId: source.id,
    attrs: {
      ...(source.attrs || {}),
      remnant: true,
      remnantFrom: source.batchNo,
    },
  })
  return { ok: true, batch }
}

export function getBatchesByItem(itemCode) {
  return listBatches({ itemCode })
}

/**
 * 最近一批带结算换算记录的「批次单量」（settleQty / pieceCount）
 * 用于：有结算单位但主数据无默认换算率时，开单预估
 * @returns {number|null}
 */
export function resolveLatestBatchSettleUnitWeight(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return null
  const ranked = listBatches({ itemCode: code })
    .filter((b) => {
      const w = Number(b?.uomConvert?.actualUnitWeight)
      return Number.isFinite(w) && w > 0
    })
    .sort((a, b) => {
      const ta = String(a.updatedAt || a.createdAt || '')
      const tb = String(b.updatedAt || b.createdAt || '')
      return tb.localeCompare(ta)
    })
  if (!ranked.length) return null
  const w = Number(ranked[0].uomConvert.actualUnitWeight)
  return Number.isFinite(w) && w > 0 ? w : null
}

registerSettleBatchWeightLookup(resolveLatestBatchSettleUnitWeight)
