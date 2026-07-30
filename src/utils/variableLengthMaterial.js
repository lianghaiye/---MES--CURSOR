/** 双物料单位（采购单位 ≠ 库存单位）主数据与单据辅助 */

export const UOM_RELATION_PER_PIECE_LENGTH = 'per_piece_length'
export const UOM_RELATION_PER_PIECE_WEIGHT = 'per_piece_weight'

/** 可作为长度类库存单位（与下料尺寸 mm/cm/m 同量纲，可填写下料尺寸） */
export const LENGTH_STOCK_UNIT_NAMES = ['米', 'm', 'M', '厘米', 'cm', 'CM', '毫米', 'mm', 'MM']

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

/** 从物料档案解析双单位相关字段（带默认） */
export function resolveVariableLengthFields(item = {}) {
  const isVL = Boolean(item.isVariableLength)
  const stockUnit = item.stockUnit || item.inventoryUnit || (isVL ? '米' : '件')
  const weightBased = isWeightStockUnit(stockUnit)
  return {
    isVariableLength: isVL,
    stockUnit,
    purchaseUnit: item.purchaseUnit || (isVL ? '根' : item.inventoryUnit || '件'),
    barcodeType: item.barcodeType || '一批一码',
    uomRelation:
      item.uomRelation ||
      (isVL ? (weightBased ? UOM_RELATION_PER_PIECE_WEIGHT : UOM_RELATION_PER_PIECE_LENGTH) : ''),
    material: item.material || '',
  }
}

/** 双单位入库填写方式；一物一码不提供「直接填合计」 */
export function getInboundEntryModeOptions(barcodeType) {
  const opts = [
    { label: '统一单件数量', value: INBOUND_ENTRY_MODE.UNIFORM },
    { label: '逐件数量（可不同）', value: INBOUND_ENTRY_MODE.PIECE },
  ]
  if (allowsInboundTotalEntry(barcodeType)) {
    opts.push({ label: '直接填合计', value: INBOUND_ENTRY_MODE.TOTAL })
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
  const v = Number(line.uniformValue ?? line.uniformLength ?? line.uniformWeight)
  return Number.isFinite(v) ? v : NaN
}

function resolvePieceValues(line) {
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
 * 双单位 BOM 行：需求米数
 * demandMeters = blankLength × unitQty × scheduleQty × (1 + lossRate)
 */
export function calcDemandMeters({ blankLength, unitQty = 1, scheduleQty = 1, blankLossRate = 0 }) {
  const len = Number(blankLength) || 0
  const uq = Number(unitQty) || 1
  const sq = Number(scheduleQty) || 1
  const loss = Number(blankLossRate) || 0
  if (len <= 0) return 0
  return roundMeters(len * uq * sq * (1 + loss / 100))
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
      return { ok: false, message: `请填写单件数量（${stockLabel || '库存单位'}）` }
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
        message: `须录入 ${roots} 条单件数量，当前 ${pieceValues.length} 条`,
      }
    }
    if (pieceValues.some((v) => !Number.isFinite(v) || v <= 0)) {
      return { ok: false, message: '每条单件数量须大于 0' }
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
      return { ok: false, message: `请填写合计数量（${stockLabel || '库存单位'}）` }
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
  line.uniformValue = resolveUniformValue(line)
  line.qty = expanded.qty
  line.stockQty = expanded.qty
  return { ok: true }
}
