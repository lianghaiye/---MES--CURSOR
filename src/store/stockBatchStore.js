import { reactive, watch } from 'vue'
import { isOneItemOneCodeBarcode, roundMeters } from '@/utils/variableLengthMaterial'
import { adjustStockQty, getStockQty } from '@/store/stockStore'
import { cloneStockBatchSeed } from '@/mock/stockBatchSeed'
import {
  createStockPiecesForBatch,
  getStockPieceById,
  isPieceManagedBatch,
  issueStockPieces,
  pickPiecesFifoForQty,
  pickPiecesFifoForPartialQty,
  splitIssueStockPiece,
} from '@/store/stockPieceStore'
import { isPartialDualUnitIssue } from '@/store/functionParamStore'

const STORAGE_KEY = 'i_doms_stock_batches'
const SEED_VERSION_KEY = 'i_doms_stock_batches_seed_v'
/** v13：库线边仓倒冲标准件库存 */
const CURRENT_SEED_VERSION = '13'

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ batches: stockBatchState.batches }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function initBatches() {
  const stored = loadFromStorage()
  if (shouldReseed() || !stored?.length) {
    return { batches: cloneStockBatchSeed(), reseeded: true }
  }
  return { batches: stored, reseeded: false }
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
    return true
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
    unit: partial.unit || '米',
    status: partial.status || BATCH_STATUS.IN_STOCK,
    sourceType: partial.sourceType || '',
    sourceDocNo: partial.sourceDocNo || '',
    attrs: partial.attrs || {},
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

  // 一物一码：1 个父批次（库存账）+ N 条件码（件身份）
  if (isOneItemOneCodeBarcode(barcodeType)) {
    const total = roundMeters(values.reduce((s, l) => s + l, 0))
    const parent = createBatch({
      warehouse: payload.warehouse,
      itemCode: payload.itemCode,
      itemName: payload.itemName || '',
      currentLength: total,
      unit,
      sourceType: payload.sourceType || '采购入库',
      sourceDocNo: payload.sourceDocNo || '',
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
      unit,
      sourceType: payload.sourceType || '采购入库',
      sourceDocNo: payload.sourceDocNo || '',
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

  const allowSplit = meta.allowPieceSplit !== false && isPartialDualUnitIssue()
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
    unit: source.unit || '米',
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
