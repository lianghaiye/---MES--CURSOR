/**
 * 成品入库申请（与小程序共用 storage key：i_doms_mobile_finished_inbounds）
 * 对齐领料申请：WEB / 小程序提交 → 审核通过后生成成品入库单。
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createMobileFinishedInboundSeed,
  finishedInboundModeLabel,
  FINISHED_INBOUND_MODES,
  FINISHED_INBOUND_AUDIT,
  FINISHED_INBOUND_AUDIT_OPTIONS,
  isFinishedInboundMultiSourceMode,
} from '@/mock/mobileFinishedInboundSeed'
import { addInboundOrder, getInboundOrderById } from '@/store/inboundOrderStore'
import { INBOUND_SOURCE } from '@/mock/inboundOptions'
import { snapshotWorkOrdersForInbound } from '@/utils/inboundWorkOrders'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'

export const MOBILE_FINISHED_INBOUND_STORAGE_KEY = 'i_doms_mobile_finished_inbounds'
const SEED_VERSION_KEY = 'i_doms_mobile_finished_inbounds_seed_v'
const CURRENT_SEED_VERSION = '1'

export {
  finishedInboundModeLabel,
  FINISHED_INBOUND_MODES,
  FINISHED_INBOUND_AUDIT,
  FINISHED_INBOUND_AUDIT_OPTIONS,
  isFinishedInboundMultiSourceMode,
}

function formatNow() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function generateFinishedInboundReqNo(items = []) {
  const day = dayjs().format('YYYYMMDD')
  const prefix = `FI${day}`
  let max = 0
  ;(items || []).forEach((row) => {
    const no = String(row.reqNo || '')
    if (!no.startsWith(prefix)) return
    const n = Number(no.slice(prefix.length))
    if (Number.isFinite(n) && n > max) max = n
  })
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

function loadItems() {
  try {
    const raw = localStorage.getItem(MOBILE_FINISHED_INBOUND_STORAGE_KEY)
    if (!raw) return null
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed?.items)) return parsed.items
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    MOBILE_FINISHED_INBOUND_STORAGE_KEY,
    JSON.stringify({ items: mobileFinishedInboundState.items }),
  )
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function allSeedIds(items) {
  return (items || []).every((r) => String(r.id || '').startsWith('fi-seed-'))
}

function createInitial() {
  const version = localStorage.getItem(SEED_VERSION_KEY)
  const cached = loadItems()
  if (version !== CURRENT_SEED_VERSION && (!cached || !cached.length || allSeedIds(cached))) {
    const seeded = createMobileFinishedInboundSeed()
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
    localStorage.setItem(MOBILE_FINISHED_INBOUND_STORAGE_KEY, JSON.stringify({ items: seeded }))
    return seeded
  }
  if (cached !== null) {
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
    return cached.map(normalizeReq)
  }
  const seeded = createMobileFinishedInboundSeed()
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  localStorage.setItem(MOBILE_FINISHED_INBOUND_STORAGE_KEY, JSON.stringify({ items: seeded }))
  return seeded
}

function normalizeReq(row) {
  const auditStatus =
    row.auditStatus ||
    (row.inboundId ? FINISHED_INBOUND_AUDIT.APPROVED : FINISHED_INBOUND_AUDIT.PENDING)
  return {
    ...row,
    auditStatus,
    rejectReason: row.rejectReason || '',
  }
}

export const mobileFinishedInboundState = reactive({
  items: createInitial(),
})

watch(
  () => mobileFinishedInboundState.items,
  () => persist(),
  { deep: true },
)

export function refreshMobileFinishedInbounds() {
  const loaded = loadItems()
  if (Array.isArray(loaded)) {
    mobileFinishedInboundState.items = loaded.map(normalizeReq)
  }
}

function listInboundRefs(row) {
  const fromList = Array.isArray(row.inboundOrders)
    ? row.inboundOrders
        .map((o) => ({
          id: o.id || '',
          docNo: o.docNo || '',
          warehouse: o.warehouse || '',
          status: o.status || '',
        }))
        .filter((o) => o.id || o.docNo)
    : []
  if (fromList.length) return fromList
  if (row.inboundId || row.inboundDocNo) {
    return [
      {
        id: row.inboundId || '',
        docNo: row.inboundDocNo || '',
        warehouse: row.warehouse || '',
        status: row.inboundStatus || '',
      },
    ]
  }
  return []
}

function applyInboundRefsToRecord(record, orders) {
  const refs = (orders || []).map((o) => ({
    id: o.id,
    docNo: o.docNo,
    warehouse: o.warehouse || '',
    status: o.status || '',
  }))
  record.inboundOrders = refs
  record.inboundId = refs[0]?.id || ''
  record.inboundDocNo = refs
    .map((r) => r.docNo)
    .filter(Boolean)
    .join('、')
  const statuses = refs.map((r) => r.status).filter(Boolean)
  record.inboundStatus = statuses.length
    ? statuses.every((s) => s === statuses[0])
      ? statuses[0]
      : '多单进行中'
    : '—'
}

function enrich(row) {
  const normalized = normalizeReq(row)
  const refs = listInboundRefs(normalized)
  const liveOrders = refs.map((ref) => getInboundOrderById(ref.id)).filter(Boolean)
  const docNos = liveOrders.length
    ? liveOrders.map((o) => o.docNo).filter(Boolean)
    : refs.map((r) => r.docNo).filter(Boolean)
  const statuses = liveOrders.map((o) => o.status).filter(Boolean)
  let inboundStatus = normalized.inboundStatus || '—'
  if (statuses.length) {
    inboundStatus = statuses.every((s) => s === statuses[0]) ? statuses[0] : '多单进行中'
  }
  return {
    ...normalized,
    modeLabel: finishedInboundModeLabel(normalized.mode),
    inboundOrders: refs,
    inboundStatus,
    inboundDocNo: docNos.join('、') || normalized.inboundDocNo || '',
    inboundId: refs[0]?.id || normalized.inboundId || '',
  }
}

export function listMobileFinishedInbounds() {
  return mobileFinishedInboundState.items
    .map(enrich)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function getMobileFinishedInboundById(id) {
  const row = mobileFinishedInboundState.items.find((r) => r.id === id)
  return row ? enrich(row) : null
}

export function relatedWorkOrderText(record) {
  if (!record) return '—'
  if (isFinishedInboundMultiSourceMode(record.mode) || (record.workOrders || []).length > 1) {
    const list = record.workOrders || []
    if (list.length)
      return list
        .map((w) => w.code)
        .filter(Boolean)
        .join('、')
    const ids = record.workOrderIds || []
    return ids.length ? `${ids.length} 个工单` : '—'
  }
  return record.workOrderCode || '—'
}

export function relatedProductText(record) {
  if (!record) return '—'
  if (record.productName) return record.productName
  const first = record.lines?.[0]?.itemName
  if (!first) return '—'
  if ((record.lineCount || 0) > 1) return `${first} 等${record.lineCount}项`
  return first
}

function createInboundForApplication(record) {
  const lines = record.lines || []
  if (!lines.length) return { ok: false, message: '请至少添加一条入库明细' }

  const groups = new Map()
  lines.forEach((line) => {
    const wh = String(line.warehouse || record.warehouse || '成品主仓').trim() || '成品主仓'
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push(line)
  })

  const workOrders = snapshotWorkOrdersForInbound(
    record.workOrders?.length
      ? record.workOrders
      : record.workOrderCode || record.workOrderId
        ? [
            {
              id: record.workOrderId,
              code: record.workOrderCode,
              productName: record.productName,
              productCode: record.lines?.[0]?.itemCode || '',
              planQty: record.planQty,
              scheduleQty: record.scheduleQty,
              salesOrderNo: record.salesOrderNo,
            },
          ]
        : [],
  )

  const sourceOrderNo =
    record.workOrderCode ||
    (workOrders || [])
      .map((w) => w.code)
      .filter(Boolean)
      .slice(0, 3)
      .join('、') ||
    record.reqNo ||
    ''

  const remarkBase = record.remark
    ? `成品入库申请：${record.remark}`
    : `成品入库申请（${finishedInboundModeLabel(record.mode)}）`

  const orders = []
  let index = 0
  for (const [warehouse, groupLines] of groups) {
    index += 1
    const remark = groups.size > 1 ? `${remarkBase}（仓库：${warehouse}）` : remarkBase
    const order = addInboundOrder({
      id: `ib-fi-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
      inboundType: '成品入库',
      status: '待入库',
      warehouse,
      itemType: '产品',
      sourceOrderNo,
      sourceType: workOrders.length ? '生产工单' : '成品入库申请',
      sourceWorkshop: record.workshop || '',
      salesOrderNo: record.salesOrderNo || '',
      handler: record.applicant || '管理员',
      creator: record.applicant || '管理员',
      remark,
      sourceChannel: INBOUND_SOURCE.BUSINESS,
      finishedInboundReqId: record.id || '',
      finishedInboundReqNo: record.reqNo || '',
      workOrders,
      lineItems: groupLines.map((line) => ({
        itemCode: line.itemCode,
        itemName: line.itemName,
        itemType: line.itemType || '产品',
        specModel: line.specModel || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        variantSummary: line.variantSummary || '',
        qty: Number(line.qty) || 0,
        unit: line.unit || '台',
        warehouse,
        lineSource: '成品入库申请',
        sourceDocNo: line.sourceWorkOrderCode || record.workOrderCode || record.reqNo || '',
        lineStatus: '待入库',
      })),
    })
    orders.push(order)
  }

  return { ok: true, orders, order: orders[0] || null }
}

/**
 * WEB / 小程序同逻辑：提交成品入库申请；审核通过后生成成品入库单
 */
export function submitFinishedInboundApplication(payload) {
  const lines = (payload.lines || [])
    .map((l, i) => ({
      id: l.id || `fi-line-${Date.now()}-${i}`,
      itemCode: l.itemCode || '',
      itemName: l.itemName || '',
      itemType: l.itemType || '产品',
      specModel: l.specModel || '',
      material: l.material || '',
      drawingNo: l.drawingNo || '',
      variantSummary: l.variantSummary || '',
      qty: Number(l.qty) || 0,
      unit: l.unit || '台',
      warehouse: String(l.warehouse || payload.warehouse || '成品主仓').trim() || '成品主仓',
      sourceWorkOrderCode: l.sourceWorkOrderCode || '',
      sourceWorkOrderId: l.sourceWorkOrderId || '',
      salesOrderNo: l.salesOrderNo || payload.salesOrderNo || '',
    }))
    .filter((l) => l.itemCode || l.itemName)

  if (!lines.length) {
    return { ok: false, message: '请至少添加一条入库明细' }
  }
  for (const line of lines) {
    if (!Number(line.qty) || Number(line.qty) <= 0) {
      return { ok: false, message: `「${line.itemName || line.itemCode}」入库数量须大于 0` }
    }
  }

  const channel = payload.sourceChannel || 'web'
  const autoApprove = isAutoApproveEnabled(AUTO_APPROVE_TYPES.FINISHED_INBOUND)
  const auditStatus = autoApprove ? FINISHED_INBOUND_AUDIT.APPROVED : FINISHED_INBOUND_AUDIT.PENDING
  const reqNo = generateFinishedInboundReqNo(mobileFinishedInboundState.items)

  const record = {
    id: `fi-${Date.now()}`,
    reqNo,
    mode: payload.mode || FINISHED_INBOUND_MODES.WORK_ORDER,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    workOrderIds: payload.workOrderIds || [],
    workOrders: payload.workOrders || [],
    salesOrderNo: payload.salesOrderNo || '',
    productName: payload.productName || lines[0]?.itemName || '',
    workshop: payload.workshop || '',
    warehouse: payload.warehouse || lines[0]?.warehouse || '成品主仓',
    remark: payload.remark || '',
    lineCount: lines.length,
    totalQty: lines.reduce((s, l) => s + (Number(l.qty) || 0), 0),
    lines,
    inboundId: '',
    inboundDocNo: '',
    inboundStatus: '—',
    auditStatus,
    rejectReason: '',
    applicant: payload.applicant || '管理员',
    createdAt: formatNow(),
    sourceChannel: channel,
  }

  let order = null
  let orders = []
  if (auditStatus === FINISHED_INBOUND_AUDIT.APPROVED) {
    const inboundResult = createInboundForApplication(record)
    if (!inboundResult.ok) return inboundResult
    orders = inboundResult.orders || []
    order = orders[0] || null
    applyInboundRefsToRecord(record, orders)
  }

  mobileFinishedInboundState.items.unshift(record)
  return { ok: true, record: enrich(record), order, orders }
}

export function approveFinishedInboundApplication(id, auditor = '管理员') {
  const row = mobileFinishedInboundState.items.find((r) => r.id === id)
  if (!row) return { ok: false, message: '申请单不存在' }
  if (normalizeReq(row).auditStatus !== FINISHED_INBOUND_AUDIT.PENDING) {
    return { ok: false, message: '仅待审核申请可审核通过' }
  }
  if (!listInboundRefs(row).length) {
    const inboundResult = createInboundForApplication(row)
    if (!inboundResult.ok) return inboundResult
    applyInboundRefsToRecord(row, inboundResult.orders || [])
  }
  row.auditStatus = FINISHED_INBOUND_AUDIT.APPROVED
  row.rejectReason = ''
  row.auditor = auditor
  row.auditedAt = formatNow()
  return { ok: true, record: enrich(row) }
}

export function rejectFinishedInboundApplication(id, reason = '', auditor = '管理员') {
  const row = mobileFinishedInboundState.items.find((r) => r.id === id)
  if (!row) return { ok: false, message: '申请单不存在' }
  if (normalizeReq(row).auditStatus !== FINISHED_INBOUND_AUDIT.PENDING) {
    return { ok: false, message: '仅待审核申请可驳回' }
  }
  row.auditStatus = FINISHED_INBOUND_AUDIT.REJECTED
  row.rejectReason = reason || ''
  row.auditor = auditor
  row.auditedAt = formatNow()
  return { ok: true, record: enrich(row) }
}

/** 入库单拒绝/完成后回写申请单入库状态 */
export function syncFinishedInboundOnInboundChange(order) {
  if (!order) return null
  const reqId = order.finishedInboundReqId
  const reqNo = order.finishedInboundReqNo
  const row = mobileFinishedInboundState.items.find((r) => {
    if (reqId && r.id === reqId) return true
    if (reqNo && r.reqNo === reqNo) return true
    const refs = listInboundRefs(r)
    return refs.some((ref) => ref.id === order.id || ref.docNo === order.docNo)
  })
  if (!row) return null
  const refs = listInboundRefs(row).map((ref) =>
    ref.id === order.id || ref.docNo === order.docNo
      ? { ...ref, status: order.status || ref.status }
      : ref,
  )
  if (!refs.length) {
    row.inboundId = order.id
    row.inboundDocNo = order.docNo
    row.inboundStatus = order.status || '—'
  } else {
    applyInboundRefsToRecord(
      row,
      refs.map((r) => ({
        ...r,
        docNo: r.docNo,
        id: r.id,
        warehouse: r.warehouse,
        status: r.status,
      })),
    )
    // keep status sync from live order when possible
    const live = getInboundOrderById(order.id)
    if (live) {
      row.inboundStatus = live.status || row.inboundStatus
    }
  }
  return enrich(row)
}
