/**
 * BOM / 库存需求（库存单位）↔ 采购数量（采购单位）换算
 * - 默认换算率（辅助单位·采购角色）：1 采购单位 = N 库存单位（如 1 盒 = 100 个）
 * - 兼容旧字段 packageContent / packContentQty
 * - 双单位型材/板材无默认换算率时不走包装换算
 */

import { UNIT_ROLE } from '@/utils/unitManageTab'

export function resolveInventoryUnit(material = {}) {
  return material.stockUnit || material.inventoryUnit || material.unit || '件'
}

export function resolvePurchaseUnit(material = {}) {
  return material.purchaseUnit || resolveInventoryUnit(material)
}

/**
 * 1 采购单位折合多少库存单位
 * 优先取辅助单位中「采购」角色的默认换算率；否则兼容 packageContent / packContentQty
 * 未填写或无效时返回 null（表示不做包装换算）
 */
export function resolvePackageContent(material = {}) {
  const aux = Array.isArray(material.auxUnits) ? material.auxUnits : []
  const purchaseRow = aux.find(
    (r) => r.enabled !== false && (r.roles || []).includes(UNIT_ROLE.PURCHASE),
  )
  if (purchaseRow) {
    const rate = Number(purchaseRow.rate)
    if (Number.isFinite(rate) && rate > 0) return rate
  }
  const n = Number(material.packageContent ?? material.packContentQty)
  if (Number.isFinite(n) && n > 0) return n
  return null
}

/**
 * 是否需要按默认换算率做采购换算
 * - 采购单位与库存单位相同，或无默认换算率 → 不换算，采购量按库存需求计
 * - 有采购辅助单位换算率时（如 1 盒=100 个）走向上取整换算；无换算率的根/米等不走此路径
 */
export function needsPackagePurchaseConvert(material = {}) {
  if (!material) return false
  const purchaseUnit = resolvePurchaseUnit(material)
  const inventoryUnit = resolveInventoryUnit(material)
  if (purchaseUnit === inventoryUnit) return false
  return resolvePackageContent(material) != null
}

/** 库存数量 → 采购数量（向上取整） */
export function stockQtyToPurchaseQty(stockQty, packageContent = 1) {
  const content = Number(packageContent) > 0 ? Number(packageContent) : 1
  const stock = Number(stockQty)
  if (!Number.isFinite(stock) || stock <= 0) return 0
  return Math.ceil(stock / content)
}

/** 采购数量 → 库存数量 */
export function purchaseQtyToStockQty(purchaseQty, packageContent = 1) {
  const content = Number(packageContent) > 0 ? Number(packageContent) : 1
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
 *   needsConvert: boolean,
 *   convertHint: string,
 * }}
 */
export function convertStockDemandToPurchase(stockDemandQty, material = {}) {
  const inventoryUnit = resolveInventoryUnit(material)
  const purchaseUnit = resolvePurchaseUnit(material)
  const packageContent = resolvePackageContent(material)
  const demandStockQty = Number(stockDemandQty) || 0
  const needsConvert = needsPackagePurchaseConvert(material)

  if (!needsConvert) {
    return {
      demandStockQty,
      planPurchaseQty: demandStockQty,
      purchaseUnit: inventoryUnit,
      inventoryUnit,
      packageContent: packageContent ?? 1,
      needsConvert: false,
      convertHint: '',
    }
  }

  const planPurchaseQty = stockQtyToPurchaseQty(demandStockQty, packageContent)
  return {
    demandStockQty,
    planPurchaseQty,
    purchaseUnit,
    inventoryUnit,
    packageContent,
    needsConvert: true,
    convertHint: `1 ${purchaseUnit}=${packageContent} ${inventoryUnit}`,
  }
}
