import {
  getBaselineBomForProduct,
  getOwnActiveBomForItem,
  getProductBomById,
} from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { findSpuById } from '@/store/spuStore'

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

  const product = productInfoState.products.find((p) => String(p.id) === String(productId))
  if (product?.spuId) {
    const spu = findSpuById(product.spuId)
    if (spu?.baseBomId) {
      const template = getProductBomById(spu.baseBomId)
      if (template) return { bom: template, source: 'spu_template' }
    }
  }
  return { bom: null, source: 'none' }
}
