/**
 * 检验项「按数量统计」：合格数 / 不合格数
 * 字段标记 countByQty=true；录入值存为 { passQty, failQty }
 */

export function isCountByQtyField(field = {}) {
  return Boolean(field?.countByQty)
}

export function parseCountByQtyValue(raw) {
  if (raw == null || raw === '') {
    return { passQty: undefined, failQty: undefined }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      passQty: normalizeQtyInput(raw.passQty),
      failQty: normalizeQtyInput(raw.failQty),
    }
  }
  return { passQty: undefined, failQty: undefined }
}

export function wrapCountByQtyValue(passQty, failQty) {
  return {
    passQty: normalizeQtyInput(passQty),
    failQty: normalizeQtyInput(failQty),
  }
}

function normalizeQtyInput(v) {
  if (v === '' || v === undefined || v === null) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}

/** @returns {'pass'|'fail'|''} */
export function evaluateCountByQtyValue(raw) {
  const { passQty, failQty } = parseCountByQtyValue(raw)
  const hasP = passQty !== undefined
  const hasF = failQty !== undefined
  if (!hasP && !hasF) return ''
  const p = hasP ? Number(passQty) : 0
  const f = hasF ? Number(failQty) : 0
  if (f > 0) return 'fail'
  // 已填写且不合格为 0：有合格数（含 0）或明确填了不合格 0 且合格>0
  if (hasP && p >= 0 && f === 0) return 'pass'
  if (!hasP && hasF && f === 0) return ''
  return ''
}

/**
 * 校验计数项
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateCountByQtyValue(raw, { inspectQty, required = true } = {}) {
  const { passQty, failQty } = parseCountByQtyValue(raw)
  const p = Number(passQty)
  const f = Number(failQty)
  const hasP = passQty !== undefined && Number.isFinite(p)
  const hasF = failQty !== undefined && Number.isFinite(f)

  if (!hasP && !hasF) {
    if (required === false) return { ok: true }
    return { ok: false, message: '请填写合格数或不合格数' }
  }
  if (hasP && p < 0) return { ok: false, message: '合格数须不小于 0' }
  if (hasF && f < 0) return { ok: false, message: '不合格数须不小于 0' }

  const passN = hasP ? p : 0
  const failN = hasF ? f : 0
  if (passN + failN <= 0) {
    return { ok: false, message: '合格数与不合格数合计须大于 0' }
  }

  const cap = Number(inspectQty)
  if (Number.isFinite(cap) && cap >= 0 && passN + failN > cap + 1e-9) {
    return {
      ok: false,
      message: `合格数+不合格数不可超过质检数量（${cap}）`,
    }
  }
  return { ok: true }
}

export function formatCountByQtyDisplay(raw) {
  const { passQty, failQty } = parseCountByQtyValue(raw)
  const parts = []
  if (passQty !== undefined) parts.push(`合格 ${passQty}`)
  if (failQty !== undefined) parts.push(`不合格 ${failQty}`)
  return parts.length ? parts.join(' / ') : '—'
}
