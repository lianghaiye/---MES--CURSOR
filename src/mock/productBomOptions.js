export const bomStatusOptions = [
  { label: '待启用', value: '待启用' },
  { label: '使用中', value: '使用中' },
  { label: '已归档', value: '已归档' },
]

export function bomStatusColor(status) {
  const map = {
    待启用: 'success',
    使用中: 'processing',
    已归档: 'warning',
  }
  return map[status] || 'default'
}

/** 可用于生产领料/工单 */
export function isBomProductionReady(bom) {
  return bom?.status === '使用中'
}
