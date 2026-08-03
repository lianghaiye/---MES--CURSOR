/** 双物料单位（采购单位 ≠ 库存单位）主数据与单据辅助 */

export const UOM_RELATION_PER_PIECE_LENGTH = 'per_piece_length'
export const UOM_RELATION_PER_PIECE_WEIGHT = 'per_piece_weight'
export const UOM_RELATION_PER_PIECE_AREA = 'per_piece_area'

/** 可作为长度类库存单位（与下料尺寸 mm/cm/m 同量纲，可填写下料尺寸） */
export const LENGTH_STOCK_UNIT_NAMES = ['米', 'm', 'M', '厘米', 'cm', 'CM', '毫米', 'mm', 'MM']

/** 面积类库存单位 */
export const AREA_STOCK_UNIT_NAMES = ['㎡', 'm²', 'm2', '平方米', '平米']

/** 板材尺寸录入单位（换算到米后再算㎡） */
export const PLATE_DIM_UNITS = ['mm', 'cm', 'm']
export const PLATE_DIM_UNIT_OPTIONS = PLATE_DIM_UNITS.map((u) => ({ label: u, value: u }))
export const DEFAULT_PLATE_DIM_UNIT = 'mm'

const DIM_TO_METERS = { mm: 0.001, cm: 0.01, m: 1 }

/** 双单位入库填写方式（与库存单位量纲无关的通用命名） */
export const INBOUND_ENTRY_MODE = {
  /** 采购件数 × 统一单件数量 */
  UNIFORM: 'uniform',
  /** 逐件填写单件数量（可不同） */
  PIECE: 'piece',
  /** 直接填写库存合计 */
  TOTAL: 'total',
}

/** 条码类型：一物一码 = 单件管理，禁止合批「直接填合计」 */
export const BARCODE_TYPE_ONE_ITEM = '一物一码'

/** 是否一物一码（单件管理） */
export function isOneItemOneCodeBarcode(barcodeType) {
  return String(barcodeType || '').trim() === BARCODE_TYPE_ONE_ITEM
}

/** 是否允许入库「直接填合计」（一类一码 / 一批一码等可合批） */
export function allowsInboundTotalEntry(barcodeType) {
  return !isOneItemOneCodeBarcode(barcodeType)
}

/** 兼容历史 mode 值 */
export function normalizeInboundEntryMode(mode) {
  const m = String(mode || '')
  if (m === 'uniform' || m === 'piece' || m === 'total') return m
  if (m === 'length_uniform' || m === 'weight_uniform') return INBOUND_ENTRY_MODE.UNIFORM
  if (m === 'length_piece' || m === 'weight_piece') return INBOUND_ENTRY_MODE.PIECE
  if (m === 'weight_total') return INBOUND_ENTRY_MODE.TOTAL
  return INBOUND_ENTRY_MODE.UNIFORM
}

/**
 * 是否为长度类库存单位（米 / 厘米 / 毫米 及其英文写法）
 */
export function isLengthStockUnit(unit) {
  const raw = String(unit || '').trim()
  if (!raw) return false
  const u = raw.toLowerCase()
  if (u === '米' || raw === '米') return true
  if (u === '厘米' || raw === '厘米') return true
  if (u === '毫米' || raw === '毫米') return true
  if (u === 'm' || u === 'meter' || u === 'metre' || u === 'meters' || u === 'metres') return true
  if (u === 'cm' || u === 'centimeter' || u === 'centimetre' || u === 'centimeters') return true
  if (u === 'mm' || u === 'millimeter' || u === 'millimetre' || u === 'millimeters') return true
  return false
}

/** 是否为重量类库存单位（kg / 公斤等） */
export function isWeightStockUnit(unit) {
  const raw = String(unit || '').trim()
  if (!raw) return false
  const u = raw.toLowerCase()
  if (raw === '公斤' || raw === '千克') return true
  if (u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilograms') return true
  if (u === 'g' || u === 'gram' || u === 'grams' || raw === '克') return true
  if (u === 't' || u === 'ton' || u === 'tonne' || raw === '吨') return true
  return false
}

/** 是否为面积类库存单位（㎡ / 平方米） */
export function isAreaStockUnit(unit) {
  const raw = String(unit || '').trim()
  if (!raw) return false
  const u = raw.toLowerCase().replace('²', '2')
  if (raw === '㎡' || raw === 'm²' || raw === '平方米' || raw === '平米') return true
  if (u === 'm2' || u === 'sqm' || u === 'sq.m' || u === 'squaremeter' || u === 'squaremeters') {
    return true
  }
  return false
}

export function normalizePlateDimUnit(unit) {
  const u = String(unit || '').toLowerCase()
  return PLATE_DIM_UNITS.includes(u) ? u : DEFAULT_PLATE_DIM_UNIT
}

/**
 * 长 × 宽 → 面积（㎡）
 * @param {number} length
 * @param {number} width
 * @param {string} [dimUnit='mm'] 长宽所用单位
 */
export function calcAreaSquareMeters(length, width, dimUnit = DEFAULT_PLATE_DIM_UNIT) {
  const l = Number(length)
  const w = Number(width)
  if (!(l > 0) || !(w > 0)) return null
  const f = DIM_TO_METERS[normalizePlateDimUnit(dimUnit)] || 0.001
  return roundQty(l * f * w * f, 4)
}

/**
 * 双单位计量形态（入库/下料共用语义）：用户可手动指定，未指定时按库存单位推断
 * - length：型材 · 按长度（根→米等）
 * - plate：板材 · 长×宽→㎡
 * - generic：通用 · 只填库存数量，不强求尺寸换算
 */
export const DUAL_UNIT_MEASURE_MODE = {
  LENGTH: 'length',
  PLATE: 'plate',
  GENERIC: 'generic',
}

export const DUAL_UNIT_MEASURE_MODE_OPTIONS = [
  { label: '型材 · 按长度', value: DUAL_UNIT_MEASURE_MODE.LENGTH },
  { label: '板材 · 长×宽→㎡', value: DUAL_UNIT_MEASURE_MODE.PLATE },
  { label: '通用', value: DUAL_UNIT_MEASURE_MODE.GENERIC },
]

export function normalizeDualUnitMeasureMode(mode) {
  const m = String(mode || '').toLowerCase()
  if (
    m === DUAL_UNIT_MEASURE_MODE.PLATE ||
    m === DUAL_UNIT_MEASURE_MODE.LENGTH ||
    m === DUAL_UNIT_MEASURE_MODE.GENERIC
  ) {
    return m
  }
  return ''
}

/** 无手动模式时的默认推断：面积单位 → 板材；其它双单位 → 型材 */
export function inferDualUnitMeasureMode(lineOrItem = {}) {
  if (!lineOrItem) return DUAL_UNIT_MEASURE_MODE.GENERIC
  if (lineOrItem.uomRelation === UOM_RELATION_PER_PIECE_AREA) {
    return DUAL_UNIT_MEASURE_MODE.PLATE
  }
  const stock = lineOrItem.stockUnit || lineOrItem.inventoryUnit || lineOrItem.unit
  if (isAreaStockUnit(stock)) return DUAL_UNIT_MEASURE_MODE.PLATE
  if (lineOrItem.isVariableLength) return DUAL_UNIT_MEASURE_MODE.LENGTH
  return DUAL_UNIT_MEASURE_MODE.GENERIC
}

/**
 * 优先行上手动值（inboundMeasureMode / blankSizeMode），否则按单位推断
 * 面积库存单位默认「板材 · 长×宽→㎡」
 */
export function resolveDualUnitMeasureMode(lineOrItem = {}) {
  const explicit = normalizeDualUnitMeasureMode(
    lineOrItem?.inboundMeasureMode || lineOrItem?.blankSizeMode,
  )
  if (explicit) return explicit
  return inferDualUnitMeasureMode(lineOrItem)
}

/** 行/物料是否按面积双单位（板材）——尊重手动计量形态 */
export function isAreaBasedDualUnit(lineOrItem = {}) {
  if (!lineOrItem) return false
  return resolveDualUnitMeasureMode(lineOrItem) === DUAL_UNIT_MEASURE_MODE.PLATE
}

/** 解析 BOM 行/物料的库存单位展示值 */
export function resolveLineStockUnit(line, material) {
  if (material) {
    if (material.isVariableLength) {
      return material.stockUnit || material.inventoryUnit || line?.unit || '米'
    }
    return material.inventoryUnit || material.stockUnit || line?.unit || '件'
  }
  return line?.inventoryUnit || line?.stockUnit || line?.unit || '—'
}

export function isVariableLengthMaterial(item) {
  if (!item) return false
  return Boolean(item.isVariableLength)
}

/** 根据库存单位推断双单位换算关系 */
export function inferUomRelation(stockUnit, explicit = '') {
  if (explicit) return explicit
  if (isAreaStockUnit(stockUnit)) return UOM_RELATION_PER_PIECE_AREA
  if (isWeightStockUnit(stockUnit)) return UOM_RELATION_PER_PIECE_WEIGHT
  return UOM_RELATION_PER_PIECE_LENGTH
}

/** 从物料档案解析双单位相关字段（带默认） */
export function resolveVariableLengthFields(item = {}) {
  const isVL = Boolean(item.isVariableLength)
  const stockUnit = item.stockUnit || item.inventoryUnit || (isVL ? '米' : '件')
  const uomRelation = isVL ? inferUomRelation(stockUnit, item.uomRelation) : ''
  const areaBased = uomRelation === UOM_RELATION_PER_PIECE_AREA
  const weightBased = uomRelation === UOM_RELATION_PER_PIECE_WEIGHT
  return {
    isVariableLength: isVL,
    stockUnit,
    purchaseUnit:
      item.purchaseUnit ||
      (isVL ? (areaBased ? '张' : weightBased ? '件' : '根') : item.inventoryUnit || '件'),
    barcodeType: item.barcodeType || '一批一码',
    uomRelation,
    material: item.material || '',
  }
}

/** 双单位入库填写方式；一物一码不提供「直接填合计」 */
export function getInboundEntryModeOptions(barcodeType, options = {}) {
  const areaBased = Boolean(options.areaBased)
  const opts = [
    {
      label: areaBased ? '统一单件尺寸（长×宽）' : '统一单件数量',
      value: INBOUND_ENTRY_MODE.UNIFORM,
    },
    {
      label: areaBased ? '逐张尺寸（可不同）' : '逐件数量（可不同）',
      value: INBOUND_ENTRY_MODE.PIECE,
    },
  ]
  if (allowsInboundTotalEntry(barcodeType)) {
    opts.push({
      label: areaBased ? '直接填合计面积' : '直接填合计',
      value: INBOUND_ENTRY_MODE.TOTAL,
    })
  }
  return opts
}

export function defaultInboundEntryMode(barcodeType) {
  return allowsInboundTotalEntry(barcodeType)
    ? INBOUND_ENTRY_MODE.TOTAL
    : INBOUND_ENTRY_MODE.UNIFORM
}

/** 若当前为合计且条码类型不允许，则回退为统一单件 */
export function coerceInboundEntryMode(mode, barcodeType) {
  const normalized = normalizeInboundEntryMode(mode || defaultInboundEntryMode(barcodeType))
  if (normalized === INBOUND_ENTRY_MODE.TOTAL && !allowsInboundTotalEntry(barcodeType)) {
    return INBOUND_ENTRY_MODE.UNIFORM
  }
  return normalized
}

function resolveUniformValue(line) {
  if (isAreaBasedDualUnit(line)) {
    const fromDims = calcAreaSquareMeters(
      line.uniformLength ?? line.uniformDimLength,
      line.uniformWidth ?? line.uniformDimWidth,
      line.dimUnit || line.uniformDimUnit,
    )
    if (fromDims != null && fromDims > 0) return fromDims
  }
  const v = Number(line.uniformValue ?? line.uniformLength ?? line.uniformWeight)
  return Number.isFinite(v) ? v : NaN
}

function resolvePieceValues(line) {
  if (isAreaBasedDualUnit(line) && Array.isArray(line.pieceDims) && line.pieceDims.length) {
    const unit = line.dimUnit || DEFAULT_PLATE_DIM_UNIT
    return line.pieceDims.map((d) => {
      const area = calcAreaSquareMeters(d?.length, d?.width, d?.unit || unit)
      return area == null ? NaN : area
    })
  }
  if (Array.isArray(line.pieceValues) && line.pieceValues.length) {
    return line.pieceValues.map(Number)
  }
  if (Array.isArray(line.pieceLengths) && line.pieceLengths.length) {
    return line.pieceLengths.map(Number)
  }
  if (Array.isArray(line.pieceWeights) && line.pieceWeights.length) {
    return line.pieceWeights.map(Number)
  }
  return []
}

function resolveTotalValue(line) {
  const v = Number(line.totalValue ?? line.totalWeight ?? line.qty)
  return Number.isFinite(v) ? v : NaN
}

/**
 * 双单位 BOM 行：需求库存单位量
 * - 型材：blankLength(米) × 单位用量 × 排产 × (1+损耗)
 * - 板材：blankArea(㎡) × 单位用量 × 排产 × (1+损耗)
 */
export function calcDemandStockQty({
  blankLength,
  blankArea,
  areaBased = false,
  unitQty = 1,
  scheduleQty = 1,
  blankLossRate = 0,
}) {
  const base = areaBased ? Number(blankArea) || 0 : Number(blankLength) || 0
  const uq = Number(unitQty) || 1
  const sq = Number(scheduleQty) || 1
  const loss = Number(blankLossRate) || 0
  if (base <= 0) return 0
  return roundMeters(base * uq * sq * (1 + loss / 100))
}

/**
 * 双单位 BOM 行：需求米数（型材口径；板材请用 calcDemandStockQty）
 * demandMeters = blankLength × unitQty × scheduleQty × (1 + lossRate)
 */
export function calcDemandMeters({ blankLength, unitQty = 1, scheduleQty = 1, blankLossRate = 0 }) {
  return calcDemandStockQty({
    blankLength,
    areaBased: false,
    unitQty,
    scheduleQty,
    blankLossRate,
  })
}

export function roundMeters(n, digits = 3) {
  return roundQty(n, digits)
}

export function roundQty(n, digits = 4) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  const p = 10 ** digits
  return Math.round(x * p) / p
}

export function sumPieceValues(values = []) {
  return roundQty(values.reduce((s, l) => s + (Number(l) || 0), 0))
}

export function sumPieceLengths(pieceLengths = []) {
  return roundMeters(sumPieceValues(pieceLengths))
}

/**
 * 根据填写方式展开单件数量列表，并回写 qty
 */
export function expandDualUnitInboundPieces(line, stockUnit) {
  if (!line?.isVariableLength) return { ok: true }
  const barcodeType = line.barcodeType
  let mode = coerceInboundEntryMode(
    line.inboundEntryMode || defaultInboundEntryMode(barcodeType),
    barcodeType,
  )
  const stockLabel = stockUnit || line.unit || ''
  const purchaseLabel = line.purchaseUnit || '件'
  const areaBased = isAreaBasedDualUnit({ ...line, unit: stockLabel, stockUnit: stockLabel })

  if (mode === INBOUND_ENTRY_MODE.TOTAL && !allowsInboundTotalEntry(barcodeType)) {
    return {
      ok: false,
      message: '一物一码物料须按件录入（统一单件或逐件），不可直接填合计合批',
    }
  }

  if (mode === INBOUND_ENTRY_MODE.UNIFORM) {
    const roots = Number(line.purchaseQty)
    const per = resolveUniformValue(line)
    if (!(roots > 0)) {
      return { ok: false, message: `请填写入库数量（${purchaseLabel}）` }
    }
    if (!(per > 0)) {
      return {
        ok: false,
        message: areaBased
          ? `请填写单件长×宽（换算为 ${stockLabel || '㎡'}），或直接填写单件面积`
          : `请填写单件数量（${stockLabel || '库存单位'}）`,
      }
    }
    const pieceValues = Array.from({ length: roots }, () => per)
    return { ok: true, pieceValues, qty: sumPieceValues(pieceValues), mode }
  }

  if (mode === INBOUND_ENTRY_MODE.PIECE) {
    const roots = Number(line.purchaseQty)
    const pieceValues = resolvePieceValues(line)
    if (!(roots > 0)) {
      return { ok: false, message: `请填写入库数量（${purchaseLabel}）` }
    }
    if (pieceValues.length !== roots) {
      return {
        ok: false,
        message: areaBased
          ? `须录入 ${roots} 张尺寸，当前 ${pieceValues.length} 张`
          : `须录入 ${roots} 条单件数量，当前 ${pieceValues.length} 条`,
      }
    }
    if (pieceValues.some((v) => !Number.isFinite(v) || v <= 0)) {
      return {
        ok: false,
        message: areaBased ? '每张长、宽须大于 0（或面积大于 0）' : '每条单件数量须大于 0',
      }
    }
    return { ok: true, pieceValues, qty: sumPieceValues(pieceValues), mode }
  }

  if (mode === INBOUND_ENTRY_MODE.TOTAL) {
    const roots = Number(line.purchaseQty)
    const total = resolveTotalValue(line)
    if (!(roots > 0)) {
      return { ok: false, message: `请填写入库数量（${purchaseLabel}）` }
    }
    if (!(total > 0)) {
      return {
        ok: false,
        message: `请填写合计数量（${stockLabel || (areaBased ? '㎡' : '库存单位')}）`,
      }
    }
    return { ok: true, pieceValues: [total], qty: roundQty(total), mode }
  }

  return { ok: false, message: '不支持的入库填写方式' }
}

/** 校验双单位入库行 */
export function validateVariableLengthInboundLine(line, stockUnit) {
  if (!line?.isVariableLength) return { ok: true }
  const unit = stockUnit || line.unit || ''
  const expanded = expandDualUnitInboundPieces(line, unit)
  if (!expanded.ok) return expanded

  line.inboundEntryMode = expanded.mode
  line.pieceValues = expanded.pieceValues
  // 兼容旧字段：统一写入 pieceLengths，批次入库仍可读
  line.pieceLengths = expanded.pieceValues
  line.pieceWeights = undefined
  const uniform = resolveUniformValue(line)
  line.uniformValue = Number.isFinite(uniform) ? uniform : undefined
  line.qty = expanded.qty
  line.stockQty = expanded.qty
  return { ok: true }
}
