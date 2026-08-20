/**
 * 主数据单位三口径：库存 / 采购 / 结算
 * 双单位、结算单位由口径差异自动推导，不再依赖独立开关。
 */

export function normalizeUnit(unit) {
  return String(unit || '').trim()
}

/** 采购单位 ≠ 库存单位 → 双单位 */
export function deriveIsVariableLength(inventoryUnit, purchaseUnit) {
  const inv = normalizeUnit(inventoryUnit)
  const pur = normalizeUnit(purchaseUnit)
  return Boolean(inv && pur && inv !== pur)
}

/** 结算单位有值且 ≠ 库存单位才落库；与库存相同视为未启用 */
export function deriveSettleUnitForSave(inventoryUnit, settleUnit) {
  const inv = normalizeUnit(inventoryUnit)
  const settle = normalizeUnit(settleUnit)
  if (!settle || settle === inv) return ''
  return settle
}

export function resolveUomRelationByInventory(inventoryUnit) {
  const inv = normalizeUnit(inventoryUnit)
  if (inv === '㎡' || inv === 'm²' || inv === '平方米') return 'per_piece_area'
  if (inv.toLowerCase() === 'kg' || inv === '公斤' || inv === '千克') return 'per_piece_weight'
  return 'per_piece_length'
}

/**
 * 配置结果提示（灰字，给业务员看）
 * @returns {string}
 */
export function buildUnitCaliberHint({ inventoryUnit, purchaseUnit, settleUnit } = {}) {
  const inv = normalizeUnit(inventoryUnit)
  if (!inv) return '请先选择库存单位（厂里记账 / 领料用这个）。'

  const pur = normalizeUnit(purchaseUnit) || inv
  const settleRaw = normalizeUnit(settleUnit)
  const settle = settleRaw && settleRaw !== inv ? settleRaw : inv
  const dual = pur !== inv
  const hasSettle = settle !== inv

  if (!dual && !hasSettle) {
    return `三个单位都是「${inv}」：入库只填一个数量即可。`
  }
  if (!dual && hasSettle) {
    return `库存/采购按「${inv}」，结算按「${settle}」：入库填${inv}数量，并再填结算数量（${settle}）。`
  }
  if (dual && !hasSettle) {
    return `采购按「${pur}」、库存按「${inv}」：入库先填到货件数（${pur}），再填库存数量（${inv}）。`
  }
  return `采购「${pur}」、库存「${inv}」、结算「${settle}」：入库要填到货件数、库存数量和结算数量。`
}
