/** 库存预警 / 统一补货：产品/物料低于最低库存，或手工添加后生产/采购/外协 */
import { PLAN_STRATEGY, isPlanStrategyMts } from '@/mock/productInfoOptions'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getOwnActiveBomForItem } from '@/store/productBomStore'
import { getOnHandQtyByItemCode } from '@/store/salesStockAllocationStore'
import { productionPlanState } from '@/store/productionPlanStore'
import { flattenMaterials } from '@/utils/material'
import { PLAN_SOURCE, PLAN_SOURCE_OPTIONS, planSourceLabel } from '@/utils/planSource'

export { PLAN_SOURCE, PLAN_SOURCE_OPTIONS, planSourceLabel }

/** 预警列表「来源」：水位预警 / 生产计划关联 / 手工 */
export const STOCK_ALERT_SOURCE = {
  ALERT: 'alert',
  PRODUCTION_PLAN: 'production-plan',
  MANUAL: 'manual',
}

export const STOCK_ALERT_SOURCE_OPTIONS = [
  { value: STOCK_ALERT_SOURCE.PRODUCTION_PLAN, label: '生产计划' },
  { value: STOCK_ALERT_SOURCE.ALERT, label: '预警' },
  { value: STOCK_ALERT_SOURCE.MANUAL, label: '手工' },
]

export function stockAlertSourceLabel(source) {
  const hit = STOCK_ALERT_SOURCE_OPTIONS.find((o) => o.value === source)
  return hit?.label || '预警'
}

export const REPLENISH_ACTION = {
  /** 直接生成加工工单（与生产计划「生成加工工单」一致） */
  WORK_ORDER: 'work_order',
  /** 生成生产计划 */
  PRODUCE: 'produce',
  PURCHASE: 'purchase',
  OUTSOURCE: 'outsource',
}

export const REPLENISH_ACTION_OPTIONS = [
  { value: REPLENISH_ACTION.WORK_ORDER, label: '生产' },
  { value: REPLENISH_ACTION.PRODUCE, label: '生产计划' },
  { value: REPLENISH_ACTION.PURCHASE, label: '采购' },
  { value: REPLENISH_ACTION.OUTSOURCE, label: '外协' },
]

export function replenishActionLabel(action) {
  const hit = REPLENISH_ACTION_OPTIONS.find((o) => o.value === action)
  return hit?.label || '—'
}

export function resolveProductPlanStrategy(product) {
  return product?.production?.planStrategy || PLAN_STRATEGY.MTO
}

export function isMtsProduct(product) {
  return isPlanStrategyMts(resolveProductPlanStrategy(product))
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
  const available = Number.isFinite(Number(availableStock))
    ? Number(availableStock)
    : resolveItemAvailableStock(item)
  const toMax = Number.isFinite(max) ? Math.max(0, max - available) : 0
  const batchQty = Number.isFinite(batch) && batch > 0 ? batch : 0
  const suggest = Math.max(toMax, batchQty)
  if (suggest > 0) return suggest
  // 无最高/批量时：至少补到最低水位以上 1
  const min = Number(item?.alert?.minStockQty)
  if (Number.isFinite(min) && available <= min) {
    return Math.max(1, min - available + 1)
  }
  return 0
}

/** 预警类型：低于最低可补货；高于最高仅展示不可补货 */
export const STOCK_ALERT_KIND = {
  BELOW_MIN: 'below_min',
  ABOVE_MAX: 'above_max',
}

export const STOCK_ALERT_KIND_OPTIONS = [
  { value: STOCK_ALERT_KIND.BELOW_MIN, label: '超低' },
  { value: STOCK_ALERT_KIND.ABOVE_MAX, label: '超高' },
]

export function stockAlertKindLabel(kind) {
  const hit = STOCK_ALERT_KIND_OPTIONS.find((o) => o.value === kind)
  return hit?.label || '—'
}

export function resolveRowAlertKind(row) {
  if (row?.alertKind) return row.alertKind
  if (row?.canReplenish === false) return STOCK_ALERT_KIND.ABOVE_MAX
  return STOCK_ALERT_KIND.BELOW_MIN
}

function resolveAvailable(item, availableStock) {
  return Number.isFinite(Number(availableStock))
    ? Number(availableStock)
    : resolveItemAvailableStock(item)
}

/** 开启预警且可用 ≤ 最低 */
export function isStockBelowMin(item, availableStock) {
  if (!item?.alert?.stockAlertEnabled) return false
  const min = Number(item.alert.minStockQty)
  if (!Number.isFinite(min)) return false
  return resolveAvailable(item, availableStock) <= min
}

/** 开启预警且可用 > 最高 */
export function isStockAboveMax(item, availableStock) {
  if (!item?.alert?.stockAlertEnabled) return false
  const max = Number(item.alert.maxStockQty)
  if (!Number.isFinite(max)) return false
  return resolveAvailable(item, availableStock) > max
}

/**
 * 是否需要出现在库存预警列表（低于最低 或 高于最高）
 * 低于最低优先：同时异常配置时按可补货处理
 */
export function needsStockAlert(item, availableStock) {
  return isStockBelowMin(item, availableStock) || isStockAboveMax(item, availableStock)
}

/** @deprecated 兼容旧名：仅表示「低于最低、可补货」 */
export function needsStockReplenish(item, availableStock) {
  return isStockBelowMin(item, availableStock)
}

export function resolveStockAlertKind(item, availableStock) {
  if (isStockBelowMin(item, availableStock)) return STOCK_ALERT_KIND.BELOW_MIN
  if (isStockAboveMax(item, availableStock)) return STOCK_ALERT_KIND.ABOVE_MAX
  return ''
}

function defaultActionBySupply(item) {
  const supply = String(item?.supplyForm || item?.supplyType || '')
  if (supply.includes('外协')) return REPLENISH_ACTION.OUTSOURCE
  if (supply.includes('外购')) return REPLENISH_ACTION.PURCHASE
  return REPLENISH_ACTION.WORK_ORDER
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

function isActiveProductionPlan(plan) {
  const status = String(plan?.orderStatus || '').trim()
  if (!status) return true
  return status !== '已完成' && status !== '已关闭' && status !== '已作废'
}

function resolvePlanDisplayNo(plan) {
  return String(plan?.salesOrderNo || plan?.orderNo || plan?.id || '').trim()
}

function addPlanRefToMap(map, code, plan) {
  const key = String(code || '').trim()
  if (!key || !plan) return
  let entry = map.get(key)
  if (!entry) {
    entry = { planNos: [], planIds: [], plans: [] }
    map.set(key, entry)
  }
  const planId = plan.id || ''
  const planNo = resolvePlanDisplayNo(plan)
  if (planId && !entry.planIds.includes(planId)) {
    entry.planIds.push(planId)
    entry.plans.push({ id: planId, planNo })
  }
  if (planNo && !entry.planNos.includes(planNo)) {
    entry.planNos.push(planNo)
  }
}

/**
 * 未完成生产计划中出现的物料/产品编码 → 关联计划单号
 * （用于水位预警行标记来源为「生产计划」）
 */
export function buildProductionPlanItemRefMap(plans = productionPlanState.plans) {
  const map = new Map()
  for (const plan of plans || []) {
    if (!isActiveProductionPlan(plan)) continue
    for (const wi of plan.workItems || []) {
      addPlanRefToMap(map, wi.productCode, plan)
      const materials = []
      flattenMaterials(wi.materials || [], materials)
      if (wi._topMaterial) materials.push(wi._topMaterial)
      materials.forEach((m) => {
        addPlanRefToMap(map, m.code || m.materialCode || m.productCode, plan)
      })
    }
  }
  return map
}

function mapItemToSuggestion(item, itemKind, purchaseMap, wipMap, planRefMap) {
  const availableStock = resolveItemAvailableStock(item)
  const alertKind = resolveStockAlertKind(item, availableStock)
  const aboveMax = alertKind === STOCK_ALERT_KIND.ABOVE_MAX
  const canReplenish = !aboveMax
  const suggestQty = aboveMax ? 0 : calcReplenishSuggestQty(item, availableStock)
  const bom =
    itemKind === 'product'
      ? getOwnActiveBomForItem('product', item.id)
      : getOwnActiveBomForItem('material', item.id) || getOwnActiveBomForItem('product', item.id)
  const action = defaultActionBySupply(item)
  const supplyType = item.supplyForm || item.supplyType || ''
  const transit = resolveTransitForItem(item, purchaseMap, wipMap)
  const variantSummary = resolveVariantSummary(item)
  const planRef = planRefMap?.get(String(item.code || '').trim()) || null
  const fromProductionPlan = Boolean(planRef?.planNos?.length)
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
    planQty: aboveMax ? 0 : suggestQty || 1,
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
    fromProductionPlan,
    alertSource: fromProductionPlan ? STOCK_ALERT_SOURCE.PRODUCTION_PLAN : STOCK_ALERT_SOURCE.ALERT,
    alertKind: alertKind || STOCK_ALERT_KIND.BELOW_MIN,
    canReplenish,
    planNos: planRef?.planNos || [],
    planIds: planRef?.planIds || [],
    productionPlans: planRef?.plans || [],
  }
}

function sortReplenishRows(rows = []) {
  const rank = (row) => {
    if (row.manual) return 2
    if (row.alertSource === STOCK_ALERT_SOURCE.PRODUCTION_PLAN || row.fromProductionPlan) return 0
    return 1
  }
  return [...rows].sort((a, b) => {
    const d = rank(a) - rank(b)
    if (d !== 0) return d
    return String(a.productCode || '').localeCompare(String(b.productCode || ''))
  })
}

/**
 * 列出预警触发的补货建议（产品 + 物料）
 * - 低于最低：可执行补货
 * - 高于最高：仅展示预警，不可执行补货
 * - 若物料同时出现在未完成生产计划中：来源标「生产计划」并置顶，合并为一行
 */
export function listStockReplenishSuggestions() {
  const { purchaseMap, wipMap } = buildTransitMaps()
  const planRefMap = buildProductionPlanItemRefMap()
  const products = productInfoState.products
    .filter((p) => needsStockAlert(p))
    .map((p) => mapItemToSuggestion(p, 'product', purchaseMap, wipMap, planRefMap))
  const materials = materialInfoState.materials
    .filter((m) => needsStockAlert(m))
    .map((m) => mapItemToSuggestion(m, 'material', purchaseMap, wipMap, planRefMap))
  return sortReplenishRows(
    [...products, ...materials].filter(
      (row) =>
        row.alertKind === STOCK_ALERT_KIND.ABOVE_MAX || row.planQty > 0 || row.suggestQty > 0,
    ),
  )
}

/** 手工添加产品/物料为补货行 */
export function buildManualReplenishRow(item, itemKind = 'product') {
  if (!item) return null
  const { purchaseMap, wipMap } = buildTransitMaps()
  const planRefMap = buildProductionPlanItemRefMap()
  const row = mapItemToSuggestion(item, itemKind, purchaseMap, wipMap, planRefMap)
  row.fromAlert = false
  row.manual = true
  row.alertSource = STOCK_ALERT_SOURCE.MANUAL
  // 手工行允许补货（即使当前库存高于最高）
  row.canReplenish = true
  if (row.alertKind === STOCK_ALERT_KIND.ABOVE_MAX) {
    row.alertKind = STOCK_ALERT_KIND.BELOW_MIN
  }
  // 手工行仍保留计划关联信息，但不改「手工」来源展示
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
