/** 列表页列显隐 / 冻结 / 排序 */

export function getColumnKey(col) {
  return col.key || col.dataIndex
}

export const PINNED_COLUMN_KEYS = ['index', 'action', 'actions']

export function createDefaultColumnSettings(baseColumns, excludeKeys = PINNED_COLUMN_KEYS) {
  return baseColumns
    .filter((c) => {
      const key = getColumnKey(c)
      return key && !excludeKeys.includes(key)
    })
    .map((c, i) => ({
      key: getColumnKey(c),
      title: typeof c.title === 'string' ? c.title : String(getColumnKey(c)),
      hidden: false,
      frozen: c.fixed === 'left',
      order: i,
    }))
}

export function mergeColumnSettings(defaultSettings, saved) {
  if (!Array.isArray(saved) || !saved.length) {
    return JSON.parse(JSON.stringify(defaultSettings))
  }
  const defaultMap = Object.fromEntries(defaultSettings.map((c) => [c.key, c]))
  const merged = saved
    .filter((s) => defaultMap[s.key])
    .map((s, i) => ({
      ...defaultMap[s.key],
      hidden: !!s.hidden,
      frozen: !!s.frozen,
      order: typeof s.order === 'number' ? s.order : i,
    }))
  defaultSettings.forEach((d) => {
    if (!merged.some((m) => m.key === d.key)) {
      merged.push({ ...d, order: merged.length })
    }
  })
  return merged.sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i }))
}

export function buildTableColumns(baseColumns, settings, options = {}) {
  const excludeKeys = options.excludeKeys || PINNED_COLUMN_KEYS
  const baseMap = Object.fromEntries(baseColumns.map((c) => [getColumnKey(c), c]))
  const sorted = [...settings]
    .filter((s) => !s.hidden && !excludeKeys.includes(s.key))
    .sort((a, b) => a.order - b.order)

  const result = []
  const indexCol = baseColumns.find((c) => getColumnKey(c) === 'index')
  if (indexCol) {
    result.push({ ...indexCol, fixed: 'left' })
  }

  sorted.forEach((s) => {
    const base = baseMap[s.key]
    if (!base) return
    result.push({
      ...base,
      fixed: s.frozen ? 'left' : base.fixed === 'right' ? 'right' : undefined,
    })
  })

  const actionCol = baseColumns.find((c) => {
    const key = getColumnKey(c)
    return key === 'action' || key === 'actions'
  })
  if (actionCol) {
    result.push({ ...actionCol, fixed: 'right' })
  }

  return result
}

export function calcTableScrollX(columns, min = 1200) {
  const sum = columns.reduce((acc, col) => acc + (col.width || 100), 0)
  return Math.max(sum, min)
}
