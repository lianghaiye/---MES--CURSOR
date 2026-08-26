/**
 * BOM / 库存需求（库存单位）↔ 采购数量（采购单位）换算
 * - 取辅助单位「采购」角色的默认换算率：1 采购单位 = N 库存单位（如 1 盒 = 100 个）
 * - 兼容历史字段 packageContent / packContentQty（旧数据回退）
 * - 双单位型材/板材未配采购换算率时不走此包装换算
 */

import { UNIT_ROLE } from '@/utils/unitManageTab'

export function resolveInventoryUnit(material = {}) {
  return material.stockUnit || material.inventoryUnit || material.unit || '件'
}

export function resolvePurchaseUnit(material = {}) {
  return material.purchaseUnit || resolveInventoryUnit(material)
}

/**
 * 1 采购单位折合多少库存单位（采购默认换算率）
 * 优先：辅助单位 · 采购角色 · rate；否则兼容 packageContent / packContentQty
 * @returns {number|null}
 */
export function resolvePurchaseConvertRate(material = {}) {
  const aux = Array.isArray(material.auxUnits) ? material.auxUnits : []
  const purchaseRow = aux.find(
    (r) => r.enabled !== false && (r.roles || []).includes(UNIT_ROLE.PURCHASE),
  )
  if (purchaseRow) {
    const rate = Number(purchaseRow.rate)
    if (Number.isFinite(rate) && rate > 0) return rate
  }
  const n = Number(
    material.packageContent ?? material.packContentQty ?? material.purchaseConvertRate,
  )
  if (Number.isFinite(n) && n > 0) return n
  return null
}

/** @deprecated 使用 resolvePurchaseConvertRate；保留别名兼容旧调用 */
export function resolvePackageContent(material = {}) {
  return resolvePurchaseConvertRate(material)
}

/**
 * 行上换算率：优先现查主数据辅助单位，再回退行快照
 */
export function resolveLinePurchaseConvertRate(line = {}, material = null) {
  if (material) {
    const fromMaster = resolvePurchaseConvertRate(material)
    if (fromMaster != null) return fromMaster
  }
  const n = Number(line.purchaseConvertRate ?? line.packageContent ?? line.packContentQty)
  if (Number.isFinite(n) && n > 0) return n
  return null
}

/**
 * 是否需要按默认换算率做采购换算
 * - 采购单位与库存单位相同，或无默认换算率 → 不换算
 */
export function needsPackagePurchaseConvert(material = {}) {
  if (!material) return false
  const purchaseUnit = resolvePurchaseUnit(material)
  const inventoryUnit = resolveInventoryUnit(material)
  if (purchaseUnit === inventoryUnit) return false
  return resolvePurchaseConvertRate(material) != null
}

/** 库存数量 → 采购数量（向上取整） */
export function stockQtyToPurchaseQty(stockQty, convertRate = 1) {
  const content = Number(convertRate) > 0 ? Number(convertRate) : 1
  const stock = Number(stockQty)
  if (!Number.isFinite(stock) || stock <= 0) return 0
  return Math.ceil(stock / content)
}

/** 采购数量 → 库存数量 */
export function purchaseQtyToStockQty(purchaseQty, convertRate = 1) {
  const content = Number(convertRate) > 0 ? Number(convertRate) : 1
  const purchase = Number(purchaseQty)
  if (!Number.isFinite(purchase) || purchase <= 0) return 0
  return Math.round(purchase * content * 1000) / 1000
}

/**
 * 由库存需求得到建议采购量
 * @returns {{
 *   demandStockQty: number,
 *   planPurchaseQty: number,
 *   purchaseUnit: string,
 *   inventoryUnit: string,
 *   packageContent: number,
 *   purchaseConvertRate: number,
 *   needsConvert: boolean,
 *   convertHint: string,
 * }}
 */
export function convertStockDemandToPurchase(stockDemandQty, material = {}) {
  const inventoryUnit = resolveInventoryUnit(material)
  const purchaseUnit = resolvePurchaseUnit(material)
  const purchaseConvertRate = resolvePurchaseConvertRate(material)
  const demandStockQty = Number(stockDemandQty) || 0
  const needsConvert = needsPackagePurchaseConvert(material)

  if (!needsConvert) {
    return {
      demandStockQty,
      planPurchaseQty: demandStockQty,
      purchaseUnit: inventoryUnit,
      inventoryUnit,
      packageContent: purchaseConvertRate ?? 1,
      purchaseConvertRate: purchaseConvertRate ?? 1,
      needsConvert: false,
      convertHint: '',
    }
  }

  const planPurchaseQty = stockQtyToPurchaseQty(demandStockQty, purchaseConvertRate)
  return {
    demandStockQty,
    planPurchaseQty,
    purchaseUnit,
    inventoryUnit,
    packageContent: purchaseConvertRate,
    purchaseConvertRate,
    needsConvert: true,
    convertHint: `1 ${purchaseUnit}=${purchaseConvertRate} ${inventoryUnit}`,
  }
}
