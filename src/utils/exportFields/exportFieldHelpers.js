import { formatNumber } from '@/utils/numberFormat'

/** 从行对象取字段，空值导出为空字符串 */

export function cell(row, key) {
  const val = row[key]
  if (val === 0) return '0'
  return val ?? ''
}

/** 有小数才显示小数位，不补尾零 */
export function numCell(val, digits = 4) {
  return formatNumber(val, digits, { empty: '' })
}

export function intCell(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0'
  return String(Math.round(n))
}
