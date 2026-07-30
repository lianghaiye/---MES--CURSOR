import { formatNumber, roundNumber } from '@/utils/numberFormat'

/** 下料尺寸可选单位 */
export const BLANK_SIZE_UNITS = ['mm', 'cm', 'm']

export const BLANK_SIZE_UNIT_OPTIONS = BLANK_SIZE_UNITS.map((u) => ({ label: u, value: u }))

/** 换算到毫米的系数 */
const TO_MM = { mm: 1, cm: 10, m: 1000 }

export const DEFAULT_BLANK_SIZE_UNIT = 'mm'

/** 下料尺寸属性（通用，与物料形态无关） */
export const BLANK_SIZE_FIELDS = [
  { key: 'length', label: '长' },
  { key: 'width', label: '宽' },
  { key: 'height', label: '高' },
  { key: 'thickness', label: '厚' },
  { key: 'innerDiameter', label: '内径' },
  { key: 'outerDiameter', label: '外径' },
]

export function emptyBlankSizeUnits() {
  const units = {}
  for (const f of BLANK_SIZE_FIELDS) {
    units[f.key] = DEFAULT_BLANK_SIZE_UNIT
  }
  return units
}

export function emptyBlankSize() {
  return {
    length: null,
    width: null,
    height: null,
    thickness: null,
    innerDiameter: null,
    outerDiameter: null,
    units: emptyBlankSizeUnits(),
  }
}

export function normalizeBlankSizeUnit(unit) {
  const u = String(unit || '').toLowerCase()
  return BLANK_SIZE_UNITS.includes(u) ? u : DEFAULT_BLANK_SIZE_UNIT
}

/** 数值按单位换算为毫米 */
export function toMillimeters(val, unit = DEFAULT_BLANK_SIZE_UNIT) {
  const n = Number(val)
  if (!Number.isFinite(n)) return null
  const factor = TO_MM[normalizeBlankSizeUnit(unit)] || 1
  return roundNumber(n * factor, 4)
}

/** 毫米换算为指定单位 */
export function fromMillimeters(mm, unit = DEFAULT_BLANK_SIZE_UNIT) {
  const n = Number(mm)
  if (!Number.isFinite(n)) return null
  const factor = TO_MM[normalizeBlankSizeUnit(unit)] || 1
  return roundNumber(n / factor, 4)
}

/**
 * 切换展示单位：保持物理尺寸不变，换算数值。
 * @returns {number|null}
 */
export function convertBlankSizeValue(val, fromUnit, toUnit) {
  if (val == null || val === '') return null
  const mm = toMillimeters(val, fromUnit)
  if (mm == null) return null
  return fromMillimeters(mm, toUnit)
}

export function normalizeBlankSize(raw) {
  const base = emptyBlankSize()
  if (!raw || typeof raw !== 'object') return base
  const rawUnits = raw.units && typeof raw.units === 'object' ? raw.units : {}
  for (const f of BLANK_SIZE_FIELDS) {
    const n = Number(raw[f.key])
    base[f.key] = Number.isFinite(n) && n > 0 ? roundNumber(n, 4) : null
    base.units[f.key] = normalizeBlankSizeUnit(rawUnits[f.key] ?? raw[`${f.key}Unit`])
  }
  return base
}

/**
 * 有值属性拼接为展示文案；空值不展示。
 * 例：长100mm 宽5cm 厚8mm
 */
export function formatBlankSizeText(blankSize) {
  const bs = normalizeBlankSize(blankSize)
  const parts = []
  for (const f of BLANK_SIZE_FIELDS) {
    const v = bs[f.key]
    if (v == null) continue
    const unit = bs.units[f.key] || DEFAULT_BLANK_SIZE_UNIT
    parts.push(`${f.label}${formatNumber(v, 4, { empty: '' })}${unit}`)
  }
  return parts.join(' ')
}

/**
 * 写入 BOM 行：blankSize + blankSizeText（原地更新）；
 * 双物料单位时用「长」换算 blankLength(米) 供批次拣选。
 */
export function applyBlankSizeToLine(line, blankSize) {
  if (!line) return line
  const bs = normalizeBlankSize(blankSize)
  line.blankSize = bs
  line.blankSizeText = formatBlankSizeText(bs)
  if (bs.length != null) {
    const lengthMm = toMillimeters(bs.length, bs.units.length)
    line.blankLength = lengthMm != null ? roundNumber(lengthMm / 1000, 4) : null
  } else {
    line.blankLength = null
  }
  return line
}
