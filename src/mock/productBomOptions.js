/** BOM 版本状态 */
export const BOM_STATUS = {
  PENDING: '待发布',
  ACTIVE: '生效',
  ARCHIVED: '已归档',
}

export const bomStatusOptions = [
  { label: '待发布', value: BOM_STATUS.PENDING },
  { label: '生效', value: BOM_STATUS.ACTIVE },
  { label: '已归档', value: BOM_STATUS.ARCHIVED },
]

export function normalizeBomStatusValue(status) {
  if (status === '待启用') return BOM_STATUS.PENDING
  if (status === '使用中') return BOM_STATUS.ACTIVE
  if (Object.values(BOM_STATUS).includes(status)) return status
  return BOM_STATUS.PENDING
}

export function bomStatusColor(status) {
  const normalized = normalizeBomStatusValue(status)
  const map = {
    [BOM_STATUS.PENDING]: 'success',
    [BOM_STATUS.ACTIVE]: 'processing',
    [BOM_STATUS.ARCHIVED]: 'warning',
  }
  return map[normalized] || 'default'
}

export function isBomPending(bom) {
  return normalizeBomStatusValue(bom?.status) === BOM_STATUS.PENDING
}

export function isBomActive(bom) {
  return normalizeBomStatusValue(bom?.status) === BOM_STATUS.ACTIVE
}

export function isBomArchived(bom) {
  return normalizeBomStatusValue(bom?.status) === BOM_STATUS.ARCHIVED
}

export function isBomEditable(bom) {
  return isBomPending(bom) || isBomActive(bom)
}

/** 可用于生产领料/工单 */
export function isBomProductionReady(bom) {
  return isBomActive(bom)
}
