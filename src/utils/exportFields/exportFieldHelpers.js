/** 从行对象取字段，空值导出为空字符串 */

export function cell(row, key) {
  const val = row[key]
  if (val === 0) return '0'
  return val ?? ''
}

export function numCell(val, digits = 2) {
  const n = Number(val)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(digits)
}

export function intCell(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0'
  return String(Math.round(n))
}
