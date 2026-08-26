/**
 * 批次换算记录：入库过磅实填沉淀到库存批次（不进主数据）
 * 主数据「按批次覆盖」仅声明规则；批次单重看库存明细 · 批次明细。
 *
 * 注意：本文件不 import settleUnit / stockBatchStore，避免
 * settleUnit → stockBatchStore → batchUomConvert → settleUnit 循环依赖导致白屏。
 */

import { roundNumber } from '@/utils/numberFormat'

/**
 * @typedef {object} BatchUomConvert
 * @property {'batch'|'fixed'} convertType
 * @property {number} pieceCount 本批件数/张数（采购点货量）
 * @property {number} settleQty 过磅/结算总重
 * @property {string} settleUnit
 * @property {number} actualUnitWeight 批次单重 = settleQty / pieceCount
 * @property {number|null} standardUnitWeight 主数据默认换算率（预估）
 * @property {number|null} stockQty 本批入库库存量
 * @property {string} stockUnit
 */

function lineSettleUnit(line = {}) {
  return String(line?.settleUnit || '').trim()
}

function lineStandardUnitWeight(line = {}) {
  const n = Number(line?.standardUnitWeight)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * 由入库行结算字段生成整行换算快照（再按批分摊）
 * @returns {BatchUomConvert|null}
 */
export function buildLineUomConvert(line = {}) {
  const settleUnit = lineSettleUnit(line)
  if (!settleUnit) return null
  const settleQty = Number(line.settleQty)
  if (!(settleQty > 0)) return null

  const pieceCount =
    Number(line.purchaseQty) > 0
      ? Number(line.purchaseQty)
      : Number(line.qty) > 0
        ? Number(line.qty)
        : 0
  if (!(pieceCount > 0)) return null

  const stockQty =
    Number(line.stockQty ?? line.qty) > 0 ? Number(line.stockQty ?? line.qty) : pieceCount

  return buildBatchUomConvert({
    convertType: 'batch',
    settleUnit,
    settleQty,
    standardUnitWeight: lineStandardUnitWeight(line) ?? line.standardUnitWeight,
    pieceCount,
    stockQty,
    stockUnit: line.unit || line.stockUnit || '',
  })
}

/**
 * @returns {BatchUomConvert|null}
 */
export function buildBatchUomConvert({
  convertType = 'batch',
  settleUnit,
  settleQty,
  standardUnitWeight,
  pieceCount,
  stockQty,
  stockUnit = '',
} = {}) {
  const unit = String(settleUnit || '').trim()
  const total = Number(settleQty)
  const pieces = Number(pieceCount)
  if (!unit || !(total > 0) || !(pieces > 0)) return null

  const actualUnitWeight = roundNumber(total / pieces, 4)
  const std = Number(standardUnitWeight)
  const hasStd = Number.isFinite(std) && std > 0

  return {
    convertType: convertType === 'fixed' ? 'fixed' : 'batch',
    pieceCount: roundNumber(pieces, 4),
    settleQty: roundNumber(total, 4),
    settleUnit: unit,
    actualUnitWeight,
    standardUnitWeight: hasStd ? roundNumber(std, 4) : null,
    stockQty: Number(stockQty) > 0 ? roundNumber(Number(stockQty), 4) : null,
    stockUnit: String(stockUnit || '').trim(),
  }
}

/**
 * 一行多批时按库存量占比分摊过磅总重与件数
 * @returns {BatchUomConvert|null}
 */
export function allocateBatchUomConvert(lineConvert, batchStockQty, lineStockTotal) {
  if (!lineConvert) return null
  const total = Number(lineStockTotal) || 0
  const part = Number(batchStockQty) || 0
  if (!(part > 0)) return null
  if (!(total > 0) || Math.abs(part - total) < 1e-9) {
    return buildBatchUomConvert({
      ...lineConvert,
      stockQty: part,
      pieceCount: lineConvert.pieceCount,
      settleQty: lineConvert.settleQty,
    })
  }
  const ratio = part / total
  return buildBatchUomConvert({
    ...lineConvert,
    settleQty: lineConvert.settleQty * ratio,
    pieceCount: lineConvert.pieceCount * ratio,
    stockQty: part,
  })
}

export function hasBatchUomConvert(batch) {
  const c = batch?.uomConvert
  return Boolean(c && Number(c.settleQty) > 0 && c.settleUnit)
}
