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
  isTransferBusinessSource,
  isTransferManualSource,
} from '@/mock/transferOptions'
import { postTransferLines } from '@/utils/transferConfirm'
import { persistJson, safeSetItem } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_transfer_orders'
const SEED_VERSION_KEY = 'i_doms_transfer_orders_seed_v'
const CURRENT_SEED_VERSION = '1'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders
    }
  } catch {
    /* ignore */
  }
  return null
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
  orders: initial,
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
  const st = order?.status
  return st === TRANSFER_STATUS.PENDING || st === TRANSFER_STATUS.PARTIAL
}

export function canDeleteTransfer(order) {
  if (!order || isTransferBusinessSource(order)) return false
  if (!isTransferManualSource(order)) return false
  const hasConfirmed = (order.lineItems || []).some(
    (l) => (l.lineStatus || '') === TRANSFER_STATUS.DONE,
  )
  if (hasConfirmed) return false
  return order.status === TRANSFER_STATUS.PENDING || order.status === TRANSFER_STATUS.PARTIAL
}

export function canConfirmTransfer(order) {
  if (!canEditTransfer(order)) return false
  return (order.lineItems || []).some((l) => {
    const st = l.lineStatus || TRANSFER_STATUS.PENDING
    return st !== TRANSFER_STATUS.DONE && st !== TRANSFER_STATUS.REFUSED
  })
}

export function canRefuseTransfer(order) {
  if (!order || order.status !== TRANSFER_STATUS.PENDING) return false
  const lines = order.lineItems || []
  if (!lines.length) return true
  return lines.every((l) => (l.lineStatus || TRANSFER_STATUS.PENDING) !== TRANSFER_STATUS.DONE)
}

export function canRefuseTransferLine(order, line) {
  if (!order || !line) return false
  if (!canEditTransfer(order)) return false
  const st = line.lineStatus || TRANSFER_STATUS.PENDING
  return st !== TRANSFER_STATUS.DONE && st !== TRANSFER_STATUS.REFUSED
}

export function recomputeTransferOrderStatus(order, operator = 'admin1') {
  if (!order) return
  const lines = order.lineItems || []
  if (!lines.length) {
    if (order.status === TRANSFER_STATUS.PARTIAL) order.status = TRANSFER_STATUS.PENDING
    return
  }
  const done = lines.filter((l) => (l.lineStatus || '') === TRANSFER_STATUS.DONE).length
  const refused = lines.filter((l) => (l.lineStatus || '') === TRANSFER_STATUS.REFUSED).length
  const pending = lines.length - done - refused

  if (done === 0 && pending === 0) {
    order.status = TRANSFER_STATUS.REFUSED
    return
  }
  if (done === 0 && pending > 0) {
    order.status = TRANSFER_STATUS.PENDING
    return
  }
  if (pending === 0 && done === lines.length) {
    order.status = TRANSFER_STATUS.DONE
    order.confirmer = order.confirmer || operator
    order.confirmedAt = order.confirmedAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
    return
  }
  order.status = TRANSFER_STATUS.PARTIAL
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
      lineStatus: l.lineStatus || TRANSFER_STATUS.PENDING,
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
        lineStatus: l.lineStatus || TRANSFER_STATUS.PENDING,
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

function markLinesConfirmed(order, lineIds, postResult, operator) {
  const idSet = new Set(lineIds)
  ;(order.lineItems || []).forEach((line) => {
    if (!idSet.has(line.id)) return
    line.lineStatus = TRANSFER_STATUS.DONE
  })
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
  recomputeTransferOrderStatus(order, operator)
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
      const st = l.lineStatus || TRANSFER_STATUS.PENDING
      return st !== TRANSFER_STATUS.DONE && st !== TRANSFER_STATUS.REFUSED
    })
    const res = postTransferLines(order, pending, { operator })
    if (!res.ok) {
      blocked.push({ docNo: order.docNo, message: res.message })
      return
    }
    markLinesConfirmed(order, res.confirmedLineIds, res, operator)
    count += 1
  })
  return { count, blocked }
}

export function confirmTransferLine(orderId, lineId, { operator = 'admin1' } = {}) {
  const order = getTransferOrderById(orderId)
  const line = (order?.lineItems || []).find((l) => l.id === lineId)
  if (!order || !line) return { ok: false, message: '明细不存在' }
  if (!canConfirmTransfer(order)) return { ok: false, message: '当前状态不可确认' }
  const st = line.lineStatus || TRANSFER_STATUS.PENDING
  if (st === TRANSFER_STATUS.DONE) return { ok: false, message: '该明细已确认' }
  if (st === TRANSFER_STATUS.REFUSED) return { ok: false, message: '该明细已拒绝' }
  const res = postTransferLines(order, [line], { operator })
  if (!res.ok) return res
  markLinesConfirmed(order, res.confirmedLineIds, res, operator)
  return { ok: true, order, outbound: res.outbound, inboundOrder: res.inboundOrder }
}

export function refuseTransfer(ids, { reason = '', operator = 'admin1' } = {}) {
  const blocked = []
  let count = 0
  const reasonText = String(reason || '').trim()
  ;(ids || []).forEach((id) => {
    const order = getTransferOrderById(id)
    if (!canRefuseTransfer(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可拒绝' })
      return
    }
    if (!reasonText) {
      blocked.push({ docNo: order?.docNo || id, message: '请填写拒绝理由' })
      return
    }
    order.status = TRANSFER_STATUS.REFUSED
    order.refuseReason = reasonText
    order.refusedBy = operator
    order.refusedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    ;(order.lineItems || []).forEach((line) => {
      if ((line.lineStatus || '') !== TRANSFER_STATUS.DONE) {
        line.lineStatus = TRANSFER_STATUS.REFUSED
        line.refuseReason = reasonText
      }
    })
    count += 1
  })
  return { count, blocked }
}

export function refuseTransferLine(orderId, lineId, { reason = '', operator = 'admin1' } = {}) {
  const order = getTransferOrderById(orderId)
  const line = (order?.lineItems || []).find((l) => l.id === lineId)
  if (!canRefuseTransferLine(order, line)) return { ok: false, message: '当前明细不可拒绝' }
  const reasonText = String(reason || '').trim()
  if (!reasonText) return { ok: false, message: '请填写拒绝理由' }
  line.lineStatus = TRANSFER_STATUS.REFUSED
  line.refuseReason = reasonText
  order.refuseReason = reasonText
  order.refusedBy = operator
  order.refusedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  recomputeTransferOrderStatus(order, operator)
  return { ok: true, order }
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
