/**
 * BOM / 库存需求（库存单位）↔ 采购数量（采购单位）换算
 * - 包装含量：1 采购单位 = N 库存单位（如 1 盒 = 100 个）
 * - 双单位型材/板材走 uomRelation，不走包装含量
 */

export function resolveInventoryUnit(material = {}) {
  return material.stockUnit || material.inventoryUnit || material.unit || '件'
}

export function resolvePurchaseUnit(material = {}) {
  return material.purchaseUnit || resolveInventoryUnit(material)
}

/**
 * 1 采购单位折合多少库存单位（兼容 packageContent / packContentQty）
 * 未填写或无效时返回 null（表示不做包装换算）
 */
export function resolvePackageContent(material = {}) {
  const n = Number(material.packageContent ?? material.packContentQty)
  if (Number.isFinite(n) && n > 0) return n
  return null
}

/**
 * 是否需要按包装含量做采购换算
 * - 双单位（可变长）不走此路径
 * - 采购单位与库存单位相同，或不填包装含量 → 不换算，采购量按库存需求计
 */
export function needsPackagePurchaseConvert(material = {}) {
  if (!material || material.isVariableLength) return false
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
