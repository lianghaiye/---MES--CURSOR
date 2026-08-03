import { createInboundLine } from '@/mock/inboundOrders'
import { getOwnActiveBomForItem } from '@/store/productBomStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getStockQty, stockState } from '@/store/stockStore'
import { demoStockQty } from '@/utils/productionPlanWorkItem'
import {
  INBOUND_ENTRY_MODE,
  allowsInboundTotalEntry,
  calcAreaSquareMeters,
  coerceInboundEntryMode,
  inferDualUnitMeasureMode,
  isAreaBasedDualUnit,
  resolveVariableLengthFields,
} from '@/utils/variableLengthMaterial'

function roundQty(val) {
  return Math.round((Number(val) || 0) * 1000) / 1000
}

function roundMoney(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

export function findMaterialByCode(itemCode) {
  if (!itemCode) return null
  return materialInfoState.materials.find((m) => m.code === itemCode) || null
}

/** 是否双物料单位行 */
export function isInboundDualUnitLine(line = {}, material = null) {
  const mat = material || findMaterialByCode(line.itemCode)
  return Boolean(line.isVariableLength || mat?.isVariableLength)
}

/** 入库数量对应单位（双单位=采购单位，单单位=库存单位） */
export function resolveInboundQtyUnit(line = {}, material = null) {
  const mat = material || findMaterialByCode(line.itemCode)
  if (isInboundDualUnitLine(line, mat)) {
    return line.purchaseUnit || mat?.purchaseUnit || '件'
  }
  return line.unit || mat?.inventoryUnit || mat?.stockUnit || '件'
}

/** 库存单位展示 */
export function resolveInboundStockUnit(line = {}, material = null) {
  const mat = material || findMaterialByCode(line.itemCode)
  if (isInboundDualUnitLine(line, mat)) {
    return line.stockUnit || line.unit || mat?.stockUnit || mat?.inventoryUnit || '米'
  }
  return line.unit || mat?.inventoryUnit || mat?.stockUnit || '件'
}

/** 入库数量（双单位取采购件数） */
export function getInboundQtyValue(line = {}) {
  if (isInboundDualUnitLine(line)) return line.purchaseQty
  return line.qty
}

/** 库存单位量（双单位：按填写方式取合计；单单位同入库数量） */
export function getStockUnitQtyValue(line = {}) {
  if (!isInboundDualUnitLine(line)) return line.qty
  const mode = coerceInboundEntryMode(line.inboundEntryMode, line.barcodeType)
  if (mode === INBOUND_ENTRY_MODE.UNIFORM) {
    let per = Number(line.uniformValue ?? line.uniformLength ?? line.uniformWeight)
    if (!(per > 0) && isAreaBasedDualUnit(line)) {
      per =
        calcAreaSquareMeters(
          line.uniformLength ?? line.uniformDimLength,
          line.uniformWidth ?? line.uniformDimWidth,
          line.dimUnit || line.uniformDimUnit,
        ) || 0
    }
    const n = Number(line.purchaseQty)
    if (Number.isFinite(per) && per > 0 && Number.isFinite(n) && n > 0) {
      return Math.round(per * n * 10000) / 10000
    }
  }
  if (mode === INBOUND_ENTRY_MODE.PIECE) {
    if (isAreaBasedDualUnit(line) && Array.isArray(line.pieceDims) && line.pieceDims.length) {
      const sum = line.pieceDims.reduce((s, d) => {
        const area = calcAreaSquareMeters(d?.length, d?.width, d?.unit || line.dimUnit)
        return s + (area || 0)
      }, 0)
      if (sum > 0) return Math.round(sum * 10000) / 10000
    }
    const pieces = line.pieceValues || line.pieceLengths || line.pieceWeights || []
    if (pieces.length) {
      const sum = pieces.reduce((s, v) => s + (Number(v) || 0), 0)
      return Math.round(sum * 10000) / 10000
    }
  }
  const v = line.totalValue ?? line.qty
  return v == null || v === '' ? null : v
}

/** 统一单件数量（一物一码列表可直接填）；板材优先用长×宽换算面积 */
export function getUniformPieceValue(line = {}) {
  if (isAreaBasedDualUnit(line)) {
    const fromDims = calcAreaSquareMeters(
      line.uniformLength ?? line.uniformDimLength,
      line.uniformWidth ?? line.uniformDimWidth,
      line.dimUnit || line.uniformDimUnit,
    )
    if (fromDims != null && fromDims > 0) return fromDims
  }
  const v = line.uniformValue ?? line.uniformLength ?? line.uniformWeight
  return v == null || v === '' ? null : v
}

/** 按物料档案写入双单位相关字段 */
export function applyDualUnitFieldsToInboundLine(line = {}, itemCode = '') {
  const code = itemCode || line.itemCode
  const mat = findMaterialByCode(code)
  if (!mat) {
    line.stockUnit = line.unit || '件'
    return line
  }
  const vl = resolveVariableLengthFields(mat)
  line.barcodeType = mat.barcodeType || vl.barcodeType || line.barcodeType || '一批一码'
  if (vl.isVariableLength) {
    line.isVariableLength = true
    line.purchaseUnit = vl.purchaseUnit
    line.stockUnit = vl.stockUnit
    line.unit = vl.stockUnit
    line.uomRelation = vl.uomRelation
    // 计量形态：已选手动值保留；否则按库存单位推断（㎡ → 板材）
    if (!line.inboundMeasureMode) {
      line.inboundMeasureMode = inferDualUnitMeasureMode({
        ...line,
        isVariableLength: true,
        stockUnit: vl.stockUnit,
        uomRelation: vl.uomRelation,
      })
    }
    if (!line.dimUnit && isAreaBasedDualUnit(line)) {
      line.dimUnit = 'mm'
    }
    const defaultMode = allowsInboundTotalEntry(line.barcodeType)
      ? INBOUND_ENTRY_MODE.TOTAL
      : INBOUND_ENTRY_MODE.UNIFORM
    line.inboundEntryMode = coerceInboundEntryMode(
      line.inboundEntryMode || defaultMode,
      line.barcodeType,
    )
    if (line.purchaseQty == null || line.purchaseQty === '') {
      line.purchaseQty = 1
    }
    if (allowsInboundTotalEntry(line.barcodeType) && line.totalValue == null && line.qty != null) {
      line.totalValue = line.qty
    }
  } else {
    line.isVariableLength = false
    line.purchaseUnit = mat.inventoryUnit || line.unit || '件'
    line.stockUnit = mat.inventoryUnit || line.unit || '件'
    line.unit = line.stockUnit
    line.inboundEntryMode = undefined
    line.purchaseQty = undefined
    line.totalValue = undefined
  }
  return line
}

export function calcInboundLineTotalPrice(line = {}) {
  const qty = Number(getStockUnitQtyValue(line)) || 0
  const price = Number(line.unitPrice) || 0
  return roundMoney(qty * price)
}

export function enrichInboundLinePricing(line = {}) {
  return { totalPrice: calcInboundLineTotalPrice(line) }
}

export function syncInboundLineTotalFromUnit(line) {
  line.totalPrice = calcInboundLineTotalPrice(line)
}

export function syncInboundLineUnitFromTotal(line) {
  const qty = Number(getStockUnitQtyValue(line)) || 0
  if (qty <= 0) return
  line.unitPrice = roundMoney((Number(line.totalPrice) || 0) / qty)
}

export function getTotalStockQty(itemCode) {
  if (!itemCode) return 0
  void stockState.records
  const total = stockState.records
    .filter((r) => r.itemCode === itemCode)
    .reduce((sum, r) => sum + (Number(r.qty) || 0), 0)
  if (total > 0) return roundQty(total)
  return roundQty(demoStockQty(10, String(itemCode).length))
}

export function getWarehouseStockQty(warehouse, itemCode) {
  if (!warehouse || !itemCode) return 0
  void stockState.records
  const qty = getStockQty(warehouse, itemCode)
  if (qty > 0) return roundQty(qty)
  return roundQty(demoStockQty(5, String(itemCode).length))
}

export function enrichInboundLineStock(line = {}) {
  const itemCode = line.itemCode || ''
  const warehouse = line.warehouse || ''
  return {
    stockQty: getTotalStockQty(itemCode),
    warehouseStockQty: getWarehouseStockQty(warehouse, itemCode),
  }
}

export function enrichInboundLine(line = {}) {
  const next = { ...line }
  applyDualUnitFieldsToInboundLine(next)
  return {
    ...next,
    ...enrichInboundLineStock(next),
    ...enrichInboundLinePricing(next),
  }
}

export function buildInboundLineFromPickerItem(item, defaultWarehouse = '') {
  const line = createInboundLine({
    itemId: item.itemId,
    itemCode: item.code,
    itemName: item.name,
    itemType: item.itemType,
    specAttr: item.productAttribute || item.materialType || '',
    specModel: item.specModel || '',
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    unit: item.inventoryUnit || '件',
    unitPrice: item.unitPrice ?? null,
    qty: 1,
    warehouse: defaultWarehouse || '',
    isSpuLine: item.isSpuLine === true,
    spuId: item.spuId || '',
    spuName: item.spuName || '',
    productId: item.productId || item.itemId || '',
    variantValues: item.variantValues ? { ...item.variantValues } : {},
    variantSummary: item.variantSummary || '',
  })
  return enrichInboundLine(line)
}

export function buildInboundLinesFromBom(
  pickerRow,
  inboundQty = 1,
  defaultWarehouse = '',
  includeTopItem = false,
) {
  const storeType = pickerRow.itemType === '产品' ? 'product' : 'material'
  const bom = getOwnActiveBomForItem(storeType, pickerRow.itemId)
  if (!bom?.lineItems?.length) return []

  const qty = Number(inboundQty) || 1
  const map = new Map()

  const pushLine = (partial, lineQty) => {
    const code = partial.itemCode
    if (!code) return
    const lineQtyVal = roundQty(lineQty)
    if (map.has(code)) {
      const hit = map.get(code)
      hit.qty = roundQty(hit.qty + lineQtyVal)
      Object.assign(hit, enrichInboundLinePricing(hit))
      return
    }
    const line = enrichInboundLine(
      createInboundLine({
        ...partial,
        qty: lineQtyVal || 1,
        sourceDocNo: partial.sourceDocNo || bom.bomNo || bom.bomName || '',
      }),
    )
    map.set(code, line)
  }

  if (includeTopItem) {
    pushLine(
      buildInboundLineFromPickerItem(
        {
          itemId: pickerRow.itemId,
          itemType: pickerRow.itemType,
          code: pickerRow.code,
          name: pickerRow.name,
          specModel: pickerRow.specModel,
          material: pickerRow.material,
          drawingNo: pickerRow.drawingNo,
          inventoryUnit: pickerRow.inventoryUnit || '件',
          unitPrice: pickerRow.unitPrice,
        },
        defaultWarehouse,
      ),
      qty,
    )
  }

  bom.lineItems.forEach((line, index) => {
    const code = line.materialCode || line.itemCode || ''
    pushLine(
      createInboundLine({
        itemCode: code,
        itemName: line.itemName || line.materialName || '',
        itemType: line.itemType || '物料',
        specModel: line.specModel || '',
        specAttr: line.specAttr || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        unit: line.unit || '件',
        unitPrice: line.unitPrice ?? null,
        warehouse: defaultWarehouse || '',
      }),
      (Number(line.unitQty) || 0) * qty || demoStockQty(1, index),
    )
  })

  return [...map.values()]
}

export function mergeInboundLines(existing = [], incoming = []) {
  const result = existing.map((l) => ({ ...l }))
  incoming.forEach((line) => {
    const code = line.itemCode
    if (!code) {
      result.push(enrichInboundLine({ ...line }))
      return
    }
    const hit = result.find((l) => l.itemCode === code)
    if (hit) {
      hit.qty = roundQty((Number(hit.qty) || 0) + (Number(line.qty) || 0))
      if (!hit.sourceDocNo && line.sourceDocNo) hit.sourceDocNo = line.sourceDocNo
      Object.assign(hit, enrichInboundLinePricing(hit))
      return
    }
    result.push(enrichInboundLine({ ...line }))
  })
  return result
}

export function createBlankInboundLine(defaultWarehouse = '') {
  return enrichInboundLine(
    createInboundLine({
      itemCode: '',
      itemName: '',
      qty: 1,
      warehouse: defaultWarehouse || '',
    }),
  )
}

export function applyPickerItemToInboundLine(line, item, defaultWarehouse = '') {
  const normalized = {
    itemId: item.itemId ?? item.id,
    itemType: item.itemType,
    code: item.code,
    name: item.name,
    specModel: item.specModel,
    material: item.material,
    drawingNo: item.drawingNo,
    inventoryUnit: item.inventoryUnit,
    unitPrice: item.unitPrice,
    productAttribute: item.productAttribute || item.materialType,
    materialType: item.materialType,
    isSpuLine: item.isSpuLine === true,
    spuId: item.spuId || '',
    spuName: item.spuName || '',
    productId: item.productId || '',
    variantValues: item.variantValues ? { ...item.variantValues } : {},
    variantSummary: item.variantSummary || '',
  }
  const fresh = buildInboundLineFromPickerItem(normalized, line.warehouse || defaultWarehouse || '')
  return enrichInboundLine({
    ...line,
    itemId: fresh.itemId,
    itemCode: fresh.itemCode,
    itemName: fresh.itemName,
    itemType: fresh.itemType,
    specAttr: fresh.specAttr,
    specModel: fresh.specModel,
    material: fresh.material,
    drawingNo: fresh.drawingNo,
    unit: fresh.unit,
    unitPrice: fresh.unitPrice ?? line.unitPrice,
    stockQty: fresh.stockQty,
    warehouseStockQty: fresh.warehouseStockQty,
    isSpuLine: fresh.isSpuLine,
    spuId: fresh.spuId,
    spuName: fresh.spuName,
    productId: fresh.productId,
    variantValues: fresh.variantValues ? { ...fresh.variantValues } : {},
    variantSummary: fresh.variantSummary || '',
    totalPrice: calcInboundLineTotalPrice({
      ...line,
      unitPrice: fresh.unitPrice ?? line.unitPrice,
    }),
  })
}

export function cloneInboundLine(line) {
  return enrichInboundLine(
    createInboundLine({
      ...line,
      id: undefined,
    }),
  )
}
