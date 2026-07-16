import { parseOuterSize } from '@/utils/packagingVariant'

/** 包装 SKU 归一化 */
export function normalizePackagingSku(item = {}) {
  const outerSize = item.outerSize || ''
  const dims =
    item.outerLength != null
      ? {
          outerLength: item.outerLength,
          outerWidth: item.outerWidth,
          outerHeight: item.outerHeight,
        }
      : parseOuterSize(outerSize)

  return {
    id: item.id,
    spuId: item.spuId || '',
    spuName: item.spuName || '',
    code: item.code || '',
    name: item.name || '',
    canSell: Boolean(item.canSell),
    canPurchase: Boolean(item.canPurchase),
    packagingForm: item.packagingForm || '',
    outerSize: outerSize || '',
    outerLength: dims.outerLength ?? null,
    outerWidth: dims.outerWidth ?? null,
    outerHeight: dims.outerHeight ?? null,
    capacityQty: item.capacityQty != null ? Number(item.capacityQty) : null,
    unit: item.unit || '',
    variantValues: item.variantValues || {},
    isVariantSku: Boolean(item.isVariantSku),
    creator: item.creator || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
  }
}

/** @deprecated 兼容旧 flat 结构 */
export function normalizePackaging(item = {}) {
  return normalizePackagingSku(item)
}

export function createPackagingSkuSeed() {
  return []
}
