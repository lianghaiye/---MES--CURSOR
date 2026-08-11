import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  clonePurchaseReceipts,
  createPurchaseReceipt,
  generatePurchaseReceiptNo,
} from '@/mock/purchaseReceipts'

const STORAGE_KEY = 'i_doms_purchase_receipts'
const SEED_VERSION_KEY = 'i_doms_purchase_receipts_seed_v'
const CURRENT_SEED_VERSION = '6'

const UNFINISHED_QC_STATUSES = new Set(['未质检', '质检中'])
const UNFINISHED_INBOUND_STATUSES = new Set(['入库中', '部分入库'])

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.receipts)) return parsed.receipts.map(normalizeReceipt)
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ receipts: purchaseReceiptState.receipts }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function migrateLegacyInboundStatus(receipt) {
  if (receipt.inboundStatus) return receipt.inboundStatus
  const legacy = receipt.receiptStatus
  if (legacy === '入库中') return '入库中'
  if (legacy === '已完成') return '已入库'
  return '待入库'
}

/** 是否已生成质检单 */
export function hasReceiptQcSheet(receipt) {
  return Boolean(String(receipt?.qcNo || '').trim())
}

/** 是否已生成入库单（用于作废/进行中判定） */
export function hasReceiptInboundOrder(receipt) {
  if (!receipt) return false
  if (receipt.inboundStatus && receipt.inboundStatus !== '待入库') return true
  if (String(receipt.inboundOrderNo || '').trim()) return true
  if (Array.isArray(receipt.inboundOrderIds) && receipt.inboundOrderIds.length) return true
  return false
}

/**
 * 根据关联单据推导单据状态：
 * - 已入库 → 已完成
 * - 已生成质检单或入库单 → 进行中
 * - 否则保持新建（不覆盖作废/已完成）
 */
export function deriveReceiptDocStatus(receipt, preferredStatus) {
  if (
    preferredStatus === '作废' ||
    receipt?.receiptStatus === '作废' ||
    receipt?.receiptStatus === '已作废'
  ) {
    return '作废'
  }
  if (preferredStatus === '已完成') return '已完成'

  const inboundStatus = receipt?.inboundStatus || '待入库'
  if (inboundStatus === '已入库') return '已完成'
  if (hasReceiptQcSheet(receipt) || hasReceiptInboundOrder(receipt)) return '进行中'
  if (preferredStatus === '进行中' || preferredStatus === '新建') return preferredStatus
  return '新建'
}

function normalizeReceipt(row) {
  const r = { ...row }
  r.inboundStatus = migrateLegacyInboundStatus(r)
  if (r.receiptStatus === '已作废' || r.receiptStatus === '入库中') {
    // 入库中曾被误用作单据状态
    if (r.receiptStatus === '已作废') r.receiptStatus = '作废'
  }
  if (r.receiptStatus === '作废') {
    // keep
  } else {
    r.receiptStatus = deriveReceiptDocStatus(r, r.receiptStatus === '已完成' ? '已完成' : undefined)
  }
  if (!r.creator) r.creator = r.purchaser || 'admin1'
  if (!r.updater) r.updater = r.creator
  if (!r.updatedAt) r.updatedAt = r.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
  if (r.createdAt && String(r.createdAt).length === 10) {
    r.createdAt = `${r.createdAt} 00:00:00`
  }
  if (!Array.isArray(r.lineItems)) r.lineItems = []
  if (!r.qcStatus) r.qcStatus = '未质检'
  return r
}

function initReceipts() {
  const list = shouldReseed()
    ? clonePurchaseReceipts()
    : loadFromStorage() || clonePurchaseReceipts()
  return list.map(normalizeReceipt)
}

export const purchaseReceiptState = reactive({
  receipts: initReceipts(),
})

watch(
  () => purchaseReceiptState.receipts,
  () => persist(),
  { deep: true },
)

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export function addPurchaseReceipt(partial = {}) {
  const receiptNo =
    String(partial.receiptNo || '').trim() ||
    generatePurchaseReceiptNo(purchaseReceiptState.receipts)
  const now = nowText()
  const draft = createPurchaseReceipt({
    ...partial,
    receiptNo,
    inboundStatus: partial.inboundStatus || '待入库',
    creator: partial.creator || 'admin1',
    createdAt: partial.createdAt || now,
    updater: partial.updater || partial.creator || 'admin1',
    updatedAt: partial.updatedAt || now,
  })
  draft.receiptStatus = deriveReceiptDocStatus(draft, partial.receiptStatus)
  purchaseReceiptState.receipts.unshift(draft)
  return draft
}

export function updatePurchaseReceipt(id, patch = {}) {
  const idx = purchaseReceiptState.receipts.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const current = purchaseReceiptState.receipts[idx]
  const next = { ...patch }
  const merged = { ...current, ...next }
  // 未显式指定单据状态时，按关联质检/入库自动推导（新建→进行中，已入库→已完成）
  if (next.receiptStatus == null) {
    next.receiptStatus = deriveReceiptDocStatus(merged)
  }
  Object.assign(purchaseReceiptState.receipts[idx], next, {
    updater: next.updater || 'admin1',
    updatedAt: next.updatedAt || nowText(),
  })
  return purchaseReceiptState.receipts[idx]
}

/**
 * 挂接质检单：写入质检单号并将单据状态置为进行中
 */
export function attachReceiptQcSheet(id, { qcNo, qcStatus = '质检中' } = {}) {
  if (!String(qcNo || '').trim()) return null
  return updatePurchaseReceipt(id, {
    qcNo: String(qcNo).trim(),
    qcStatus,
  })
}

/**
 * 挂接采购入库单：写入入库单关联并将单据状态置为进行中
 */
export function attachReceiptInboundOrder(
  id,
  { inboundOrderNo, inboundOrderId, inboundStatus } = {},
) {
  const patch = {}
  if (inboundOrderNo) patch.inboundOrderNo = inboundOrderNo
  if (inboundOrderId) {
    const current = getPurchaseReceiptById(id)
    const ids = new Set(current?.inboundOrderIds || [])
    ids.add(inboundOrderId)
    patch.inboundOrderIds = [...ids]
  }
  if (inboundStatus) patch.inboundStatus = inboundStatus
  else if (
    !getPurchaseReceiptById(id)?.inboundStatus ||
    getPurchaseReceiptById(id)?.inboundStatus === '待入库'
  ) {
    patch.inboundStatus = '入库中'
  }
  return updatePurchaseReceipt(id, patch)
}

export function deletePurchaseReceipt(id) {
  const idx = purchaseReceiptState.receipts.findIndex((r) => r.id === id)
  if (idx === -1) return false
  purchaseReceiptState.receipts.splice(idx, 1)
  return true
}

export function getPurchaseReceiptById(id) {
  return purchaseReceiptState.receipts.find((r) => r.id === id) || null
}

/** 是否存在未完成的来料质检单 */
export function hasUnfinishedReceiptQc(receipt) {
  if (!hasReceiptQcSheet(receipt)) return false
  return UNFINISHED_QC_STATUSES.has(receipt.qcStatus || '未质检')
}

/** 是否存在未完成的采购入库单 */
export function hasUnfinishedReceiptInbound(receipt) {
  if (!receipt) return false
  if (UNFINISHED_INBOUND_STATUSES.has(receipt.inboundStatus || '')) return true
  if (
    Array.isArray(receipt.unfinishedInboundOrderIds) &&
    receipt.unfinishedInboundOrderIds.length
  ) {
    return true
  }
  return false
}

export function canEditPurchaseReceipt(receipt) {
  return receipt?.receiptStatus === '新建'
}

export function canVoidPurchaseReceipt(receipt) {
  if (!receipt || receipt.receiptStatus !== '新建') return false
  if (hasReceiptQcSheet(receipt)) return false
  if (hasReceiptInboundOrder(receipt)) return false
  return true
}

/** 新建/进行中，且无未完成来料质检单、采购入库单时可手动完成 */
export function canCompletePurchaseReceipt(receipt) {
  if (!receipt) return false
  if (receipt.receiptStatus !== '新建' && receipt.receiptStatus !== '进行中') return false
  if (hasUnfinishedReceiptQc(receipt)) return false
  if (hasUnfinishedReceiptInbound(receipt)) return false
  return true
}

export function voidPurchaseReceipt(id) {
  const receipt = getPurchaseReceiptById(id)
  if (!receipt) return { ok: false, message: '收货单不存在' }
  if (!canVoidPurchaseReceipt(receipt)) {
    if (hasReceiptQcSheet(receipt) || hasReceiptInboundOrder(receipt)) {
      return { ok: false, message: '已生成质检单或入库单的收货单不可作废' }
    }
    return { ok: false, message: `收货单「${receipt.receiptNo}」不可作废` }
  }
  updatePurchaseReceipt(id, { receiptStatus: '作废' })
  return { ok: true, message: `收货单「${receipt.receiptNo}」已作废` }
}

export function completePurchaseReceipt(id) {
  const receipt = getPurchaseReceiptById(id)
  if (!receipt) return { ok: false, message: '收货单不存在' }
  if (!canCompletePurchaseReceipt(receipt)) {
    if (hasUnfinishedReceiptQc(receipt)) {
      return { ok: false, message: '存在未完成的来料质检单，不可完成' }
    }
    if (hasUnfinishedReceiptInbound(receipt)) {
      return { ok: false, message: '存在未完成的采购入库单，不可完成' }
    }
    return { ok: false, message: `收货单「${receipt.receiptNo}」不可完成` }
  }
  updatePurchaseReceipt(id, { receiptStatus: '已完成' })
  return { ok: true, message: `收货单「${receipt.receiptNo}」已完成` }
}
