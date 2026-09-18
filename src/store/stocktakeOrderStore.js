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
  STOCKTAKE_POSTING,
  STOCKTAKE_TYPE,
  normalizeStocktakeStatus,
  isStocktakeBusinessSource,
  isStocktakeManualSource,
} from '@/mock/stocktakeOptions'
import { postStocktakeOrder } from '@/utils/stocktakeConfirm'
import { isStocktakeAutoPostOnApprove } from '@/store/stocktakeSettingsStore'
import { persistJson, safeSetItem } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_stocktake_orders'
const SEED_VERSION_KEY = 'i_doms_stocktake_orders_seed_v'
/** v3：审核流 + 过账状态 */
const CURRENT_SEED_VERSION = '3'

function migrateOrder(order) {
  if (!order) return order
  order.status = normalizeStocktakeStatus(order.status)
  if (!order.stocktakeType) order.stocktakeType = STOCKTAKE_TYPE.OTHER
  if (!order.postingStatus) {
    if (order.status === STOCKTAKE_STATUS.POSTED) order.postingStatus = STOCKTAKE_POSTING.SUCCESS
    else if (order.status === STOCKTAKE_STATUS.APPROVED)
      order.postingStatus = STOCKTAKE_POSTING.PENDING
    else order.postingStatus = ''
  }
  order.linkedInboundIds = order.linkedInboundIds || []
  order.linkedOutboundIds = order.linkedOutboundIds || []
  order.linkedInboundDocNos = order.linkedInboundDocNos || []
  order.linkedOutboundDocNos = order.linkedOutboundDocNos || []
  ;(order.lineItems || []).forEach((l) => {
    const st = l.lineStatus
    if (st === '待确认' || st === '部分确认') l.lineStatus = STOCKTAKE_STATUS.PENDING_APPROVAL
    if (st === '已确认') l.lineStatus = STOCKTAKE_STATUS.POSTED
  })
  return order
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders.map(migrateOrder)
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
  ? cloneStocktakeSeedOrders().map(migrateOrder)
  : (loadFromStorage() || cloneStocktakeSeedOrders()).map(migrateOrder)

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
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.PENDING_APPROVAL
}

export function canDeleteStocktake(order) {
  if (!order || isStocktakeBusinessSource(order)) return false
  if (!isStocktakeManualSource(order)) return false
  return normalizeStocktakeStatus(order.status) === STOCKTAKE_STATUS.PENDING_APPROVAL
}

/** 审核通过 */
export function canApproveStocktake(order) {
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.PENDING_APPROVAL
}

/** 审核拒绝 */
export function canRefuseStocktake(order) {
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.PENDING_APPROVAL
}

/** 生成盘盈盘亏 / 重新过账 */
export function canPostStocktake(order) {
  if (!order) return false
  const st = normalizeStocktakeStatus(order.status)
  if (st !== STOCKTAKE_STATUS.APPROVED) return false
  return (
    order.postingStatus === STOCKTAKE_POSTING.PENDING ||
    order.postingStatus === STOCKTAKE_POSTING.FAILED ||
    !order.postingStatus
  )
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
      lineStatus: STOCKTAKE_STATUS.PENDING_APPROVAL,
    })
  })

  const row = createStocktakeOrder({
    ...payload,
    id: payload.id || `st-${Date.now()}`,
    docNo,
    warehouse,
    stocktakeType: payload.stocktakeType || STOCKTAKE_TYPE.OTHER,
    lineItems,
    sourceChannel: payload.sourceChannel || STOCKTAKE_SOURCE.MANUAL,
    status: STOCKTAKE_STATUS.PENDING_APPROVAL,
    postingStatus: '',
    postingError: '',
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
        lineStatus: l.lineStatus || STOCKTAKE_STATUS.PENDING_APPROVAL,
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

function mergeLinked(order, postResult) {
  ;(postResult.linkedInboundIds || []).forEach((id) => {
    if (!order.linkedInboundIds.includes(id)) order.linkedInboundIds.push(id)
  })
  ;(postResult.linkedInboundDocNos || []).forEach((no) => {
    if (no && !order.linkedInboundDocNos.includes(no)) order.linkedInboundDocNos.push(no)
  })
  ;(postResult.linkedOutboundIds || []).forEach((id) => {
    if (!order.linkedOutboundIds.includes(id)) order.linkedOutboundIds.push(id)
  })
  ;(postResult.linkedOutboundDocNos || []).forEach((no) => {
    if (no && !order.linkedOutboundDocNos.includes(no)) order.linkedOutboundDocNos.push(no)
  })
}

function markPosted(order, operator) {
  order.status = STOCKTAKE_STATUS.POSTED
  order.postingStatus = STOCKTAKE_POSTING.SUCCESS
  order.postingError = ''
  order.confirmer = operator
  order.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  order.postedAt = order.confirmedAt
  ;(order.lineItems || []).forEach((l) => {
    l.lineStatus = STOCKTAKE_STATUS.POSTED
  })
}

function markPostFailed(order, message) {
  order.status = STOCKTAKE_STATUS.APPROVED
  order.postingStatus = STOCKTAKE_POSTING.FAILED
  order.postingError = message || '过账失败'
}

/** 执行过账（生成盘盈盘亏并入账） */
export function postStocktake(ids, { operator = 'admin1', force = false } = {}) {
  const blocked = []
  let count = 0
  ;(ids || []).forEach((id) => {
    const order = getStocktakeOrderById(id)
    if (
      !canPostStocktake(order) &&
      normalizeStocktakeStatus(order?.status) !== STOCKTAKE_STATUS.APPROVED
    ) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可过账' })
      return
    }
    if (normalizeStocktakeStatus(order.status) === STOCKTAKE_STATUS.POSTED) {
      blocked.push({ docNo: order.docNo, message: '已过账' })
      return
    }
    const res = postStocktakeOrder(order, { operator, force })
    if (!res.ok) {
      markPostFailed(order, res.message)
      blocked.push({ docNo: order.docNo, message: res.message, postingFailed: true })
      return
    }
    mergeLinked(order, res)
    markPosted(order, operator)
    count += 1
  })
  return { count, blocked }
}

/** 审核通过；按配置自动过账 */
export function approveStocktake(ids, { operator = 'admin1', force = false } = {}) {
  const blocked = []
  const posted = []
  let count = 0
  ;(ids || []).forEach((id) => {
    const order = getStocktakeOrderById(id)
    if (!canApproveStocktake(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可审核' })
      return
    }
    order.status = STOCKTAKE_STATUS.APPROVED
    order.postingStatus = STOCKTAKE_POSTING.PENDING
    order.postingError = ''
    order.approver = operator
    order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    count += 1

    if (!isStocktakeAutoPostOnApprove()) return

    const res = postStocktakeOrder(order, { operator, force })
    if (!res.ok) {
      markPostFailed(order, res.message)
      blocked.push({
        docNo: order.docNo,
        message: `审核通过，过账失败：${res.message}`,
        postingFailed: true,
      })
      return
    }
    mergeLinked(order, res)
    markPosted(order, operator)
    posted.push(order.docNo)
  })
  return { count, blocked, posted }
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
    order.postingStatus = ''
    ;(order.lineItems || []).forEach((line) => {
      line.lineStatus = STOCKTAKE_STATUS.REFUSED
      line.refuseReason = reasonText
    })
    count += 1
  })
  return { count, blocked }
}

/** @deprecated 兼容旧调用：改为审核通过 */
export function confirmStocktake(ids, options) {
  return approveStocktake(ids, options)
}

export function filterStocktakeOrders(orders, filters = {}) {
  return (orders || []).filter((o) => {
    const status = normalizeStocktakeStatus(o.status)
    if (filters.docNo && !String(o.docNo || '').includes(String(filters.docNo).trim())) return false
    if (filters.warehouse && o.warehouse !== filters.warehouse) return false
    if (filters.status && status !== filters.status && o.status !== filters.status) return false
    if (filters.stocktakeType && o.stocktakeType !== filters.stocktakeType) return false
    if (filters.applicant && !String(o.applicant || '').includes(String(filters.applicant).trim()))
      return false
    if (filters.dateRange?.length === 2) {
      const d = String(o.stocktakeDate || '').slice(0, 10)
      if (d < filters.dateRange[0] || d > filters.dateRange[1]) return false
    }
    return true
  })
}
