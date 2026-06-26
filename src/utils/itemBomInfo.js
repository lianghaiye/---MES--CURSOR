/** 列表/标题用：BOM 名称 + 版本号 */
export function formatBomInfoLabel(bom) {
  if (!bom) return ''
  const label = `${bom.bomName || ''}${bom.version || ''}`
  return label.trim()
}

const STATUS_SORT = { 生效: 0, 待发布: 1, 已归档: 2 }

function compareBomByVersionDesc(a, b) {
  const yearA = a.versionYear ?? 0
  const yearB = b.versionYear ?? 0
  if (yearA !== yearB) return yearB - yearA
  return (b.versionSub ?? 0) - (a.versionSub ?? 0)
}

/** 详情 Tab：优先生效，其次待发布，再归档；同状态按版本降序 */
export function sortBomsForDisplay(list) {
  return [...list].sort((a, b) => {
    const sa = STATUS_SORT[a.status] ?? 9
    const sb = STATUS_SORT[b.status] ?? 9
    if (sa !== sb) return sa - sb
    const byVersion = compareBomByVersionDesc(a, b)
    if (byVersion !== 0) return byVersion
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  })
}
