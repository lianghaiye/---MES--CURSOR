import {
  getBaselineBomForProduct,
  getOwnActiveBomForItem,
  getProductBomById,
} from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { findSpuById } from '@/store/spuStore'
import { SPU_BOM_STRATEGY, normalizeBomStrategy } from '@/constants/spu'

/**
 * 取 SKU 所属产品族的基准 BOM（继承策略且已配置 baseBomId）
 * @returns {{ bom: object, spu: object }|null}
 */
export function resolveSpuTemplateBomForSku(itemType, itemId) {
  if (!itemType || itemId == null || itemId === '') return null
  const master =
    itemType === 'product'
      ? productInfoState.products.find((p) => String(p.id) === String(itemId))
      : materialInfoState.materials.find((m) => String(m.id) === String(itemId))
  if (!master?.spuId) return null
  const spu = findSpuById(master.spuId)
  if (!spu?.baseBomId) return null
  if (normalizeBomStrategy(spu.bomStrategy) === SPU_BOM_STRATEGY.INDEPENDENT) return null
  const bom = getProductBomById(spu.baseBomId)
  if (!bom) return null
  return { bom, spu }
}

/**
 * 设计任务骨架优先级：SKU 自有基准/生效 → 族模板 baseBomId → 无
 * @returns {{ bom: object|null, source: 'own'|'spu_template'|'none' }}
 */
export function resolveDesignBaselineBom(productId) {
  if (!productId) return { bom: null, source: 'none' }

  const ownBaseline = getBaselineBomForProduct(productId)
  if (ownBaseline) return { bom: ownBaseline, source: 'own' }

  const ownActive = getOwnActiveBomForItem('product', productId)
  if (ownActive) return { bom: ownActive, source: 'own' }

  const fromSpu = resolveSpuTemplateBomForSku('product', productId)
  if (fromSpu?.bom) return { bom: fromSpu.bom, source: 'spu_template' }
  return { bom: null, source: 'none' }
}
