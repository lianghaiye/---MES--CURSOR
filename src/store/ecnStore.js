import { ECN_STATUS } from '@/constants/ecn'
import { buildMockEcnRecords } from '@/mock/ecnSeed'
import { createChangeRequestStore } from '@/store/changeRequestStore'

const api = createChangeRequestStore({
  storageKey: 'i_doms_ecn',
  dataVersion: 5,
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
export const completeEcnExecution = api.completeExecution

export function cancelEcn(id) {
  const row = findEcnById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  if (row.status !== ECN_STATUS.APPROVING && row.status !== ECN_STATUS.PENDING) {
    return { ok: false, message: '当前状态不可撤销' }
  }
  row.status = ECN_STATUS.DRAFT
  row.approvalFlow?.forEach((step) => {
    if (step.status === '审批中' || step.status === '待审批') {
      step.status = '待审批'
    }
  })
  return { ok: true, record: row }
}

export function archiveEcn(id) {
  const row = findEcnById(id)
  if (!row) return { ok: false, message: '变更单不存在' }
  return { ok: true, message: '已归档' }
}

export const ecnStoreApi = api
