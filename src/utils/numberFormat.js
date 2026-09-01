/**
 * 前端数字展示：最多 maxDecimals 位小数四舍五入；
 * 有小数显示有效小数位，无小数只显示整数（不补尾零）。
 */

export function roundNumber(val, maxDecimals = 4) {
  const n = Number(val)
  if (!Number.isFinite(n)) return NaN
  const factor = 10 ** maxDecimals
  return Math.round(n * factor + Number.EPSILON) / factor
}

/**
 * @param {*} val
 * @param {number} [maxDecimals=4]
 * @param {{ empty?: string }} [options]
 * @returns {string}
 */
export function formatNumber(val, maxDecimals = 4, options = {}) {
  const empty = options.empty ?? '—'
  if (val == null || val === '') return empty
  const n = Number(val)
  if (!Number.isFinite(n)) return empty
  const rounded = roundNumber(n, maxDecimals)
  if (!Number.isFinite(rounded)) return empty
  if (Math.abs(rounded - Math.round(rounded)) < 1e-12) {
    return String(Math.round(rounded))
  }
  let s = rounded.toFixed(maxDecimals)
  s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s
}

/** 数量类展示（同 formatNumber） */
export function formatQty(val, maxDecimals = 4) {
  return formatNumber(val, maxDecimals)
}

/** 金额/单价/税率展示（最多 4 位，有几位显示几位） */
export function formatMoney(val, maxDecimals = 4) {
  return formatNumber(val, maxDecimals)
}

/** 数量与单位合并，如「20 个」「36 米」 */
export function formatQtyWithUnit(val, unit, maxDecimals = 4) {
  const q = formatQty(val, maxDecimals)
  const u = String(unit || '').trim()
  if (q === '—') return u ? `— ${u}` : '—'
  return u ? `${q} ${u}` : q
}

/** a-input-number：展示时去掉尾零 */
export function inputNumberFormatter(value) {
  if (value === '' || value == null) return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return formatNumber(n, 4, { empty: '' })
}

export function inputNumberParser(value) {
  if (value === '' || value == null) return ''
  const cleaned = String(value).replace(/[^\d.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return cleaned
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : cleaned
}
