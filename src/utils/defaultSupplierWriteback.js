/** 生成采购订单时：无默认供应商则回写主数据 */
import { materialInfoState, updateMaterial } from '@/store/materialInfoStore'
import { productInfoState, updateProduct } from '@/store/productInfoStore'

export function writeDefaultSupplierIfEmpty(materialCode, supplierName) {
  const code = String(materialCode || '').trim()
  const supplier = String(supplierName || '').trim()
  if (!code || !supplier) return { ok: false, reason: 'empty' }

  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material) {
    if (material.production?.defaultSupplier) {
      return { ok: false, reason: 'exists', kind: 'material' }
    }
    updateMaterial(material.id, {
      production: { ...(material.production || {}), defaultSupplier: supplier },
    })
    return { ok: true, kind: 'material', id: material.id }
  }

  const product = productInfoState.products.find((p) => p.code === code)
  if (product) {
    if (product.production?.defaultSupplier) {
      return { ok: false, reason: 'exists', kind: 'product' }
    }
    updateProduct(product.id, {
      production: { ...(product.production || {}), defaultSupplier: supplier },
    })
    return { ok: true, kind: 'product', id: product.id }
  }

  return { ok: false, reason: 'not_found' }
}

export function writeDefaultSuppliersFromMergedLines(mergedLines) {
  const results = []
  ;(mergedLines || []).forEach((line) => {
    results.push(writeDefaultSupplierIfEmpty(line.materialCode, line.supplierName))
  })
  return results.filter((r) => r.ok)
}
