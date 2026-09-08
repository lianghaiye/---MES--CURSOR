import { QC_TEMPLATE_SCOPE_TYPE, qcTemplateScopeTypeOptions } from '@/mock/qcTemplates'
import { BOM_STATUS } from '@/mock/productBomOptions'
import { isShipBomType } from '@/mock/bomMaterialColumns'
import { productInfoState } from '@/store/productInfoStore'

export const SHIP_ATTACHMENT_STATUS = {
  ENABLED: '启用',
  DISABLED: '停用',
}

export const SHIP_ATTACHMENT_SCOPE_TYPE = QC_TEMPLATE_SCOPE_TYPE

export const shipAttachmentScopeTypeOptions = qcTemplateScopeTypeOptions

export const shipAttachmentStatusOptions = [
  { label: SHIP_ATTACHMENT_STATUS.ENABLED, value: SHIP_ATTACHMENT_STATUS.ENABLED },
  { label: SHIP_ATTACHMENT_STATUS.DISABLED, value: SHIP_ATTACHMENT_STATUS.DISABLED },
]

export function shipAttachmentScopeTypeLabel(scopeType) {
  const hit = shipAttachmentScopeTypeOptions.find((o) => o.value === scopeType)
  return hit?.label || '—'
}

/** 启用：含历史「生效」发运 BOM */
export function isShipAttachmentEnabled(bom) {
  if (!bom || !isShipBomType(bom.bomType)) return false
  const status = bom.status
  return status === SHIP_ATTACHMENT_STATUS.ENABLED || status === BOM_STATUS.ACTIVE
}

export function isShipAttachmentDisabled(bom) {
  return isShipBomType(bom?.bomType) && !isShipAttachmentEnabled(bom)
}

export function displayShipAttachmentStatus(bom) {
  if (!bom) return '—'
  return isShipAttachmentEnabled(bom)
    ? SHIP_ATTACHMENT_STATUS.ENABLED
    : SHIP_ATTACHMENT_STATUS.DISABLED
}

function findProductById(id) {
  const pid = String(id || '')
  if (!pid) return null
  return (productInfoState.products || []).find((p) => String(p.id) === pid) || null
}

function findProductByCode(code) {
  const c = String(code || '').trim()
  if (!c) return null
  return (productInfoState.products || []).find((p) => String(p.code || '').trim() === c) || null
}

function productToItemObject(product, fallbackId = '') {
  if (!product) {
    return {
      type: 'item',
      value: String(fallbackId || ''),
      label: String(fallbackId || ''),
      itemId: String(fallbackId || ''),
    }
  }
  return {
    type: 'item',
    value: product.code || product.id,
    label: product.name || product.code || '',
    specModel: product.specModel || '',
    itemId: product.id,
    categoryKey: product.categoryKey || '',
    categoryName: product.categoryName || '',
    categoryCode: product.categoryCode || '',
  }
}

/** 旧数据：applicableProductIds / 单产品绑定 → 与质检模板相同的 scopeType + objects */
export function normalizeShipAttachmentScope(bom = {}) {
  if (bom.scopeType) {
    return {
      scopeType: bom.scopeType,
      objects: Array.isArray(bom.objects) ? bom.objects.map((o) => ({ ...o })) : [],
    }
  }
  const ids = Array.isArray(bom.applicableProductIds) ? bom.applicableProductIds : []
  if (ids.length) {
    return {
      scopeType: SHIP_ATTACHMENT_SCOPE_TYPE.SINGLE,
      objects: ids.map((id) => productToItemObject(findProductById(id), id)),
    }
  }
  if (bom.itemType === 'product' && bom.itemId) {
    const product = findProductById(bom.itemId)
    return {
      scopeType: SHIP_ATTACHMENT_SCOPE_TYPE.SINGLE,
      objects: [productToItemObject(product, bom.itemId)],
    }
  }
  return { scopeType: SHIP_ATTACHMENT_SCOPE_TYPE.GLOBAL, objects: [] }
}

export function deriveApplicableProductIds(scopeType, objects = []) {
  if (scopeType !== SHIP_ATTACHMENT_SCOPE_TYPE.SINGLE) return []
  return (objects || [])
    .filter((o) => o?.type === 'item')
    .map((o) => o.itemId || findProductByCode(o.value)?.id)
    .filter(Boolean)
    .map(String)
}

export function formatShipAttachmentObjects(bom = {}) {
  const { scopeType, objects } = normalizeShipAttachmentScope(bom)
  if (scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.GLOBAL) return '全部'
  const labels = (objects || [])
    .map((o) => o.label || o.code || o.value || o.name)
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (!labels.length) return '—'
  if (labels.length <= 2) return labels.join('、')
  return `${labels.slice(0, 2).join('、')} 等${labels.length}项`
}

function scopeRank(scopeType) {
  if (scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.SINGLE) return 3
  if (scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.CATEGORY) return 2
  if (scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.GLOBAL) return 1
  return 0
}

function objectMatchesItem(obj, { itemCode, itemId, categoryCode, categoryKey } = {}) {
  const type = String(obj?.type || '').trim()
  const value = String(obj?.value || '').trim()
  const code = String(obj?.code || '').trim()
  const objItemId = String(obj?.itemId || '').trim()
  const item = String(itemCode || '').trim()
  const pid = String(itemId || '').trim()
  const catCode = String(categoryCode || '').trim()
  const catKey = String(categoryKey || '').trim()

  if (type === 'item' || (!type && (item || pid))) {
    if (objItemId && pid && objItemId === pid) return true
    return Boolean(value && item && value === item)
  }
  if (type === 'productCategory' || type === 'materialCategory' || type === 'category') {
    if (value && catKey && value === catKey) return true
    if (code && catCode && code === catCode) return true
    if (value && catCode && value === catCode) return true
    return false
  }
  if (objItemId && pid && objItemId === pid) return true
  if (value && item && value === item) return true
  if (value && (value === catKey || value === catCode)) return true
  if (code && (code === catCode || code === catKey)) return true
  return false
}

function templateMatchesTarget(bom, target = {}) {
  const { scopeType, objects } = normalizeShipAttachmentScope(bom)
  if (scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.GLOBAL) return true
  if (!objects.length) return false
  return objects.some((o) => objectMatchesItem(o, target))
}

export function shipAttachmentMatchesTarget(bom, target = {}) {
  return templateMatchesTarget(bom, target)
}

export function buildShipAttachmentMatchTarget(product = {}) {
  return {
    itemCode: product.code,
    itemId: product.id,
    categoryCode: product.categoryCode,
    categoryKey: product.categoryKey,
  }
}

function pickBest(candidates = []) {
  if (!candidates.length) return null
  return candidates.slice().sort((a, b) => {
    const sa = normalizeShipAttachmentScope(a).scopeType
    const sb = normalizeShipAttachmentScope(b).scopeType
    const scopeDiff = scopeRank(sb) - scopeRank(sa)
    if (scopeDiff !== 0) return scopeDiff
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  })[0]
}

/**
 * 匹配优先级与质检模板一致：单产品 > 产品类别 > 全局
 */
export function matchShipAttachmentForProduct(boms = [], product) {
  if (!product?.id && !product?.code) return null
  const enabled = (boms || []).filter(isShipAttachmentEnabled)
  if (!enabled.length) return null
  const target = {
    itemCode: product.code,
    itemId: product.id,
    categoryCode: product.categoryCode,
    categoryKey: product.categoryKey,
  }
  const matched = enabled.filter((b) => templateMatchesTarget(b, target))
  return pickBest(matched)
}
