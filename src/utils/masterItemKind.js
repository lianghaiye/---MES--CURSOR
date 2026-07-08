/** 主数据条目类型：产品 / 物料 / 产品物料 */
export const ITEM_KIND = {
  PRODUCT: 'product',
  MATERIAL: 'material',
  PRODUCT_MATERIAL: 'productMaterial',
}

export const CATEGORY_TREE_MODE = {
  PRODUCT: 'product',
  MATERIAL: 'material',
}

/** 由可销售、可生产推导条目类型；两者都不勾选时返回 null */
export function resolveItemKind({ canSell, canProduce }) {
  const sell = Boolean(canSell)
  const produce = Boolean(canProduce)
  if (sell && produce) return ITEM_KIND.PRODUCT_MATERIAL
  if (sell) return ITEM_KIND.PRODUCT
  if (produce) return ITEM_KIND.MATERIAL
  return null
}

export function itemKindLabel(kind) {
  const map = {
    [ITEM_KIND.PRODUCT]: '产品',
    [ITEM_KIND.MATERIAL]: '物料',
    [ITEM_KIND.PRODUCT_MATERIAL]: '产品物料',
  }
  return map[kind] || '—'
}

/** 规范化业务能力标记（兼容历史 isPart / isProductMaterial） */
export function normalizeCapabilityFlags(record = {}, source = '') {
  let canSell
  if (record.canSell != null) {
    canSell = Boolean(record.canSell)
  } else if (source === 'product') {
    canSell = record.canSell !== false
  } else {
    canSell = false
  }

  let canProduce = Boolean(record.canProduce)
  if (!canProduce && source === 'material' && record.canProduce !== false) {
    canProduce = true
  }
  if (!canProduce && record.isProductMaterial && source === 'product') {
    canProduce = Boolean(record.isPart)
  }
  return { canSell, canProduce }
}

/** 从单条或双表记录推导 itemKind */
export function inferItemKindFromRecord(record = {}, options = {}) {
  if (record.itemKind) return record.itemKind

  const productRow = options.productRow
  const materialRow = options.materialRow

  if (productRow && materialRow && productRow.id === materialRow.id) {
    return ITEM_KIND.PRODUCT_MATERIAL
  }
  if (record.isProductMaterial && (productRow || materialRow)) {
    return ITEM_KIND.PRODUCT_MATERIAL
  }

  const { canSell, canProduce } = normalizeCapabilityFlags(record, options.source || '')
  const kind = resolveItemKind({ canSell, canProduce })
  if (kind) return kind

  if (productRow && !materialRow) return ITEM_KIND.PRODUCT
  if (materialRow && !productRow) return ITEM_KIND.MATERIAL
  return ITEM_KIND.PRODUCT
}

/** 产品物料是否应写入双表 */
export function isProductMaterialKind(kind) {
  return kind === ITEM_KIND.PRODUCT_MATERIAL
}

/** BOM 维护默认 itemType */
export function resolveBomItemTypeForKind(itemKind) {
  if (itemKind === ITEM_KIND.MATERIAL) return 'material'
  return 'product'
}

/** 产品表禁止：仅可生产、不可销售（非产品物料双写） */
export function isForbiddenProductOnlyProduce(record = {}) {
  if (!record || record.isProductMaterial) return false
  const canSell = record.canSell === true
  const canProduce = Boolean(record.canProduce)
  return canProduce && !canSell
}
