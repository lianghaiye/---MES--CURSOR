import { findMasterItemByCode } from '@/utils/stockAlertDisplay'
import { calcPoLineReceivedQty } from '@/utils/purchaseLineInbound'
import { createPurchaseReturnLine } from '@/mock/purchaseReturns'
import { formatNumber } from '@/utils/numberFormat'

function uniqUnits(units = []) {
  return [...new Set(units.map((u) => String(u || '').trim()).filter(Boolean))]
}

/** 单单位默认库存单位；双单位默认采购单位 */
export function resolveReturnUnitDefaults(productCode, poLine = {}) {
  const hit = findMasterItemByCode(productCode || poLine.productCode || poLine.itemCode)
  const item = hit?.item
  const inventoryUnit =
    item?.inventoryUnit || item?.stockUnit || poLine.unit || poLine.purchaseUnit || '个'
  const purchaseUnit = item?.purchaseUnit || poLine.purchaseUnit || poLine.unit || inventoryUnit
  const dual =
    Boolean(item?.isVariableLength) ||
    (purchaseUnit && inventoryUnit && purchaseUnit !== inventoryUnit)
  const defaultUnit = dual ? purchaseUnit : inventoryUnit
  const unitOptions = dual ? uniqUnits([purchaseUnit, inventoryUnit]) : uniqUnits([inventoryUnit])
  return { defaultUnit, unitOptions, dual, inventoryUnit, purchaseUnit }
}

export function formatQtyWithUnit(qty, unit) {
  const n = Number(qty)
  const qtyText = Number.isFinite(n) ? formatNumber(n, 4, { empty: '0' }) : '0'
  const u = String(unit || '').trim()
  return u ? `${qtyText}${u}` : qtyText
}

export function mapPoLineToReturnLine(po, poLine) {
  const productCode = poLine.productCode || poLine.itemCode || ''
  const productName = poLine.productName || poLine.itemName || ''
  const { defaultUnit, unitOptions, purchaseUnit } = resolveReturnUnitDefaults(productCode, poLine)
  const receivedQty = calcPoLineReceivedQty(po, poLine)
  const warehouse = poLine.receivingWarehouse || po.receivingWarehouse || ''
  return createPurchaseReturnLine({
    poLineId: poLine.id,
    productName,
    productCode,
    specModel: poLine.specModel || '',
    variantSummary: poLine.variantSummary || poLine.specAttr || '',
    material: poLine.material || '',
    drawingNo: poLine.drawingNo || '',
    purchaseQty: Number(poLine.purchaseQty) || 0,
    purchaseUnit: purchaseUnit || poLine.unit || '',
    receivedQty,
    returnQty: 0,
    unit: defaultUnit,
    unitOptions,
    shipWarehouse: warehouse,
    returnType: '退货',
    remark: '',
  })
}

export function buildReturnLinesFromPurchaseOrder(po) {
  if (!po) return []
  return (po.lineItems || []).map((line) => mapPoLineToReturnLine(po, line))
}
