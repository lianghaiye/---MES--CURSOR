import { QC_TEMPLATE_SCOPE_TYPE } from '@/mock/qcTemplates'
import {
  cloneUniversalSystemTemplateFields,
  QC_SYSTEM_UNIVERSAL_BIZ_SCOPE,
  QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
} from '@/mock/qcSystemTemplateFields'
import { qcTemplateState } from '@/store/qcTemplateStore'

function scopeRank(scopeType) {
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE) return 3
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.CATEGORY) return 2
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) return 1
  return 0
}

function isTemplateEnabled(row) {
  return row?.status === '启用'
}

function isUniversalSystemTemplate(row) {
  return Boolean(
    row?.isSystem && (row.isUniversal || row.bizScope === QC_SYSTEM_UNIVERSAL_BIZ_SCOPE),
  )
}

function templateMatchesBizScope(template, bizScope) {
  if (isUniversalSystemTemplate(template)) return true
  return template.bizScope === bizScope
}

function objectMatchesItem(obj, { itemCode, categoryCode, categoryKey } = {}) {
  const type = String(obj?.type || '').trim()
  const value = String(obj?.value || '').trim()
  const code = String(obj?.code || '').trim()
  const item = String(itemCode || '').trim()
  const catCode = String(categoryCode || '').trim()
  const catKey = String(categoryKey || '').trim()

  if (type === 'item' || (!type && item)) {
    return Boolean(value && item && value === item)
  }
  if (type === 'productCategory' || type === 'materialCategory' || type === 'category') {
    if (value && catKey && value === catKey) return true
    if (code && catCode && code === catCode) return true
    if (value && catCode && value === catCode) return true
    return false
  }
  if (value && item && value === item) return true
  if (value && (value === catKey || value === catCode)) return true
  if (code && (code === catCode || code === catKey)) return true
  return false
}

function templateMatchesTarget(template, target = {}) {
  const scopeType = template.scopeType || QC_TEMPLATE_SCOPE_TYPE.GLOBAL
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) return true
  const objects = template.objects || []
  if (!objects.length) return false
  return objects.some((o) => objectMatchesItem(o, target))
}

function pickBestTemplate(candidates = []) {
  const enabled = candidates.filter(isTemplateEnabled)
  if (!enabled.length) return null
  return enabled.slice().sort((a, b) => {
    const scopeDiff = scopeRank(b.scopeType) - scopeRank(a.scopeType)
    if (scopeDiff !== 0) return scopeDiff
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  })[0]
}

export function getQcTemplateByCode(code) {
  const c = String(code || '').trim()
  if (!c) return null
  return qcTemplateState.templates.find((t) => t.code === c) || null
}

/** 系统通用模板（全业务类型兜底，不按 bizScope 拆分） */
export function getSystemQcTemplate() {
  return (
    qcTemplateState.templates.find((t) => isUniversalSystemTemplate(t) && isTemplateEnabled(t)) ||
    qcTemplateState.templates.find((t) => t.code === QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE) ||
    qcTemplateState.templates.find((t) => t.isSystem && isTemplateEnabled(t)) ||
    null
  )
}

function buildBuiltinFallbackTemplate(bizScope) {
  const fields = cloneUniversalSystemTemplateFields()
  return {
    id: `qct-builtin-universal`,
    code: QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
    name: '系统通用模板',
    status: '启用',
    type: '系统模板',
    isSystem: true,
    isUniversal: true,
    bizScope: QC_SYSTEM_UNIVERSAL_BIZ_SCOPE,
    scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
    objects: [],
    fields,
    fieldCount: fields.length,
    _fallbackForBizScope: bizScope,
  }
}

/**
 * 匹配质检模板优先级：
 * 指定 code > 单产品 > 产品类别 > 全局自定义 > 系统通用模板 > 内置兜底
 */
export function matchQcTemplate({
  bizScope,
  templateCode,
  itemCode,
  categoryCode,
  categoryKey,
} = {}) {
  if (!bizScope) return { ok: false, message: '缺少业务类型' }

  const target = { itemCode, categoryCode, categoryKey }
  const explicitCode = String(templateCode || '').trim()
  if (explicitCode) {
    const hit = getQcTemplateByCode(explicitCode)
    if (hit && templateMatchesBizScope(hit, bizScope)) {
      return { ok: true, template: hit, matchSource: 'explicit' }
    }
  }

  const enabledCustom = qcTemplateState.templates.filter(
    (t) => !t.isSystem && t.bizScope === bizScope && isTemplateEnabled(t),
  )

  const singleHits = enabledCustom.filter(
    (t) => t.scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE && templateMatchesTarget(t, target),
  )
  const bestSingle = pickBestTemplate(singleHits)
  if (bestSingle) return { ok: true, template: bestSingle, matchSource: 'single' }

  const categoryHits = enabledCustom.filter(
    (t) => t.scopeType === QC_TEMPLATE_SCOPE_TYPE.CATEGORY && templateMatchesTarget(t, target),
  )
  const bestCategory = pickBestTemplate(categoryHits)
  if (bestCategory) return { ok: true, template: bestCategory, matchSource: 'category' }

  const globalHits = enabledCustom.filter((t) => t.scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL)
  const bestGlobal = pickBestTemplate(globalHits)
  if (bestGlobal) return { ok: true, template: bestGlobal, matchSource: 'global' }

  const system = getSystemQcTemplate()
  if (system) return { ok: true, template: system, matchSource: 'system' }

  return {
    ok: true,
    template: buildBuiltinFallbackTemplate(bizScope),
    matchSource: 'builtin',
  }
}

export const QC_TEMPLATE_MATCH_SOURCE_LABELS = {
  explicit: '指定模板编码',
  single: '单产品',
  category: '产品类别',
  global: '全局自定义',
  system: '系统通用模板',
  builtin: '内置兜底',
}

function sortCandidates(list = []) {
  return (list || []).slice().sort((a, b) => {
    const scopeDiff = scopeRank(b.scopeType) - scopeRank(a.scopeType)
    if (scopeDiff !== 0) return scopeDiff
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  })
}

/**
 * 匹配试算：返回生效模板 + 各优先级层候选（便于理解「为什么是这份」）
 */
export function probeQcTemplateMatch(params = {}) {
  const result = matchQcTemplate(params)
  if (!result.ok) return { ...result, layers: [], priorityTip: '' }

  const { bizScope, itemCode, categoryCode, categoryKey } = params
  const target = { itemCode, categoryCode, categoryKey }
  const enabledCustom = qcTemplateState.templates.filter(
    (t) => !t.isSystem && t.bizScope === bizScope && isTemplateEnabled(t),
  )

  const singleHits = sortCandidates(
    enabledCustom.filter(
      (t) => t.scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE && templateMatchesTarget(t, target),
    ),
  )
  const categoryHits = sortCandidates(
    enabledCustom.filter(
      (t) => t.scopeType === QC_TEMPLATE_SCOPE_TYPE.CATEGORY && templateMatchesTarget(t, target),
    ),
  )
  const globalHits = sortCandidates(
    enabledCustom.filter((t) => t.scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL),
  )
  const system = getSystemQcTemplate()

  const winnerId = result.template?.id
  const layers = [
    {
      key: 'single',
      label: '单产品',
      priority: 1,
      items: singleHits,
    },
    {
      key: 'category',
      label: '产品类别',
      priority: 2,
      items: categoryHits,
    },
    {
      key: 'global',
      label: '全局自定义',
      priority: 3,
      items: globalHits,
    },
    {
      key: 'system',
      label: '系统通用',
      priority: 4,
      items: system ? [system] : [],
    },
  ].map((layer) => ({
    ...layer,
    items: (layer.items || []).map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      scopeType: t.scopeType,
      status: t.status,
      updatedAt: t.updatedAt,
      isWinner:
        t.id === winnerId || (result.matchSource === layer.key && t.code === result.template?.code),
    })),
  }))

  return {
    ...result,
    matchSourceLabel: QC_TEMPLATE_MATCH_SOURCE_LABELS[result.matchSource] || result.matchSource,
    priorityTip: '优先级：单产品 > 产品类别 > 全局自定义 > 系统通用模板',
    layers,
  }
}
