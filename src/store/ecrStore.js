import { buildMockEcrRecords } from '@/mock/ecrSeed'
import { createChangeRequestStore } from '@/store/changeRequestStore'

const api = createChangeRequestStore({
  storageKey: 'i_doms_ecr',
  dataVersion: 1,
  buildMockRecords: buildMockEcrRecords,
  docNoField: 'ecrNo',
  docNoPrefix: 'ECR',
  idPrefix: 'ecr',
})

export const ecrState = api.state
export const generateEcrNo = api.generateDocNo
export const findEcrById = api.findById
export const filterEcrList = api.filterList
export const addEcr = api.add
export const saveEcrDraft = api.saveDraft
export const deleteEcr = api.deleteById
export const submitEcrForApproval = api.submitForApproval
export const approveEcr = api.approve
export const startEcrExecution = api.startExecution
export const completeEcrExecution = api.completeExecution

export const ecrStoreApi = api
