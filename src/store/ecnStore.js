import { ECN_STATUS } from '@/constants/ecn'
import { buildMockEcnRecords } from '@/mock/ecnSeed'
import { createChangeRequestStore } from '@/store/changeRequestStore'
import { executeEcnBomVersionUpgrade } from '@/utils/ecnBomExecution'
import { buildBomVersionHistoryFromGroup } from '@/utils/ecnBomVersionHistory'

const api = createChangeRequestStore({
  storageKey: 'i_doms_ecn',
  dataVersion: 9,
  buildMockRecords: buildMockEcnRecords,
  docNoField: 'ecnNo',
  docNoPrefix: 'ECN',
  idPrefix: 'ecn',
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
    row.bomId = bomRes.newBomId
    row.bomVersion = bomRes.newVersion
    row.versionGroupId = bomRes.versionGroupId
    row.previousBomVersion = bomRes.oldVersion
    row.bomVersionHistory = buildBomVersionHistoryFromGroup(bomRes.versionGroupId)
    row.executor = operator
  }

  return { ...res, bomUpgrade: bomRes }
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
  withdraw: withdrawEcn,
  canWithdraw: canWithdrawEcn,
  cancel: withdrawEcn,
}
