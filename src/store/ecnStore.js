import { ECN_STATUS } from '@/constants/ecn'
import { ECN_RESCHEDULE_STATUS } from '@/constants/ecnPlanReschedule'
import { buildMockEcnRecords } from '@/mock/ecnSeed'
import { createChangeRequestStore } from '@/store/changeRequestStore'
import { executeEcnBomVersionUpgrade } from '@/utils/ecnBomExecution'
import { buildBomVersionHistoryFromGroup } from '@/utils/ecnBomVersionHistory'
import { analyzeEcnPlanImpact } from '@/utils/ecnPlanImpact'

const api = createChangeRequestStore({
  storageKey: 'i_doms_ecn',
  dataVersion: 20,
  buildMockRecords: buildMockEcnRecords,
  docNoField: 'ecnNo',
  docNoPrefix: 'ECN',
  idPrefix: 'ecn',
  // 演示数据不落盘：刷新页面即恢复 MOCK 初始态
  ephemeral: true,
})

export const ecnState = api.state
export const generateEcnNo = api.generateDocNo
export const findEcnById = api.findById
export const filterEcnList = api.filterList
export const addEcn = api.add
export const saveEcnDraft = api.saveDraft
export const deleteEcn = api.deleteById
export const submitEcnForApproval = api.submitForApproval
export const approveEcn = api.approve
export const startEcnExecution = api.startExecution

export function completeEcnExecution(id, operator = '张工') {
  const row = findEcnById(id)
  if (!row) return { ok: false, message: '变更单不存在' }

  const bomRes = executeEcnBomVersionUpgrade(row, operator)
  const res = api.completeExecution(id)
  if (!res.ok) return res

  if (bomRes.ok) {
    row.previousBomId = row.bomId || bomRes.oldBomId || ''
    row.bomId = bomRes.newBomId
    row.bomVersion = bomRes.newVersion
    row.versionGroupId = bomRes.versionGroupId
    row.previousBomVersion = bomRes.oldVersion
    row.bomVersionHistory = buildBomVersionHistoryFromGroup(bomRes.versionGroupId)
    row.executor = operator
  }

  const impact = analyzeEcnPlanImpact(row)
  row.planImpactSnapshot = {
    at: new Date().toISOString(),
    summary: impact.summary,
  }
  row.rescheduleStatus = ECN_RESCHEDULE_STATUS.PENDING
  row.executionDraft = null

  return { ...res, bomUpgrade: bomRes, planImpact: impact }
}

/** 执行页草稿：只落处置选择，不改状态、不升版 BOM */
export function saveEcnExecutionDraft(id, draft) {
  const row = findEcnById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (row.status !== ECN_STATUS.APPROVED) {
    return { ok: false, message: '仅待执行的变更单可保存执行草稿' }
  }
  row.executionDraft = {
    workItemKeys: Array.isArray(draft?.workItemKeys) ? [...draft.workItemKeys] : [],
    oldActionByKey: { ...(draft?.oldActionByKey || {}) },
    newActionByKey: { ...(draft?.newActionByKey || {}) },
    supplyFormByKey: { ...(draft?.supplyFormByKey || {}) },
    wholePlanMode: !!draft?.wholePlanMode,
    savedAt: new Date().toISOString(),
  }
  return { ok: true, record: row }
}

export function hasEcnExecutionDraft(record) {
  return !!(record?.executionDraft && record.status === ECN_STATUS.APPROVED)
}

export function canWithdrawEcn(order) {
  return order?.status === ECN_STATUS.APPROVING || order?.status === ECN_STATUS.PENDING
}

/** 撤回：待审批 / 审批中 → 草稿（等同采购「待审核」撤回） */
export function withdrawEcn(id) {
  const row = findEcnById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (!canWithdrawEcn(row)) {
    return { ok: false, message: '仅待审批/审批中的变更单可撤回' }
  }
  row.status = ECN_STATUS.DRAFT
  row.reviewer = ''
  row.reviewTime = ''
  row.approvalFlow?.forEach((step) => {
    if (step.status === '审批中' || step.status === '待审批' || step.status === '已通过') {
      step.status = '待审批'
      step.opinion = ''
      step.time = ''
    }
  })
  return { ok: true, record: row }
}

/** @deprecated 使用 withdrawEcn */
export function cancelEcn(id) {
  return withdrawEcn(id)
}

export function archiveEcn(id) {
  const row = findEcnById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  return { ok: true, message: '已归档' }
}

export const ecnStoreApi = {
  ...api,
  completeExecution: completeEcnExecution,
  saveExecutionDraft: saveEcnExecutionDraft,
  hasExecutionDraft: hasEcnExecutionDraft,
  withdraw: withdrawEcn,
  canWithdraw: canWithdrawEcn,
  cancel: withdrawEcn,
}
