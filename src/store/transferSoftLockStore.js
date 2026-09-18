/**
 * 调拨软锁：数量仍挂调出仓，可用量扣除；签收迁仓 / 拒绝解锁
 */
import { reactive, watch } from 'vue'
import { persistJson } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_transfer_soft_locks'
const DATA_VERSION = 1

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version === DATA_VERSION && Array.isArray(parsed.locks)) return parsed.locks
  } catch {
    /* ignore */
  }
  return null
}

export const transferSoftLockState = reactive({
  locks: load() || [],
})

watch(
  () => transferSoftLockState.locks,
  () => persistJson(STORAGE_KEY, { version: DATA_VERSION, locks: transferSoftLockState.locks }),
  { deep: true },
)

function nid() {
  return `tflock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * @param {{
 *   transferOrderId: string,
 *   transferLineId: string,
 *   warehouse: string,
 *   itemCode: string,
 *   itemName?: string,
 *   batchId?: string,
 *   batchNo?: string,
 *   qty: number,
 *   unit?: string,
 * }} lock
 */
export function addTransferSoftLock(lock) {
  const qty = Number(lock.qty) || 0
  if (!(qty > 0) || !lock.transferOrderId || !lock.transferLineId) return null
  const row = {
    id: nid(),
    transferOrderId: lock.transferOrderId,
    transferLineId: lock.transferLineId,
    warehouse: String(lock.warehouse || '').trim(),
    itemCode: String(lock.itemCode || '').trim(),
    itemName: lock.itemName || '',
    batchId: lock.batchId || '',
    batchNo: lock.batchNo || '',
    qty,
    unit: lock.unit || '件',
    createdAt: new Date().toISOString(),
  }
  transferSoftLockState.locks.push(row)
  return row
}

export function releaseTransferSoftLocksByLineIds(transferLineIds = []) {
  const set = new Set((transferLineIds || []).map(String))
  if (!set.size) return 0
  const before = transferSoftLockState.locks.length
  transferSoftLockState.locks = transferSoftLockState.locks.filter(
    (l) => !set.has(String(l.transferLineId)),
  )
  return before - transferSoftLockState.locks.length
}

export function releaseTransferSoftLocksByOrderId(transferOrderId) {
  const id = String(transferOrderId || '')
  if (!id) return 0
  const before = transferSoftLockState.locks.length
  transferSoftLockState.locks = transferSoftLockState.locks.filter(
    (l) => String(l.transferOrderId) !== id,
  )
  return before - transferSoftLockState.locks.length
}

/** 某仓某料（可选批次）被软锁数量 */
export function getTransferSoftLockedQty({ warehouse, itemCode, batchId } = {}) {
  void transferSoftLockState.locks
  const wh = String(warehouse || '').trim()
  const code = String(itemCode || '').trim()
  if (!wh || !code) return 0
  return transferSoftLockState.locks
    .filter((l) => {
      if (l.warehouse !== wh || l.itemCode !== code) return false
      if (batchId) return String(l.batchId || '') === String(batchId)
      return true
    })
    .reduce((s, l) => s + (Number(l.qty) || 0), 0)
}
