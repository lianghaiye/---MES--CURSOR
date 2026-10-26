import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  CONTRACT_CHANGE_FIELDS,
  CONTRACT_CHANGE_FIELD_LABELS,
  CONTRACT_CHANGE_STATUS,
  CONTRACT_STATUS,
} from '@/constants/salesContract'
import {
  getSalesContractById,
  normalizeContractRecord,
  updateSalesContract,
} from '@/store/salesContractStore'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'

const SYSTEM_AUTO_APPROVER = '系统自动审批'

const STORAGE_KEY = 'i_doms_sales_contract_changes'
const DATA_VERSION = 1

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null))
}

export function snapshotContractForChange(contract) {
  const row = normalizeContractRecord(contract || {})
  const snap = {}
  CONTRACT_CHANGE_FIELDS.forEach((key) => {
    snap[key] = cloneJson(row[key])
  })
  return snap
}

function valuesEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export function diffContractSnapshots(before = {}, after = {}) {
  const diffs = []
  CONTRACT_CHANGE_FIELDS.forEach((key) => {
    if (valuesEqual(before[key], after[key])) return
    diffs.push({
      field: key,
      label: CONTRACT_CHANGE_FIELD_LABELS[key] || key,
      before: before[key],
      after: after[key],
    })
  })
  return diffs
}

function formatDiffValue(field, value) {
  if (value == null || value === '') return '—'
  if (field === 'allowExceedQuota') return value ? '允许' : '不允许'
  if (field === 'taxInclusive') return value ? '含税' : '不含税'
  if (field === 'defaultDiscountRate') {
    const n = Number(value)
    if (!Number.isFinite(n)) return '—'
    return `${Number((n * 100).toFixed(2))}%`
  }
  if (field === 'partyLegal') {
    const p = value || {}
    const parts = [
      p.legalRepresentative,
      p.unifiedSocialCreditCode,
      p.invoiceName,
      p.invoiceTaxNo,
    ].filter(Boolean)
    return parts.length ? parts.join(' / ') : '—'
  }
  if (field === 'priceItems' || field === 'lineItems' || field === 'paymentNodes') {
    const list = Array.isArray(value) ? value : []
    return `${list.length} 条`
  }
  if (field === 'attachments') {
    const list = Array.isArray(value) ? value : []
    return list.map((f) => f.name || f).join('、') || '—'
  }
  return String(value)
}

export function formatContractChangeDiffRows(diffs = []) {
  return diffs.map((d) => ({
    ...d,
    beforeText: formatDiffValue(d.field, d.before),
    afterText: formatDiffValue(d.field, d.after),
  }))
}

function seedChanges() {
  return []
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.changes)) return parsed.changes.map(normalizeChange)
    }
  } catch {
    /* ignore */
  }
  return seedChanges()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, changes: salesContractChangeState.changes }),
  )
}

export function normalizeChange(row = {}) {
  return {
    id: row.id || `scc-${Date.now()}`,
    changeNo: row.changeNo || '',
    contractId: row.contractId || '',
    contractNo: row.contractNo || '',
    contractName: row.contractName || '',
    contractType: row.contractType || '',
    customerName: row.customerName || '',
    status: row.status || CONTRACT_CHANGE_STATUS.DRAFT,
    reason: row.reason || '',
    beforeSnapshot: row.beforeSnapshot || {},
    afterSnapshot: row.afterSnapshot || {},
    createdAt: row.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: row.updatedAt || dayjs().format('YYYY-MM-DD HH:mm'),
    creator: row.creator || 'admin',
    submittedAt: row.submittedAt || '',
    approvedAt: row.approvedAt || '',
    approvedBy: row.approvedBy || '',
    rejectedAt: row.rejectedAt || '',
    rejectReason: row.rejectReason || '',
  }
}

export const salesContractChangeState = reactive({
  changes: loadFromStorage(),
})

watch(
  () => salesContractChangeState.changes,
  () => persist(),
  { deep: true },
)

function generateChangeNo() {
  const seq = String(salesContractChangeState.changes.length + 1).padStart(3, '0')
  return `HTBG${dayjs().format('YYYYMMDD')}-${seq}`
}

export function getContractChangeById(id) {
  return salesContractChangeState.changes.find((c) => c.id === id) || null
}

export function listContractChangesByContract(contractId) {
  return salesContractChangeState.changes.filter((c) => c.contractId === contractId)
}

export function getPendingContractChange(contractId) {
  if (!contractId) return null
  return (
    salesContractChangeState.changes.find(
      (c) =>
        c.contractId === contractId &&
        (c.status === CONTRACT_CHANGE_STATUS.DRAFT || c.status === CONTRACT_CHANGE_STATUS.PENDING),
    ) || null
  )
}

/**
 * 合同列表「变更状态」（与销售订单一致）：
 * 未发起 → `-`；草稿/待审 → `变更审核中`；最近一次已审结 → `已通过` / `已拒绝`
 */
export function resolveSalesContractChangeStatus(contractId) {
  if (!contractId) return '-'
  const pending = getPendingContractChange(contractId)
  if (pending) return '变更审核中'
  const latest = listContractChangesByContract(contractId)[0]
  if (!latest) return '-'
  if (latest.status === CONTRACT_CHANGE_STATUS.APPROVED) return '已通过'
  if (latest.status === CONTRACT_CHANGE_STATUS.REJECTED) return '已拒绝'
  return '-'
}

export function salesContractChangeStatusLabelColor(label) {
  if (label === '已通过') return 'success'
  if (label === '已拒绝') return 'error'
  if (label === '变更审核中') return 'warning'
  return 'default'
}

export function canCreateContractChange(contract) {
  if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
    return { ok: false, message: '仅生效中的合同可发起变更' }
  }
  if (getPendingContractChange(contract.id)) {
    return { ok: false, message: '该合同已有未完成的变更单' }
  }
  return { ok: true }
}

/** 从生效合同发起变更单（草稿） */
export function createContractChangeFromContract(
  contractId,
  { reason = '', creator = 'admin' } = {},
) {
  const contract = getSalesContractById(contractId)
  const guard = canCreateContractChange(contract)
  if (!guard.ok) return guard

  const snap = snapshotContractForChange(contract)
  const row = normalizeChange({
    id: `scc-${Date.now()}`,
    changeNo: generateChangeNo(),
    contractId: contract.id,
    contractNo: contract.contractNo,
    contractName: contract.contractName,
    contractType: contract.contractType,
    customerName: contract.customerName,
    status: CONTRACT_CHANGE_STATUS.DRAFT,
    reason,
    beforeSnapshot: snap,
    afterSnapshot: cloneJson(snap),
    creator,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  salesContractChangeState.changes.unshift(row)
  return { ok: true, data: row }
}

export function updateContractChange(id, patch) {
  const idx = salesContractChangeState.changes.findIndex((c) => c.id === id)
  if (idx < 0) return { ok: false, message: '变更单不存在' }
  const row = salesContractChangeState.changes[idx]
  if (
    row.status !== CONTRACT_CHANGE_STATUS.DRAFT &&
    row.status !== CONTRACT_CHANGE_STATUS.REJECTED
  ) {
    return { ok: false, message: '仅草稿或已驳回的变更单可编辑' }
  }
  const nextAfter = patch.afterSnapshot || row.afterSnapshot
  salesContractChangeState.changes[idx] = normalizeChange({
    ...row,
    ...patch,
    id: row.id,
    changeNo: row.changeNo,
    contractId: row.contractId,
    beforeSnapshot: row.beforeSnapshot,
    customerName: nextAfter?.customerName ?? patch.customerName ?? row.customerName,
    contractName: nextAfter?.contractName ?? patch.contractName ?? row.contractName,
    status: CONTRACT_CHANGE_STATUS.DRAFT,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  return { ok: true, data: salesContractChangeState.changes[idx] }
}

export function submitContractChange(id) {
  const row = getContractChangeById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (
    row.status !== CONTRACT_CHANGE_STATUS.DRAFT &&
    row.status !== CONTRACT_CHANGE_STATUS.REJECTED
  ) {
    return { ok: false, message: '仅草稿或已驳回可提交' }
  }
  const diffs = diffContractSnapshots(row.beforeSnapshot, row.afterSnapshot)
  if (!diffs.length) return { ok: false, message: '未发生任何变更，无需提交' }
  const idx = salesContractChangeState.changes.findIndex((c) => c.id === id)
  salesContractChangeState.changes[idx] = {
    ...row,
    status: CONTRACT_CHANGE_STATUS.PENDING,
    submittedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    rejectedAt: '',
    rejectReason: '',
  }
  if (isAutoApproveEnabled(AUTO_APPROVE_TYPES.SALES_CONTRACT_CHANGE)) {
    const approved = approveContractChange(id, SYSTEM_AUTO_APPROVER)
    if (!approved.ok) return approved
    return {
      ok: true,
      autoApproved: true,
      message: '变更单已自动审批通过并生效',
      data: approved.data,
      contract: approved.contract,
    }
  }
  return { ok: true, data: salesContractChangeState.changes[idx] }
}

export function approveContractChange(id, operator = 'admin') {
  const row = getContractChangeById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (row.status !== CONTRACT_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '请先提交审核后再审核生效' }
  }
  const contract = getSalesContractById(row.contractId)
  if (!contract || contract.status !== CONTRACT_STATUS.ACTIVE) {
    return { ok: false, message: '合同不存在或已非生效状态' }
  }
  const diffs = diffContractSnapshots(row.beforeSnapshot, row.afterSnapshot)
  if (!diffs.length) return { ok: false, message: '未发生任何变更' }

  const applyPatch = { ...row.afterSnapshot }
  const res = updateSalesContract(row.contractId, applyPatch)
  if (!res.ok) return res

  const idx = salesContractChangeState.changes.findIndex((c) => c.id === id)
  salesContractChangeState.changes[idx] = {
    ...row,
    status: CONTRACT_CHANGE_STATUS.APPROVED,
    approvedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    approvedBy: operator,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  // 变更付款条款后重建回款计划（保留已补起算日/开票/方式）
  import('@/store/salesPaymentStore')
    .then((m) => m.ensurePaymentPlansForContract(res.data, { rebuild: true }))
    .catch(() => {})
  return { ok: true, data: salesContractChangeState.changes[idx], contract: res.data }
}

export function rejectContractChange(id, reason = '') {
  const row = getContractChangeById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (row.status !== CONTRACT_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审变更单可驳回' }
  }
  const idx = salesContractChangeState.changes.findIndex((c) => c.id === id)
  salesContractChangeState.changes[idx] = {
    ...row,
    status: CONTRACT_CHANGE_STATUS.REJECTED,
    rejectedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    rejectReason: reason || '',
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  return { ok: true, data: salesContractChangeState.changes[idx] }
}

/** 待审撤回为草稿（对齐订单变更：先撤回再作废） */
export function withdrawContractChange(id) {
  const row = getContractChangeById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (row.status !== CONTRACT_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审变更单可撤回' }
  }
  const idx = salesContractChangeState.changes.findIndex((c) => c.id === id)
  salesContractChangeState.changes[idx] = {
    ...row,
    status: CONTRACT_CHANGE_STATUS.DRAFT,
    submittedAt: '',
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  return { ok: true, data: salesContractChangeState.changes[idx] }
}

/** 仅草稿/已驳回可作废；待审须先撤回 */
export function cancelContractChange(id) {
  const row = getContractChangeById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (
    row.status !== CONTRACT_CHANGE_STATUS.DRAFT &&
    row.status !== CONTRACT_CHANGE_STATUS.REJECTED
  ) {
    return { ok: false, message: '待审变更单请先撤回后再作废' }
  }
  const idx = salesContractChangeState.changes.findIndex((c) => c.id === id)
  salesContractChangeState.changes[idx] = {
    ...row,
    status: CONTRACT_CHANGE_STATUS.CANCELLED,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  return { ok: true, data: salesContractChangeState.changes[idx] }
}
