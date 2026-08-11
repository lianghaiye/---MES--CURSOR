/** 库存预警展示：对比现有库存与主数据最高/最低库存 */
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'

export function findMasterItemByCode(code) {
  const key = String(code || '').trim()
  if (!key) return null
  const material = materialInfoState.materials.find((m) => m.code === key)
  if (material) return { kind: 'material', item: material }
  const product = productInfoState.products.find((p) => p.code === key)
  if (product) return { kind: 'product', item: product }
  return null
}

/**
 * @returns {{ type: 'below'|'above'|'', text: string, minStockQty?: number, maxStockQty?: number, stockQty: number }}
 */
export function resolveStockAlertHint({ materialCode, stockQty } = {}) {
  const hit = findMasterItemByCode(materialCode)
  const alert = hit?.item?.alert
  const stock = Number(stockQty)
  const resolvedStock = Number.isFinite(stock)
    ? stock
    : Number(hit?.item?.stockQty ?? hit?.item?.inventoryQty) || 0

  if (!alert?.stockAlertEnabled) {
    return { type: '', text: '—', stockQty: resolvedStock }
  }

  const min = Number(alert.minStockQty)
  const max = Number(alert.maxStockQty)
  if (Number.isFinite(min) && resolvedStock < min) {
    return {
      type: 'below',
      text: '低于「最低库存」',
      minStockQty: min,
      maxStockQty: Number.isFinite(max) ? max : undefined,
      stockQty: resolvedStock,
    }
  }
  if (Number.isFinite(max) && resolvedStock > max) {
    return {
      type: 'above',
      text: '高于【最高库存】',
      minStockQty: Number.isFinite(min) ? min : undefined,
      maxStockQty: max,
      stockQty: resolvedStock,
    }
  }
  return {
    type: '',
    text: '—',
    minStockQty: Number.isFinite(min) ? min : undefined,
    maxStockQty: Number.isFinite(max) ? max : undefined,
    stockQty: resolvedStock,
  }
}

export function stockAlertClass(type) {
  if (type === 'below') return 'stock-alert-below'
  if (type === 'above') return 'stock-alert-above'
  return ''
}
