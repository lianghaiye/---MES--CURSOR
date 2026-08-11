import { findMasterItemByCode } from '@/utils/stockAlertDisplay'
import { calcWxLineReceivedQty } from '@/utils/outsourcingInbound'
import { createOutsourcingReturnLine } from '@/mock/outsourcingReturns'
import { formatNumber } from '@/utils/numberFormat'

function uniqUnits(units = []) {
  return [...new Set(units.map((u) => String(u || '').trim()).filter(Boolean))]
}

/** 单单位默认库存单位；双单位默认采购单位 */
export function resolveReturnUnitDefaults(productCode, wxLine = {}) {
  const hit = findMasterItemByCode(productCode || wxLine.productCode || wxLine.itemCode)
  const item = hit?.item
  const inventoryUnit =
    item?.inventoryUnit || item?.stockUnit || wxLine.unit || wxLine.purchaseUnit || '个'
  const purchaseUnit = item?.purchaseUnit || wxLine.purchaseUnit || wxLine.unit || inventoryUnit
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

export function mapWxLineToReturnLine(order, wxLine) {
  const productCode = wxLine.productCode || wxLine.itemCode || ''
  const productName = wxLine.productName || wxLine.itemName || ''
  const { defaultUnit, unitOptions, purchaseUnit } = resolveReturnUnitDefaults(productCode, wxLine)
  const receivedQty = calcWxLineReceivedQty(order, wxLine)
  return createOutsourcingReturnLine({
    wxLineId: wxLine.id,
    productName,
    productCode,
    specModel: wxLine.specModel || '',
    variantSummary: wxLine.variantSummary || wxLine.specAttr || '',
    material: wxLine.material || '',
    drawingNo: wxLine.drawingNo || '',
    planQty: Number(wxLine.planQty) || 0,
    purchaseUnit: purchaseUnit || wxLine.unit || '',
    receivedQty,
    returnQty: 0,
    unit: defaultUnit,
    unitOptions,
    shipWarehouse: '',
    returnType: '返工',
    compensationMethod: '',
    compensationAmount: null,
    remark: '',
  })
}

export function buildReturnLinesFromOutsourcingOrder(order) {
  if (!order) return []
  return (order.lineItems || []).map((line) => mapWxLineToReturnLine(order, line))
}
