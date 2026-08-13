/** 库存预警 / 统一补货：产品/物料低于最低库存，或手工添加后生产/采购/外协 */
import { PLAN_STRATEGY } from '@/mock/productInfoOptions'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getOwnActiveBomForItem } from '@/store/productBomStore'
import { getOnHandQtyByItemCode } from '@/store/salesStockAllocationStore'
import { PLAN_SOURCE, PLAN_SOURCE_OPTIONS, planSourceLabel } from '@/utils/planSource'

export { PLAN_SOURCE, PLAN_SOURCE_OPTIONS, planSourceLabel }

export const REPLENISH_ACTION = {
  PRODUCE: 'produce',
  PURCHASE: 'purchase',
  OUTSOURCE: 'outsource',
}

export const REPLENISH_ACTION_OPTIONS = [
  { value: REPLENISH_ACTION.PRODUCE, label: '生产' },
  { value: REPLENISH_ACTION.PURCHASE, label: '采购' },
  { value: REPLENISH_ACTION.OUTSOURCE, label: '外协' },
]

export function resolveProductPlanStrategy(product) {
  return product?.production?.planStrategy || PLAN_STRATEGY.MTO
}

export function isMtsProduct(product) {
  return resolveProductPlanStrategy(product) === PLAN_STRATEGY.MTS
}

export function findProductForSalesLine(line) {
  if (!line) return null
  if (line.productId) {
    const byId = productInfoState.products.find((p) => p.id === line.productId)
    if (byId) return byId
  }
  if (line.productCode) {
    return productInfoState.products.find((p) => p.code === line.productCode) || null
  }
  return null
}

/** 可用库存：台账优先，回退主数据 */
export function resolveProductAvailableStock(product) {
  if (!product) return 0
  const fromLedger = getOnHandQtyByItemCode(product.code)
  if (fromLedger > 0) return fromLedger
  const qty = Number(product.stockQty ?? product.inventoryQty)
  return Number.isFinite(qty) ? qty : 0
}

export function resolveItemAvailableStock(item) {
  if (!item) return 0
  const fromLedger = getOnHandQtyByItemCode(item.code)
  if (fromLedger > 0) return fromLedger
  const qty = Number(item.stockQty ?? item.inventoryQty)
  return Number.isFinite(qty) ? qty : 0
}

/**
 * 建议补货量 = max(最高库存 − 可用库存, 补货批量)
 */
export function calcReplenishSuggestQty(item, availableStock) {
  const max = Number(item?.alert?.maxStockQty)
  const batch = Number(item?.production?.replenishQty ?? item?.replenishQty)
  const available = Number(availableStock)
  const toMax = Number.isFinite(max)
    ? Math.max(0, max - (Number.isFinite(available) ? available : 0))
    : 0
  const batchQty = Number.isFinite(batch) && batch > 0 ? batch : 0
  const suggest = Math.max(toMax, batchQty)
  if (suggest > 0) return suggest
  // 无最高/批量时：至少补到最低水位以上 1
  const min = Number(item?.alert?.minStockQty)
  if (Number.isFinite(min) && Number.isFinite(available) && available <= min) {
    return Math.max(1, min - available + 1)
  }
  return 0
}

/** 开启预警且可用 ≤ 最低（不强制 MTS） */
export function needsStockReplenish(item, availableStock) {
  if (!item?.alert?.stockAlertEnabled) return false
  const min = Number(item.alert.minStockQty)
  if (!Number.isFinite(min)) return false
  const available = Number.isFinite(Number(availableStock))
    ? Number(availableStock)
    : resolveItemAvailableStock(item)
  return available <= min
}

function defaultActionBySupply(item) {
  const supply = String(item?.supplyForm || item?.supplyType || '')
  if (supply.includes('外协')) return REPLENISH_ACTION.OUTSOURCE
  if (supply.includes('外购')) return REPLENISH_ACTION.PURCHASE
  return REPLENISH_ACTION.PRODUCE
}

function resolveVariantSummary(item) {
  const owned = String(item?.variantSummary || '').trim()
  if (owned) return owned
  try {
    const { findSpuById } = require('@/store/spuStore')
    const { formatVariantSummary } = require('@/utils/spuVariant')
    const axes = item?.spuId ? findSpuById(item.spuId)?.variantAxes || [] : []
    return formatVariantSummary(item?.variantValues || {}, axes) || ''
  } catch {
    return ''
  }
}

function formatBomLabel(bom) {
  if (!bom) return '-'
  const name = String(bom.bomName || bom.name || '').trim()
  const version = String(bom.version || '').trim()
  if (name && version) return `${name} ${version}`
  if (name) return name
  if (version) return version
  return '-'
}

function resolveTransitForItem(item, purchaseMap, wipMap) {
  try {
    const { resolveInTransitOrWipForPlanNode } = require('@/utils/planPurchaseInTransit')
    const supplyType = item.supplyForm || item.supplyType || ''
    return resolveInTransitOrWipForPlanNode({ code: item.code, supplyType }, purchaseMap, wipMap)
  } catch {
    return { inTransitText: '—', inTransitQty: 0, inTransitTip: '' }
  }
}

function buildTransitMaps() {
  try {
    const { buildPurchaseInTransitMap } = require('@/utils/planPurchaseInTransit')
    const { buildWipInProcessMap } = require('@/utils/planWipInProcess')
    return {
      purchaseMap: buildPurchaseInTransitMap(),
      wipMap: buildWipInProcessMap(),
    }
  } catch {
    return { purchaseMap: undefined, wipMap: undefined }
  }
}

function mapItemToSuggestion(item, itemKind, purchaseMap, wipMap) {
  const availableStock = resolveItemAvailableStock(item)
  const suggestQty = calcReplenishSuggestQty(item, availableStock)
  const bom =
    itemKind === 'product'
      ? getOwnActiveBomForItem('product', item.id)
      : getOwnActiveBomForItem('material', item.id) || getOwnActiveBomForItem('product', item.id)
  const action = defaultActionBySupply(item)
  const supplyType = item.supplyForm || item.supplyType || ''
  const transit = resolveTransitForItem(item, purchaseMap, wipMap)
  const variantSummary = resolveVariantSummary(item)
  return {
    key: `${itemKind}-${item.id}`,
    itemKind,
    productId: item.id,
    productCode: item.code,
    productName: item.name,
    specModel: item.specModel || '',
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    variantSummary: variantSummary || '—',
    unit: item.inventoryUnit || '件',
    supplyForm: supplyType,
    availableStock,
    inTransitText: transit.inTransitText || '—',
    inTransitQty: transit.inTransitQty || 0,
    inTransitTip: transit.inTransitTip || '',
    minStockQty: Number(item.alert?.minStockQty) || 0,
    maxStockQty: Number(item.alert?.maxStockQty) || 0,
    replenishQty: Number(item.production?.replenishQty ?? item.replenishQty) || 0,
    suggestQty,
    planQty: suggestQty || 1,
    hasBom: Boolean(bom),
    bomId: bom?.id || '',
    bomName: bom?.bomName || '',
    bomVersion: bom?.version || '',
    bomLabel: formatBomLabel(bom),
    defaultWorkCenter: item.production?.defaultWorkCenter || '',
    defaultWarehouse: item.production?.defaultWarehouse || '',
    action,
    fromAlert: true,
    manual: false,
  }
}

/**
 * 列出预警触发的补货建议（产品 + 物料）
 */
export function listStockReplenishSuggestions() {
  const { purchaseMap, wipMap } = buildTransitMaps()
  const products = productInfoState.products
    .filter((p) => needsStockReplenish(p))
    .map((p) => mapItemToSuggestion(p, 'product', purchaseMap, wipMap))
  const materials = materialInfoState.materials
    .filter((m) => needsStockReplenish(m))
    .map((m) => mapItemToSuggestion(m, 'material', purchaseMap, wipMap))
  return [...products, ...materials].filter((row) => row.planQty > 0 || row.suggestQty > 0)
}

/** 手工添加产品/物料为补货行 */
export function buildManualReplenishRow(item, itemKind = 'product') {
  if (!item) return null
  const { purchaseMap, wipMap } = buildTransitMaps()
  const row = mapItemToSuggestion(item, itemKind, purchaseMap, wipMap)
  row.fromAlert = false
  row.manual = true
  if (!(Number(row.planQty) > 0)) row.planQty = 1
  return row
}

/**
 * 销售行库存提醒文案（保留兼容）
 */
export function collectMtsStockShortageWarnings(lineItems = []) {
  const warnings = []
  for (const line of lineItems) {
    const product = findProductForSalesLine(line)
    if (!product) continue
    const need = Number(line.salesQty ?? line.qty) || 0
    const available = resolveProductAvailableStock(product)
    if (need > available) {
      warnings.push(
        `「${line.productName || product.name}」库存 ${available}，订单 ${need}，库存不足请先补货或改数量`,
      )
    }
  }
  return warnings
}
