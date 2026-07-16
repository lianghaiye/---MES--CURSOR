import dayjs from 'dayjs'
import { findPackagingSpuById } from '@/store/packagingSpuStore'
import {
  packagingState,
  generatePackagingCode,
  normalizePackagingSku,
} from '@/store/packagingStore'
import { syncPackagingSkuFieldsFromVariant } from '@/utils/packagingVariant'
import { variantValuesMatch } from '@/utils/spuVariant'

function findSkuBySpuVariant(spuId, variantValues) {
  const pid = String(spuId)
  return (
    packagingState.items.find(
      (item) => item.spuId === pid && variantValuesMatch(item.variantValues, variantValues),
    ) || null
  )
}

function buildSkuBasePayload(spu, variantValues, overrides = {}) {
  const synced = syncPackagingSkuFieldsFromVariant(spu, variantValues)
  return {
    ...synced,
    ...overrides,
    spuId: spu.id,
    spuName: spu.name,
    canSell: overrides.canSell ?? spu.canSell,
    canPurchase: overrides.canPurchase ?? spu.canPurchase,
    isVariantSku: true,
  }
}

export function upsertPackagingSkuForSpu(spuId, variantValues, options = {}) {
  const spu = findPackagingSpuById(spuId)
  if (!spu) return { error: '包装族不存在' }

  const existing = findSkuBySpuVariant(spuId, variantValues)
  const payload = buildSkuBasePayload(spu, variantValues, options)

  if (existing) {
    const patch = {
      ...payload,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    Object.assign(existing, normalizePackagingSku({ ...existing, ...patch }))
    return { sku: existing, created: false }
  }

  const code = options.code?.trim() || generatePackagingCode()
  const row = normalizePackagingSku({
    id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...payload,
    code,
    creator: options.creator || 'admin',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  packagingState.items.unshift(row)
  return { sku: row, created: true }
}

export function batchGeneratePackagingSkus(spuId, combinations = []) {
  return combinations.map((combo) => {
    const variantValues = combo.variantValues || {
      packagingForm: combo.packagingForm || '',
      outerSize: combo.outerSize || '',
      capacityQty: combo.capacityQty != null ? String(combo.capacityQty) : '',
      unit: combo.unit || '',
      ...(combo.extra || {}),
    }
    return upsertPackagingSkuForSpu(spuId, variantValues, {
      code: combo.code,
      creator: combo.creator,
    })
  })
}

export function listSkusForPackagingSpu(spuId) {
  const pid = String(spuId)
  return packagingState.items.filter((item) => item.spuId === pid)
}

export function countSkusForPackagingSpu(spuId) {
  return listSkusForPackagingSpu(spuId).length
}
