import { productInfoState } from '@/store/productInfoStore'
import { productBomState } from '@/store/productBomStore'
import { calcBomMaterialCount } from '@/utils/productBomListEnrich'
import {
  SHIP_ATTACHMENT_SCOPE_TYPE,
  buildShipAttachmentMatchTarget,
  displayShipAttachmentStatus,
  formatShipAttachmentObjects,
  isShipAttachmentEnabled,
  matchShipAttachmentForProduct,
  normalizeShipAttachmentScope,
  shipAttachmentMatchesTarget,
  shipAttachmentScopeTypeLabel,
} from '@/utils/shipAttachmentScope'

export const SHIP_ATTACHMENT_MATCH_SOURCE_LABELS = {
  explicit: '产品指定绑定',
  single: '单产品',
  category: '产品类别',
  global: '全局',
  none: '未命中',
}

function resolveBoundAttachment(product) {
  const id = product?.shipBomId
  if (!id) return null
  return (productBomState.boms || []).find((b) => String(b.id) === String(id)) || null
}

function resolveProduct({ itemId, itemCode, categoryCode, categoryKey } = {}) {
  const pid = String(itemId || '').trim()
  const code = String(itemCode || '').trim()
  const products = productInfoState.products || []
  const hit =
    (pid && products.find((p) => String(p.id) === pid)) ||
    (code && products.find((p) => String(p.code || '').trim() === code)) ||
    null
  if (hit) {
    return {
      ...hit,
      categoryCode: hit.categoryCode || categoryCode || '',
      categoryKey: hit.categoryKey || categoryKey || '',
    }
  }
  if (!pid && !code) return null
  return {
    id: pid,
    code,
    categoryCode: categoryCode || '',
    categoryKey: categoryKey || '',
  }
}

function sortByUpdatedAt(list = []) {
  return (list || [])
    .slice()
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

function toLayerItem(row, winnerId) {
  const scope = normalizeShipAttachmentScope(row)
  return {
    id: row.id,
    code: row.bomNo,
    name: row.bomName,
    scopeType: scope.scopeType,
    status: displayShipAttachmentStatus(row),
    enabled: isShipAttachmentEnabled(row),
    objectsText: formatShipAttachmentObjects(row),
    materialCount: calcBomMaterialCount(row.lineItems),
    updatedAt: row.updatedAt,
    isWinner: String(row.id) === String(winnerId),
  }
}

function resolveMatchSource(winner, explicit) {
  if (!winner) return 'none'
  if (explicit && String(winner.id) === String(explicit.id)) return 'explicit'
  const scopeType = normalizeShipAttachmentScope(winner).scopeType
  if (scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.SINGLE) return 'single'
  if (scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.CATEGORY) return 'category'
  return 'global'
}

/**
 * 匹配试算：与发货取随货附件相同规则
 * 产品指定绑定 > 单产品 > 产品类别 > 全局
 */
export function probeShipAttachmentMatch(params = {}) {
  const product = resolveProduct(params)
  if (!product?.id && !product?.code) {
    return { ok: false, message: '请选择产品' }
  }

  const target = buildShipAttachmentMatchTarget(product)
  const enabled = (productBomState.boms || []).filter(isShipAttachmentEnabled)

  let explicit = resolveBoundAttachment(product)
  const explicitEnabled = explicit && isShipAttachmentEnabled(explicit) ? explicit : null

  const singleHits = sortByUpdatedAt(
    enabled.filter((b) => {
      const { scopeType } = normalizeShipAttachmentScope(b)
      return (
        scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.SINGLE && shipAttachmentMatchesTarget(b, target)
      )
    }),
  )
  const categoryHits = sortByUpdatedAt(
    enabled.filter((b) => {
      const { scopeType } = normalizeShipAttachmentScope(b)
      return (
        scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.CATEGORY && shipAttachmentMatchesTarget(b, target)
      )
    }),
  )
  const globalHits = sortByUpdatedAt(
    enabled.filter(
      (b) => normalizeShipAttachmentScope(b).scopeType === SHIP_ATTACHMENT_SCOPE_TYPE.GLOBAL,
    ),
  )

  const scopedWinner = matchShipAttachmentForProduct(productBomState.boms, product)
  const winner = explicitEnabled || scopedWinner
  const matchSource = resolveMatchSource(winner, explicitEnabled)
  const winnerId = winner?.id

  const layers = [
    {
      key: 'explicit',
      label: '产品指定绑定',
      priority: 1,
      items: explicit ? [explicit] : [],
    },
    {
      key: 'single',
      label: '单产品',
      priority: 2,
      items: singleHits,
    },
    {
      key: 'category',
      label: '产品类别',
      priority: 3,
      items: categoryHits,
    },
    {
      key: 'global',
      label: '全局',
      priority: 4,
      items: globalHits,
    },
  ].map((layer) => ({
    ...layer,
    items: (layer.items || []).map((t) => toLayerItem(t, winnerId)),
  }))

  return {
    ok: true,
    template: winner
      ? {
          id: winner.id,
          code: winner.bomNo,
          name: winner.bomName,
          scopeType: normalizeShipAttachmentScope(winner).scopeType,
          objectsText: formatShipAttachmentObjects(winner),
          materialCount: calcBomMaterialCount(winner.lineItems),
          status: displayShipAttachmentStatus(winner),
        }
      : null,
    matchSource,
    matchSourceLabel: SHIP_ATTACHMENT_MATCH_SOURCE_LABELS[matchSource] || matchSource,
    priorityTip: '优先级：产品指定绑定 > 单产品 > 产品类别 > 全局',
    layers,
    message: winner ? '' : '该产品没有命中已启用的随货附件',
  }
}

export { shipAttachmentScopeTypeLabel }
