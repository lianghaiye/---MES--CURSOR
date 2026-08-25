/** 出库按规则自动分配批次（FIFO / LIFO）及自主多批分配 */

import { getBatchById, listBatches } from '@/store/stockBatchStore'
import {
  getStockPieceById,
  isPieceManagedBatch,
  listStockPieces,
  pickPiecesFifoForQty,
  pickPiecesFifoForPartialQty,
  pickPiecesFifoCoveringQty,
} from '@/store/stockPieceStore'
import {
  OUTBOUND_ISSUE_RULES,
  DUAL_UNIT_ISSUE_STRATEGIES,
  isManualOutboundIssue,
  getDualUnitIssueStrategy,
} from '@/store/functionParamStore'
import { resolveNeedsBlankingSettle } from '@/utils/blankingSettleMaterial'

/**
 * 行级扣批策略（与双单位无关）：
 * - 普通物料 → 一律按需求扣、余量留原批
 * - 需要下料结算 → 跟功能参数「批次扣批方式」（整出+结算 / 部分出+留原批）
 */
export function resolveLineBatchIssueStrategy(line = {}) {
  if (!resolveNeedsBlankingSettle(line)) {
    return DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
  }
  return getDualUnitIssueStrategy()
}

export function isLinePartialBatchIssue(line = {}) {
  return resolveLineBatchIssueStrategy(line) === DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
}

export function isLineWholeWithRemnantBatchIssue(line = {}) {
  return resolveLineBatchIssueStrategy(line) === DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT
}

/** 拣批是否用「优先整批 + 余料优先」（仅需下料结算物料） */
export function isLineEnhancedBlankingPick(line = {}) {
  return resolveNeedsBlankingSettle(line)
}

function resolveIssueStrategyFromOpts(opts = {}) {
  if (
    opts.issueStrategy === DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL ||
    opts.issueStrategy === DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT
  ) {
    return opts.issueStrategy
  }
  if (opts.line) return resolveLineBatchIssueStrategy(opts.line)
  return DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
}

/** 该明细行是否走自主拣选（行级开关或全局出库规则） */
export function isLineManualBatchPick(line = {}) {
  if (isManualOutboundIssue()) return true
  if (line.manualBatchPick === true) return true
  if (line.outboundIssueRule === OUTBOUND_ISSUE_RULES.MANUAL) return true
  return false
}

/** 自主拣选已选批次 ID */
export function getManualPickBatchIds(line = {}) {
  if (Array.isArray(line.manualPickBatchIds) && line.manualPickBatchIds.length) {
    return line.manualPickBatchIds.filter(Boolean)
  }
  return getLineBatchAllocations(line)
    .map((a) => a.batchId)
    .filter(Boolean)
}

/**
 * 从所选批次按「余量小优先」跨批扣减，凑齐 demandQty
 * @returns {{ ok: boolean, message?: string, allocations: Array, available: number }}
 */
export function allocateFromSelectedBatches({
  batchIds = [],
  demandQty,
  unit = '',
  line,
  issueStrategy,
} = {}) {
  const need = roundQty(demandQty)
  const ids = Array.isArray(batchIds) ? batchIds.filter(Boolean) : []
  if (!ids.length) {
    return { ok: false, message: '请至少选择一个批次', allocations: [], available: 0 }
  }
  if (!(need > 0)) {
    return { ok: false, message: '出库数量须大于 0', allocations: [], available: 0 }
  }
  const batches = ids.map((id) => getBatchById(id)).filter((b) => b && b.status === '在库')
  if (batches.length !== ids.length) {
    return { ok: false, message: '所选批次不存在或不在库', allocations: [], available: 0 }
  }
  // 优先扣数量小的批次，允许跨批
  batches.sort((a, b) => {
    const da = Number(a.currentLength) || 0
    const db = Number(b.currentLength) || 0
    if (da !== db) return da - db
    return String(a.batchNo || '').localeCompare(String(b.batchNo || ''), 'zh-CN')
  })
  const available = roundQty(batches.reduce((s, b) => s + (Number(b.currentLength) || 0), 0))
  if (need > available) {
    return {
      ok: false,
      message: `出库数量 ${need} 大于所选批次合计 ${available}，请减少出库数量或增选批次`,
      allocations: [],
      available,
    }
  }
  let left = need
  const allocations = []
  const whole =
    resolveIssueStrategyFromOpts({ line, issueStrategy }) ===
    DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT
  for (const b of batches) {
    if (!(left > 0)) break
    const avail = roundQty(Number(b.currentLength) || 0)
    if (!(avail > 0)) continue
    // 整出+余料回：整批出完（可略超需求）；部分出：按需求扣、余量留原批
    const take = whole ? avail : roundQty(Math.min(avail, left))
    allocations.push({
      batchId: b.id,
      batchNo: b.batchNo,
      qty: take,
      unit: b.unit || unit || '',
      available: avail,
    })
    left = roundQty(left - take)
  }
  if (!(left <= 0) || !allocations.length) {
    return {
      ok: false,
      message: whole
        ? `所选批次整批出库后仍不足需求（需 ${need}，可用 ${available}），请增选批次`
        : `所选批次不足（需 ${need}，可用 ${available}）`,
      allocations: [],
      available,
    }
  }
  return { ok: true, allocations, available, total: sumBatchAllocations(allocations) }
}

function roundQty(val) {
  return Math.round((Number(val) || 0) * 10000) / 10000
}

function isRemnantBatch(batch) {
  return Boolean(batch?.attrs?.remnant)
}

function isRemnantPiece(piece) {
  return Boolean(piece?.remnant)
}

/**
 * 出库候选排序：余料优先 → 数量短优先（够用前提下）→ 批次号 FIFO/LIFO
 * @param {{ remnant: boolean, length: number, batchNo: string, serialNo?: string }} a
 * @param {{ remnant: boolean, length: number, batchNo: string, serialNo?: string }} b
 */
export function compareOutboundPickCandidates(a, b, rule) {
  if (Boolean(a.remnant) !== Boolean(b.remnant)) {
    return a.remnant ? -1 : 1
  }
  const la = Number(a.length) || 0
  const lb = Number(b.length) || 0
  if (la !== lb) return la - lb
  const ka = String(a.batchNo || '')
  const kb = String(b.batchNo || '')
  if (ka !== kb) {
    const cmp = ka < kb ? -1 : 1
    return rule === OUTBOUND_ISSUE_RULES.LIFO ? -cmp : cmp
  }
  const sa = String(a.serialNo || '')
  const sb = String(b.serialNo || '')
  if (sa !== sb) return sa < sb ? -1 : 1
  return 0
}

/** 跨批回退时的在库批排序：余料优先 → 批次号 FIFO/LIFO → 数量短优先 */
export function sortBatchesByIssueRule(batches, rule) {
  const list = (batches || []).slice()
  list.sort((a, b) => {
    const ra = isRemnantBatch(a)
    const rb = isRemnantBatch(b)
    if (ra !== rb) return ra ? -1 : 1
    const ka = String(a.batchNo || a.createdAt || '')
    const kb = String(b.batchNo || b.createdAt || '')
    if (ka !== kb) {
      const cmp = ka < kb ? -1 : 1
      return rule === OUTBOUND_ISSUE_RULES.LIFO ? -cmp : cmp
    }
    return (Number(a.currentLength) || 0) - (Number(b.currentLength) || 0)
  })
  return list
}

/** 普通物料：仅按批次号先进先出（不做余料优先 / 最短够用） */
export function sortBatchesSimpleFifo(batches, rule) {
  const list = (batches || []).slice()
  list.sort((a, b) => {
    const ka = String(a.batchNo || a.createdAt || '')
    const kb = String(b.batchNo || b.createdAt || '')
    if (ka !== kb) {
      const cmp = ka < kb ? -1 : 1
      return rule === OUTBOUND_ISSUE_RULES.LIFO ? -cmp : cmp
    }
    return (Number(a.currentLength) || 0) - (Number(b.currentLength) || 0)
  })
  return list
}

function sortedInStockPiecesForBatch(batchId) {
  return listStockPieces({ batchId, inStockOnly: true })
    .slice()
    .sort((a, b) => {
      const sa = String(a.serialNo || '')
      const sb = String(b.serialNo || '')
      if (sa !== sb) return sa < sb ? -1 : 1
      return (a.index || 0) - (b.index || 0)
    })
}

/**
 * 优先整批/整根：找单批或单件 ≥ 需求的最优候选
 * 排序：余料优先 → 最短够用 → 批次号 FIFO/LIFO
 * @returns {null | {batchId,batchNo,qty,unit,pieceIds?,pieceSerialNos?,pieceSplit?}}
 */
export function pickWholeSatisfyAllocation(batches, demandQty, rule, issueStrategy) {
  const need = roundQty(demandQty)
  if (!(need > 0)) return null
  const strategy = resolveIssueStrategyFromOpts({ issueStrategy })
  const whole = strategy === DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT
  const partial = strategy === DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
  const candidates = []

  for (const b of batches || []) {
    const avail = roundQty(Number(b.currentLength) || 0)
    if (!(avail > 0)) continue

    if (isPieceManagedBatch(b)) {
      for (const p of sortedInStockPiecesForBatch(b.id)) {
        const pq = roundQty(Number(p.pieceQty) || 0)
        if (pq + 0.0001 < need) continue
        candidates.push({
          remnant: isRemnantPiece(p) || isRemnantBatch(b),
          length: pq,
          batchNo: b.batchNo || '',
          serialNo: p.serialNo || '',
          allocation: {
            batchId: b.id,
            batchNo: b.batchNo,
            qty: whole ? pq : need,
            unit: b.unit || p.unit || '',
            pieceIds: [p.id],
            pieceSerialNos: [p.serialNo],
            pieceSplit: partial && pq > need + 0.0001,
          },
        })
      }
      continue
    }

    if (avail + 0.0001 < need) continue
    candidates.push({
      remnant: isRemnantBatch(b),
      length: avail,
      batchNo: b.batchNo || '',
      serialNo: '',
      allocation: {
        batchId: b.id,
        batchNo: b.batchNo,
        qty: whole ? avail : need,
        unit: b.unit || '',
      },
    })
  }

  if (!candidates.length) return null
  candidates.sort((a, b) => compareOutboundPickCandidates(a, b, rule))
  return candidates[0].allocation
}

/** 仓库+物料在库批次可用合计 */
export function getOutboundAvailableBatchQty(warehouse, itemCode) {
  if (!warehouse || !itemCode) return 0
  return roundQty(
    listBatches({ warehouse, itemCode, inStockOnly: true }).reduce(
      (s, b) => s + (Number(b.currentLength) || 0),
      0,
    ),
  )
}

/**
 * 按出库规则拆分配额
 * @returns {{ ok: boolean, message?: string, allocations: Array<{batchId,batchNo,qty,unit}>, available: number }}
 */
export function allocateOutboundBatches({
  warehouse,
  itemCode,
  demandQty,
  rule,
  salesOrderId,
  salesOrderNo,
  freeOnly = false,
  excludeOtherDedicated = false,
  line,
  issueStrategy,
} = {}) {
  const need = roundQty(demandQty)
  if (!(need > 0)) {
    return { ok: false, message: '出库数量须大于 0', allocations: [], available: 0 }
  }
  if (!warehouse || !itemCode) {
    return { ok: false, message: '缺少仓库或物料编码', allocations: [], available: 0 }
  }

  const strategy = resolveIssueStrategyFromOpts({ line, issueStrategy })
  const partial = strategy === DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
  const enhancedPick = line ? isLineEnhancedBlankingPick(line) : false
  const issueRule =
    rule === OUTBOUND_ISSUE_RULES.LIFO ? OUTBOUND_ISSUE_RULES.LIFO : OUTBOUND_ISSUE_RULES.FIFO
  let rawBatches = listBatches({ warehouse, itemCode, inStockOnly: true })
  if (freeOnly) {
    rawBatches = rawBatches.filter((b) => !(b.salesOrderId || b.salesOrderNo))
  } else if (salesOrderId || salesOrderNo) {
    rawBatches = rawBatches.filter(
      (b) =>
        (salesOrderId && b.salesOrderId === salesOrderId) ||
        (!salesOrderId && salesOrderNo && String(b.salesOrderNo || '') === String(salesOrderNo)),
    )
  } else if (excludeOtherDedicated) {
    // 显式开启：可扣自由备货，剔除挂了销售单的按单批（避免误扣他单）
    rawBatches = rawBatches.filter((b) => !(b.salesOrderId || b.salesOrderNo))
  }
  const available = roundQty(rawBatches.reduce((s, b) => s + (Number(b.currentLength) || 0), 0))
  if (available < need) {
    return {
      ok: false,
      message: `可用库存不足（需 ${need}，可用 ${available}）`,
      allocations: [],
      available,
    }
  }

  // 需下料结算：优先单批满足 + 余料优先；普通物料：直接按批次号 FIFO 跨批扣
  if (enhancedPick) {
    const wholePick = pickWholeSatisfyAllocation(rawBatches, need, issueRule, strategy)
    if (wholePick) {
      return { ok: true, allocations: [wholePick], available }
    }
  }

  const batches = enhancedPick
    ? sortBatchesByIssueRule(rawBatches, issueRule)
    : sortBatchesSimpleFifo(rawBatches, issueRule)
  let left = need
  const allocations = []
  for (const b of batches) {
    if (!(left > 0)) break
    const avail = roundQty(Number(b.currentLength) || 0)
    if (!(avail > 0)) continue

    if (isPieceManagedBatch(b)) {
      const target = roundQty(Math.min(avail, left))
      if (partial) {
        const pick = pickPiecesFifoForPartialQty(b.id, target)
        if (!pick.ok) continue
        const take = roundQty(pick.consumeQty ?? pick.total)
        if (!(take > 0)) continue
        allocations.push({
          batchId: b.id,
          batchNo: b.batchNo,
          qty: take,
          unit: b.unit || '',
          pieceIds: pick.pieces.map((p) => p.id),
          pieceSerialNos: pick.pieces.map((p) => p.serialNo),
          pieceSplit: Boolean(pick.split),
        })
        left = roundQty(left - take)
        continue
      }
      // 整出+余料回：整件出库直至 ≥ 剩余需求（可略超；本批不足则跨批）
      const pick = pickPiecesFifoCoveringQty(b.id, left)
      const take = roundQty(pick.total)
      if (!(take > 0)) continue
      allocations.push({
        batchId: b.id,
        batchNo: b.batchNo,
        qty: take,
        unit: b.unit || '',
        pieceIds: pick.pieces.map((p) => p.id),
        pieceSerialNos: pick.pieces.map((p) => p.serialNo),
      })
      left = roundQty(left - take)
      continue
    }

    // 一批一码 / 一类一码
    if (partial) {
      const take = roundQty(Math.min(avail, left))
      allocations.push({
        batchId: b.id,
        batchNo: b.batchNo,
        qty: take,
        unit: b.unit || '',
      })
      left = roundQty(left - take)
    } else {
      // 整出+余料回：整批出库（可大于剩余需求），余料经下料结算回库
      const take = avail
      allocations.push({
        batchId: b.id,
        batchNo: b.batchNo,
        qty: take,
        unit: b.unit || '',
      })
      left = roundQty(left - take)
    }
  }

  if (!(left <= 0) || !allocations.length) {
    const pieceHint =
      left > 0
        ? partial
          ? `；剩余 ${left} 无法从在库件码分配（无足够整件可凑齐，也无单件 ≥ 需求可拆）`
          : `；一物一码须按整件出库，剩余 ${left} 无法用整件凑齐，请调整出库数量`
        : ''
    return {
      ok: false,
      message: `可用库存不足（需 ${need}，可用 ${available}）${pieceHint}`,
      allocations: [],
      available,
    }
  }

  return { ok: true, allocations, available }
}

/** 预览文案：将扣哪些批次 */
export function formatBatchAllocationPreview(allocations = [], unit = '') {
  if (!allocations.length) return ''
  const u = unit || allocations[0]?.unit || ''
  return allocations.map((a) => `${a.batchNo}×${a.qty}${u}`).join('；')
}

export function sumBatchAllocations(allocations = []) {
  return roundQty(allocations.reduce((s, a) => s + (Number(a.qty) || 0), 0))
}

/**
 * 兼容旧数据：仅有 pickedBatchId 时转为 batchAllocations
 * @returns {Array<{batchId,batchNo,qty,unit,available?}>}
 */
export function getLineBatchAllocations(line = {}) {
  if (Array.isArray(line.batchAllocations) && line.batchAllocations.length) {
    return line.batchAllocations
      .map((a) => ({
        batchId: a.batchId,
        batchNo: a.batchNo || '',
        qty: roundQty(a.qty),
        unit: a.unit || line.unit || '',
        available: a.available != null ? roundQty(a.available) : undefined,
        pieceIds: Array.isArray(a.pieceIds) ? a.pieceIds.filter(Boolean) : undefined,
        pieceSerialNos: Array.isArray(a.pieceSerialNos)
          ? a.pieceSerialNos.filter(Boolean)
          : undefined,
      }))
      .filter((a) => a.batchId)
  }
  if (line.pickedBatchId) {
    const batch = getBatchById(line.pickedBatchId)
    const avail = roundQty(Number(batch?.currentLength ?? line.pickedLength) || 0)
    const qty = roundQty(Number(line.shipQty) || avail)
    return [
      {
        batchId: line.pickedBatchId,
        batchNo: line.pickedBatchNo || batch?.batchNo || '',
        qty: qty > 0 ? qty : avail,
        unit: line.unit || batch?.unit || '',
        available: avail,
      },
    ]
  }
  return []
}

/**
 * 写回行上的批次分配
 * @param {{ syncShipQty?: boolean }} [opts] syncShipQty 默认 true；自主拣选填数量时传 false
 */
export function applyBatchAllocationsToLine(line, allocations = [], opts = {}) {
  const syncShipQty = opts.syncShipQty !== false
  const list = (allocations || [])
    .map((a) => ({
      batchId: a.batchId,
      batchNo: a.batchNo || getBatchById(a.batchId)?.batchNo || '',
      qty: roundQty(a.qty),
      unit: a.unit || line.unit || '',
      available:
        a.available != null
          ? roundQty(a.available)
          : roundQty(Number(getBatchById(a.batchId)?.currentLength) || 0),
      pieceIds: Array.isArray(a.pieceIds) ? a.pieceIds.filter(Boolean) : undefined,
      pieceSerialNos: Array.isArray(a.pieceSerialNos)
        ? a.pieceSerialNos.filter(Boolean)
        : undefined,
    }))
    .filter((a) => a.batchId && (Number(a.qty) > 0 || !syncShipQty))

  const positive = list.filter((a) => Number(a.qty) > 0)
  line.batchAllocations = syncShipQty ? positive : list.length ? list : positive
  line.manualPickBatchIds = (syncShipQty ? positive : list).map((a) => a.batchId)
  const total = sumBatchAllocations(positive)
  if (syncShipQty) {
    line.shipQty = total > 0 ? total : null
  }
  const display = positive.length ? positive : list
  if (display.length) {
    line.pickedBatchId = display[0].batchId
    line.pickedBatchNo = display[0].batchNo
    line.pickedLength = display[0].available ?? display[0].qty
    line.barcodeBatchNo = display
      .map((a) => a.batchNo)
      .filter(Boolean)
      .join('、')
  } else {
    line.pickedBatchId = null
    line.pickedBatchNo = ''
    line.pickedLength = null
    line.barcodeBatchNo = ''
  }
  return line
}

/**
 * 自主拣选：写入所选批次，并按出库数量预览「小批优先」跨批分配（不改 shipQty）
 */
export function syncManualPickBatchesToLine(line, batchIds = []) {
  const ids = Array.isArray(batchIds) ? batchIds.filter(Boolean) : []
  line.manualBatchPick = true
  line.manualPickBatchIds = ids
  if (!ids.length) {
    line.batchAllocations = []
    line.pickedBatchId = null
    line.pickedBatchNo = ''
    line.pickedLength = null
    line.barcodeBatchNo = ''
    return line
  }
  const demand = Number(line.shipQty) || 0
  if (demand > 0) {
    const res = allocateFromSelectedBatches({
      batchIds: ids,
      demandQty: demand,
      unit: line.unit || '',
      line,
    })
    if (res.ok) {
      applyBatchAllocationsToLine(line, res.allocations, { syncShipQty: false })
      return line
    }
  }
  // 仅选批、尚未填数量或数量超限：先挂上批次余量预览（qty=0 表示待按出库数量扣）
  const preview = ids.map((id) => {
    const batch = getBatchById(id)
    const avail = roundQty(Number(batch?.currentLength) || 0)
    return {
      batchId: id,
      batchNo: batch?.batchNo || '',
      qty: 0,
      unit: batch?.unit || line.unit || '',
      available: avail,
    }
  })
  applyBatchAllocationsToLine(line, preview, { syncShipQty: false })
  return line
}

/** 多选批次 ID → 分配行（保留已有数量，新增默认取满余量） */
export function buildAllocationsFromBatchIds(line, batchIds = [], prevAllocations = null) {
  const prev = new Map(
    (prevAllocations || getLineBatchAllocations(line)).map((a) => [a.batchId, a]),
  )
  const ids = Array.isArray(batchIds) ? batchIds.filter(Boolean) : []
  return ids.map((id) => {
    const batch = getBatchById(id)
    const avail = roundQty(Number(batch?.currentLength) || 0)
    const old = prev.get(id)
    let qty = old != null ? roundQty(old.qty) : avail
    if (!(qty > 0)) qty = avail
    if (avail > 0 && qty > avail) qty = avail
    const row = {
      batchId: id,
      batchNo: batch?.batchNo || old?.batchNo || '',
      qty,
      unit: batch?.unit || line.unit || '',
      available: avail,
    }
    if (old?.pieceIds?.length) {
      row.pieceIds = [...old.pieceIds]
      row.pieceSerialNos = old.pieceSerialNos ? [...old.pieceSerialNos] : undefined
    }
    return row
  })
}

/**
 * 校验自主拣选：须有出库数量 + 所选批次；按小批优先跨批扣减后校验件码
 * @returns {{ ok: boolean, message?: string, allocations?: Array, total?: number }}
 */
export function validateManualBatchAllocations(line, { requireAllocations = true } = {}) {
  const ids = getManualPickBatchIds(line)
  if (!ids.length) {
    if (!requireAllocations) return { ok: true }
    return { ok: false, message: '请至少选择一个批次' }
  }
  const demand = Number(line.shipQty) || 0
  if (!(demand > 0)) {
    return { ok: false, message: '请填写出库数量' }
  }
  const allocated = allocateFromSelectedBatches({
    batchIds: ids,
    demandQty: demand,
    unit: line.unit || '',
    line,
  })
  if (!allocated.ok) {
    return allocated
  }
  const partial = isLinePartialBatchIssue(line)
  const allocations = allocated.allocations.map((a) => ({ ...a }))
  for (const a of allocations) {
    const batch = getBatchById(a.batchId)
    if (!batch) {
      return { ok: false, message: `批次 ${a.batchNo || a.batchId} 不存在` }
    }
    if (isPieceManagedBatch(batch)) {
      const prev = getLineBatchAllocations(line).find((x) => x.batchId === a.batchId)
      if (Array.isArray(prev?.pieceIds) && prev.pieceIds.length) {
        a.pieceIds = [...prev.pieceIds]
        a.pieceSerialNos = prev.pieceSerialNos ? [...prev.pieceSerialNos] : undefined
      }
      if (Array.isArray(a.pieceIds) && a.pieceIds.length) {
        let sum = 0
        for (const pid of a.pieceIds) {
          const p = getStockPieceById(pid)
          if (!p || p.batchId !== a.batchId) {
            return { ok: false, message: `批次 ${a.batchNo} 件码无效` }
          }
          if (p.status !== '在库') {
            return { ok: false, message: `件码 ${p.serialNo} 不在库` }
          }
          sum = roundQty(sum + (Number(p.pieceQty) || 0))
        }
        const qty = roundQty(a.qty)
        const canSplit =
          partial && a.pieceIds.length === 1 && sum + 0.0001 >= qty && Math.abs(sum - qty) > 0.0001
        if (!canSplit && Math.abs(sum - qty) > 0.0001) {
          return {
            ok: false,
            message: `批次 ${a.batchNo} 勾选件码合计 ${sum} 与分配数量 ${qty} 不一致`,
          }
        }
        if (canSplit) a.pieceSplit = true
      } else if (partial) {
        const partialPick = pickPiecesFifoForPartialQty(a.batchId, a.qty)
        if (!partialPick.ok) {
          return { ok: false, message: partialPick.message }
        }
        a.pieceIds = partialPick.pieces.map((p) => p.id)
        a.pieceSerialNos = partialPick.pieces.map((p) => p.serialNo)
        a.pieceSplit = Boolean(partialPick.split)
      } else {
        const exact = pickPiecesFifoForQty(a.batchId, a.qty)
        if (!exact.ok) {
          return { ok: false, message: exact.message }
        }
        a.pieceIds = exact.pieces.map((p) => p.id)
        a.pieceSerialNos = exact.pieces.map((p) => p.serialNo)
      }
    }
  }
  const total = sumBatchAllocations(allocations)
  if (!(total > 0)) {
    return { ok: false, message: '出库数量须大于 0' }
  }
  return { ok: true, allocations, total }
}
