import {
  PRODUCT_SKU_CODE_PATTERN,
  SPU_BOM_SOURCE_LABELS,
  SPU_BOM_STRATEGY,
  VARIANT_AXIS_SOURCE,
} from '@/constants/spu'
import { productBomState } from '@/store/productBomStore'
import { isBomActive } from '@/mock/productBomOptions'
import { buildSkuDisplayName } from '@/utils/spuVariant'
import { variantValuesKey } from '@/utils/spuVariant'

export function combinationKey(variantValues = {}) {
  return variantValuesKey(variantValues)
}

export function resolveAxisValueOptions(axis, materialGrades = []) {
  if (!axis) return []
  if (axis.source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE) {
    // 本族已选定的材质子集（可删减，避免无关材质参与 SKU 笛卡尔）
    if (axis.enumValues?.length) {
      return axis.enumValues.map((v) => {
        const raw = typeof v === 'string' ? { name: v, code: v } : v
        const fromLib =
          (raw.materialGradeId &&
            materialGrades.find((g) => String(g.id) === String(raw.materialGradeId))) ||
          materialGrades.find((g) => g.name === raw.name) ||
          null
        return {
          name: raw.name || fromLib?.name || '',
          code: raw.code || fromLib?.code || raw.name || fromLib?.name || '',
          materialGradeId: raw.materialGradeId || fromLib?.id || '',
          description: raw.description || fromLib?.description || '',
        }
      })
    }
    // 未配置本族材质值域时不使用全库，避免冗余 SKU
    return []
  }
  if (axis.enumValues?.length) {
    return axis.enumValues.map((v) =>
      typeof v === 'string'
        ? { name: v, code: v }
        : {
            name: v.name,
            code: v.code || v.name,
            materialGradeId: v.materialGradeId || '',
            description: v.description || '',
          },
    )
  }
  return []
}

export function cartesianProduct(variantAxes = [], materialGrades = []) {
  const axes = (variantAxes || []).filter((a) => resolveAxisValueOptions(a, materialGrades).length)
  if (!axes.length) return []

  const walk = (idx, acc) => {
    if (idx >= axes.length) return [acc]
    const axis = axes[idx]
    const options = resolveAxisValueOptions(axis, materialGrades)
    const rows = []
    options.forEach((opt) => {
      const next = {
        ...acc,
        variantValues: {
          ...(acc.variantValues || {}),
          [axis.key]: opt.name,
        },
        axisMeta: {
          ...(acc.axisMeta || {}),
          [axis.key]: opt,
        },
      }
      if (axis.source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE && opt.materialGradeId) {
        next.materialGradeId = opt.materialGradeId
      }
      rows.push(...walk(idx + 1, next))
    })
    return rows
  }

  return walk(0, { variantValues: {}, axisMeta: {} })
}

export function buildSkuCodeFromPattern(spu, variantValues = {}, axisMeta = {}) {
  const pattern = spu?.skuCodePattern || PRODUCT_SKU_CODE_PATTERN
  const axes = spu?.variantAxes || []
  let code = pattern.replace(/\{SPU_CODE\}/g, spu?.code || 'SPU')
  axes.forEach((axis) => {
    const token =
      axisMeta[axis.key]?.code ||
      axis.enumValues?.find((e) => (e.name || e) === variantValues[axis.key])?.code ||
      variantValues[axis.key] ||
      ''
    const re = new RegExp(`\\{${axis.code || axis.key.toUpperCase()}\\}`, 'g')
    code = code.replace(re, token)
  })
  return code.replace(/--+/g, '-').replace(/^-|-$/g, '')
}

/** SKU 是否已有生效自有 BOM */
export function skuHasOwnActiveBom(sku) {
  if (!sku?.id) return false
  const types =
    sku._store === 'product'
      ? ['product']
      : sku._store === 'material'
        ? ['material']
        : ['product', 'material']
  return types.some((type) =>
    productBomState.boms.some(
      (b) => b.itemType === type && String(b.itemId) === String(sku.id) && isBomActive(b),
    ),
  )
}

/**
 * 矩阵「BOM来源」：自有BOM / 继承 / 独立 / 未配置
 */
export function resolveMatrixBomSource(spu, existingSku) {
  if (existingSku && skuHasOwnActiveBom(existingSku)) {
    return SPU_BOM_SOURCE_LABELS.own
  }
  const strategy = spu?.bomStrategy || SPU_BOM_STRATEGY.INHERIT
  if (strategy === SPU_BOM_STRATEGY.INDEPENDENT) {
    return SPU_BOM_SOURCE_LABELS.independent
  }
  if (strategy === SPU_BOM_STRATEGY.INHERIT) {
    return spu?.baseBomId ? SPU_BOM_SOURCE_LABELS.inherit : SPU_BOM_SOURCE_LABELS.none
  }
  return SPU_BOM_SOURCE_LABELS.none
}

export function previewMatrixRows(spu, options = {}) {
  const { materialGrades = [], existingSkus = [], enabledKeys = null, extraCombos = [] } = options

  const combos = cartesianProduct(spu?.variantAxes || [], materialGrades)
  const extraRows = (extraCombos || []).map((c) => ({
    variantValues: c.variantValues || {},
    axisMeta: c.axisMeta || {},
    materialGradeId: c.materialGradeId || '',
  }))
  const all = [...combos, ...extraRows]
  const seen = new Set()

  return all
    .filter((row) => {
      const key = combinationKey(row.variantValues)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((row, index) => {
      const key = combinationKey(row.variantValues)
      const existingSku = existingSkus.find((s) => combinationKey(s.variantValues || {}) === key)
      const previewCode = buildSkuCodeFromPattern(spu, row.variantValues, row.axisMeta)
      return {
        rowKey: key || `row-${index}`,
        index: index + 1,
        variantValues: { ...row.variantValues },
        axisMeta: row.axisMeta || {},
        materialGradeId: row.materialGradeId || '',
        previewName: buildSkuDisplayName(spu?.name, row.variantValues, spu?.variantAxes),
        previewCode,
        existingSku,
        enabled: enabledKeys == null ? true : enabledKeys.has(key),
        bomSource: resolveMatrixBomSource(spu, existingSku),
      }
    })
}

export function matrixRowsToSkuCombos(rows = []) {
  return rows
    .filter((r) => r.enabled !== false)
    .map((r) => ({
      variantValues: r.variantValues,
      materialGradeId: r.materialGradeId || '',
      code: r.previewCode || r.code,
      extra: r.variantValues,
    }))
}
