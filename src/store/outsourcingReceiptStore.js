import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  cloneOutsourcingReceipts,
  createOutsourcingReceipt,
  generateOutsourcingReceiptNo,
} from '@/mock/outsourcingReceipts'

const STORAGE_KEY = 'i_doms_outsourcing_receipts'
const SEED_VERSION_KEY = 'i_doms_outsourcing_receipts_seed_v'
const CURRENT_SEED_VERSION = '1'

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ receipts: outsourcingReceiptState.receipts }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function migrateLegacyInboundStatus(receipt) {
  if (receipt.inboundStatus) return receipt.inboundStatus
  const legacy = receipt.receiptStatus
  if (legacy === '入库中') return '入库中'
  if (legacy === '已完成') return '已入库'
  return '待入库'
}

export function hasReceiptQcSheet(receipt) {
  return Boolean(String(receipt?.qcNo || '').trim())
}

export function hasReceiptInboundOrder(receipt) {
  if (!receipt) return false
  if (receipt.inboundStatus && receipt.inboundStatus !== '待入库') return true
  if (String(receipt.inboundOrderNo || '').trim()) return true
  if (Array.isArray(receipt.inboundOrderIds) && receipt.inboundOrderIds.length) return true
  return false
}

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
    if (r.receiptStatus === '已作废') r.receiptStatus = '作废'
  }
  if (r.receiptStatus !== '作废') {
    r.receiptStatus = deriveReceiptDocStatus(r, r.receiptStatus === '已完成' ? '已完成' : undefined)
  }
  if (!r.outsourcingOrderNo && r.purchaseOrderNo) r.outsourcingOrderNo = r.purchaseOrderNo
  if (!r.outsourcingOrderId && r.purchaseOrderId) r.outsourcingOrderId = r.purchaseOrderId
  if (!r.purchaseOrderNo && r.outsourcingOrderNo) r.purchaseOrderNo = r.outsourcingOrderNo
  if (!r.purchaseOrderId && r.outsourcingOrderId) r.purchaseOrderId = r.outsourcingOrderId
  if (!r.creator) r.creator = r.contactPerson || r.purchaser || 'admin1'
  if (!r.updater) r.updater = r.creator
  if (!r.updatedAt) r.updatedAt = r.createdAt || dayjs().format('YYYY-MM-DD HH:mm')
  if (!Array.isArray(r.lineItems)) r.lineItems = []
  if (!r.qcStatus) r.qcStatus = '未质检'
  return r
}

function initReceipts() {
  const list = shouldReseed()
    ? cloneOutsourcingReceipts()
    : loadFromStorage() || cloneOutsourcingReceipts()
  return list.map(normalizeReceipt)
}

export const outsourcingReceiptState = reactive({
  receipts: initReceipts(),
})

watch(
  () => outsourcingReceiptState.receipts,
  () => persist(),
  { deep: true },
)

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm')
}

export function addOutsourcingReceipt(partial = {}) {
  const receiptNo =
    String(partial.receiptNo || '').trim() ||
    generateOutsourcingReceiptNo(outsourcingReceiptState.receipts)
  const now = nowText()
  const draft = createOutsourcingReceipt({
    ...partial,
    receiptNo,
    inboundStatus: partial.inboundStatus || '待入库',
    creator: partial.creator || 'admin1',
    createdAt: partial.createdAt || now,
    updater: partial.updater || partial.creator || 'admin1',
    updatedAt: partial.updatedAt || now,
  })
  draft.receiptStatus = deriveReceiptDocStatus(draft, partial.receiptStatus)
  outsourcingReceiptState.receipts.unshift(draft)
  return draft
}

export function updateOutsourcingReceipt(id, patch = {}) {
  const idx = outsourcingReceiptState.receipts.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const current = outsourcingReceiptState.receipts[idx]
  const next = { ...patch }
  const merged = { ...current, ...next }
  if (next.receiptStatus == null) {
    next.receiptStatus = deriveReceiptDocStatus(merged)
  }
  Object.assign(outsourcingReceiptState.receipts[idx], next, {
    updater: next.updater || 'admin1',
    updatedAt: next.updatedAt || nowText(),
  })
  return outsourcingReceiptState.receipts[idx]
}

export function attachReceiptQcSheet(id, { qcNo, qcStatus = '质检中' } = {}) {
  if (!String(qcNo || '').trim()) return null
  return updateOutsourcingReceipt(id, {
    qcNo: String(qcNo).trim(),
    qcStatus,
  })
}

export function attachReceiptInboundOrder(
  id,
  { inboundOrderNo, inboundOrderId, inboundStatus } = {},
) {
  const patch = {}
  if (inboundOrderNo) patch.inboundOrderNo = inboundOrderNo
  if (inboundOrderId) {
    const current = getOutsourcingReceiptById(id)
    const ids = new Set(current?.inboundOrderIds || [])
    ids.add(inboundOrderId)
    patch.inboundOrderIds = [...ids]
  }
  if (inboundStatus) patch.inboundStatus = inboundStatus
  else if (
    !getOutsourcingReceiptById(id)?.inboundStatus ||
    getOutsourcingReceiptById(id)?.inboundStatus === '待入库'
  ) {
    patch.inboundStatus = '入库中'
  }
  return updateOutsourcingReceipt(id, patch)
}

export function deleteOutsourcingReceipt(id) {
  const idx = outsourcingReceiptState.receipts.findIndex((r) => r.id === id)
  if (idx === -1) return false
  outsourcingReceiptState.receipts.splice(idx, 1)
  return true
}

export function getOutsourcingReceiptById(id) {
  return outsourcingReceiptState.receipts.find((r) => r.id === id) || null
}

export function hasUnfinishedReceiptQc(receipt) {
  if (!hasReceiptQcSheet(receipt)) return false
  return UNFINISHED_QC_STATUSES.has(receipt.qcStatus || '未质检')
}

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

export function canEditOutsourcingReceipt(receipt) {
  return receipt?.receiptStatus === '新建'
}

export function canVoidOutsourcingReceipt(receipt) {
  if (!receipt || receipt.receiptStatus !== '新建') return false
  if (hasReceiptQcSheet(receipt)) return false
  if (hasReceiptInboundOrder(receipt)) return false
  return true
}

export function canCompleteOutsourcingReceipt(receipt) {
  if (!receipt) return false
  if (receipt.receiptStatus !== '新建' && receipt.receiptStatus !== '进行中') return false
  if (hasUnfinishedReceiptQc(receipt)) return false
  if (hasUnfinishedReceiptInbound(receipt)) return false
  return true
}

export function voidOutsourcingReceipt(id) {
  const receipt = getOutsourcingReceiptById(id)
  if (!receipt) return { ok: false, message: '收货单不存在' }
  if (!canVoidOutsourcingReceipt(receipt)) {
    if (hasReceiptQcSheet(receipt) || hasReceiptInboundOrder(receipt)) {
      return { ok: false, message: '已生成质检单或入库单的收货单不可作废' }
    }
    return { ok: false, message: `收货单「${receipt.receiptNo}」不可作废` }
  }
  updateOutsourcingReceipt(id, { receiptStatus: '作废' })
  return { ok: true, message: `收货单「${receipt.receiptNo}」已作废` }
}

export function completeOutsourcingReceipt(id) {
  const receipt = getOutsourcingReceiptById(id)
  if (!receipt) return { ok: false, message: '收货单不存在' }
  if (!canCompleteOutsourcingReceipt(receipt)) {
    if (hasUnfinishedReceiptQc(receipt)) {
      return { ok: false, message: '存在未完成的来料质检单，不可完成' }
    }
    if (hasUnfinishedReceiptInbound(receipt)) {
      return { ok: false, message: '存在未完成的外协入库单，不可完成' }
    }
    return { ok: false, message: `收货单「${receipt.receiptNo}」不可完成` }
  }
  updateOutsourcingReceipt(id, { receiptStatus: '已完成' })
  return { ok: true, message: `收货单「${receipt.receiptNo}」已完成` }
}
