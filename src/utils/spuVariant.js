import { VARIANT_AXIS_SOURCE } from '@/constants/spu'

export function normalizeVariantValues(variantValues = {}) {
  const next = {}
  Object.keys(variantValues || {}).forEach((key) => {
    const val = variantValues[key]
    if (val != null && val !== '') next[key] = String(val).trim()
  })
  return next
}

export function variantValuesKey(variantValues = {}) {
  const normalized = normalizeVariantValues(variantValues)
  return Object.keys(normalized)
    .sort()
    .map((key) => `${key}=${normalized[key]}`)
    .join('|')
}

export function variantValuesMatch(a = {}, b = {}) {
  const left = normalizeVariantValues(a)
  const right = normalizeVariantValues(b)
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] || '') !== (right[key] || '')) return false
  }
  return true
}

export function buildSkuDisplayName(spuName, variantValues = {}, variantAxes = []) {
  const parts = [spuName].filter(Boolean)
  ;(variantAxes || []).forEach((axis) => {
    const val = variantValues?.[axis.key]
    if (val) parts.push(val)
  })
  return parts.join(' ')
}

export function syncSkuFieldsFromVariant(spu, variantValues = {}, materialGradeId = '') {
  const axes = spu?.variantAxes || []
  const specAxis = axes.find((a) => a.key === 'specModel')
  const materialAxis = axes.find((a) => a.key === 'material')
  const name = buildSkuDisplayName(spu?.name, variantValues, axes)
  return {
    name,
    specModel: variantValues[specAxis?.key || 'specModel'] || '',
    material: variantValues[materialAxis?.key || 'material'] || '',
    materialGradeId: materialGradeId || '',
    variantValues: normalizeVariantValues(variantValues),
  }
}

export function normalizeAxisEnumValues(enumValues = []) {
  return (enumValues || []).map((item) =>
    typeof item === 'string'
      ? { name: item, code: item, materialGradeId: '', description: '' }
      : {
          name: item.name || '',
          code: item.code || item.name || '',
          materialGradeId: item.materialGradeId || '',
          description: item.description || '',
        },
  )
}

/** 从材质牌号主数据映射为变体轴值域项（完整信息） */
export function materialGradeToAxisValue(grade) {
  if (!grade) return null
  return {
    name: grade.name || '',
    code: grade.code || grade.name || '',
    materialGradeId: grade.id || '',
    description: grade.description || '',
  }
}

/**
 * 若材质轴尚未配置值域，从已有 SKU 回填（编辑旧数据时避免空白）
 */
export function hydrateMaterialAxisFromSkus(variantAxes = [], skus = [], gradeLookup = null) {
  const axes = (variantAxes || []).map((a) => ({
    ...a,
    enumValues: normalizeAxisEnumValues(a.enumValues),
  }))
  const materialAxis = axes.find(
    (a) => a.key === 'material' || a.source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE,
  )
  if (!materialAxis || materialAxis.enumValues?.length) return axes

  const seen = new Map()
  ;(skus || []).forEach((sku) => {
    const id = sku.materialGradeId || ''
    const name = sku.material || sku.variantValues?.material || ''
    if (!id && !name) return
    const key = id || name
    if (seen.has(key)) return
    const fromLib = gradeLookup?.(id) || null
    seen.set(key, {
      name: name || fromLib?.name || '',
      code: fromLib?.code || name || '',
      materialGradeId: id || fromLib?.id || '',
      description: fromLib?.description || '',
    })
  })
  materialAxis.enumValues = [...seen.values()].filter((v) => v.name)
  return axes
}

export function resolveAxisSourceLabel(source) {
  if (source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE) return '材质牌号'
  if (source === VARIANT_AXIS_SOURCE.ENUM) return '枚举值域'
  return '自由文本'
}

const DEFAULT_EXCLUDE_VARIANT_KEYS = ['specModel', 'material']

/**
 * 变体属性摘要：系统轴（规格/材质）通常已有独立列，其余写成「轴名:值 · …」
 * @param {Record<string,string>} variantValues
 * @param {Array<{key:string,label?:string}>} variantAxes
 * @param {{ excludeKeys?: string[] }} [options]
 */
export function formatVariantSummary(variantValues = {}, variantAxes = [], options = {}) {
  const exclude = new Set(options.excludeKeys || DEFAULT_EXCLUDE_VARIANT_KEYS)
  const normalized = normalizeVariantValues(variantValues)
  const axes = Array.isArray(variantAxes) ? variantAxes : []
  const axisByKey = new Map(axes.map((a) => [a.key, a]))

  const orderedKeys = [
    ...axes.map((a) => a.key).filter((k) => k && !exclude.has(k) && normalized[k]),
    ...Object.keys(normalized).filter((k) => !exclude.has(k) && !axisByKey.has(k)),
  ]

  return orderedKeys
    .map((key) => {
      const label = axisByKey.get(key)?.label || key
      return `${label}:${normalized[key]}`
    })
    .join(' · ')
}

/** 悬停全量：含规格/材质与自定义轴 */
export function formatVariantTooltip(variantValues = {}, variantAxes = []) {
  const normalized = normalizeVariantValues(variantValues)
  if (!Object.keys(normalized).length) return ''
  const axes = Array.isArray(variantAxes) ? variantAxes : []
  const axisByKey = new Map(axes.map((a) => [a.key, a]))
  const orderedKeys = [
    ...axes.map((a) => a.key).filter((k) => k && normalized[k]),
    ...Object.keys(normalized).filter((k) => !axisByKey.has(k)),
  ]
  return orderedKeys
    .map((key) => {
      const label = axisByKey.get(key)?.label || key
      return `${label}：${normalized[key]}`
    })
    .join('\n')
}
