import dayjs from 'dayjs'
import {
  productInfoState,
  addProduct,
  updateProduct,
  generateProductCode,
} from '@/store/productInfoStore'
import {
  materialInfoState,
  addMaterial,
  updateMaterial,
  generateMaterialCode,
} from '@/store/materialInfoStore'
import { findSpuById } from '@/store/spuStore'
import { ITEM_KIND } from '@/utils/masterItemKind'
import { syncSkuFieldsFromVariant, variantValuesMatch } from '@/utils/spuVariant'

function findSkuBySpuVariant(spuId, variantValues) {
  const pid = String(spuId)
  const hit =
    productInfoState.products.find(
      (p) => p.spuId === pid && variantValuesMatch(p.variantValues, variantValues),
    ) ||
    materialInfoState.materials.find(
      (m) => m.spuId === pid && variantValuesMatch(m.variantValues, variantValues),
    )
  return hit || null
}

function buildSkuBasePayload(spu, variantValues, materialGradeId, overrides = {}) {
  const synced = syncSkuFieldsFromVariant(spu, variantValues, materialGradeId)
  const shared = spu.sharedFields || {}
  return {
    ...shared,
    ...synced,
    ...overrides,
    spuId: spu.id,
    spuName: spu.name,
    canSell: overrides.canSell ?? spu.canSell,
    canProduce: overrides.canProduce ?? spu.canProduce,
    canPurchase: overrides.canPurchase ?? spu.canPurchase,
    canOutsource: overrides.canOutsource ?? spu.canOutsource,
    bomOverrides: overrides.bomOverrides || [],
    isVariantSku: true,
  }
}

export function upsertSkuForSpu(spuId, variantValues, options = {}) {
  const spu = findSpuById(spuId)
  if (!spu) return { error: '产品族不存在' }

  const materialGradeId = options.materialGradeId || ''
  const existing = findSkuBySpuVariant(spuId, variantValues)
  const payload = buildSkuBasePayload(spu, variantValues, materialGradeId, options)

  if (existing) {
    const patch = { ...payload, updatedAt: dayjs().format('YYYY-MM-DD') }
    if (productInfoState.products.some((p) => p.id === existing.id)) {
      updateProduct(existing.id, patch)
      return { sku: { ...existing, ...patch }, created: false, store: 'product' }
    }
    updateMaterial(existing.id, patch)
    return { sku: { ...existing, ...patch }, created: false, store: 'material' }
  }

  const kind = spu.itemKind
  if (kind === ITEM_KIND.PRODUCT || kind === ITEM_KIND.PRODUCT_MATERIAL) {
    const row = addProduct({
      ...payload,
      code: options.code || generateProductCode(),
      productAttribute: payload.productAttribute || '标准产品',
      canSell: true,
      canProduce: kind === ITEM_KIND.PRODUCT_MATERIAL,
      isPart: kind === ITEM_KIND.PRODUCT_MATERIAL,
      isProductMaterial: kind === ITEM_KIND.PRODUCT_MATERIAL,
    })
    return { sku: row, created: true, store: 'product' }
  }

  const row = addMaterial({
    ...payload,
    code: options.code || generateMaterialCode(),
    materialType: payload.materialType || '零部件',
    supplyForm: payload.supplyForm || '自制件',
    canProduce: true,
  })
  return { sku: row, created: true, store: 'material' }
}

export function batchGenerateSkus(spuId, combinations = []) {
  const results = []
  combinations.forEach((combo) => {
    const variantValues = combo.variantValues || {
      specModel: combo.specModel || '',
      material: combo.material || '',
      ...(combo.extra || {}),
    }
    const res = upsertSkuForSpu(spuId, variantValues, {
      materialGradeId: combo.materialGradeId || '',
      code: combo.code,
    })
    results.push(res)
  })
  return results
}

export function listSkusForSpu(spuId) {
  const pid = String(spuId)
  const byId = new Map()
  productInfoState.products
    .filter((p) => p.spuId === pid)
    .forEach((p) => byId.set(p.id, { ...p, _store: 'product' }))
  materialInfoState.materials
    .filter((m) => m.spuId === pid)
    .forEach((m) => {
      if (!byId.has(m.id)) byId.set(m.id, { ...m, _store: 'material' })
    })
  return [...byId.values()]
}
