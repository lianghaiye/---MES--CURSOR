/** SPU（产品族/物料族）BOM 策略 */
export const SPU_BOM_STRATEGY = {
  INHERIT: 'inherit',
  INDEPENDENT: 'independent',
}

export const SPU_BOM_STRATEGY_LABELS = {
  [SPU_BOM_STRATEGY.INHERIT]: '继承族模板',
  [SPU_BOM_STRATEGY.INDEPENDENT]: '每 SKU 独立 BOM',
}

export const SPU_BOM_STRATEGY_HELPS = {
  [SPU_BOM_STRATEGY.INHERIT]:
    '族模板供设计任务预填参考；销售投产仅认 SKU 自有生效 BOM。结构共用时推荐；特殊 SKU 再建独立 BOM。',
  [SPU_BOM_STRATEGY.INDEPENDENT]: '不走族模板，每个 SKU 各自维护 BOM。',
}

/** 矩阵「BOM来源」展示文案 */
export const SPU_BOM_SOURCE_LABELS = {
  own: '自有BOM',
  inherit: '继承',
  independent: '独立',
  none: '未配置',
}

/** 历史 mixed → inherit */
export function normalizeBomStrategy(strategy) {
  if (strategy === 'mixed') return SPU_BOM_STRATEGY.INHERIT
  if (strategy === SPU_BOM_STRATEGY.INDEPENDENT) return SPU_BOM_STRATEGY.INDEPENDENT
  return SPU_BOM_STRATEGY.INHERIT
}

/** 变体轴数据来源 */
export const VARIANT_AXIS_SOURCE = {
  FREE_TEXT: 'freeText',
  ENUM: 'enum',
  MATERIAL_GRADE: 'materialGrade',
}

/** 系统固定变体轴：规格型号、材质（不可删除） */
export const DEFAULT_VARIANT_AXES = [
  {
    key: 'specModel',
    label: '规格型号',
    code: 'SPEC',
    required: true,
    locked: true,
    source: VARIANT_AXIS_SOURCE.ENUM,
    enumValues: [],
  },
  {
    key: 'material',
    label: '材质',
    code: 'MATERIAL',
    required: true,
    locked: true,
    source: VARIANT_AXIS_SOURCE.MATERIAL_GRADE,
    enumValues: [],
  },
]

/** 产品族固定 SKU 编码规则：族编码-规格编码-材质编码 */
export const PRODUCT_SKU_CODE_PATTERN = '{SPU_CODE}-{SPEC}-{MATERIAL}'

/** 合并系统固定轴：保证规格型号、材质始终存在且 locked */
export function ensureLockedVariantAxes(axes = []) {
  const list = Array.isArray(axes) ? axes.map((a) => ({ ...a })) : []
  const byKey = new Map(list.map((a) => [a.key, a]))

  const locked = DEFAULT_VARIANT_AXES.map((lockedAxis) => {
    const existing = byKey.get(lockedAxis.key)
    if (existing) {
      return {
        ...existing,
        key: lockedAxis.key,
        label: existing.label || lockedAxis.label,
        code: lockedAxis.code,
        required: true,
        locked: true,
        source: lockedAxis.source,
        enumValues: existing.enumValues || [],
      }
    }
    return JSON.parse(JSON.stringify(lockedAxis))
  })

  const lockedKeys = new Set(DEFAULT_VARIANT_AXES.map((a) => a.key))
  const rest = list.filter((a) => a.key && !lockedKeys.has(a.key))
  return [...locked, ...rest]
}
