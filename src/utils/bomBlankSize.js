import { formatNumber, roundNumber } from '@/utils/numberFormat'
import {
  calcAreaSquareMeters,
  DUAL_UNIT_MEASURE_MODE,
  inferDualUnitMeasureMode,
  normalizeDualUnitMeasureMode,
  resolveDualUnitMeasureMode,
} from '@/utils/variableLengthMaterial'

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

/** 板材模式主填项 */
export const PLATE_BLANK_SIZE_PRIMARY_FIELDS = [
  { key: 'length', label: '长', required: true },
  { key: 'width', label: '宽', required: true },
]

/** 板材模式辅填项（不参与面积） */
export const PLATE_BLANK_SIZE_EXTRA_FIELDS = [{ key: 'thickness', label: '厚', required: false }]

/** 型材/管材模式主填项 */
export const LENGTH_BLANK_SIZE_PRIMARY_FIELDS = [{ key: 'length', label: '长', required: true }]

export const LENGTH_BLANK_SIZE_EXTRA_FIELDS = [
  { key: 'outerDiameter', label: '外径', required: false },
  { key: 'innerDiameter', label: '内径', required: false },
  { key: 'thickness', label: '厚', required: false },
  { key: 'width', label: '宽', required: false },
  { key: 'height', label: '高', required: false },
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

/** 下料方式：与入库计量形态共用语义（length / plate / generic） */
export const BLANK_SIZE_MODE = DUAL_UNIT_MEASURE_MODE

export const BLANK_SIZE_MODE_OPTIONS = [
  { label: '型材 · 按长度', value: BLANK_SIZE_MODE.LENGTH },
  { label: '板材 · 长×宽→㎡', value: BLANK_SIZE_MODE.PLATE },
  { label: '通用', value: BLANK_SIZE_MODE.GENERIC },
]

export function normalizeBlankSizeMode(mode) {
  return normalizeDualUnitMeasureMode(mode)
}

/** 无手动模式时的默认推断（仅作弹窗初值建议） */
export function inferBlankSizeMode(lineOrItem = {}) {
  return inferDualUnitMeasureMode(lineOrItem)
}

/** 优先用行上 blankSizeMode，否则回退推断 */
export function resolveBlankSizeMode(lineOrItem = {}) {
  return resolveDualUnitMeasureMode({
    ...lineOrItem,
    blankSizeMode: lineOrItem?.blankSizeMode,
  })
}

/** BOM 行是否按面积下料（板材）——尊重手动模式 */
export function isPlateBlankSizeLine(lineOrItem = {}) {
  return resolveBlankSizeMode(lineOrItem) === BLANK_SIZE_MODE.PLATE
}

export function isLengthBlankSizeLine(lineOrItem = {}) {
  return resolveBlankSizeMode(lineOrItem) === BLANK_SIZE_MODE.LENGTH
}

/**
 * 由 blankSize 长×宽换算单件面积（㎡）
 * 长、宽单位可不同：各自换算到米后相乘
 */
export function calcBlankAreaSquareMeters(blankSize) {
  const bs = normalizeBlankSize(blankSize)
  if (bs.length == null || bs.width == null) return null
  const lengthUnit = bs.units.length || DEFAULT_BLANK_SIZE_UNIT
  const widthUnit = bs.units.width || DEFAULT_BLANK_SIZE_UNIT
  if (lengthUnit === widthUnit) {
    return calcAreaSquareMeters(bs.length, bs.width, lengthUnit)
  }
  const lengthM = toMillimeters(bs.length, lengthUnit)
  const widthM = toMillimeters(bs.width, widthUnit)
  if (lengthM == null || widthM == null) return null
  return roundNumber((lengthM / 1000) * (widthM / 1000), 4)
}

/**
 * 写入 BOM 行：blankSize + blankSizeText + blankSizeMode；
 * 板材写 blankArea(㎡)；型材写 blankLength(米)
 * @param {{ mode?: string }} [options]
 */
export function applyBlankSizeToLine(line, blankSize, options = {}) {
  if (!line) return line
  const bs = normalizeBlankSize(blankSize)
  line.blankSize = bs
  line.blankSizeText = formatBlankSizeText(bs)

  const mode =
    normalizeBlankSizeMode(options.mode) ||
    normalizeBlankSizeMode(line.blankSizeMode) ||
    inferBlankSizeMode(line)
  line.blankSizeMode = mode

  if (mode === BLANK_SIZE_MODE.PLATE) {
    const area = calcBlankAreaSquareMeters(bs)
    line.blankArea = area != null && area > 0 ? area : null
    line.blankLength = null
  } else if (mode === BLANK_SIZE_MODE.LENGTH) {
    const lengthMm = toMillimeters(bs.length, bs.units.length)
    line.blankLength = lengthMm != null ? roundNumber(lengthMm / 1000, 4) : null
    line.blankArea = null
  } else if (bs.length != null) {
    const lengthMm = toMillimeters(bs.length, bs.units.length)
    line.blankLength = lengthMm != null ? roundNumber(lengthMm / 1000, 4) : null
    line.blankArea = null
  } else {
    line.blankLength = null
    line.blankArea = null
  }
  return line
}

/**
 * 校验双单位行下料尺寸是否齐全
 * @returns {{ ok: boolean, message?: string, line?: object }}
 */
export function validateVariableLengthBlankSize(line) {
  if (!line?.isVariableLength) return { ok: true }
  const label = line.itemName || line.materialCode || '双物料单位'
  const mode = resolveBlankSizeMode(line)
  if (mode === BLANK_SIZE_MODE.PLATE) {
    const area =
      Number(line.blankArea) > 0
        ? Number(line.blankArea)
        : calcBlankAreaSquareMeters(line.blankSize)
    if (!(area > 0)) {
      return {
        ok: false,
        message: `板材「${label}」请在下料尺寸中填写「长」和「宽」`,
        line,
      }
    }
    return { ok: true }
  }
  if (mode === BLANK_SIZE_MODE.GENERIC) return { ok: true }
  const len = Number(line.blankSize?.length ?? line.blankLength)
  if (!(len > 0)) {
    return {
      ok: false,
      message: `型材「${label}」请在下料尺寸中填写「长」`,
      line,
    }
  }
  return { ok: true }
}

/** 批量找第一条不合格双单位下料行 */
export function findInvalidBlankSizeLine(lines = []) {
  for (const line of lines) {
    const res = validateVariableLengthBlankSize(line)
    if (!res.ok) return res
  }
  return { ok: true }
}
