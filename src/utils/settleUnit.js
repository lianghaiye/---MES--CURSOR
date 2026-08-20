/**
 * 结算单位（按件库存、按重/其他单位与供应商结算）
 * 与 isVariableLength 双单位正交：库存仍按 inventoryUnit，金额按 settleQty。
 */

export function hasSettleUnit(source = {}) {
  const u = String(source?.settleUnit || '').trim()
  return Boolean(u)
}

export function resolveSettleUnit(source = {}) {
  const u = String(source?.settleUnit || '').trim()
  return u || ''
}

export function resolveStandardUnitWeight(source = {}) {
  const n = Number(source?.standardUnitWeight)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 预计结算数量：优先已有 settleQty，否则 订货量 × 标准单重 */
export function estimateSettleQty(source = {}, purchaseQty) {
  const existing = Number(source?.settleQty)
  if (Number.isFinite(existing) && existing > 0) return roundQty(existing)
  const std = resolveStandardUnitWeight(source)
  const qty = Number(purchaseQty ?? source?.purchaseQty)
  if (std != null && Number.isFinite(qty) && qty > 0) return roundQty(qty * std)
  return null
}

/** 计价数量：有结算单位用 settleQty，否则用 purchaseQty / qty */
export function resolvePricingQty(source = {}) {
  if (hasSettleUnit(source)) {
    const n = Number(source.settleQty)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const pq = Number(source.purchaseQty)
  if (Number.isFinite(pq) && pq > 0) return pq
  const q = Number(source.qty)
  return Number.isFinite(q) && q > 0 ? q : 0
}

/** 可结算数量（入库/收货行）：结算量 − 已结算量 */
export function getRemainSettleQty(line = {}) {
  const total = hasSettleUnit(line)
    ? Number(line.settleQty) || 0
    : Number(line.purchaseQty ?? line.qty) || 0
  const settled = Number(line.settledSettleQty) || 0
  return Math.max(0, roundQty(total - settled))
}

export function applySettleFieldsFromMaterial(target = {}, material = null) {
  if (!material) return target
  const settleUnit = resolveSettleUnit(material)
  if (settleUnit) {
    target.settleUnit = settleUnit
    target.settleConvertType = material.settleConvertType || 'floating'
    const std = resolveStandardUnitWeight(material)
    if (std != null) target.standardUnitWeight = std
  } else {
    target.settleUnit = ''
    target.settleConvertType = ''
    target.standardUnitWeight = undefined
  }
  return target
}

export function validateSettleUnitOnMaster(form = {}) {
  const settleUnit = resolveSettleUnit(form)
  if (!settleUnit) return { ok: true }
  const inv = String(form.inventoryUnit || '').trim()
  if (!inv) return { ok: false, message: '请先选择库存单位' }
  if (settleUnit === inv) {
    return { ok: false, message: '结算单位需与库存单位不同（如库存=件，结算=kg）' }
  }
  const std = form.standardUnitWeight
  if (std != null && std !== '' && !(Number(std) > 0)) {
    return { ok: false, message: '标准单重须大于 0' }
  }
  return { ok: true }
}

function roundQty(val) {
  return Math.round((Number(val) || 0) * 1000) / 1000
}
