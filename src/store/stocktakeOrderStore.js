import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  cloneStocktakeSeedOrders,
  createStocktakeLine,
  createStocktakeOrder,
  generateStocktakeNo,
} from '@/mock/stocktakeOrders'
import {
  STOCKTAKE_SOURCE,
  STOCKTAKE_STATUS,
  isStocktakeBusinessSource,
  isStocktakeManualSource,
} from '@/mock/stocktakeOptions'
import { postStocktakeLine } from '@/utils/stocktakeConfirm'
import { persistJson, safeSetItem } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_stocktake_orders'
const SEED_VERSION_KEY = 'i_doms_stocktake_orders_seed_v'
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
  persistJson(STORAGE_KEY, { orders: stocktakeOrderState.orders })
  safeSetItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

const initial = shouldReseed()
  ? cloneStocktakeSeedOrders()
  : loadFromStorage() || cloneStocktakeSeedOrders()

export const stocktakeOrderState = reactive({
  orders: initial,
})

watch(
  () => stocktakeOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getStocktakeOrderById(id) {
  return stocktakeOrderState.orders.find((o) => o.id === id) || null
}

export function canEditStocktake(order) {
  const st = order?.status
  return st === STOCKTAKE_STATUS.PENDING || st === STOCKTAKE_STATUS.PARTIAL
}

export function canDeleteStocktake(order) {
  if (!order || isStocktakeBusinessSource(order)) return false
  if (!isStocktakeManualSource(order)) return false
  const hasConfirmed = (order.lineItems || []).some(
    (l) => (l.lineStatus || '') === STOCKTAKE_STATUS.DONE,
  )
  if (hasConfirmed) return false
  return order.status === STOCKTAKE_STATUS.PENDING || order.status === STOCKTAKE_STATUS.PARTIAL
}

export function canConfirmStocktake(order) {
  if (!canEditStocktake(order)) return false
  return (order.lineItems || []).some((l) => {
    const st = l.lineStatus || STOCKTAKE_STATUS.PENDING
    return st !== STOCKTAKE_STATUS.DONE && st !== STOCKTAKE_STATUS.REFUSED
  })
}

export function canRefuseStocktake(order) {
  if (!order || order.status !== STOCKTAKE_STATUS.PENDING) return false
  const lines = order.lineItems || []
  if (!lines.length) return true
  return lines.every((l) => (l.lineStatus || STOCKTAKE_STATUS.PENDING) !== STOCKTAKE_STATUS.DONE)
}

export function canRefuseStocktakeLine(order, line) {
  if (!order || !line) return false
  if (!canEditStocktake(order)) return false
  const st = line.lineStatus || STOCKTAKE_STATUS.PENDING
  return st !== STOCKTAKE_STATUS.DONE && st !== STOCKTAKE_STATUS.REFUSED
}

export function recomputeStocktakeOrderStatus(order, operator = 'admin1') {
  if (!order) return
  const lines = order.lineItems || []
  if (!lines.length) {
    if (order.status === STOCKTAKE_STATUS.PARTIAL) order.status = STOCKTAKE_STATUS.PENDING
    return
  }
  const done = lines.filter((l) => (l.lineStatus || '') === STOCKTAKE_STATUS.DONE).length
  const refused = lines.filter((l) => (l.lineStatus || '') === STOCKTAKE_STATUS.REFUSED).length
  const pending = lines.length - done - refused

  if (done === 0 && pending === 0) {
    order.status = STOCKTAKE_STATUS.REFUSED
    return
  }
  if (done === 0 && pending > 0) {
    order.status = STOCKTAKE_STATUS.PENDING
    return
  }
  if (pending === 0 && done === lines.length) {
    order.status = STOCKTAKE_STATUS.DONE
    order.confirmer = order.confirmer || operator
    order.confirmedAt = order.confirmedAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
    return
  }
  order.status = STOCKTAKE_STATUS.PARTIAL
}

export function addStocktakeOrder(payload) {
  const warehouse = String(payload.warehouse || '').trim()
  if (!warehouse) return { ok: false, message: '请选择盘点仓库' }
  if (!payload.lineItems?.length) return { ok: false, message: '请至少添加一条明细' }

  const docNo = String(payload.docNo || '').trim() || generateStocktakeNo()
  if (stocktakeOrderState.orders.some((o) => o.docNo === docNo)) {
    return { ok: false, message: '盘点单号已存在' }
  }

  const lineItems = (payload.lineItems || []).map((l) => {
    const bookQty = Number(l.bookQty) || 0
    const actualQty = l.actualQty != null && l.actualQty !== '' ? Number(l.actualQty) : bookQty
    const diffQty = Math.round((actualQty - bookQty) * 10000) / 10000
    return createStocktakeLine({
      ...l,
      bookQty,
      actualQty,
      diffQty,
      lineStatus: l.lineStatus || STOCKTAKE_STATUS.PENDING,
    })
  })

  const row = createStocktakeOrder({
    ...payload,
    id: payload.id || `st-${Date.now()}`,
    docNo,
    warehouse,
    lineItems,
    sourceChannel: payload.sourceChannel || STOCKTAKE_SOURCE.MANUAL,
    status: STOCKTAKE_STATUS.PENDING,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  stocktakeOrderState.orders.unshift(row)
  return { ok: true, order: row }
}

export function updateStocktakeOrder(id, patch) {
  const order = getStocktakeOrderById(id)
  if (!order) return { ok: false, message: '盘点单不存在' }
  if (!canEditStocktake(order)) return { ok: false, message: '当前状态不可编辑' }
  const warehouse = String((patch.warehouse ?? order.warehouse) || '').trim()
  if (!warehouse) return { ok: false, message: '请选择盘点仓库' }
  if (patch.lineItems) {
    patch.lineItems = patch.lineItems.map((l) => {
      const bookQty = Number(l.bookQty) || 0
      const actualQty = l.actualQty != null && l.actualQty !== '' ? Number(l.actualQty) : bookQty
      const diffQty = Math.round((actualQty - bookQty) * 10000) / 10000
      return createStocktakeLine({
        ...l,
        bookQty,
        actualQty,
        diffQty,
        lineStatus: l.lineStatus || STOCKTAKE_STATUS.PENDING,
      })
    })
  }
  Object.assign(order, patch, { warehouse })
  return { ok: true, order }
}

export function deleteStocktakeOrder(id) {
  const idx = stocktakeOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  if (!canDeleteStocktake(stocktakeOrderState.orders[idx])) return false
  stocktakeOrderState.orders.splice(idx, 1)
  return true
}

function attachLinkedDocs(order, line, postResult) {
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
    line.linkedInboundId = postResult.inboundOrder.id
    line.linkedInboundDocNo = postResult.inboundOrder.docNo
  }
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
    line.linkedOutboundId = postResult.outbound.id
    line.linkedOutboundDocNo = postResult.outbound.docNo
  }
}

export function confirmStocktake(ids, { operator = 'admin1' } = {}) {
  const blocked = []
  let count = 0
  ;(ids || []).forEach((id) => {
    const order = getStocktakeOrderById(id)
    if (!canConfirmStocktake(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可确认' })
      return
    }
    const pending = (order.lineItems || []).filter((l) => {
      const st = l.lineStatus || STOCKTAKE_STATUS.PENDING
      return st !== STOCKTAKE_STATUS.DONE && st !== STOCKTAKE_STATUS.REFUSED
    })
    let okLines = 0
    for (const line of pending) {
      const res = postStocktakeLine(order, line, { operator })
      if (!res.ok) {
        blocked.push({ docNo: order.docNo, message: `${line.itemCode || line.id}: ${res.message}` })
        continue
      }
      line.lineStatus = STOCKTAKE_STATUS.DONE
      attachLinkedDocs(order, line, res)
      okLines += 1
    }
    if (okLines > 0) {
      recomputeStocktakeOrderStatus(order, operator)
      count += 1
    }
  })
  return { count, blocked }
}

export function confirmStocktakeLine(orderId, lineId, { operator = 'admin1' } = {}) {
  const order = getStocktakeOrderById(orderId)
  const line = (order?.lineItems || []).find((l) => l.id === lineId)
  if (!order || !line) return { ok: false, message: '明细不存在' }
  if (!canConfirmStocktake(order)) return { ok: false, message: '当前状态不可确认' }
  const st = line.lineStatus || STOCKTAKE_STATUS.PENDING
  if (st === STOCKTAKE_STATUS.DONE) return { ok: false, message: '该明细已确认' }
  if (st === STOCKTAKE_STATUS.REFUSED) return { ok: false, message: '该明细已拒绝' }
  const res = postStocktakeLine(order, line, { operator })
  if (!res.ok) return res
  line.lineStatus = STOCKTAKE_STATUS.DONE
  attachLinkedDocs(order, line, res)
  recomputeStocktakeOrderStatus(order, operator)
  return { ok: true, order, ...res }
}

export function refuseStocktake(ids, { reason = '', operator = 'admin1' } = {}) {
  const blocked = []
  let count = 0
  const reasonText = String(reason || '').trim()
  ;(ids || []).forEach((id) => {
    const order = getStocktakeOrderById(id)
    if (!canRefuseStocktake(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可拒绝' })
      return
    }
    if (!reasonText) {
      blocked.push({ docNo: order?.docNo || id, message: '请填写拒绝理由' })
      return
    }
    order.status = STOCKTAKE_STATUS.REFUSED
    order.refuseReason = reasonText
    order.refusedBy = operator
    order.refusedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    ;(order.lineItems || []).forEach((line) => {
      if ((line.lineStatus || '') !== STOCKTAKE_STATUS.DONE) {
        line.lineStatus = STOCKTAKE_STATUS.REFUSED
        line.refuseReason = reasonText
      }
    })
    count += 1
  })
  return { count, blocked }
}

export function refuseStocktakeLine(orderId, lineId, { reason = '', operator = 'admin1' } = {}) {
  const order = getStocktakeOrderById(orderId)
  const line = (order?.lineItems || []).find((l) => l.id === lineId)
  if (!canRefuseStocktakeLine(order, line)) return { ok: false, message: '当前明细不可拒绝' }
  const reasonText = String(reason || '').trim()
  if (!reasonText) return { ok: false, message: '请填写拒绝理由' }
  line.lineStatus = STOCKTAKE_STATUS.REFUSED
  line.refuseReason = reasonText
  order.refuseReason = reasonText
  order.refusedBy = operator
  order.refusedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  recomputeStocktakeOrderStatus(order, operator)
  return { ok: true, order }
}

export function filterStocktakeOrders(orders, filters = {}) {
  return (orders || []).filter((o) => {
    if (filters.docNo && !String(o.docNo || '').includes(String(filters.docNo).trim())) return false
    if (filters.warehouse && o.warehouse !== filters.warehouse) return false
    if (filters.status && o.status !== filters.status) return false
    if (filters.applicant && !String(o.applicant || '').includes(String(filters.applicant).trim()))
      return false
    if (filters.dateRange?.length === 2) {
      const d = String(o.stocktakeDate || '').slice(0, 10)
      if (d < filters.dateRange[0] || d > filters.dateRange[1]) return false
    }
    return true
  })
}
