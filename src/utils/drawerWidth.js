/** 抽屉三档宽度（drawer-layout 规范） */

export const DRAWER_SIZE_LEVELS = ['s', 'm', 'l']

export const DRAWER_SIZE_LABELS = {
  s: '小',
  m: '中',
  l: '大',
}

/** @type {Record<'s'|'m'|'l', number>} */
export const DRAWER_WIDTH_PX = {
  s: 360,
  m: 520,
  l: 720,
}

export const DRAWER_NARROW_BREAKPOINT = 768

export const DRAWER_MASK_STYLE = { backgroundColor: 'rgba(0, 0, 0, 0.45)' }

export const DRAWER_PLACEMENT = 'right'

export function normalizeDrawerSize(value, fallback = 'm') {
  const key = String(value || fallback).toLowerCase()
  return DRAWER_SIZE_LEVELS.includes(key) ? key : fallback
}

/**
 * @param {'s'|'m'|'l'} [size='m']
 * @param {number} [viewportWidth] 不传则仅在 SSR 场景用桌面宽度
 * @returns {number|string}
 */
export function resolveDrawerWidth(size = 'm', viewportWidth) {
  const normalized = normalizeDrawerSize(size)
  if (viewportWidth != null && viewportWidth <= DRAWER_NARROW_BREAKPOINT) {
    return '100%'
  }
  return DRAWER_WIDTH_PX[normalized]
}

/**
 * 按字段数 / 是否含内嵌表格推荐档位；>12 字段返回 'page'（应改新标签页）
 * @param {{ fieldCount?: number, hasEmbeddedTable?: boolean }} options
 * @returns {'s'|'m'|'l'|'page'}
 */
export function suggestDrawerSize({ fieldCount = 0, hasEmbeddedTable = false } = {}) {
  if (fieldCount > 12) return 'page'
  if (fieldCount > 8 || hasEmbeddedTable) return 'l'
  if (fieldCount <= 3) return 's'
  return 'm'
}
