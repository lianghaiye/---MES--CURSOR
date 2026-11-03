/**
 * 齐套库存占用台账：手动锁定 + 审计
 * 自动预占由 kitStockAllocate 按优先级实时计算，不落库；
 * 手动锁定持久化，重算时优先保留。
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { persistJson } from '@/utils/safeStorage'
import { stockState } from '@/store/stockStore'

const STORAGE_KEY = 'i_doms_kit_stock_allocations'
const DATA_VERSION = 1

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.version === DATA_VERSION && Array.isArray(parsed.locks)) {
      return {
        locks: parsed.locks,
        audits: Array.isArray(parsed.audits) ? parsed.audits : [],
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  persistJson(STORAGE_KEY, {
    version: DATA_VERSION,
    locks: kitStockAllocationState.locks,
    audits: kitStockAllocationState.audits,
  })
}

const stored = loadFromStorage()

export const kitStockAllocationState = reactive({
  locks: stored?.locks || [],
  audits: stored?.audits || [],
})

watch(
  () => [kitStockAllocationState.locks, kitStockAllocationState.audits],
  () => persist(),
  { deep: true },
)

function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pushAudit(partial) {
  const row = {
    id: nextId('audit'),
    itemCode: '',
    qty: 0,
    targetKey: '',
    targetDocNo: '',
    method: 'manual',
    operator: '当前用户',
    reason: '',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    detail: '',
    ...partial,
  }
  kitStockAllocationState.audits.unshift(row)
  if (kitStockAllocationState.audits.length > 500) {
    kitStockAllocationState.audits.length = 500
  }
  return row
}

/** 有效手动锁定 */
export function listActiveKitLocks(itemCode) {
  const code = String(itemCode || '').trim()
  return (kitStockAllocationState.locks || []).filter(
    (l) => l.status === 'active' && (Number(l.qty) || 0) > 0 && (!code || l.itemCode === code),
  )
}

export function getManualLockQty(targetKey, itemCode) {
  const key = String(targetKey || '').trim()
  const code = String(itemCode || '').trim()
  if (!key || !code) return 0
  return listActiveKitLocks(code)
    .filter((l) => l.targetKey === key)
    .reduce((s, l) => s + (Number(l.qty) || 0), 0)
}

export function getManualLockQtyByItem(itemCode) {
  return listActiveKitLocks(itemCode).reduce((s, l) => s + (Number(l.qty) || 0), 0)
}

/** 实物库存（各仓合计） */
export function getKitItemPhysicalQty(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return 0
  const sum = (stockState.records || [])
    .filter((r) => r.itemCode === code)
    .reduce((s, r) => s + (Number(r.qty) || 0), 0)
  return Math.round(sum * 1000) / 1000
}

/**
 * 某单还可再锁多少：实物 − 其他单已锁（本单已锁不占「他人」额度）
 * 保证全物料有效手动锁合计不超过实物。
 */
export function getManualLockRoom(itemCode, targetKey, physicalQty) {
  const code = String(itemCode || '').trim()
  const key = String(targetKey || '').trim()
  const physical =
    physicalQty != null && Number.isFinite(Number(physicalQty))
      ? Math.max(0, Number(physicalQty))
      : getKitItemPhysicalQty(code)
  if (!code || !key) return 0
  const locks = listActiveKitLocks(code)
  const others = locks
    .filter((l) => l.targetKey !== key)
    .reduce((s, l) => s + (Number(l.qty) || 0), 0)
  const mine = locks
    .filter((l) => l.targetKey === key)
    .reduce((s, l) => s + (Number(l.qty) || 0), 0)
  const maxForMe = Math.max(0, physical - others)
  return Math.round(Math.max(0, maxForMe - mine) * 1000) / 1000
}

/**
 * 转入本单可设上限（总量）：min(需求, 实物 − 其他单已锁)
 * 确认后按输入数量重写该单手动锁（输入多少锁多少）。
 */
export function getTransferInMaxQty({ itemCode, targetKey, demandQty, physicalQty } = {}) {
  const demand = Math.max(0, Number(demandQty) || 0)
  const code = String(itemCode || '').trim()
  const key = String(targetKey || '').trim()
  const physical =
    physicalQty != null && Number.isFinite(Number(physicalQty))
      ? Math.max(0, Number(physicalQty))
      : getKitItemPhysicalQty(code)
  if (!code || !key) return 0
  const others = listActiveKitLocks(code)
    .filter((l) => l.targetKey !== key)
    .reduce((s, l) => s + (Number(l.qty) || 0), 0)
  const maxTotal = Math.max(0, physical - others)
  return Math.round(Math.min(demand, maxTotal) * 1000) / 1000
}

/**
 * 手动锁定（指定占用）
 * @param {{ itemCode: string, qty: number, targetKey: string, targetDocNo?: string, targetLabel?: string, reason?: string, operator?: string, physicalQty?: number }} payload
 */
export function lockKitStock(payload) {
  const itemCode = String(payload?.itemCode || '').trim()
  const targetKey = String(payload?.targetKey || '').trim()
  let qty = Math.max(0, Number(payload?.qty) || 0)
  if (!itemCode || !targetKey || qty <= 0) {
    return { ok: false, message: '锁定参数不完整' }
  }
  const room = getManualLockRoom(itemCode, targetKey, payload?.physicalQty)
  if (room <= 0) {
    return {
      ok: false,
      message: '实物库存已被其他单据锁定占满，无法再转入本单',
    }
  }
  if (qty > room + 1e-9) {
    qty = room
  }
  const lock = {
    id: nextId('lock'),
    itemCode,
    qty,
    targetKey,
    targetDocNo: payload.targetDocNo || '',
    targetLabel: payload.targetLabel || payload.targetDocNo || targetKey,
    reason: payload.reason || '手动占用',
    operator: payload.operator || '当前用户',
    status: 'active',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  kitStockAllocationState.locks.unshift(lock)
  pushAudit({
    itemCode,
    qty,
    targetKey,
    targetDocNo: lock.targetDocNo,
    method: 'lock',
    operator: lock.operator,
    reason: lock.reason,
    detail: `手动锁定 ${qty}`,
  })
  return { ok: true, lock, capped: qty < Number(payload?.qty) }
}

export function releaseKitLock(lockId, { operator, reason } = {}) {
  const lock = kitStockAllocationState.locks.find((l) => l.id === lockId)
  if (!lock || lock.status !== 'active') {
    return { ok: false, message: '锁定不存在或已释放' }
  }
  lock.status = 'released'
  lock.releasedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  lock.releaseOperator = operator || '当前用户'
  lock.releaseReason = reason || '手动释放'
  pushAudit({
    itemCode: lock.itemCode,
    qty: lock.qty,
    targetKey: lock.targetKey,
    targetDocNo: lock.targetDocNo,
    method: 'release',
    operator: lock.releaseOperator,
    reason: lock.releaseReason,
    detail: `释放锁定 ${lock.qty}`,
  })
  return { ok: true, lock }
}

/** 释放某物料下某单据的全部有效手动锁（物料视角，不依赖入口单） */
export function releaseKitLocksForTarget(itemCode, targetKey, { operator, reason } = {}) {
  const code = String(itemCode || '').trim()
  const key = String(targetKey || '').trim()
  if (!code || !key) return { ok: false, message: '参数不完整' }
  const locks = listActiveKitLocks(code).filter((l) => l.targetKey === key)
  if (!locks.length) return { ok: false, message: '该单没有手动锁定' }
  locks.forEach((l) => releaseKitLock(l.id, { operator, reason: reason || '物料占用明细释放' }))
  return { ok: true, count: locks.length, qty: locks.reduce((s, l) => s + (Number(l.qty) || 0), 0) }
}

/**
 * 调整某单手动锁总量：先释放该单旧锁，再按目标数量重锁（受实物额度约束）
 */
export function setKitManualLockTotal({
  itemCode,
  targetKey,
  qty,
  targetDocNo,
  targetLabel,
  reason,
  operator,
  physicalQty,
} = {}) {
  const code = String(itemCode || '').trim()
  const key = String(targetKey || '').trim()
  const want = Math.max(0, Number(qty) || 0)
  if (!code || !key) return { ok: false, message: '参数不完整' }

  const existing = listActiveKitLocks(code).filter((l) => l.targetKey === key)
  existing.forEach((l) => releaseKitLock(l.id, { operator, reason: reason || '调整前释放旧锁' }))

  if (want <= 0) {
    return { ok: true, qty: 0, released: existing.length }
  }

  // 释放本单旧锁后重新计算额度
  const room = getManualLockRoom(code, key, physicalQty)
  const lockQty = Math.min(want, room)
  if (lockQty <= 0) {
    return { ok: false, message: '实物库存已被其他单据锁定占满，无法调整' }
  }
  const res = lockKitStock({
    itemCode: code,
    qty: lockQty,
    targetKey: key,
    targetDocNo,
    targetLabel,
    reason: reason || '调整手动锁定',
    operator,
    physicalQty,
  })
  if (!res.ok) return res
  return {
    ok: true,
    lock: res.lock,
    qty: lockQty,
    capped: lockQty < want,
    released: existing.length,
  }
}

/**
 * 让路：从 fromKey 释放等量自动权益，改为锁定给 toKey
 * 实现：给 toKey 增加手动锁定；重算时 toKey 优先拿到量
 */
export function yieldKitStock({
  itemCode,
  qty,
  fromKey,
  fromDocNo,
  toKey,
  toDocNo,
  toLabel,
  reason,
  operator,
} = {}) {
  const amount = Math.max(0, Number(qty) || 0)
  if (!itemCode || !toKey || amount <= 0) {
    return { ok: false, message: '让路参数不完整' }
  }
  const result = lockKitStock({
    itemCode,
    qty: amount,
    targetKey: toKey,
    targetDocNo: toDocNo,
    targetLabel: toLabel || toDocNo,
    reason: reason || `自 ${fromDocNo || fromKey || '—'} 让路`,
    operator,
  })
  if (!result.ok) return result
  pushAudit({
    itemCode,
    qty: amount,
    targetKey: toKey,
    targetDocNo: toDocNo || '',
    method: 'yield',
    operator: operator || '当前用户',
    reason: reason || '让路',
    detail: `${fromDocNo || fromKey || '—'} → ${toDocNo || toKey}`,
  })
  return result
}

/** 抢占：给目标加手动锁定，审计 method=seize */
export function seizeKitStock({
  itemCode,
  qty,
  fromKey,
  fromDocNo,
  toKey,
  toDocNo,
  toLabel,
  reason,
  operator,
} = {}) {
  const amount = Math.max(0, Number(qty) || 0)
  if (!itemCode || !toKey || amount <= 0) {
    return { ok: false, message: '抢占参数不完整' }
  }
  const result = lockKitStock({
    itemCode,
    qty: amount,
    targetKey: toKey,
    targetDocNo: toDocNo,
    targetLabel: toLabel || toDocNo,
    reason: reason || `抢占自 ${fromDocNo || fromKey || '—'}`,
    operator,
  })
  if (!result.ok) return result
  pushAudit({
    itemCode,
    qty: amount,
    targetKey: toKey,
    targetDocNo: toDocNo || '',
    method: 'seize',
    operator: operator || '当前用户',
    reason: reason || '抢占',
    detail: `${fromDocNo || fromKey || '—'} → ${toDocNo || toKey}`,
  })
  return result
}

export function listKitAllocationAudits({ itemCode, limit = 50 } = {}) {
  const code = String(itemCode || '').trim()
  return (kitStockAllocationState.audits || [])
    .filter((a) => !code || a.itemCode === code)
    .slice(0, limit)
}
