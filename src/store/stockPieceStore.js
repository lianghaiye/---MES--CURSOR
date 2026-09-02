/** 库存件码（一物一码挂在父批次下，不单独占库存批次） */

import { reactive, watch } from 'vue'
import { roundMeters } from '@/utils/variableLengthMaterial'
import { cloneStockPieceSeed } from '@/mock/stockPieceSeed'
import { ensureOneItemOneCodeInventoryPieces } from '@/mock/oneItemOneCodeInventoryDemoSeed'

const STORAGE_KEY = 'i_doms_stock_pieces'
const SEED_VERSION_KEY = 'i_doms_stock_pieces_seed_v'
/** v4：件码改为四位 SN；一类/一批按件入库挂件码 */
const CURRENT_SEED_VERSION = '4'

export const PIECE_STATUS = {
  IN_STOCK: '在库',
  ISSUED: '已出库',
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.pieces)) return parsed.pieces
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ pieces: stockPieceState.pieces }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function nid() {
  return `pc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function initPieces() {
  const stored = loadFromStorage()
  const base = shouldReseed() || !stored?.length ? cloneStockPieceSeed() : stored
  return ensureOneItemOneCodeInventoryPieces(base)
}

export const stockPieceState = reactive({
  pieces: initPieces(),
})

persist()

watch(
  () => stockPieceState.pieces,
  () => persist(),
  { deep: true },
)

/** 件码：父批号-4位 SN，如 B-260724-001-0001 */
export function generatePieceSerialNo(batchNo, index) {
  return `${batchNo}-${String(index).padStart(4, '0')}`
}

export function listStockPieces(filters = {}) {
  return stockPieceState.pieces.filter((p) => {
    if (filters.batchId && p.batchId !== filters.batchId) return false
    if (filters.batchNo && p.batchNo !== filters.batchNo) return false
    if (filters.itemCode && p.itemCode !== filters.itemCode) return false
    if (filters.warehouse && p.warehouse !== filters.warehouse) return false
    if (filters.status && p.status !== filters.status) return false
    if (filters.inStockOnly && p.status !== PIECE_STATUS.IN_STOCK) return false
    if (filters.sourceDocNo && p.sourceDocNo !== filters.sourceDocNo) return false
    return true
  })
}

export function getStockPieceById(id) {
  return stockPieceState.pieces.find((p) => p.id === id) || null
}

export function isPieceManagedBatch(batch) {
  return Boolean(batch?.attrs?.manageByPiece)
}

/**
 * 入库：为父批创建 N 条在库件码
 * @returns {Array} pieces
 */
export function createStockPiecesForBatch({
  batchId,
  batchNo,
  warehouse,
  itemCode,
  itemName,
  pieceValues = [],
  unit = '米',
  sourceDocNo = '',
  sourceType = '采购入库',
  salesOrderId = '',
  salesOrderNo = '',
  salesLineId = '',
  workOrderNo = '',
}) {
  const values = pieceValues.map(Number).filter((v) => v > 0)
  const created = values.map((qty, i) => {
    const row = {
      id: nid(),
      serialNo: generatePieceSerialNo(batchNo, i + 1),
      batchId,
      batchNo,
      warehouse: warehouse || '',
      itemCode: itemCode || '',
      itemName: itemName || '',
      pieceQty: roundMeters(qty),
      unit: unit || '米',
      status: PIECE_STATUS.IN_STOCK,
      sourceDocNo: sourceDocNo || '',
      sourceType: sourceType || '',
      salesOrderId: salesOrderId || '',
      salesOrderNo: salesOrderNo || '',
      salesLineId: salesLineId || '',
      workOrderNo: workOrderNo || '',
      index: i + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: '',
      issueDocNo: '',
    }
    stockPieceState.pieces.unshift(row)
    return row
  })
  return created
}

function sortedInStockPieces(batchId) {
  return listStockPieces({ batchId, inStockOnly: true })
    .slice()
    .sort((a, b) => {
      const sa = String(a.serialNo || '')
      const sb = String(b.serialNo || '')
      if (sa !== sb) return sa < sb ? -1 : 1
      return (a.index || 0) - (b.index || 0)
    })
}

/** 按 FIFO 整件尽量凑，不超过 want（可不恰好等于） */
export function pickPiecesFifoUpToQty(batchId, wantQty) {
  const want = roundMeters(wantQty)
  if (!(want > 0)) {
    return { ok: true, pieces: [], total: 0 }
  }
  const pieces = sortedInStockPieces(batchId)
  const taken = []
  let sum = 0
  for (const p of pieces) {
    const pq = roundMeters(Number(p.pieceQty) || 0)
    if (!(pq > 0)) continue
    if (roundMeters(sum + pq) <= roundMeters(want + 0.0001)) {
      taken.push(p)
      sum = roundMeters(sum + pq)
    } else {
      break
    }
  }
  return { ok: true, pieces: taken, total: sum }
}

/**
 * 整出+余料回：按 FIFO 取整件直至合计 ≥ want，或本批件码取尽（可略超需求；未凑齐则由调用方跨批继续）
 */
export function pickPiecesFifoCoveringQty(batchId, wantQty) {
  const want = roundMeters(wantQty)
  if (!(want > 0)) {
    return { ok: true, pieces: [], total: 0, covered: true }
  }
  const pieces = sortedInStockPieces(batchId)
  const taken = []
  let sum = 0
  for (const p of pieces) {
    const pq = roundMeters(Number(p.pieceQty) || 0)
    if (!(pq > 0)) continue
    taken.push(p)
    sum = roundMeters(sum + pq)
    if (sum >= want - 0.0001) break
  }
  return {
    ok: taken.length > 0,
    pieces: taken,
    total: sum,
    covered: sum >= want - 0.0001,
  }
}

/**
 * 按 FIFO（件码号）整件凑数量；须恰好等于 want（允许微小误差）
 */
export function pickPiecesFifoForQty(batchId, wantQty) {
  const want = roundMeters(wantQty)
  if (!(want > 0)) {
    return { ok: false, message: '出库数量须大于 0', pieces: [], total: 0 }
  }
  const pieces = sortedInStockPieces(batchId)
  if (!pieces.length) {
    return { ok: false, message: '该批次无在库件码', pieces: [], total: 0 }
  }

  const { pieces: taken, total: sum } = pickPiecesFifoUpToQty(batchId, want)

  if (Math.abs(sum - want) > 0.0001) {
    const availableTotal = roundMeters(pieces.reduce((s, p) => s + (Number(p.pieceQty) || 0), 0))
    return {
      ok: false,
      message: `一物一码须按整件出库。需求 ${want}，按件码顺序最多可凑 ${sum}（在库合计 ${availableTotal}），请调整数量或点编辑勾选件码`,
      pieces: taken,
      total: sum,
    }
  }
  return { ok: true, pieces: taken, total: sum }
}

/** 按件码 ID 列表出库核销 */
export function issueStockPieces(pieceIds = [], meta = {}) {
  const ids = Array.isArray(pieceIds) ? pieceIds : []
  if (!ids.length) return { ok: false, message: '未指定件码', pieces: [], total: 0 }
  const now = new Date().toISOString()
  const issued = []
  let total = 0
  for (const id of ids) {
    const p = getStockPieceById(id)
    if (!p) return { ok: false, message: `件码不存在：${id}`, pieces: issued, total }
    if (p.status !== PIECE_STATUS.IN_STOCK) {
      return { ok: false, message: `件码 ${p.serialNo} 不在库`, pieces: issued, total }
    }
    p.status = PIECE_STATUS.ISSUED
    p.issuedAt = now
    p.issueDocNo = meta.sourceDocNo || ''
    p.issueWorkOrderNo = meta.workOrderNo || ''
    p.updatedAt = now
    issued.push(p)
    total = roundMeters(total + (Number(p.pieceQty) || 0))
  }
  return { ok: true, pieces: issued, total }
}

/** 下一件码序号（同父批） */
function nextPieceIndex(batchId) {
  const list = listStockPieces({ batchId })
  return list.reduce((m, p) => Math.max(m, Number(p.index) || 0), 0) + 1
}

/**
 * 部分出：核销整件码，余量生成新件码（挂原父批，标记余料）
 * @returns {{ ok, message?, issuedPiece?, remnantPiece?, consumeQty, remnantQty }}
 */
export function splitIssueStockPiece(pieceId, consumeQty, meta = {}) {
  const piece = getStockPieceById(pieceId)
  if (!piece) return { ok: false, message: '件码不存在' }
  if (piece.status !== PIECE_STATUS.IN_STOCK) {
    return { ok: false, message: `件码 ${piece.serialNo} 不在库` }
  }
  const pieceQty = roundMeters(Number(piece.pieceQty) || 0)
  const consume = roundMeters(Number(consumeQty) || 0)
  if (!(consume > 0)) return { ok: false, message: '出库数量须大于 0' }
  if (consume > pieceQty) {
    return {
      ok: false,
      message: `出库数量 ${consume} 超过件码 ${piece.serialNo} 数量 ${pieceQty}`,
    }
  }

  const issued = issueStockPieces([pieceId], meta)
  if (!issued.ok) return issued

  const remnantQty = roundMeters(pieceQty - consume)
  let remnantPiece = null
  if (remnantQty > 0) {
    const index = nextPieceIndex(piece.batchId)
    remnantPiece = {
      id: nid(),
      serialNo: generatePieceSerialNo(piece.batchNo, index),
      batchId: piece.batchId,
      batchNo: piece.batchNo,
      warehouse: piece.warehouse || '',
      itemCode: piece.itemCode || '',
      itemName: piece.itemName || '',
      pieceQty: remnantQty,
      unit: piece.unit || '米',
      status: PIECE_STATUS.IN_STOCK,
      sourceDocNo: meta.sourceDocNo || '',
      sourceType: '余料',
      index,
      remnant: true,
      remnantFromSerialNo: piece.serialNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: '',
      issueDocNo: '',
    }
    stockPieceState.pieces.unshift(remnantPiece)
  }

  return {
    ok: true,
    issuedPiece: issued.pieces[0],
    remnantPiece,
    consumeQty: consume,
    remnantQty,
    pieces: issued.pieces,
    total: consume,
  }
}

/**
 * 部分出拣选：优先整件恰好凑齐；否则取第一件 ≥ 需求的件码做拆件
 */
export function pickPiecesFifoForPartialQty(batchId, wantQty) {
  const want = roundMeters(wantQty)
  if (!(want > 0)) {
    return { ok: false, message: '出库数量须大于 0', pieces: [], total: 0 }
  }
  const exact = pickPiecesFifoForQty(batchId, want)
  if (exact.ok) {
    return { ...exact, split: false, consumeQty: want }
  }

  const pieces = sortedInStockPieces(batchId)
  for (const p of pieces) {
    const pq = roundMeters(Number(p.pieceQty) || 0)
    if (pq + 0.0001 >= want) {
      return {
        ok: true,
        pieces: [p],
        total: want,
        split: true,
        consumeQty: want,
        pieceQty: pq,
      }
    }
  }

  const availableTotal = roundMeters(pieces.reduce((s, p) => s + (Number(p.pieceQty) || 0), 0))
  return {
    ok: false,
    message: `一物一码无法满足需求 ${want}（在库合计 ${availableTotal}）：无整件可凑齐，也无单件数量 ≥ 需求可拆`,
    pieces: [],
    total: 0,
  }
}
