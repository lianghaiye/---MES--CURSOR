/**
 * 金属型材重量计算（纯前端）
 * 体积按 mm 统一换算；密度 g/cm³；结果 kg
 */
import { roundNumber } from '@/utils/numberFormat'
import {
  DEFAULT_BLANK_SIZE_UNIT,
  normalizeBlankSize,
  toMillimeters,
  fromMillimeters,
} from '@/utils/bomBlankSize'

/** 常用材料密度预设（g/cm³），用户可改自定义 */
export const METAL_DENSITY_PRESETS = [
  { key: 'carbon', label: '碳钢 / 普通钢', density: 7.85 },
  { key: 'stainless', label: '不锈钢（304 等）', density: 7.93 },
  { key: 'cast', label: '铸铁', density: 7.2 },
  { key: 'aluminum', label: '铝 / 铝合金', density: 2.7 },
  { key: 'copper', label: '铜', density: 8.96 },
  { key: 'brass', label: '黄铜', density: 8.5 },
  { key: 'titanium', label: '钛', density: 4.51 },
  { key: 'custom', label: '自定义', density: null },
]

export const METAL_PROFILE = {
  PLATE: 'plate',
  ROUND_BAR: 'round_bar',
  ROUND_PIPE: 'round_pipe',
  SQUARE_BAR: 'square_bar',
  SQUARE_PIPE: 'square_pipe',
  FLAT_BAR: 'flat_bar',
  HEX_BAR: 'hex_bar',
}

/**
 * 型材定义：fields 对应下料尺寸字段；calc 用毫米尺寸算体积 cm³
 */
export const METAL_PROFILE_OPTIONS = [
  {
    value: METAL_PROFILE.PLATE,
    label: '板材',
    hint: '长 × 宽 × 厚',
    fields: [
      { key: 'length', label: '长', required: true },
      { key: 'width', label: '宽', required: true },
      { key: 'thickness', label: '厚', required: true },
    ],
    suggestedBlankMode: 'plate',
    volumeCm3(mm) {
      return (mm.length * mm.width * mm.thickness) / 1000
    },
  },
  {
    value: METAL_PROFILE.ROUND_BAR,
    label: '圆钢 / 棒材',
    hint: '直径 × 长',
    fields: [
      { key: 'outerDiameter', label: '直径', required: true },
      { key: 'length', label: '长', required: true },
    ],
    suggestedBlankMode: 'generic',
    volumeCm3(mm) {
      const r = mm.outerDiameter / 2
      return (Math.PI * r * r * mm.length) / 1000
    },
  },
  {
    value: METAL_PROFILE.ROUND_PIPE,
    label: '圆管',
    hint: '外径、内径（或壁厚）× 长',
    fields: [
      { key: 'outerDiameter', label: '外径', required: true },
      { key: 'innerDiameter', label: '内径', required: false },
      { key: 'thickness', label: '壁厚', required: false },
      { key: 'length', label: '长', required: true },
    ],
    suggestedBlankMode: 'generic',
    volumeCm3(mm) {
      const od = mm.outerDiameter
      let id = mm.innerDiameter
      if (!(id > 0) && mm.thickness > 0) {
        id = od - 2 * mm.thickness
      }
      if (!(id > 0) || id >= od) return null
      const R = od / 2
      const r = id / 2
      return (Math.PI * (R * R - r * r) * mm.length) / 1000
    },
  },
  {
    value: METAL_PROFILE.SQUARE_BAR,
    label: '方钢 / 矩形棒',
    hint: '宽 × 高 × 长',
    fields: [
      { key: 'width', label: '宽', required: true },
      { key: 'height', label: '高', required: true },
      { key: 'length', label: '长', required: true },
    ],
    suggestedBlankMode: 'generic',
    volumeCm3(mm) {
      return (mm.width * mm.height * mm.length) / 1000
    },
  },
  {
    value: METAL_PROFILE.SQUARE_PIPE,
    label: '方管 / 矩形管',
    hint: '外宽、外高、壁厚 × 长',
    fields: [
      { key: 'width', label: '外宽', required: true },
      { key: 'height', label: '外高', required: true },
      { key: 'thickness', label: '壁厚', required: true },
      { key: 'length', label: '长', required: true },
    ],
    suggestedBlankMode: 'generic',
    volumeCm3(mm) {
      const t = mm.thickness
      const iw = mm.width - 2 * t
      const ih = mm.height - 2 * t
      if (!(iw > 0) || !(ih > 0)) return null
      return ((mm.width * mm.height - iw * ih) * mm.length) / 1000
    },
  },
  {
    value: METAL_PROFILE.FLAT_BAR,
    label: '扁钢',
    hint: '宽 × 厚 × 长',
    fields: [
      { key: 'width', label: '宽', required: true },
      { key: 'thickness', label: '厚', required: true },
      { key: 'length', label: '长', required: true },
    ],
    suggestedBlankMode: 'generic',
    volumeCm3(mm) {
      return (mm.width * mm.thickness * mm.length) / 1000
    },
  },
  {
    value: METAL_PROFILE.HEX_BAR,
    label: '六角钢',
    hint: '对边距 × 长',
    fields: [
      { key: 'width', label: '对边距', required: true },
      { key: 'length', label: '长', required: true },
    ],
    suggestedBlankMode: 'generic',
    volumeCm3(mm) {
      // 对边距 S：面积 = (√3/2) × S²
      return ((Math.sqrt(3) / 2) * mm.width * mm.width * mm.length) / 1000
    },
  },
]

export function getMetalProfile(profileValue) {
  return METAL_PROFILE_OPTIONS.find((p) => p.value === profileValue) || METAL_PROFILE_OPTIONS[0]
}

export function emptyWeightCalcDraft(profileValue = METAL_PROFILE.PLATE) {
  const profile = getMetalProfile(profileValue)
  const draft = {
    profile: profile.value,
    densityPreset: 'carbon',
    density: 7.85,
    qty: 1,
    values: {},
    units: {},
  }
  for (const f of profile.fields) {
    draft.values[f.key] = null
    draft.units[f.key] = DEFAULT_BLANK_SIZE_UNIT
  }
  return draft
}

/** 尺寸对象 → 毫米 */
export function toMmMap(values = {}, units = {}, fieldKeys = []) {
  const mm = {}
  for (const key of fieldKeys) {
    const n = toMillimeters(values[key], units[key] || DEFAULT_BLANK_SIZE_UNIT)
    mm[key] = n != null && n > 0 ? n : 0
  }
  return mm
}

/**
 * @returns {{ ok: boolean, weightKg?: number, pieceWeightKg?: number, volumeCm3?: number, message?: string }}
 */
export function calcMetalWeight({ profile, density, qty, values, units }) {
  const def = getMetalProfile(profile)
  if (!def) return { ok: false, message: '请选择型材类型' }

  const dens = Number(density)
  if (!(dens > 0)) return { ok: false, message: '请填写有效密度（g/cm³）' }

  for (const f of def.fields) {
    if (!f.required) continue
    if (!(Number(values?.[f.key]) > 0)) {
      return { ok: false, message: `请填写「${f.label}」` }
    }
  }

  // 圆管：内径与壁厚至少填一个
  if (profile === METAL_PROFILE.ROUND_PIPE) {
    const hasId = Number(values?.innerDiameter) > 0
    const hasWall = Number(values?.thickness) > 0
    if (!hasId && !hasWall) {
      return { ok: false, message: '圆管请填写「内径」或「壁厚」' }
    }
  }

  const fieldKeys = def.fields.map((f) => f.key)
  const mm = toMmMap(values, units, fieldKeys)
  const volumeCm3 = def.volumeCm3(mm)
  if (volumeCm3 == null || !(volumeCm3 > 0)) {
    return { ok: false, message: '尺寸无效，请检查外径/内径/壁厚关系' }
  }

  const pieceWeightKg = roundNumber((volumeCm3 * dens) / 1000, 4)
  const n = Number(qty)
  const count = Number.isFinite(n) && n > 0 ? n : 1
  const weightKg = roundNumber(pieceWeightKg * count, 4)

  return { ok: true, weightKg, pieceWeightKg, volumeCm3: roundNumber(volumeCm3, 4) }
}

/** 从下料尺寸 draft 灌入计算器 */
export function seedWeightCalcFromBlankSize(blankSize, profileValue) {
  const bs = normalizeBlankSize(blankSize)
  const draft = emptyWeightCalcDraft(profileValue)
  const def = getMetalProfile(draft.profile)
  for (const f of def.fields) {
    if (bs[f.key] != null) {
      draft.values[f.key] = bs[f.key]
      draft.units[f.key] = bs.units?.[f.key] || DEFAULT_BLANK_SIZE_UNIT
    }
  }
  return draft
}

/**
 * 计算器尺寸回填为下料 blankSize（只写本型材用到的字段，其它清空为不覆盖已有？）
 * 策略：合并——本型材字段写入，其余保留原 draft 中已有值
 */
export function applyWeightCalcToBlankSize(calcDraft, existingBlankSize) {
  const base = normalizeBlankSize(existingBlankSize)
  const def = getMetalProfile(calcDraft.profile)
  for (const f of def.fields) {
    const v = Number(calcDraft.values?.[f.key])
    if (Number.isFinite(v) && v > 0) {
      const unit = calcDraft.units?.[f.key] || DEFAULT_BLANK_SIZE_UNIT
      // 统一写入为当前单位数值（不强制转 mm）
      base[f.key] = roundNumber(v, 4)
      base.units[f.key] = unit
    }
  }
  // 圆管若只填壁厚：回填推算内径，便于预览完整
  if (calcDraft.profile === METAL_PROFILE.ROUND_PIPE) {
    const od = Number(calcDraft.values?.outerDiameter)
    const wall = Number(calcDraft.values?.thickness)
    const id = Number(calcDraft.values?.innerDiameter)
    if (!(id > 0) && od > 0 && wall > 0) {
      const unit = calcDraft.units?.outerDiameter || DEFAULT_BLANK_SIZE_UNIT
      const odMm = toMillimeters(od, unit)
      const wallMm = toMillimeters(wall, calcDraft.units?.thickness || unit)
      if (odMm != null && wallMm != null) {
        const idMm = odMm - 2 * wallMm
        if (idMm > 0) {
          base.innerDiameter = fromMillimeters(idMm, unit)
          base.units.innerDiameter = unit
        }
      }
    }
  }
  return base
}

export function suggestedBlankModeForProfile(profileValue) {
  return getMetalProfile(profileValue)?.suggestedBlankMode || 'generic'
}

/** 切换型材时保留同名字段数值 */
export function switchWeightCalcProfile(prevDraft, nextProfile) {
  const next = emptyWeightCalcDraft(nextProfile)
  next.density = prevDraft?.density ?? next.density
  next.densityPreset =
    prevDraft?.densityPreset != null ? prevDraft.densityPreset : next.densityPreset
  next.qty = prevDraft?.qty ?? 1
  const def = getMetalProfile(nextProfile)
  for (const f of def.fields) {
    if (prevDraft?.values?.[f.key] != null) {
      next.values[f.key] = prevDraft.values[f.key]
      next.units[f.key] = prevDraft.units?.[f.key] || DEFAULT_BLANK_SIZE_UNIT
    }
  }
  return next
}
