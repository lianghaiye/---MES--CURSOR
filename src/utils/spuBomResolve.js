import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getProductBomById, productBomState } from '@/store/productBomStore'
import { findSpuById } from '@/store/spuStore'
import { SPU_BOM_STRATEGY, normalizeBomStrategy } from '@/constants/spu'
import { getBomLineItems } from '@/utils/bomVersionReference'
import { isBomActive } from '@/mock/productBomOptions'

function findMasterRecord(itemType, itemId) {
  if (itemType === 'product') {
    return productInfoState.products.find((p) => String(p.id) === String(itemId)) || null
  }
  return materialInfoState.materials.find((m) => String(m.id) === String(itemId)) || null
}

function findSkuActiveBom(itemType, itemId) {
  const row = productBomState.boms.find(
    (b) => b.itemType === itemType && String(b.itemId) === String(itemId) && isBomActive(b),
  )
  return row ? getProductBomById(row.id) || row : null
}

function cloneBomStructure(bom) {
  const full = getProductBomById(bom.id) || bom
  return {
    ...full,
    lineItems: JSON.parse(JSON.stringify(getBomLineItems(full) || full.lineItems || [])),
    treeNodes: JSON.parse(JSON.stringify(full.treeNodes || [])),
    _resolvedFromSpu: true,
    _sourceBomId: full.id,
  }
}

function applyLineOverrides(bom, overrides = []) {
  if (!overrides?.length) return bom
  const lines = bom.lineItems || []
  const nextLines = lines.map((line) => {
    const hit = overrides.find(
      (o) =>
        (o.lineId && o.lineId === line.id) ||
        (o.materialCode && o.materialCode === line.materialCode),
    )
    if (!hit) return line
    return {
      ...line,
      material: hit.material ?? line.material,
      referencedItemId: hit.referencedItemId ?? line.referencedItemId,
      itemName: hit.itemName ?? line.itemName,
    }
  })
  return { ...bom, lineItems: nextLines }
}

/**
 * 解析 SKU 生效 BOM（非投产口径）：SKU 自有 → 继承族模板 + overrides
 * 销售投产请用 getOwnActiveBomForItem。
 */
export function resolveActiveBomForItem(itemType, itemId) {
  const skuBom = findSkuActiveBom(itemType, itemId)
  if (skuBom) {
    return getProductBomById(skuBom.id) || skuBom
  }

  const sku = findMasterRecord(itemType, itemId)
  if (!sku?.spuId) return null

  const spu = findSpuById(sku.spuId)
  if (!spu?.baseBomId) return null

  const strategy = normalizeBomStrategy(spu.bomStrategy)
  if (strategy === SPU_BOM_STRATEGY.INDEPENDENT) return null

  const baseBom = getProductBomById(spu.baseBomId)
  if (!baseBom) return null

  if (strategy === SPU_BOM_STRATEGY.INHERIT) {
    return applyLineOverrides(cloneBomStructure(baseBom), sku.bomOverrides)
  }

  return null
}

/** 是否由 SPU 模板解析而来（非 SKU 自有 BOM） */
export function isSpuResolvedBom(bom) {
  return Boolean(bom?._resolvedFromSpu)
}

/**
 * 矩阵/列表用：解析 BOM 来源标签
 * own > strategy (inherit/independent) > none
 */
export function resolveBomSourceKey(spu, sku) {
  if (sku) {
    const itemType =
      sku._store === 'product' ? 'product' : sku._store === 'material' ? 'material' : null
    if (itemType) {
      if (findSkuActiveBom(itemType, sku.id)) return 'own'
    } else if (findSkuActiveBom('product', sku.id) || findSkuActiveBom('material', sku.id)) {
      return 'own'
    }
  }
  if (!spu) return 'none'
  const strategy = normalizeBomStrategy(spu.bomStrategy)
  if (strategy === SPU_BOM_STRATEGY.INDEPENDENT) return 'independent'
  if (!spu.baseBomId) return 'none'
  return 'inherit'
}
