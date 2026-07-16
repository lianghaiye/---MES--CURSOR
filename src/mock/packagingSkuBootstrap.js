import dayjs from 'dayjs'
import { createPackagingSpuSeed } from '@/mock/packagingSpuSeed'
import { normalizePackagingSku } from '@/mock/packagingSeed'
import { syncPackagingSkuFieldsFromVariant } from '@/utils/packagingVariant'
import { matrixRowsToSkuCombos, previewMatrixRows } from '@/utils/spuMatrix'
import { buildSkuCodeFromPattern } from '@/utils/spuMatrix'

/** 根据 SPU 种子批量生成 SKU 种子（无 store 副作用，避免循环依赖） */
export function bootstrapPackagingSkuSeed() {
  const spus = createPackagingSpuSeed()
  const skus = []
  let seq = 1

  spus.forEach((spu) => {
    const rows = previewMatrixRows(spu, { existingSkus: [] })
    const combos = matrixRowsToSkuCombos(rows)
    combos.forEach((combo, idx) => {
      const synced = syncPackagingSkuFieldsFromVariant(spu, combo.variantValues)
      const code =
        combo.code ||
        buildSkuCodeFromPattern(spu, combo.variantValues, combo.axisMeta || {}) ||
        `BZ${dayjs().format('YYYYMMDD')}${String(seq).padStart(3, '0')}`
      seq += 1
      skus.push(
        normalizePackagingSku({
          id: `pkg-seed-${spu.id}-${idx + 1}`,
          spuId: spu.id,
          spuName: spu.name,
          code,
          canSell: spu.canSell,
          canPurchase: spu.canPurchase,
          creator: spu.creator || 'admin',
          createdAt: spu.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
          ...synced,
        }),
      )
    })
  })

  return skus
}
