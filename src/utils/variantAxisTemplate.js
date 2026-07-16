import {
  DEFAULT_VARIANT_AXES,
  PRODUCT_SKU_CODE_PATTERN,
  VARIANT_AXIS_SOURCE,
  ensureLockedVariantAxes,
} from '@/constants/spu'
import { normalizeAxisEnumValues } from '@/utils/spuVariant'

const CATEGORY_AXIS_PRESETS = {
  'cat-004-001': [
    {
      key: 'specModel',
      label: '规格型号',
      code: 'SPEC',
      required: true,
      locked: true,
      source: VARIANT_AXIS_SOURCE.ENUM,
      enumValues: [
        { name: '100mm', code: '100' },
        { name: '150mm', code: '150' },
        { name: '200mm', code: '200' },
      ],
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
  ],
}

function cloneAxes(axes = []) {
  return JSON.parse(JSON.stringify(axes)).map((axis) => ({
    ...axis,
    enumValues: normalizeAxisEnumValues(axis.enumValues),
  }))
}

export function getVariantAxesForCategory(categoryKey, treeMode = 'material') {
  void treeMode
  if (categoryKey && CATEGORY_AXIS_PRESETS[categoryKey]) {
    return ensureLockedVariantAxes(cloneAxes(CATEGORY_AXIS_PRESETS[categoryKey]))
  }
  return ensureLockedVariantAxes(cloneAxes(DEFAULT_VARIANT_AXES))
}

export function defaultSkuCodePattern(variantAxes = []) {
  if (!variantAxes?.length) return PRODUCT_SKU_CODE_PATTERN
  const tokens = ['{SPU_CODE}', ...variantAxes.map((a) => `{${a.code || a.key.toUpperCase()}}`)]
  return tokens.join('-')
}
