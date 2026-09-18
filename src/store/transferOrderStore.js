import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  cloneTransferSeedOrders,
  createTransferLine,
  createTransferOrder,
  generateTransferNo,
} from '@/mock/transferOrders'
import {
  TRANSFER_SOURCE,
  TRANSFER_STATUS,
  TRANSFER_LINE_STATUS,
  isTransferBusinessSource,
  isTransferManualSource,
} from '@/mock/transferOptions'
import {
  postTransferOutboundConfirm,
  recomputeTransferStatusFromLines,
} from '@/utils/transferConfirm'
import { releaseTransferSoftLocksByOrderId } from '@/store/transferSoftLockStore'
import { persistJson, safeSetItem } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_transfer_orders'
const SEED_VERSION_KEY = 'i_doms_transfer_orders_seed_v'
/** v2：两段式状态（已完成/待入库方确认/已作废） */
const CURRENT_SEED_VERSION = '2'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders.map(migrateTransferOrder)
    }
  } catch {
    /* ignore */
  }
  return null
}

function migrateTransferOrder(order) {
  if (!order) return order
  // 旧「已确认」→「已完成」
  if (order.status === '已确认') order.status = TRANSFER_STATUS.DONE
  ;(order.lineItems || []).forEach((l) => {
    if (l.lineStatus === '已确认') l.lineStatus = TRANSFER_LINE_STATUS.DONE
  })
  return order
}

function persist() {
  persistJson(STORAGE_KEY, { orders: transferOrderState.orders })
  safeSetItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

const initial = shouldReseed()
  ? cloneTransferSeedOrders()
  : loadFromStorage() || cloneTransferSeedOrders()

export const transferOrderState = reactive({
  orders: (initial || []).map(migrateTransferOrder),
})

watch(
  () => transferOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getTransferOrderById(id) {
  return transferOrderState.orders.find((o) => o.id === id) || null
}

export function canEditTransfer(order) {
  return order?.status === TRANSFER_STATUS.PENDING
}

export function canDeleteTransfer(order) {
  if (!order || isTransferBusinessSource(order)) return false
  if (!isTransferManualSource(order)) return false
  return order.status === TRANSFER_STATUS.PENDING
}

/** 出库方确认（整单） */
export function canConfirmTransfer(order) {
  if (order?.status !== TRANSFER_STATUS.PENDING) return false
  return (order.lineItems || []).some((l) => {
    const st = l.lineStatus || TRANSFER_LINE_STATUS.PENDING
    return st === TRANSFER_LINE_STATUS.PENDING && Number(l.qty) > 0
  })
}

/** 作废：仅待确认 */
export function canVoidTransfer(order) {
  return order?.status === TRANSFER_STATUS.PENDING
}

export function recomputeTransferOrderStatus(order, operator = 'admin1') {
  recomputeTransferStatusFromLines(order, operator)
}

export function addTransferOrder(payload) {
  const fromWarehouse = String(payload.fromWarehouse || '').trim()
  const toWarehouse = String(payload.toWarehouse || '').trim()
  if (!fromWarehouse || !toWarehouse) return { ok: false, message: '请选择调出/调入仓库' }
  if (fromWarehouse === toWarehouse) return { ok: false, message: '调出仓库与调入仓库不能相同' }
  if (!payload.lineItems?.length) return { ok: false, message: '请至少添加一条明细' }

  const docNo = String(payload.docNo || '').trim() || generateTransferNo()
  if (transferOrderState.orders.some((o) => o.docNo === docNo)) {
    return { ok: false, message: '调拨单号已存在' }
  }

  const lineItems = (payload.lineItems || []).map((l) =>
    createTransferLine({
      ...l,
      lineStatus: l.lineStatus || TRANSFER_LINE_STATUS.PENDING,
    }),
  )
  const row = createTransferOrder({
    ...payload,
    id: payload.id || `tf-${Date.now()}`,
    docNo,
    fromWarehouse,
    toWarehouse,
    lineItems,
    sourceChannel: payload.sourceChannel || TRANSFER_SOURCE.MANUAL,
    status: TRANSFER_STATUS.PENDING,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  transferOrderState.orders.unshift(row)
  return { ok: true, order: row }
}

export function updateTransferOrder(id, patch) {
  const order = getTransferOrderById(id)
  if (!order) return { ok: false, message: '调拨单不存在' }
  if (!canEditTransfer(order)) return { ok: false, message: '当前状态不可编辑' }
  const fromWarehouse = String((patch.fromWarehouse ?? order.fromWarehouse) || '').trim()
  const toWarehouse = String((patch.toWarehouse ?? order.toWarehouse) || '').trim()
  if (!fromWarehouse || !toWarehouse) return { ok: false, message: '请选择调出/调入仓库' }
  if (fromWarehouse === toWarehouse) return { ok: false, message: '调出仓库与调入仓库不能相同' }
  if (patch.lineItems) {
    patch.lineItems = patch.lineItems.map((l) =>
      createTransferLine({
        ...l,
        lineStatus: l.lineStatus || TRANSFER_LINE_STATUS.PENDING,
      }),
    )
  }
  Object.assign(order, patch, { fromWarehouse, toWarehouse })
  return { ok: true, order }
}

export function deleteTransferOrder(id) {
  const idx = transferOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  if (!canDeleteTransfer(transferOrderState.orders[idx])) return false
  transferOrderState.orders.splice(idx, 1)
  return true
}

function linkOutboundInbound(order, postResult) {
  if (postResult.outbound?.id) {
    if (!order.linkedOutboundIds.includes(postResult.outbound.id)) {
      order.linkedOutboundIds.push(postResult.outbound.id)
    }
    if (
      postResult.outbound.docNo &&
      !order.linkedOutboundDocNos.includes(postResult.outbound.docNo)
    ) {
      order.linkedOutboundDocNos.push(postResult.outbound.docNo)
    }
  }
  if (postResult.inboundOrder?.id) {
    if (!order.linkedInboundIds.includes(postResult.inboundOrder.id)) {
      order.linkedInboundIds.push(postResult.inboundOrder.id)
    }
    if (
      postResult.inboundOrder.docNo &&
      !order.linkedInboundDocNos.includes(postResult.inboundOrder.docNo)
    ) {
      order.linkedInboundDocNos.push(postResult.inboundOrder.docNo)
    }
  }
}

export function confirmTransfer(ids, { operator = 'admin1' } = {}) {
  const blocked = []
  let count = 0
  ;(ids || []).forEach((id) => {
    const order = getTransferOrderById(id)
    if (!canConfirmTransfer(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可确认' })
      return
    }
    const pending = (order.lineItems || []).filter((l) => {
      const st = l.lineStatus || TRANSFER_LINE_STATUS.PENDING
      return st === TRANSFER_LINE_STATUS.PENDING
    })
    const res = postTransferOutboundConfirm(order, pending, { operator })
    if (!res.ok) {
      blocked.push({ docNo: order.docNo, message: res.message })
      return
    }
    linkOutboundInbound(order, res)
    recomputeTransferStatusFromLines(order, operator)
    count += 1
  })
  return { count, blocked }
}

/** 保存并确认：先落单再出库确认 */
export function saveAndConfirmTransfer(payload, { operator = 'admin1' } = {}) {
  const addRes = payload?.id ? updateTransferOrder(payload.id, payload) : addTransferOrder(payload)
  if (!addRes.ok) return addRes
  const confirmRes = confirmTransfer([addRes.order.id], { operator })
  if (confirmRes.blocked?.length) {
    return {
      ok: false,
      message: confirmRes.blocked.map((b) => b.message).join('；'),
      order: addRes.order,
    }
  }
  return { ok: true, order: getTransferOrderById(addRes.order.id) }
}

export function voidTransfer(ids, { reason = '', operator = 'admin1' } = {}) {
  const blocked = []
  let count = 0
  const reasonText = String(reason || '').trim()
  ;(ids || []).forEach((id) => {
    const order = getTransferOrderById(id)
    if (!canVoidTransfer(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '仅待确认单据可作废' })
      return
    }
    if (!reasonText) {
      blocked.push({ docNo: order?.docNo || id, message: '请填写作废理由' })
      return
    }
    order.status = TRANSFER_STATUS.VOIDED
    order.voidReason = reasonText
    order.voidedBy = operator
    order.voidedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    releaseTransferSoftLocksByOrderId(order.id)
    count += 1
  })
  return { count, blocked }
}

/** @deprecated 使用 voidTransfer */
export function refuseTransfer(ids, options) {
  return voidTransfer(ids, options)
}

export function canRefuseTransfer(order) {
  return canVoidTransfer(order)
}

export function filterTransferOrders(orders, filters = {}) {
  return (orders || []).filter((o) => {
    if (filters.docNo && !String(o.docNo || '').includes(String(filters.docNo).trim())) return false
    if (filters.fromWarehouse && o.fromWarehouse !== filters.fromWarehouse) return false
    if (filters.toWarehouse && o.toWarehouse !== filters.toWarehouse) return false
    if (filters.status && o.status !== filters.status) return false
    if (filters.applicant && !String(o.applicant || '').includes(String(filters.applicant).trim()))
      return false
    if (filters.dateRange?.length === 2) {
      const d = String(o.transferDate || '').slice(0, 10)
      if (d < filters.dateRange[0] || d > filters.dateRange[1]) return false
    }
    return true
  })
}
