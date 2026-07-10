import { createOutboundLine } from '@/mock/outboundOrders'
import { getActiveBomForItem } from '@/store/productBomStore'
import { getStockQty, stockState } from '@/store/stockStore'
import { demoStockQty } from '@/utils/productionPlanWorkItem'

function roundQty(val) {
  return Math.round((Number(val) || 0) * 1000) / 1000
}

function roundMoney(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

export function calcLineTotalPrice(line = {}) {
  const qty = Number(line.shipQty) || 0
  const price = Number(line.unitPrice) || 0
  return roundMoney(qty * price)
}

export function calcLineCostAmount(line = {}) {
  const qty = Number(line.shipQty) || 0
  const costUnit = Number(line.costUnitPrice ?? line.unitPrice) || 0
  return roundMoney(qty * costUnit)
}

export function enrichOutboundLinePricing(line = {}) {
  const totalPrice = calcLineTotalPrice(line)
  const costUnitPrice =
    line.costUnitPrice != null && line.costUnitPrice !== ''
      ? roundMoney(line.costUnitPrice)
      : line.unitPrice != null
        ? roundMoney(line.unitPrice)
        : null
  const costAmount =
    line.costAmount != null && line.costAmount !== ''
      ? roundMoney(line.costAmount)
      : costUnitPrice != null
        ? roundMoney((Number(line.shipQty) || 0) * costUnitPrice)
        : null
  return { totalPrice, costUnitPrice, costAmount }
}

export function syncLineTotalFromUnit(line) {
  line.totalPrice = calcLineTotalPrice(line)
}

export function syncLineUnitFromTotal(line) {
  const qty = Number(line.shipQty) || 0
  if (qty <= 0) return
  line.unitPrice = roundMoney((Number(line.totalPrice) || 0) / qty)
}

export function syncLineCostFromUnit(line) {
  line.costAmount = calcLineCostAmount(line)
}

export function syncLineCostUnitFromAmount(line) {
  const qty = Number(line.shipQty) || 0
  if (qty <= 0) return
  line.costUnitPrice = roundMoney((Number(line.costAmount) || 0) / qty)
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

/** 根据仓库与物品编码解析货位号（只读展示） */
export function resolveOutboundLocationNo(warehouse, itemCode) {
  if (!warehouse || !itemCode) return ''
  const seed = `${warehouse}::${itemCode}`
  const zones = ['A', 'B', 'C', 'D', 'E']
  const zone = zones[seed.length % zones.length]
  const row = (seed.charCodeAt(0) % 12) + 1
  const col = (seed.charCodeAt(seed.length - 1) % 20) + 1
  return `${zone}-${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}`
}

export function enrichOutboundLineLocation(line = {}) {
  return {
    locationNo: resolveOutboundLocationNo(line.shipWarehouse, line.itemCode),
  }
}

export function enrichOutboundLineStock(line = {}) {
  const itemCode = line.itemCode || ''
  const warehouse = line.shipWarehouse || ''
  return {
    stockQty: getTotalStockQty(itemCode),
    warehouseStockQty: getWarehouseStockQty(warehouse, itemCode),
  }
}

export function enrichOutboundLine(line = {}) {
  return {
    ...line,
    ...enrichOutboundLineStock(line),
    ...enrichOutboundLineLocation(line),
    ...enrichOutboundLinePricing(line),
  }
}

export function buildOutboundLineFromPickerItem(item, defaultWarehouse = '') {
  const line = createOutboundLine({
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
    shipQty: 1,
    shipWarehouse: defaultWarehouse || '',
    sourceDocNo: '',
  })
  return enrichOutboundLine(line)
}

/** 按 BOM 添加：展开子件明细；includeTopItem=false 时不带入顶级物品 */
export function buildOutboundLinesFromBom(
  pickerRow,
  outboundQty = 1,
  defaultWarehouse = '',
  includeTopItem = true,
) {
  const storeType = pickerRow.itemType === '产品' ? 'product' : 'material'
  const bom = getActiveBomForItem(storeType, pickerRow.itemId)
  if (!bom?.lineItems?.length) return []

  const qty = Number(outboundQty) || 1
  const map = new Map()

  const pushLine = (partial, lineQty) => {
    const code = partial.itemCode
    if (!code) return
    const shipQty = roundQty(lineQty)
    if (map.has(code)) {
      const hit = map.get(code)
      hit.shipQty = roundQty(hit.shipQty + shipQty)
      Object.assign(hit, enrichOutboundLinePricing(hit))
      return
    }
    const line = enrichOutboundLine(
      createOutboundLine({
        ...partial,
        shipQty: shipQty || 1,
        sourceDocNo: partial.sourceDocNo || bom.bomNo || bom.bomName || '',
      }),
    )
    map.set(code, line)
  }

  if (includeTopItem) {
    pushLine(
      buildOutboundLineFromPickerItem(
        {
          itemId: pickerRow.itemId,
          itemType: pickerRow.itemType,
          code: pickerRow.code,
          name: pickerRow.name,
          specModel: pickerRow.specModel,
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
      createOutboundLine({
        itemCode: code,
        itemName: line.itemName || line.materialName || '',
        itemType: line.itemType || '物料',
        specModel: line.specModel || '',
        specAttr: line.specAttr || '',
        unit: line.unit || '件',
        unitPrice: line.unitPrice ?? null,
        shipWarehouse: defaultWarehouse || '',
      }),
      (Number(line.unitQty) || 0) * qty || demoStockQty(1, index),
    )
  })

  return [...map.values()]
}

export function mergeOutboundLines(existing = [], incoming = []) {
  const result = existing.map((l) => ({ ...l }))
  incoming.forEach((line) => {
    const code = line.itemCode
    if (!code) {
      result.push(enrichOutboundLine({ ...line }))
      return
    }
    const hit = result.find((l) => l.itemCode === code)
    if (hit) {
      hit.shipQty = roundQty((Number(hit.shipQty) || 0) + (Number(line.shipQty) || 0))
      if (!hit.sourceDocNo && line.sourceDocNo) hit.sourceDocNo = line.sourceDocNo
      Object.assign(hit, enrichOutboundLinePricing(hit))
      return
    }
    result.push(enrichOutboundLine({ ...line }))
  })
  return result
}

export function createBlankOutboundLine(defaultWarehouse = '') {
  return enrichOutboundLine(
    createOutboundLine({
      itemCode: '',
      itemName: '',
      shipQty: 1,
      shipWarehouse: defaultWarehouse || '',
    }),
  )
}

export function applyPickerItemToOutboundLine(line, item, defaultWarehouse = '') {
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
  }
  const fresh = buildOutboundLineFromPickerItem(
    normalized,
    line.shipWarehouse || defaultWarehouse || '',
  )
  return enrichOutboundLine({
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
    totalPrice: calcLineTotalPrice({ ...line, unitPrice: fresh.unitPrice ?? line.unitPrice }),
  })
}

export function cloneOutboundLine(line) {
  return enrichOutboundLine(
    createOutboundLine({
      ...line,
      id: undefined,
    }),
  )
}
