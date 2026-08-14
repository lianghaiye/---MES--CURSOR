/**
 * 生成收货/入库弹窗：明细列表「仅展示未入库 / 展示所有」
 */

/** 是否视为已完成入库（无可再入数量） */
export function isInboundLineCompleted(line) {
  if (!line) return true
  if (line.locked === true) return true
  const remaining = Number(line.remainingQty)
  if (Number.isFinite(remaining)) return remaining <= 1e-9
  return false
}

/**
 * @param {Array} lines
 * @param {'pending'|'all'} scope
 */
export function filterInboundLinesByScope(lines = [], scope = 'pending') {
  const list = Array.isArray(lines) ? lines : []
  if (scope === 'all') return list
  return list.filter((line) => !isInboundLineCompleted(line))
}
