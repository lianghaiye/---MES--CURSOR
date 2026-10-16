/** ECN 生效后计划重排 / 分批投产 */

export const MATERIAL_RELEASE_STATUS = {
  RELEASABLE: 'releasable',
  PENDING_SPEC: 'pending_spec',
}

export const materialReleaseStatusOptions = [
  { label: '可投', value: MATERIAL_RELEASE_STATUS.RELEASABLE },
  { label: '待定', value: MATERIAL_RELEASE_STATUS.PENDING_SPEC },
]

export function materialReleaseStatusLabel(status) {
  if (status === MATERIAL_RELEASE_STATUS.PENDING_SPEC) return '待定'
  return '可投'
}

export function materialReleaseStatusColor(status) {
  if (status === MATERIAL_RELEASE_STATUS.PENDING_SPEC) return 'orange'
  return 'success'
}

/** 工作项可按新 BOM 自动重排的状态 */
export const RESCHEDULABLE_WORK_ITEM_STATUSES = ['待下达', '设计中', '待BOM']

/** 工作项已开工（不可自动重排，需人工） */
export const STARTED_WORK_ITEM_STATUSES = ['进行中', '执行中', '部分下达']

export const ECN_RESCHEDULE_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  DONE: 'done',
  SKIPPED: 'skipped',
}

export function isMaterialReleasable(material) {
  if (!material) return false
  const status = material.releaseStatus || MATERIAL_RELEASE_STATUS.RELEASABLE
  return status !== MATERIAL_RELEASE_STATUS.PENDING_SPEC
}
