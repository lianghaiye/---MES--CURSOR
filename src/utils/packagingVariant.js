import { buildSkuDisplayName, normalizeVariantValues } from '@/utils/spuVariant'

/** 解析外包装尺寸字符串，如 1200×800×600 */
export function parseOuterSize(outerSize = '') {
  const parts = String(outerSize)
    .split(/[×xX*]/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
  return {
    outerLength: parts[0] ?? null,
    outerWidth: parts[1] ?? null,
    outerHeight: parts[2] ?? null,
  }
}

export function formatOuterSize(length, width, height) {
  if (length == null || width == null || height == null) return ''
  return `${length}×${width}×${height}`
}

export function syncPackagingSkuFieldsFromVariant(spu, variantValues = {}) {
  const axes = spu?.variantAxes || []
  const normalized = normalizeVariantValues(variantValues)
  const outerSize = normalized.outerSize || ''
  const dims = parseOuterSize(outerSize)
  const qtyRaw = normalized.capacityQty
  const capacityQty = qtyRaw != null && qtyRaw !== '' ? Number(qtyRaw) : null

  return {
    name: buildSkuDisplayName(spu?.name, normalized, axes),
    packagingForm: normalized.packagingForm || '',
    outerSize,
    ...dims,
    capacityQty: Number.isFinite(capacityQty) ? capacityQty : null,
    unit: normalized.unit || '',
    variantValues: normalized,
    isVariantSku: true,
  }
}
