import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createMaterialRequisitionSeed,
  MATERIAL_DEDUCT_STATUS,
  MATERIAL_REQUISITION_STATS_SEED,
  MATERIAL_DEDUCT_SOURCES,
  normalizeMaterialDeductStatus,
  resolveInventoryDeductDocNo,
  resolveDeductSource,
  isQuickMaterialDeduct,
} from '@/mock/materialRequisitionRecords'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'
import { buildBackflushDeductDraft } from '@/utils/backflushDeduct'
import { ensureCrossDemoDeductRecords } from '@/mock/crossModuleDemoSeed'

const STORAGE_KEY = 'i_doms_material_requisition'
const SEED_VERSION_KEY = 'i_doms_material_requisition_seed_v'
/** v10：跨模块演示库存扣减 */
const CURRENT_SEED_VERSION = '10'

/** 确认后可撤销 / 作废 / 重试的天数，超时单据锁定 */
export const MATERIAL_DEDUCT_OPERABLE_DAYS = 30

/**
 * 已确认单据是否因超过可操作窗口被锁定
 * （待确认、已作废不受此限制）
 */
export function isMaterialDeductLocked(record) {
  if (!record) return false
  const status = record.status
  if (
    status !== MATERIAL_DEDUCT_STATUS.SUCCESS &&
    status !== MATERIAL_DEDUCT_STATUS.PARTIAL &&
    status !== MATERIAL_DEDUCT_STATUS.FAILED
  ) {
    return false
  }
  const confirmedAt = record.confirmedAt || record.deductTime
  if (!confirmedAt) return false
  const start = dayjs(confirmedAt)
  if (!start.isValid()) return false
  return dayjs().diff(start, 'day') >= MATERIAL_DEDUCT_OPERABLE_DAYS
}

function assertConfirmedOperable(row) {
  if (isMaterialDeductLocked(row)) {
    return {
      ok: false,
      message: `确认已超过 ${MATERIAL_DEDUCT_OPERABLE_DAYS} 天，单据已锁定，不可再操作`,
    }
  }
  return null
}

export const DEDUCT_REVOKE_REASON_OPTIONS = [
  { label: '报工数量填写错误', value: '报工数量填写错误' },
  { label: '工单取消/作废', value: '工单取消/作废' },
  { label: 'BOM用量错误', value: 'BOM用量错误' },
  { label: '部分完工撤销', value: '部分完工撤销' },
  { label: '其他（请在说明中描述）', value: '其他（请在说明中描述）' },
]

function normalizeRecord(row) {
  if (!row) return row
  row.status = normalizeMaterialDeductStatus(row.status)
  if (Array.isArray(row.lines)) {
    row.lines = row.lines.map((l) => ({
      ...l,
      status: normalizeMaterialDeductStatus(l.status),
    }))
  }
  if (!row.stockPhase) {
    if (row.status === MATERIAL_DEDUCT_STATUS.PENDING) row.stockPhase = 'prelock'
    else if (row.status === MATERIAL_DEDUCT_STATUS.VOIDED) row.stockPhase = 'released'
    else row.stockPhase = 'actual'
  }
  if (!row.requisitionMode) {
    row.requisitionMode = row.reqNo && !row.workOrderNo ? 'quick' : 'work-order'
  }
  if (!row.deductSource) {
    row.deductSource = resolveDeductSource(row)
  }
  return row
}

export function generateMaterialDeductNo() {
  const ymd = dayjs().format('YYYYMMDD')
  const prefix = `DR-${ymd}-`
  let max = 0
  materialRequisitionState.records.forEach((r) => {
    const no = String(r.deductNo || '')
    if (!no.startsWith(prefix)) return
    const seq = Number(no.slice(prefix.length).replace(/\D/g, '')) || 0
    max = Math.max(max, seq)
  })
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

/**
 * 写入一条库存扣减记录；若开启库存扣减自动审批则直接确认
 */
export function createMaterialDeductRecord(payload = {}) {
  const lines = (payload.lines || []).map((l) => ({
    ...l,
    planQty: Number(l.planQty) || 0,
    actualQty: 0,
    status: MATERIAL_DEDUCT_STATUS.PENDING,
    failReason: '',
  }))
  if (!lines.length) {
    return { ok: false, message: '扣减明细不能为空' }
  }
  const row = normalizeRecord({
    id: payload.id || `dr-${Date.now()}`,
    workOrderNo: payload.workOrderNo || '',
    workOrderId: payload.workOrderId || '',
    reqNo: payload.reqNo || '',
    requisitionMode: payload.requisitionMode || 'work-order',
    deductSource: payload.deductSource || MATERIAL_DEDUCT_SOURCES.WORK_ORDER,
    deductNo: payload.deductNo || generateMaterialDeductNo(),
    productName: payload.productName || '',
    productSpec: payload.productSpec || '',
    material: payload.material || '',
    drawingNo: payload.drawingNo || '',
    reportQty: Number(payload.reportQty) || 0,
    deductTime: '',
    warehouseName: payload.warehouseName || '',
    warehouseCode: payload.warehouseCode || '',
    materialDone: 0,
    materialTotal: lines.length,
    status: MATERIAL_DEDUCT_STATUS.PENDING,
    stockPhase: 'prelock',
    remark: payload.remark || '',
    lines,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  materialRequisitionState.records.unshift(row)

  if (isAutoApproveEnabled(AUTO_APPROVE_TYPES.INVENTORY_DEDUCT)) {
    return confirmMaterialDeduct(row.id)
  }
  return { ok: true, record: row }
}

/**
 * 工单完工 → 倒冲扣减单（领料属性关闭的 BOM 件）
 * 同一工单已有倒冲待确认/成功单时不重复生成
 */
export function createBackflushDeductFromWorkOrder(workOrder, finishedQty) {
  if (!workOrder) return { ok: false, message: '工单不存在' }
  const woNo = workOrder.code || workOrder.workOrderNo || ''
  const existed = materialRequisitionState.records.find(
    (r) =>
      resolveDeductSource(r) === MATERIAL_DEDUCT_SOURCES.BACKFLUSH &&
      (r.workOrderId === workOrder.id || r.workOrderNo === woNo) &&
      r.status !== MATERIAL_DEDUCT_STATUS.VOIDED,
  )
  if (existed) {
    return { ok: true, skipped: true, record: existed, message: '该工单已有倒冲扣减单' }
  }

  const built = buildBackflushDeductDraft(workOrder, finishedQty)
  if (!built.ok) return built
  return createMaterialDeductRecord(built.draft)
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.records)) {
        return {
          ...parsed,
          records: parsed.records.map((r) => normalizeRecord({ ...r })),
        }
      }
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
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      records: materialRequisitionState.records,
      stats: materialRequisitionState.stats,
    }),
  )
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function createInitial() {
  if (!shouldReseed()) {
    const cached = loadFromStorage()
    if (cached) {
      return {
        records: ensureCrossDemoDeductRecords(cached.records),
        stats: { ...MATERIAL_REQUISITION_STATS_SEED, ...(cached.stats || {}) },
      }
    }
  }
  return {
    records: ensureCrossDemoDeductRecords(createMaterialRequisitionSeed()),
    stats: { ...MATERIAL_REQUISITION_STATS_SEED },
  }
}

export const materialRequisitionState = reactive(createInitial())

watch(
  () => [materialRequisitionState.records, materialRequisitionState.stats],
  () => persist(),
  { deep: true },
)

function findRecord(id) {
  return materialRequisitionState.records.find((r) => r.id === id) || null
}

function recalcMaterialCount(row) {
  const lines = row.lines || []
  row.materialTotal = lines.length
  row.materialDone = lines.filter((l) => l.status === MATERIAL_DEDUCT_STATUS.SUCCESS).length
}

function resolveDeductResultStatus(lines = []) {
  const total = lines.length
  if (!total) return MATERIAL_DEDUCT_STATUS.FAILED
  const success = lines.filter((l) => l.status === MATERIAL_DEDUCT_STATUS.SUCCESS).length
  const failed = lines.filter((l) => l.status === MATERIAL_DEDUCT_STATUS.FAILED).length
  if (failed === 0 && success === total) return MATERIAL_DEDUCT_STATUS.SUCCESS
  if (success === 0) return MATERIAL_DEDUCT_STATUS.FAILED
  return MATERIAL_DEDUCT_STATUS.PARTIAL
}

/** 模拟扣减执行：库存不足则失败 */
function executeDeductLines(lines = []) {
  return lines.map((l) => {
    const planQty = Number(l.planQty) || 0
    const stock = l.warehouseStockQty
    const insufficient = stock != null && Number(stock) < planQty
    if (insufficient || planQty <= 0) {
      return {
        ...l,
        actualQty: 0,
        status: MATERIAL_DEDUCT_STATUS.FAILED,
        failReason: planQty <= 0 ? '数量无效' : '库存不足',
      }
    }
    return {
      ...l,
      actualQty: planQty,
      status: MATERIAL_DEDUCT_STATUS.SUCCESS,
      failReason: '',
    }
  })
}

export function listMaterialDeductRecords() {
  return materialRequisitionState.records
}

export function getMaterialDeductById(id) {
  return findRecord(id)
}

export function getMaterialDeductStats() {
  return materialRequisitionState.stats
}

export function isInventoryDeductAutoApprove() {
  return isAutoApproveEnabled(AUTO_APPROVE_TYPES.INVENTORY_DEDUCT)
}

export function updatePendingMaterialDeduct(id, patch = {}) {
  const row = findRecord(id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status !== MATERIAL_DEDUCT_STATUS.PENDING) {
    return { ok: false, message: '仅待确认记录可编辑' }
  }
  if (patch.warehouseName != null) row.warehouseName = patch.warehouseName
  if (patch.warehouseCode != null) row.warehouseCode = patch.warehouseCode
  if (Array.isArray(patch.lines)) {
    row.lines = patch.lines.map((l) => ({
      ...l,
      planQty: Number(l.planQty) || 0,
      actualQty: 0,
      status: MATERIAL_DEDUCT_STATUS.PENDING,
      failReason: '',
    }))
    recalcMaterialCount(row)
    row.materialDone = 0
  }
  row.stockPhase = 'prelock'
  return { ok: true, record: row }
}

/**
 * 确认扣减：预扣冻结转为实扣
 * （兼容旧名 approveMaterialDeduct）
 */
export function confirmMaterialDeduct(id) {
  const row = findRecord(id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status !== MATERIAL_DEDUCT_STATUS.PENDING) {
    return { ok: false, message: '仅待确认记录可确认' }
  }
  if (!(row.lines || []).length) {
    return { ok: false, message: '请至少保留一条扣减物料' }
  }
  row.lines = executeDeductLines(row.lines)
  row.status = resolveDeductResultStatus(row.lines)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  row.deductTime = now
  row.confirmedAt = now
  row.stockPhase = 'actual'
  recalcMaterialCount(row)
  return { ok: true, record: row }
}

/** @deprecated 使用 confirmMaterialDeduct */
export function approveMaterialDeduct(id) {
  return confirmMaterialDeduct(id)
}

/** 批量确认待确认记录 */
export function batchConfirmMaterialDeduct(ids = []) {
  const results = []
  ids.forEach((id) => {
    results.push({ id, ...confirmMaterialDeduct(id) })
  })
  const okCount = results.filter((r) => r.ok).length
  return {
    ok: okCount > 0,
    okCount,
    failCount: results.length - okCount,
    results,
  }
}

/**
 * 撤销确认：实扣退回仓库，恢复为待确认（预扣锁定保留）
 */
export function undoConfirmMaterialDeduct(id) {
  const row = findRecord(id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (
    row.status !== MATERIAL_DEDUCT_STATUS.SUCCESS &&
    row.status !== MATERIAL_DEDUCT_STATUS.PARTIAL &&
    row.status !== MATERIAL_DEDUCT_STATUS.FAILED
  ) {
    return { ok: false, message: '当前状态不可撤销确认' }
  }
  const locked = assertConfirmedOperable(row)
  if (locked) return locked
  row.status = MATERIAL_DEDUCT_STATUS.PENDING
  row.stockPhase = 'prelock'
  row.deductTime = ''
  row.confirmedAt = ''
  row.lines = (row.lines || []).map((l) => ({
    ...l,
    actualQty: 0,
    status: MATERIAL_DEDUCT_STATUS.PENDING,
    failReason: '',
    returnQty: Number(l.actualQty) || 0,
  }))
  row.materialDone = 0
  row.undoConfirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, record: row }
}

/**
 * 作废：解冻并退回库存，单据永久失效不可再发起
 */
export function voidMaterialDeduct(id, reason = '') {
  const row = findRecord(id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status === MATERIAL_DEDUCT_STATUS.VOIDED) {
    return { ok: false, message: '单据已作废' }
  }
  if (
    row.status === MATERIAL_DEDUCT_STATUS.SUCCESS ||
    row.status === MATERIAL_DEDUCT_STATUS.PARTIAL ||
    row.status === MATERIAL_DEDUCT_STATUS.FAILED
  ) {
    const locked = assertConfirmedOperable(row)
    if (locked) return locked
  }
  row.status = MATERIAL_DEDUCT_STATUS.VOIDED
  row.stockPhase = 'released'
  row.voidReason = reason || ''
  row.voidedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  row.lines = (row.lines || []).map((l) => ({
    ...l,
    actualQty: 0,
    status: MATERIAL_DEDUCT_STATUS.VOIDED,
    failReason: '',
    returnQty: Number(l.actualQty) || Number(l.planQty) || 0,
  }))
  row.materialDone = 0
  materialRequisitionState.stats.revokedMonth =
    (materialRequisitionState.stats.revokedMonth || 0) + 1
  return { ok: true, record: row }
}

/** @deprecated 使用 voidMaterialDeduct */
export function rejectMaterialDeduct(id, reason = '') {
  return voidMaterialDeduct(id, reason)
}

/**
 * @param {object} payload
 * @param {'full'|'diff'} payload.revokeType
 * @param {Array<{id:string, actualDeductQty:number}>} [payload.lineDiffs]
 * @param {string} payload.reason
 * @param {string} [payload.remark]
 * @deprecated 差额撤销场景可改用 undoConfirmMaterialDeduct；保留兼容
 */
export function revokeMaterialDeductWithForm(id, payload = {}) {
  const row = findRecord(id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status === MATERIAL_DEDUCT_STATUS.VOIDED) {
    return { ok: false, message: '已作废' }
  }
  if (row.status === MATERIAL_DEDUCT_STATUS.PENDING) {
    return { ok: false, message: '待确认记录请使用作废' }
  }
  if (!payload.reason) {
    return { ok: false, message: '请选择撤销原因' }
  }

  const revokeType = payload.revokeType || 'full'
  if (revokeType === 'full') {
    return undoConfirmMaterialDeduct(id)
  }

  const diffMap = new Map((payload.lineDiffs || []).map((d) => [d.id, d]))
  row.lines = (row.lines || []).map((l) => {
    const diff = diffMap.get(l.id)
    const original = Number(l.actualQty) || Number(l.planQty) || 0
    const actualDeduct =
      diff && diff.actualDeductQty != null ? Number(diff.actualDeductQty) : original
    const returnQty = Math.max(0, original - actualDeduct)
    return {
      ...l,
      planQty: actualDeduct,
      actualQty: actualDeduct,
      returnQty,
      status: actualDeduct <= 0 ? MATERIAL_DEDUCT_STATUS.VOIDED : MATERIAL_DEDUCT_STATUS.SUCCESS,
      failReason: '',
    }
  })
  const active = (row.lines || []).filter((l) => Number(l.actualQty) > 0)
  if (!active.length) {
    return undoConfirmMaterialDeduct(id)
  }
  row.status = MATERIAL_DEDUCT_STATUS.SUCCESS
  row.stockPhase = 'actual'
  row.lines = active
  recalcMaterialCount(row)
  row.revokeType = revokeType
  row.revokeReason = payload.reason
  row.revokeRemark = payload.remark || ''
  row.revokedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, record: row }
}

/** @deprecated 使用 undoConfirmMaterialDeduct */
export function revokeMaterialDeduct(id) {
  return undoConfirmMaterialDeduct(id)
}

export function retryMaterialDeduct(id) {
  const row = findRecord(id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (
    row.status !== MATERIAL_DEDUCT_STATUS.FAILED &&
    row.status !== MATERIAL_DEDUCT_STATUS.PARTIAL
  ) {
    return { ok: false, message: '仅部分成功或失败记录可重试' }
  }
  const locked = assertConfirmedOperable(row)
  if (locked) return locked
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  row.deductTime = now
  row.lines = executeDeductLines(
    (row.lines || []).map((l) => ({
      ...l,
      planQty: Number(l.planQty) || Number(l.actualQty) || 0,
    })),
  )
  row.status = resolveDeductResultStatus(row.lines)
  row.stockPhase = 'actual'
  recalcMaterialCount(row)
  return { ok: true, record: row }
}

export function urgeMaterialDeductAudit(id) {
  const row = findRecord(id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status !== MATERIAL_DEDUCT_STATUS.PENDING) {
    return { ok: false, message: '仅待确认可操作' }
  }
  return {
    ok: true,
    message: `${isQuickMaterialDeduct(row) ? '领料单' : '工单'} ${resolveInventoryDeductDocNo(row)} 待确认（预扣已锁定）`,
  }
}
