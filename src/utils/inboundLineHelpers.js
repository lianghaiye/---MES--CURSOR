import { createInboundLine } from '@/mock/inboundOrders'
import { getActiveBomForItem } from '@/store/productBomStore'
import { getStockQty, stockState } from '@/store/stockStore'
import { demoStockQty } from '@/utils/productionPlanWorkItem'

function roundQty(val) {
  return Math.round((Number(val) || 0) * 1000) / 1000
}

function roundMoney(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

export function calcInboundLineTotalPrice(line = {}) {
  const qty = Number(line.qty) || 0
  const price = Number(line.unitPrice) || 0
  return roundMoney(qty * price)
}

export function enrichInboundLinePricing(line = {}) {
  const totalPrice =
    line.totalPrice != null && line.totalPrice !== ''
      ? roundMoney(line.totalPrice)
      : calcInboundLineTotalPrice(line)
  return { totalPrice }
}

export function syncInboundLineTotalFromUnit(line) {
  line.totalPrice = calcInboundLineTotalPrice(line)
}

export function syncInboundLineUnitFromTotal(line) {
  const qty = Number(line.qty) || 0
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
  return {
    ...line,
    ...enrichInboundLineStock(line),
    ...enrichInboundLinePricing(line),
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
  const bom = getActiveBomForItem(storeType, pickerRow.itemId)
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
  const map = new Map(existing.map((l) => [l.itemCode, { ...l }]))
  incoming.forEach((line) => {
    const hit = map.get(line.itemCode)
    if (hit) {
      hit.qty = roundQty((Number(hit.qty) || 0) + (Number(line.qty) || 0))
      if (!hit.sourceDocNo && line.sourceDocNo) hit.sourceDocNo = line.sourceDocNo
      Object.assign(hit, enrichInboundLinePricing(hit))
      return
    }
    map.set(line.itemCode, enrichInboundLine({ ...line }))
  })
  return [...map.values()]
}

export function cloneInboundLine(line) {
  return enrichInboundLine(
    createInboundLine({
      ...line,
      id: undefined,
    }),
  )
}
