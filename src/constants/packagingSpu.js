import { VARIANT_AXIS_SOURCE } from '@/constants/spu'
import { PACKAGING_FORM_OPTIONS, PACKAGING_UNIT_OPTIONS } from '@/constants/packagingMaster'

function enumFromList(list = []) {
  return list.map((name) => ({ name, code: name }))
}

/** 包装族默认变体轴：形式 × 尺寸 × 标准包装量 × 单位 */
export const DEFAULT_PACKAGING_VARIANT_AXES = [
  {
    key: 'packagingForm',
    label: '包装形式',
    code: 'FORM',
    required: true,
    source: VARIANT_AXIS_SOURCE.ENUM,
    enumValues: enumFromList(PACKAGING_FORM_OPTIONS.slice(0, 6)),
  },
  {
    key: 'outerSize',
    label: '外包装尺寸',
    code: 'SIZE',
    required: true,
    source: VARIANT_AXIS_SOURCE.ENUM,
    enumValues: [],
  },
  {
    key: 'capacityQty',
    label: '标准包装量',
    code: 'QTY',
    required: true,
    source: VARIANT_AXIS_SOURCE.ENUM,
    enumValues: enumFromList(['1', '4', '8', '10', '20']),
  },
  {
    key: 'unit',
    label: '单位',
    code: 'UNIT',
    required: true,
    source: VARIANT_AXIS_SOURCE.ENUM,
    enumValues: enumFromList(PACKAGING_UNIT_OPTIONS),
  },
]

export function defaultPackagingSkuCodePattern(variantAxes = DEFAULT_PACKAGING_VARIANT_AXES) {
  const tokens = ['{SPU_CODE}', ...variantAxes.map((a) => `{${a.code || a.key.toUpperCase()}}`)]
  return tokens.join('-')
}
