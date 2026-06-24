/** EBOM 状态（独立于设计任务状态） */
export const EBOM_STATUS = {
  DRAFT: '草稿',
  FINALIZED: '定稿',
}

export function ebomStatusColor(status) {
  return status === EBOM_STATUS.FINALIZED ? 'success' : 'gold'
}
