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
 * @returns {{
 *   type: 'below'|'above'|'',
 *   text: string,
 *   displayValue: string|number,
 *   minStockQty?: number,
 *   maxStockQty?: number,
 *   stockQty: number
 * }}
 */
export function resolveStockAlertHint({ materialCode, stockQty } = {}) {
  const hit = findMasterItemByCode(materialCode)
  const alert = hit?.item?.alert
  const stock = Number(stockQty)
  const resolvedStock = Number.isFinite(stock)
    ? stock
    : Number(hit?.item?.stockQty ?? hit?.item?.inventoryQty) || 0

  if (!alert?.stockAlertEnabled) {
    return { type: '', text: '—', displayValue: '—', stockQty: resolvedStock }
  }

  const min = Number(alert.minStockQty)
  const max = Number(alert.maxStockQty)
  // 低于最低：展示主数据「最低库存」；高于最高：展示「最高库存」
  if (Number.isFinite(min) && resolvedStock < min) {
    return {
      type: 'below',
      text: String(min),
      displayValue: min,
      minStockQty: min,
      maxStockQty: Number.isFinite(max) ? max : undefined,
      stockQty: resolvedStock,
    }
  }
  if (Number.isFinite(max) && resolvedStock > max) {
    return {
      type: 'above',
      text: String(max),
      displayValue: max,
      minStockQty: Number.isFinite(min) ? min : undefined,
      maxStockQty: max,
      stockQty: resolvedStock,
    }
  }
  return {
    type: '',
    text: '—',
    displayValue: '—',
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

/** 列表/表单展示：触发预警时显示主数据设置的最低/最高值 */
export function formatStockAlertDisplay(hint) {
  if (!hint) return '—'
  if (hint.displayValue != null && hint.displayValue !== '') return String(hint.displayValue)
  if (hint.type === 'below' && hint.minStockQty != null) return String(hint.minStockQty)
  if (hint.type === 'above' && hint.maxStockQty != null) return String(hint.maxStockQty)
  return hint.text || '—'
}
