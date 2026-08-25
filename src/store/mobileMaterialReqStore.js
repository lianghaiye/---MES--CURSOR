/**
 * 领料申请（与小程序共用 storage key：i_doms_mobile_material_reqs）
 * 小程序 / WEB 提交后均写入此存储，并联动生成领料出库单。
 */
import { reactive, watch } from 'vue'
import {
  createMobileMaterialReqSeed,
  materialReqModeLabel,
  MATERIAL_REQ_MODES,
  MATERIAL_REQ_AUDIT,
  MATERIAL_REQ_AUDIT_OPTIONS,
  isMaterialReqMultiSourceMode,
} from '@/mock/mobileMaterialReqSeed'
import { ensureMultiUnitFlowMaterialReqs } from '@/mock/multiUnitFlowDemoSeed'
import {
  appendOutboundOrder,
  getOutboundOrderById,
  resolveOutboundInitialStatus,
} from '@/store/outboundStore'
import { snapshotWorkOrdersForOutbound } from '@/utils/outboundWorkOrders'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'
import {
  mergeMaterialLines,
  mergeMaterialLinesWithSources,
  generateMaterialReqNo,
  formatNow,
} from '@/utils/materialReqEbom'

export const MOBILE_MATERIAL_REQ_STORAGE_KEY = 'i_doms_mobile_material_reqs'
const SEED_VERSION_KEY = 'i_doms_mobile_material_reqs_seed_v'
const CURRENT_SEED_VERSION = '4'

export {
  materialReqModeLabel,
  MATERIAL_REQ_MODES,
  MATERIAL_REQ_AUDIT,
  MATERIAL_REQ_AUDIT_OPTIONS,
  isMaterialReqMultiSourceMode,
}

function loadItems() {
  try {
    const raw = localStorage.getItem(MOBILE_MATERIAL_REQ_STORAGE_KEY)
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
    MOBILE_MATERIAL_REQ_STORAGE_KEY,
    JSON.stringify({ items: mobileMaterialReqState.items }),
  )
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function createInitial() {
  const version = localStorage.getItem(SEED_VERSION_KEY)
  const cached = loadItems()
  // 种子升级且无真实小程序数据时重灌演示数据（避免覆盖用户已有申请）
  if (version !== CURRENT_SEED_VERSION && (!cached || !cached.length || allSeedIds(cached))) {
    const seeded = ensureMultiUnitFlowMaterialReqs(createMobileMaterialReqSeed())
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
    localStorage.setItem(MOBILE_MATERIAL_REQ_STORAGE_KEY, JSON.stringify({ items: seeded }))
    return seeded
  }
  if (cached !== null) {
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
    return ensureMultiUnitFlowMaterialReqs(ensureMultiWarehouseSeedReqs(cached.map(normalizeReq)))
  }
  const seeded = ensureMultiUnitFlowMaterialReqs(createMobileMaterialReqSeed())
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  localStorage.setItem(MOBILE_MATERIAL_REQ_STORAGE_KEY, JSON.stringify({ items: seeded }))
  return seeded
}

/** 在已有真实数据时补齐多仓演示单（不覆盖用户单据） */
function ensureMultiWarehouseSeedReqs(items) {
  const seeds = createMobileMaterialReqSeed().filter((r) =>
    ['mr-seed-001', 'mr-seed-005', 'mr-seed-006'].includes(r.id),
  )
  const list = [...(items || [])]
  const indexById = new Map(list.map((r, i) => [r.id, i]))
  seeds.forEach((seed) => {
    const idx = indexById.get(seed.id)
    if (idx == null) {
      list.unshift(seed)
      return
    }
    // 仅覆盖仍是演示种子的行，刷新多仓字段
    if (String(list[idx].id || '').startsWith('mr-seed-')) {
      list[idx] = { ...seed }
    }
  })
  return list
}

function allSeedIds(items) {
  return items.every((r) => {
    const id = String(r.id || '')
    return id.startsWith('mr-seed-') || id.startsWith('mr-mu-flow-')
  })
}

function normalizeReq(row) {
  const auditStatus =
    row.auditStatus || (row.outboundId ? MATERIAL_REQ_AUDIT.APPROVED : MATERIAL_REQ_AUDIT.PENDING)
  return {
    ...row,
    auditStatus,
    rejectReason: row.rejectReason || '',
  }
}

export const mobileMaterialReqState = reactive({
  items: createInitial(),
})

watch(
  () => mobileMaterialReqState.items,
  () => persist(),
  { deep: true },
)

/** 从 localStorage 重新拉取（小程序写入后同步） */
export function refreshMobileMaterialReqs() {
  const loaded = loadItems()
  if (Array.isArray(loaded)) {
    mobileMaterialReqState.items = loaded
  }
}

function enrich(row) {
  const normalized = normalizeReq(row)
  const refs = listOutboundRefs(normalized)
  const liveOrders = refs.map((ref) => getOutboundOrderById(ref.id)).filter(Boolean)
  const docNos = liveOrders.length
    ? liveOrders.map((o) => o.docNo).filter(Boolean)
    : refs.map((r) => r.docNo).filter(Boolean)
  const statuses = liveOrders.map((o) => o.status).filter(Boolean)
  let outboundStatus = normalized.outboundStatus || '—'
  if (statuses.length) {
    outboundStatus = statuses.every((s) => s === statuses[0]) ? statuses[0] : '多单进行中'
  }
  return {
    ...normalized,
    modeLabel: materialReqModeLabel(normalized.mode),
    outboundOrders: refs,
    outboundStatus,
    outboundDocNo: docNos.join('、') || normalized.outboundDocNo || '',
    outboundId: refs[0]?.id || normalized.outboundId || '',
  }
}

/** 兼容旧单字段与 outboundOrders[] */
function listOutboundRefs(row) {
  const fromList = Array.isArray(row.outboundOrders)
    ? row.outboundOrders
        .map((o) => ({
          id: o.id || '',
          docNo: o.docNo || '',
          warehouse: o.warehouse || '',
          status: o.status || '',
        }))
        .filter((o) => o.id || o.docNo)
    : []
  if (fromList.length) return fromList
  if (row.outboundId || row.outboundDocNo) {
    return [
      {
        id: row.outboundId || '',
        docNo: row.outboundDocNo || '',
        warehouse: '',
        status: row.outboundStatus || '',
      },
    ]
  }
  return []
}

function applyOutboundRefsToRecord(record, orders) {
  const refs = (orders || []).map((o) => ({
    id: o.id,
    docNo: o.docNo,
    warehouse: o.warehouse || '',
    status: o.status || '',
  }))
  record.outboundOrders = refs
  record.outboundId = refs[0]?.id || ''
  record.outboundDocNo = refs
    .map((r) => r.docNo)
    .filter(Boolean)
    .join('、')
  const statuses = refs.map((r) => r.status).filter(Boolean)
  record.outboundStatus = statuses.length
    ? statuses.every((s) => s === statuses[0])
      ? statuses[0]
      : '多单进行中'
    : '—'
}

export function listMobileMaterialReqs() {
  return mobileMaterialReqState.items
    .map(enrich)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function getMobileMaterialReqById(id) {
  const row = mobileMaterialReqState.items.find((r) => r.id === id)
  return row ? enrich(row) : null
}

export function relatedWorkOrderText(record) {
  if (!record) return '—'
  if (record.mode === MATERIAL_REQ_MODES.BATCH) {
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
  if (record.mode === MATERIAL_REQ_MODES.BATCH) {
    const count = record.workOrderIds?.length || record.workOrders?.length || 0
    if (count) return `${count} 个工单 · ${record.lineCount || 0} 项物料`
    return record.productName || '批量领料'
  }
  if (record.productName) return record.productName
  const first = record.lines?.[0]?.itemName
  if (!first) return '—'
  if ((record.lineCount || 0) > 1) return `${first} 等${record.lineCount}项`
  return first
}

function resolveBatchSourceOrderNo(payload) {
  if (payload.salesOrderNo && payload.salesOrderNo !== 'MULTI') {
    return payload.salesOrderNo
  }
  const codes = (payload.workOrders || [])
    .map((wo) => wo.code)
    .filter(Boolean)
    .slice(0, 3)
  return codes.join('、')
}

function resolveLineSourceDocNo(payload, line) {
  if (payload.mode !== MATERIAL_REQ_MODES.BATCH) {
    return payload.workOrderCode || ''
  }
  const sources = line.sourceWorkOrders || []
  if (sources.length === 1) return sources[0].workOrderCode || ''
  if (sources.length > 1) {
    return sources
      .map((s) => s.workOrderCode)
      .filter(Boolean)
      .slice(0, 3)
      .join('、')
  }
  return resolveBatchSourceOrderNo(payload)
}

/**
 * WEB / 小程序同逻辑：提交领料申请；审核通过后生成领料出库单
 * @param {object} payload
 * @param {'work-order'|'quick'|'batch-work-order'|'sales-order'} payload.mode
 * @param {string} [payload.sourceChannel] web | mini-program
 */
export function submitMaterialRequisition(payload) {
  const isMulti = isMaterialReqMultiSourceMode(payload.mode)
  const mergeFn = isMulti ? mergeMaterialLinesWithSources : mergeMaterialLines
  const lines = mergeFn(payload.lines || [])
  if (!lines.length) {
    return { ok: false, message: '请至少添加一条领料明细' }
  }
  for (const line of lines) {
    if (!Number(line.shipQty) || Number(line.shipQty) <= 0) {
      return { ok: false, message: `「${line.itemName || line.itemCode}」领料数量须大于 0` }
    }
    // 双单位拣批在领料出库单完成，申请阶段只报需求量
  }

  const userName = payload.applicant || '管理员'
  const workshop = payload.workshop || payload.requisitionDept || '默认工厂'
  const sourceOrderNo = isMulti
    ? resolveBatchSourceOrderNo(payload)
    : payload.workOrderCode || payload.salesOrderNo || ''
  const remarkBase = payload.remark
    ? `领料申请：${payload.remark}`
    : `领料申请（${materialReqModeLabel(payload.mode)}）`
  const channel = payload.sourceChannel || 'web'

  const autoApprove = isAutoApproveEnabled(AUTO_APPROVE_TYPES.MATERIAL_REQUISITION)
  const auditStatus = autoApprove ? MATERIAL_REQ_AUDIT.APPROVED : MATERIAL_REQ_AUDIT.PENDING

  const reqNo = generateMaterialReqNo(mobileMaterialReqState.items)
  const outboundDraft = {
    remarkBase,
    sourceOrderNo,
    warehouse: payload.warehouse || '',
    channel,
  }
  const record = {
    id: `mr-${Date.now()}`,
    reqNo,
    mode: payload.mode,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    workOrderIds: payload.workOrderIds || [],
    workOrders: payload.workOrders || [],
    salesOrderNo: payload.salesOrderNo || '',
    productName: payload.productName || '',
    orderCategory: payload.orderCategory || '',
    workshop,
    receiveWarehouse: payload.receiveWarehouse || '',
    remark: payload.remark || '',
    lineCount: lines.length,
    totalQty: lines.reduce((s, l) => s + (Number(l.shipQty) || 0), 0),
    lines,
    outboundId: '',
    outboundDocNo: '',
    outboundStatus: '—',
    auditStatus,
    rejectReason: '',
    applicant: userName,
    createdAt: formatNow(),
    sourceChannel: channel,
    _outboundDraft: outboundDraft,
  }

  let order = null
  let orders = []
  if (auditStatus === MATERIAL_REQ_AUDIT.APPROVED) {
    const outboundResult = createOutboundForRequisition(record)
    if (!outboundResult.ok) return outboundResult
    orders = outboundResult.orders || []
    order = orders[0] || null
    applyOutboundRefsToRecord(record, orders)
    delete record._outboundDraft
  }

  mobileMaterialReqState.items.unshift(record)
  return { ok: true, record, order, orders }
}

/**
 * 按领料仓库拆分生成领料出库单（一仓一张）
 * @returns {{ ok: boolean, orders?: object[], order?: object, message?: string }}
 */
function createOutboundForRequisition(record) {
  const draft = record._outboundDraft || {}
  const userName = record.applicant || '管理员'
  const workshop = record.workshop || '默认工厂'
  const remarkBase =
    draft.remarkBase ||
    (record.remark
      ? `领料申请：${record.remark}`
      : `领料申请（${materialReqModeLabel(record.mode)}）`)
  const sourceOrderNo =
    draft.sourceOrderNo ||
    (isMaterialReqMultiSourceMode(record.mode)
      ? resolveBatchSourceOrderNo(record)
      : record.workOrderCode || record.salesOrderNo || '')
  const channel = draft.channel || record.sourceChannel || 'web'
  const outboundStatus = resolveOutboundInitialStatus('领料出库')

  const workOrders = snapshotWorkOrdersForOutbound(
    record.workOrders?.length
      ? record.workOrders
      : record.workOrderCode || record.workOrderId
        ? [
            {
              id: record.workOrderId,
              code: record.workOrderCode,
              productName: record.productName,
              productCode: record.productCode,
              specModel: record.specModel,
              material: record.material,
              drawingNo: record.drawingNo,
              bom: record.bom,
              planQty: record.planQty ?? record.scheduleQty,
              scheduleQty: record.scheduleQty,
              salesOrderNo: record.salesOrderNo,
            },
          ]
        : [],
  )

  const mappedLines = (record.lines || []).map((line) => ({
    itemCode: line.itemCode,
    itemName: line.itemName,
    itemType: line.itemType || '物料',
    specModel: line.specModel,
    specAttr: line.specAttr || '',
    material: line.material,
    drawingNo: line.drawingNo,
    shipQty: line.shipQty,
    unit: line.unit || '件',
    shipWarehouse: String(line.shipWarehouse || draft.warehouse || '').trim() || '未指定仓库',
    stockQty: line.warehouseStockQty ?? null,
    warehouseStockQty: line.warehouseStockQty ?? null,
    lineSource: line.lineSource === 'EBOM' ? '工单领料' : '手工添加',
    sourceDocNo: resolveLineSourceDocNo(record, line),
    itemId: line.itemId || '',
    sourceWorkOrders: line.sourceWorkOrders || [],
    isVariableLength: Boolean(line.isVariableLength),
    demandMeters: line.demandMeters ?? (line.isVariableLength ? line.shipQty : null),
    blankLength: line.blankLength ?? null,
    blankArea: line.blankArea ?? null,
    blankSize: line.blankSize || null,
    blankSizeText: line.blankSizeText || '',
    blankSizeMode: line.blankSizeMode || '',
    uomRelation: line.uomRelation || '',
    pickedBatchId: line.pickedBatchId || '',
    pickedBatchNo: line.pickedBatchNo || '',
    pickedLength: line.pickedLength ?? null,
    workOrderNo: resolveLineSourceDocNo(record, line),
  }))

  if (!mappedLines.length) {
    return { ok: false, message: '请至少添加一条领料明细' }
  }

  const groups = new Map()
  mappedLines.forEach((line) => {
    const wh = line.shipWarehouse
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push(line)
  })

  const orders = []
  let index = 0
  for (const [warehouse, lineItems] of groups) {
    index += 1
    const remark = groups.size > 1 ? `${remarkBase}（仓库：${warehouse}）` : remarkBase
    const result = appendOutboundOrder({
      id: `ob-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
      outboundType: '领料出库',
      status: outboundStatus,
      handler: userName,
      creator: userName,
      warehouseKeeper: userName,
      workshop,
      requisitionDept: workshop,
      receiveWarehouse: record.receiveWarehouse || '',
      sourceOrderNo: sourceOrderNo || record.reqNo || '',
      materialReqId: record.id || '',
      materialReqNo: record.reqNo || '',
      salesOrderNo: record.salesOrderNo || '',
      warehouse,
      remark,
      sourceChannel: channel,
      workOrders,
      lineItems,
    })
    if (!result.ok) {
      return { ok: false, message: result.message || `仓库「${warehouse}」生成出库单失败` }
    }
    orders.push(result.order)
  }

  return { ok: true, orders, order: orders[0] || null }
}

export function approveMaterialRequisition(id, auditor = '管理员') {
  const row = mobileMaterialReqState.items.find((r) => r.id === id)
  if (!row) return { ok: false, message: '申请单不存在' }
  if (normalizeReq(row).auditStatus !== MATERIAL_REQ_AUDIT.PENDING) {
    return { ok: false, message: '仅待审核申请可审核通过' }
  }
  if (!listOutboundRefs(row).length) {
    const outboundResult = createOutboundForRequisition(row)
    if (!outboundResult.ok) return outboundResult
    applyOutboundRefsToRecord(row, outboundResult.orders || [])
  }
  row.auditStatus = MATERIAL_REQ_AUDIT.APPROVED
  row.rejectReason = ''
  row.auditor = auditor
  row.auditedAt = formatNow()
  delete row._outboundDraft
  return { ok: true, record: enrich(row) }
}

export function rejectMaterialRequisition(id, reason = '', auditor = '管理员') {
  const row = mobileMaterialReqState.items.find((r) => r.id === id)
  if (!row) return { ok: false, message: '申请单不存在' }
  if (normalizeReq(row).auditStatus !== MATERIAL_REQ_AUDIT.PENDING) {
    return { ok: false, message: '仅待审核申请可驳回' }
  }
  row.auditStatus = MATERIAL_REQ_AUDIT.REJECTED
  row.rejectReason = reason || ''
  row.auditor = auditor
  row.auditedAt = formatNow()
  delete row._outboundDraft
  return { ok: true, record: enrich(row) }
}

/** 出库单拒绝出库后，回写关联领料申请的出库状态 */
export function syncMaterialReqOnOutboundRefuse(order) {
  if (!order) return null
  const id = order.id
  const docNo = order.docNo
  const reqId = order.materialReqId
  const reqNo = order.materialReqNo
  const row = mobileMaterialReqState.items.find((r) => {
    if (reqId && r.id === reqId) return true
    if (reqNo && r.reqNo === reqNo) return true
    const refs = listOutboundRefs(r)
    if (id && refs.some((ref) => ref.id === id)) return true
    if (docNo && refs.some((ref) => ref.docNo === docNo)) return true
    if (id && r.outboundId === id) return true
    if (docNo && (r.outboundDocNo || '').includes(docNo)) return true
    return false
  })
  if (!row) return null
  const refs = listOutboundRefs(row).map((ref) => {
    const live = getOutboundOrderById(ref.id)
    if (live) {
      return {
        id: live.id,
        docNo: live.docNo,
        warehouse: live.warehouse || '',
        status: live.status || '',
      }
    }
    if ((id && ref.id === id) || (docNo && ref.docNo === docNo)) {
      return { ...ref, status: order.status || '拒绝领料' }
    }
    return ref
  })
  if (refs.length) {
    applyOutboundRefsToRecord(row, refs)
  } else {
    row.outboundStatus = order.status || '拒绝领料'
    row.outboundDocNo = order.docNo || row.outboundDocNo || ''
    row.outboundId = order.id || row.outboundId || ''
  }
  row.outboundRefuseReason = order.refuseReason || ''
  return enrich(row)
}

/** @deprecated 领料出库已统一为待出库→确认出库，不再审批 */
export function isMaterialOutboundSkipApproval() {
  return true
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === MOBILE_MATERIAL_REQ_STORAGE_KEY) refreshMobileMaterialReqs()
  })
  window.addEventListener('focus', () => refreshMobileMaterialReqs())
}
