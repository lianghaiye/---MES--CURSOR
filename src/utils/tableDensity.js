/** 列表表格字号三档 token（与 list-table-box 规范一致） */

export const TABLE_DENSITY_LEVELS = ['large', 'medium', 'small']

export const TABLE_DENSITY_LABELS = {
  large: '大号',
  medium: '中号',
  small: '小号',
}

/** @type {Record<string, { bodySize: number, bodyLineHeight: number, rowHeight: number, headSize: number }>} */
export const TABLE_DENSITY_TOKENS = {
  large: { bodySize: 14, bodyLineHeight: 22, rowHeight: 48, headSize: 13 },
  medium: { bodySize: 13, bodyLineHeight: 20, rowHeight: 44, headSize: 12.5 },
  small: { bodySize: 12, bodyLineHeight: 18, rowHeight: 40, headSize: 12 },
}

export const TABLE_DENSITY_STORAGE_PREFIX = 'i_doms_table_density_'

export function normalizeDensity(value, fallback = 'large') {
  return TABLE_DENSITY_LEVELS.includes(value) ? value : fallback
}

/**
 * @param {string} pageKey 页面/表格唯一 key（与 useTableColumnSettings 的 storageKey 对齐）
 * @param {string} [userScope] 用户标识，用于隔离偏好
 */
export function buildTableDensityStorageKey(pageKey, userScope = 'guest') {
  return `${TABLE_DENSITY_STORAGE_PREFIX}${userScope}_${pageKey}`
}

export function readTableDensity(storageKey, fallback = 'large') {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) return normalizeDensity(JSON.parse(raw), fallback)
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeTableDensity(storageKey, density) {
  localStorage.setItem(storageKey, JSON.stringify(normalizeDensity(density)))
}
