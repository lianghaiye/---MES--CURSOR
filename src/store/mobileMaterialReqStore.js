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
const CURRENT_SEED_VERSION = '2'

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
    const seeded = createMobileMaterialReqSeed()
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
    localStorage.setItem(MOBILE_MATERIAL_REQ_STORAGE_KEY, JSON.stringify({ items: seeded }))
    return seeded
  }
  if (cached !== null) {
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
    return cached.map(normalizeReq)
  }
  const seeded = createMobileMaterialReqSeed()
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  localStorage.setItem(MOBILE_MATERIAL_REQ_STORAGE_KEY, JSON.stringify({ items: seeded }))
  return seeded
}

function allSeedIds(items) {
  return items.every((r) => String(r.id || '').startsWith('mr-seed-'))
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
  const outbound = normalized.outboundId ? getOutboundOrderById(normalized.outboundId) : null
  return {
    ...normalized,
    modeLabel: materialReqModeLabel(normalized.mode),
    outboundStatus: outbound?.status || normalized.outboundStatus || '—',
    outboundDocNo: outbound?.docNo || normalized.outboundDocNo || '',
  }
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
  if (auditStatus === MATERIAL_REQ_AUDIT.APPROVED) {
    const outboundResult = createOutboundForRequisition(record)
    if (!outboundResult.ok) return outboundResult
    order = outboundResult.order
    record.outboundId = order.id
    record.outboundDocNo = order.docNo
    record.outboundStatus = order.status
    delete record._outboundDraft
  }

  mobileMaterialReqState.items.unshift(record)
  return { ok: true, record, order }
}

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

  return appendOutboundOrder({
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
    warehouse: draft.warehouse || '',
    remark: remarkBase,
    sourceChannel: channel,
    workOrders,
    lineItems: (record.lines || []).map((line) => ({
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: line.itemType || '物料',
      specModel: line.specModel,
      specAttr: line.specAttr || '',
      material: line.material,
      drawingNo: line.drawingNo,
      shipQty: line.shipQty,
      unit: line.unit || '件',
      shipWarehouse: line.shipWarehouse || draft.warehouse || '',
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
    })),
  })
}

export function approveMaterialRequisition(id, auditor = '管理员') {
  const row = mobileMaterialReqState.items.find((r) => r.id === id)
  if (!row) return { ok: false, message: '申请单不存在' }
  if (normalizeReq(row).auditStatus !== MATERIAL_REQ_AUDIT.PENDING) {
    return { ok: false, message: '仅待审核申请可审核通过' }
  }
  if (!row.outboundId) {
    const outboundResult = createOutboundForRequisition(row)
    if (!outboundResult.ok) return outboundResult
    row.outboundId = outboundResult.order.id
    row.outboundDocNo = outboundResult.order.docNo
    row.outboundStatus = outboundResult.order.status
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
