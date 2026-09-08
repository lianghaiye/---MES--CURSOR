import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { productInfoState } from '@/store/productInfoStore'
import { getActiveShipBomForProduct, getProductBomById } from '@/store/productBomStore'
import { calcBomMaterialCount } from '@/utils/productBomListEnrich'
import {
  probeShipAttachmentMatch,
  shipAttachmentScopeTypeLabel,
} from '@/utils/shipAttachmentMatchService'

export function isAttachmentSelected(row) {
  return row?.selected !== false
}

export function listDeliveryProductLines(order) {
  const lines = []
  ;(order?.lineItems || []).forEach((l) => {
    if (!l?.productName && !l?.productCode && !l?.productId) return
    lines.push({
      productId: l.productId || '',
      productCode: l.productCode || '',
      productName: l.productName || '',
      specModel: l.specModel || '',
      shipQty: Number(l.shipQty) || 0,
      unit: l.unit || '',
    })
  })
  return lines
}

export function formatDeliveryProductSummary(order) {
  const names = listDeliveryProductLines(order)
    .map((p) => p.productName || p.productCode)
    .filter(Boolean)
  if (!names.length) return '—'
  if (names.length <= 2) return names.join('、')
  return `${names.slice(0, 2).join('、')} 等${names.length}项`
}

export function resolveCatalogProduct({ productId, productCode } = {}) {
  const products = productInfoState.products || []
  const pid = String(productId || '').trim()
  const code = String(productCode || '').trim()
  return (
    (pid && products.find((p) => String(p.id) === pid)) ||
    (code && products.find((p) => String(p.code || '').trim() === code)) ||
    null
  )
}

function kitLinesOf(bom) {
  return (bom?.lineItems || []).map((line) => ({
    id: line.id,
    materialCode: line.materialCode || line.itemCode || '',
    materialName: line.itemName || line.materialName || '',
    specModel: line.specModel || '',
    unit: line.unit || '件',
    unitQty: Number(line.unitQty) || 1,
    remark: line.remark || '',
  }))
}

export function suggestStandardKitsForDelivery(order) {
  const seen = new Set()
  const kits = []
  listDeliveryProductLines(order).forEach((line) => {
    const product = resolveCatalogProduct(line)
    const pid = product?.id || line.productId
    const key = String(pid || line.productCode || line.productName)
    if (!key || seen.has(key)) return
    seen.add(key)
    const bom = pid ? getActiveShipBomForProduct(pid) : null
    kits.push({
      key,
      productId: pid || '',
      productCode: product?.code || line.productCode || '',
      productName: product?.name || line.productName || '',
      shipQty: line.shipQty,
      bom,
      bomId: bom?.id || '',
      bomNo: bom?.bomNo || '',
      bomName: bom?.bomName || '',
      materialCount: calcBomMaterialCount(bom?.lineItems),
      lines: kitLinesOf(bom),
    })
  })
  return kits
}

export function buildDeliveryShipQueryRow(order) {
  const atts = order?.shipAttachments || []
  const selectedRows = atts.filter(isAttachmentSelected)
  return {
    ...order,
    productSummary: formatDeliveryProductSummary(order),
    attachmentTotal: atts.length,
    selectedCount: selectedRows.length,
    selectedRows,
    allRows: atts,
    standardKits: suggestStandardKitsForDelivery(order),
  }
}

export function filterDeliveryShipQueryRows(orders, filters = {}) {
  const f = filters || {}
  const kwCode = String(f.deliveryCode || '').trim()
  const kwProduct = String(f.productKeyword || '')
    .trim()
    .toLowerCase()
  return (orders || []).filter((row) => {
    if (kwCode && !String(row.deliveryCode || '').includes(kwCode)) return false
    if (f.customerName && row.customerName !== f.customerName) return false
    if (f.deliveryStatus && row.deliveryStatus !== f.deliveryStatus) return false
    if (f.onlyWithAttachments && !(row.shipAttachments || []).some(isAttachmentSelected)) {
      return false
    }
    if (kwProduct) {
      const blob = [
        formatDeliveryProductSummary(row),
        ...(row.lineItems || []).map((l) => `${l.productName || ''} ${l.productCode || ''}`),
        ...(row.shipAttachments || []).map((a) => `${a.productName || ''} ${a.productCode || ''}`),
      ]
        .join(' ')
        .toLowerCase()
      if (!blob.includes(kwProduct)) return false
    }
    return true
  })
}

export function listDeliveryShipQueryRows(filters = {}) {
  void deliveryOrderState.orders
  const rows = (deliveryOrderState.orders || []).map(buildDeliveryShipQueryRow)
  return filterDeliveryShipQueryRows(rows, filters)
}

export function findDeliveriesForProduct({ productId, productCode } = {}) {
  const pid = String(productId || '').trim()
  const code = String(productCode || '').trim()
  if (!pid && !code) return []
  return (deliveryOrderState.orders || [])
    .filter((order) => {
      const onLine = (order.lineItems || []).some(
        (l) =>
          (pid && String(l.productId) === pid) ||
          (code && String(l.productCode || '').trim() === code),
      )
      const onAtt = (order.shipAttachments || []).some(
        (a) =>
          (pid && String(a.productId) === pid) ||
          (code && String(a.productCode || '').trim() === code),
      )
      return onLine || onAtt
    })
    .slice()
    .sort((a, b) =>
      String(b.documentDate || b.createdAt || '').localeCompare(
        String(a.documentDate || a.createdAt || ''),
      ),
    )
}

export function queryShipAttachmentByProduct(params = {}) {
  const product = resolveCatalogProduct(params)
  const probe = probeShipAttachmentMatch({
    itemId: product?.id || params.productId || params.itemId || '',
    itemCode: product?.code || params.productCode || params.itemCode || '',
    categoryCode: product?.categoryCode || params.categoryCode || '',
    categoryKey: product?.categoryKey || params.categoryKey || '',
  })
  const kitBom =
    (product?.id && getActiveShipBomForProduct(product.id)) ||
    (probe.template?.id && getProductBomById(probe.template.id)) ||
    null
  return {
    product,
    probe: {
      ...probe,
      scopeTypeLabel: shipAttachmentScopeTypeLabel(probe.template?.scopeType),
    },
    kit: kitBom
      ? {
          id: kitBom.id,
          bomNo: kitBom.bomNo,
          bomName: kitBom.bomName,
          materialCount: calcBomMaterialCount(kitBom.lineItems),
          lines: kitLinesOf(kitBom),
        }
      : null,
    deliveries: findDeliveriesForProduct({
      productId: product?.id || params.productId,
      productCode: product?.code || params.productCode,
    }).map(buildDeliveryShipQueryRow),
  }
}
