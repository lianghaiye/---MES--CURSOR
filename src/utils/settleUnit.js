/**
 * 结算单位（按件库存、按重/其他单位与供应商结算）
 * 与 isVariableLength 双单位正交：库存仍按 inventoryUnit，金额按 settleQty。
 *
 * 预计结算换算率：
 * 1. 主数据 / 行上 standardUnitWeight（默认换算率）
 * 2. 否则取该物料最近一批 uomConvert.actualUnitWeight（批次单量）
 * 3. 都没有 → 不预估
 *
 * 批次回退通过 registerSettleBatchWeightLookup 注入，避免与 stockBatchStore 循环依赖。
 */

import { roundNumber } from '@/utils/numberFormat'

/** @type {null | ((itemCode: string) => number|null)} */
let batchWeightLookup = null

/** 由 stockBatchStore 在模块加载后注册 */
export function registerSettleBatchWeightLookup(fn) {
  batchWeightLookup = typeof fn === 'function' ? fn : null
}

export function hasSettleUnit(source = {}) {
  const u = String(source?.settleUnit || '').trim()
  return Boolean(u)
}

export function resolveSettleUnit(source = {}) {
  const u = String(source?.settleUnit || '').trim()
  return u || ''
}

/** 主数据/行快照上的默认换算率（不含批次回退） */
export function resolveStandardUnitWeight(source = {}) {
  const n = Number(source?.standardUnitWeight)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function resolveItemCodeForSettle(source = {}) {
  return String(
    source?.itemCode ||
      source?.productCode ||
      source?.materialCode ||
      source?.inventoryCode ||
      source?.code ||
      '',
  ).trim()
}

/**
 * 开单预估用换算率（仅有结算单位时有意义）
 * @returns {{ rate: number|null, source: 'master'|'batch'|null }}
 */
export function resolveSettleEstimateRate(source = {}) {
  if (!hasSettleUnit(source)) return { rate: null, source: null }
  const master = resolveStandardUnitWeight(source)
  if (master != null) return { rate: master, source: 'master' }
  const code = resolveItemCodeForSettle(source)
  if (!code || !batchWeightLookup) return { rate: null, source: null }
  const batchRate = batchWeightLookup(code)
  if (batchRate != null) return { rate: batchRate, source: 'batch' }
  return { rate: null, source: null }
}

/** 预计结算数量：优先已有 settleQty，否则 订货量 × 预估换算率（主数据或最近批次单量） */
export function estimateSettleQty(source = {}, purchaseQty) {
  const existing = Number(source?.settleQty)
  if (Number.isFinite(existing) && existing > 0) return roundQty(existing)
  const { rate } = resolveSettleEstimateRate(source)
  const qty = Number(purchaseQty ?? source?.purchaseQty ?? source?.planPurchaseQty)
  if (rate != null && Number.isFinite(qty) && qty > 0) return roundQty(qty * rate)
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

/**
 * 从主数据带结算字段到单据行。
 * 无主数据默认率时，用最近批次单量写入行上 standardUnitWeight（仅作本单预估快照，不回写主数据）。
 */
export function applySettleFieldsFromMaterial(target = {}, material = null) {
  if (!material) return target
  const settleUnit = resolveSettleUnit(material)
  if (settleUnit) {
    target.settleUnit = settleUnit
    target.settleConvertType = material.settleConvertType || 'floating'
    const resolved = resolveSettleEstimateRate({
      ...material,
      itemCode: material.code || material.itemCode,
      settleUnit,
    })
    if (resolved.rate != null) {
      target.standardUnitWeight = resolved.rate
      target.settleEstimateRateSource = resolved.source
    } else {
      target.standardUnitWeight = undefined
      target.settleEstimateRateSource = undefined
    }
  } else {
    target.settleUnit = ''
    target.settleConvertType = ''
    target.standardUnitWeight = undefined
    target.settleEstimateRateSource = undefined
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
  const r = roundNumber(Number(val) || 0, 4)
  return Number.isFinite(r) ? r : 0
}
