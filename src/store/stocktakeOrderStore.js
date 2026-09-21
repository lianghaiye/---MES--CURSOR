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
import {
  postStocktakeOrder,
  hasUnpostedStocktakeDiff,
  stocktakePostModeLabel,
} from '@/utils/stocktakeConfirm'
import { isStocktakeAutoPostOnApprove } from '@/store/stocktakeSettingsStore'
import { persistJson, safeSetItem } from '@/utils/safeStorage'
import {
  appendStocktakeOperationLog,
  backfillStocktakeOperationLogs,
} from '@/utils/stocktakeOperationLog'

const STORAGE_KEY = 'i_doms_stocktake_orders'
const SEED_VERSION_KEY = 'i_doms_stocktake_orders_seed_v'
/** v7：列表创建人 + 审核/过账人时间 */
const CURRENT_SEED_VERSION = '7'

function migrateOrder(order) {
  if (!order) return order
  const rawStatus = order.status
  order.status = normalizeStocktakeStatus(order.status)
  if (!order.stocktakeType) order.stocktakeType = STOCKTAKE_TYPE.OTHER
  // 历史「已过账」→ 审核通过 + 过账成功
  if (rawStatus === '已过账' || rawStatus === '已确认') {
    order.postingStatus = STOCKTAKE_POSTING.SUCCESS
  } else if (!order.postingStatus) {
    if (order.status === STOCKTAKE_STATUS.APPROVED) order.postingStatus = STOCKTAKE_POSTING.PENDING
    else order.postingStatus = ''
  }
  order.linkedInboundIds = order.linkedInboundIds || []
  order.linkedOutboundIds = order.linkedOutboundIds || []
  order.linkedInboundDocNos = order.linkedInboundDocNos || []
  order.linkedOutboundDocNos = order.linkedOutboundDocNos || []
  ;(order.lineItems || []).forEach((l) => {
    const st = l.lineStatus
    if (st === '待确认' || st === '部分确认') l.lineStatus = STOCKTAKE_STATUS.DRAFT
    if (st === '已确认' || st === '已过账') l.lineStatus = STOCKTAKE_STATUS.APPROVED
  })
  if (order.poster == null) order.poster = order.confirmer || ''
  backfillStocktakeOperationLogs(order)
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

function initOrders() {
  const stored = loadFromStorage()
  if (shouldReseed() || !stored?.length) {
    return cloneStocktakeSeedOrders().map(migrateOrder)
  }
  return stored
}

export const stocktakeOrderState = reactive({
  orders: initOrders(),
})

// 立即落盘：避免仅注册 watch、未操作就刷新时种子版本未写入导致每次重置
persist()

watch(
  () => stocktakeOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getStocktakeOrderById(id) {
  return stocktakeOrderState.orders.find((o) => o.id === id) || null
}

export function canEditStocktake(order) {
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.DRAFT
}

export function canDeleteStocktake(order) {
  if (!order || isStocktakeBusinessSource(order)) return false
  if (!isStocktakeManualSource(order)) return false
  return normalizeStocktakeStatus(order.status) === STOCKTAKE_STATUS.DRAFT
}

/** 提交审核 */
export function canSubmitStocktake(order) {
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.DRAFT
}

/** 审核通过 */
export function canApproveStocktake(order) {
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.PENDING_APPROVAL
}

/** 审核拒绝 */
export function canRefuseStocktake(order) {
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.PENDING_APPROVAL
}

/** 撤回（待审核 → 待提交） */
export function canWithdrawStocktake(order) {
  return normalizeStocktakeStatus(order?.status) === STOCKTAKE_STATUS.PENDING_APPROVAL
}

/** 生成盘盈盘亏 / 重新过账 / 继续过账（部分过账） */
export function canPostStocktake(order) {
  if (!order) return false
  const st = normalizeStocktakeStatus(order.status)
  if (st !== STOCKTAKE_STATUS.APPROVED) return false
  return (
    order.postingStatus === STOCKTAKE_POSTING.PENDING ||
    order.postingStatus === STOCKTAKE_POSTING.PARTIAL ||
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
      lineStatus: STOCKTAKE_STATUS.DRAFT,
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
    status: STOCKTAKE_STATUS.DRAFT,
    postingStatus: '',
    postingError: '',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  appendStocktakeOperationLog(row, {
    action: '创建',
    operator: row.creator || row.applicant || 'admin1',
    operatedAt: row.createdAt,
    remark: `创建盘点单 ${row.docNo}，仓库 ${row.warehouse}，类型 ${row.stocktakeType || '—'}`,
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
        lineStatus: l.lineStatus || STOCKTAKE_STATUS.DRAFT,
      })
    })
  }
  Object.assign(order, patch, { warehouse })
  appendStocktakeOperationLog(order, {
    action: '编辑',
    operator: patch.updater || order.updater || order.applicant || 'admin1',
    remark: '更新盘点单',
  })
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

function markPosted(order, operator, { modeLabel = '生成盘盈盘亏并入账', partial = false } = {}) {
  // 单据状态保持「审核通过」，过账结果写入 postingStatus
  order.status = STOCKTAKE_STATUS.APPROVED
  order.postingStatus = partial ? STOCKTAKE_POSTING.PARTIAL : STOCKTAKE_POSTING.SUCCESS
  order.postingError = ''
  order.confirmer = operator
  order.poster = operator
  order.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  order.postedAt = order.confirmedAt
  if (!partial) {
    ;(order.lineItems || []).forEach((l) => {
      l.lineStatus = STOCKTAKE_STATUS.APPROVED
    })
  }
  appendStocktakeOperationLog(order, {
    action: partial ? '部分过账' : '过账',
    operator,
    operatedAt: order.confirmedAt,
    remark: partial ? `${modeLabel}（尚有差异未生成，可继续过账）` : modeLabel,
  })
}

function markPostFailed(order, message, operator = 'admin1') {
  order.status = STOCKTAKE_STATUS.APPROVED
  order.postingStatus = STOCKTAKE_POSTING.FAILED
  order.postingError = message || '过账失败'
  appendStocktakeOperationLog(order, {
    action: '过账失败',
    operator,
    remark: order.postingError,
  })
}

/** 执行过账（生成盘盈盘亏并入账） */
export function postStocktake(ids, { operator = 'admin1', force = false, mode } = {}) {
  const blocked = []
  let count = 0
  let partialCount = 0
  ;(ids || []).forEach((id) => {
    const order = getStocktakeOrderById(id)
    if (
      !canPostStocktake(order) &&
      normalizeStocktakeStatus(order?.status) !== STOCKTAKE_STATUS.APPROVED
    ) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可过账' })
      return
    }
    if (order.postingStatus === STOCKTAKE_POSTING.SUCCESS) {
      blocked.push({ docNo: order.docNo, message: '已过账' })
      return
    }
    const res = postStocktakeOrder(order, { operator, force, mode })
    if (!res.ok) {
      markPostFailed(order, res.message, operator)
      blocked.push({ docNo: order.docNo, message: res.message, postingFailed: true })
      return
    }
    mergeLinked(order, res)
    // 以明细关联单二次确认，避免只生成一侧时误标为过账成功
    const partial = Boolean(res.partial) || hasUnpostedStocktakeDiff(order)
    markPosted(order, operator, {
      modeLabel: stocktakePostModeLabel(res.mode),
      partial,
    })
    count += 1
    if (partial) partialCount += 1
  })
  return { count, blocked, partialCount }
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
    appendStocktakeOperationLog(order, {
      action: '审核通过',
      operator,
      operatedAt: order.approvedAt,
      remark: isStocktakeAutoPostOnApprove() ? '审核通过，按配置自动过账' : '审核通过，待手动过账',
    })
    count += 1

    if (!isStocktakeAutoPostOnApprove()) return

    const res = postStocktakeOrder(order, { operator, force })
    if (!res.ok) {
      markPostFailed(order, res.message, operator)
      blocked.push({
        docNo: order.docNo,
        message: `审核通过，过账失败：${res.message}`,
        postingFailed: true,
      })
      return
    }
    mergeLinked(order, res)
    const partial = Boolean(res.partial) || hasUnpostedStocktakeDiff(order)
    markPosted(order, operator, {
      modeLabel: stocktakePostModeLabel(res.mode),
      partial,
    })
    if (!partial) posted.push(order.docNo)
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
    appendStocktakeOperationLog(order, {
      action: '拒绝',
      operator,
      operatedAt: order.refusedAt,
      remark: `拒绝理由：${reasonText}`,
    })
    count += 1
  })
  return { count, blocked }
}

/** 提交：待提交 → 待审核 */
export function submitStocktake(ids, { operator = 'admin1' } = {}) {
  const blocked = []
  let count = 0
  ;(ids || []).forEach((id) => {
    const order = getStocktakeOrderById(id)
    if (!canSubmitStocktake(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可提交' })
      return
    }
    if (!(order.lineItems || []).length) {
      blocked.push({ docNo: order.docNo, message: '请至少添加一条盘点明细' })
      return
    }
    order.status = STOCKTAKE_STATUS.PENDING_APPROVAL
    order.postingStatus = ''
    order.postingError = ''
    order.submittedBy = operator
    order.submittedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    ;(order.lineItems || []).forEach((line) => {
      line.lineStatus = STOCKTAKE_STATUS.PENDING_APPROVAL
    })
    appendStocktakeOperationLog(order, {
      action: '提交',
      operator,
      operatedAt: order.submittedAt,
      remark: '提交审核',
    })
    count += 1
  })
  return { count, blocked }
}

/** 撤回：待审核 → 待提交 */
export function withdrawStocktake(ids, { operator = 'admin1' } = {}) {
  const blocked = []
  let count = 0
  ;(ids || []).forEach((id) => {
    const order = getStocktakeOrderById(id)
    if (!canWithdrawStocktake(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '当前状态不可撤回' })
      return
    }
    order.status = STOCKTAKE_STATUS.DRAFT
    order.postingStatus = ''
    order.postingError = ''
    order.approver = ''
    order.approvedAt = ''
    ;(order.lineItems || []).forEach((line) => {
      line.lineStatus = STOCKTAKE_STATUS.DRAFT
    })
    appendStocktakeOperationLog(order, {
      action: '撤回',
      operator,
      remark: '撤回至待提交',
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
    if (filters.postingStatus) {
      const ps = o.postingStatus || ''
      if (ps !== filters.postingStatus) return false
    }
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
