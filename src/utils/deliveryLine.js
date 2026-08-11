import { isWholeMachineLine, isScatterLine, normalizeDeliveryMode } from '@/utils/salesDeliveryMode'
import { calcSalesLineAppliedShipQty, calcSalesLineShippedQty } from '@/utils/salesLineShipped'
import { enrichOutboundLineStock } from '@/utils/outboundLineHelpers'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { findSpuById } from '@/store/spuStore'
import { formatVariantSummary } from '@/utils/spuVariant'
import { formatNumber, roundNumber } from '@/utils/numberFormat'

export { roundNumber as roundDeliveryDecimal, formatNumber as formatDeliveryDecimal }

function roundDeliveryDecimal(val, maxDecimals = 4) {
  const n = roundNumber(val, maxDecimals)
  return Number.isFinite(n) ? n : 0
}

/** 展示 SKU 变体属性：优先行内摘要，其次主数据 variantValues，否则规格属性 */
export function resolveDeliveryVariantAttr(line = {}) {
  if (line.variantSummary) return String(line.variantSummary)

  const master =
    (line.productId && productInfoState.products.find((p) => p.id === line.productId)) ||
    (line.productCode && productInfoState.products.find((p) => p.code === line.productCode)) ||
    (line.productId && materialInfoState.materials.find((m) => m.id === line.productId)) ||
    (line.productCode && materialInfoState.materials.find((m) => m.code === line.productCode)) ||
    null

  const variantValues = line.variantValues || master?.variantValues || {}
  const spuId = line.spuId || master?.spuId
  const axes = spuId ? findSpuById(spuId)?.variantAxes || [] : []
  const summary = formatVariantSummary(variantValues, axes)
  if (summary) return summary

  return line.specAttr || master?.standardSpec || ''
}

/** 行级发货状态：已发完仅看「已确认出库 ≥ 订单」；有占用但未出满为部分发货 */
export function calcLineShipStatus(confirmedOutboundQty, orderQty, occupiedQty) {
  const confirmed = Number(confirmedOutboundQty) || 0
  const order = Number(orderQty) || 0
  const occupied = occupiedQty != null ? Number(occupiedQty) || 0 : confirmed
  if (order > 0 && confirmed >= order - 1e-9) return '已发完'
  if (confirmed > 0 || occupied > 0) return '部分发货'
  return '未发货'
}

export function lineShipStatusColor(status) {
  const map = {
    未发货: 'default',
    部分发货: 'processing',
    已发完: 'success',
  }
  return map[status] || 'default'
}

/** @deprecated 使用 formatDeliveryDecimal */
export function formatDeliveryQtyInt(val) {
  return formatNumber(val, 4, { empty: '-' })
}

/**
 * 发货进度：已确认出库数量 / 已占用数量（待出库申请+实际出库） / 订单数量
 */
export function formatShipProgress(confirmedOutboundQty, appliedShipQty, orderQty) {
  return `${formatNumber(confirmedOutboundQty, 4, { empty: '-' })} / ${formatNumber(appliedShipQty, 4, { empty: '-' })} / ${formatNumber(orderQty, 4, { empty: '-' })}`
}

export const SHIP_PROGRESS_TOOLTIP =
  '格式：已确认出库数量 / 已占用数量（待出库按申请量占用，已出库按实际量占用） / 订单数量'

/**
 * 是否锁定不可再申请：
 * - 待出库申请已占满订单额度 → 锁定
 * - 已确认出库已达订单数量 → 锁定
 * - 实际出库 < 订单，且无待出库占用差额 → 不锁定，可再次申请
 */
export function isDeliveryLineShipLocked(line) {
  if (!line) return false
  if (line.shipLocked === true) return true
  const orderQty = Number(line.orderQty ?? line.salesQty ?? line.qty) || 0
  const remain =
    line.remainShipQty != null
      ? Number(line.remainShipQty)
      : Math.max(
          0,
          orderQty - Number(line.appliedShipQty ?? line.occupiedShipQty ?? line.shippedQty ?? 0),
        )
  return orderQty > 0 && remain <= 1e-9
}

function buildDeliveryLineBase(line, order) {
  const orderQty = roundDeliveryDecimal(Number(line.salesQty ?? line.qty ?? 0), 4)
  const confirmedOutboundQty = roundDeliveryDecimal(calcSalesLineShippedQty(order, line), 4)
  const appliedShipQty = roundDeliveryDecimal(calcSalesLineAppliedShipQty(order, line), 4)
  const shippedQty = confirmedOutboundQty
  const remainShipQty = Math.max(0, orderQty - appliedShipQty)
  const shipLocked = remainShipQty <= 1e-9 && orderQty > 0
  const unitPriceExTax = roundDeliveryDecimal(Number(line.unitPriceExTax ?? 0), 4)
  const unitPriceInTax = roundDeliveryDecimal(Number(line.unitPriceInTax ?? 0), 4)
  const shipQty = shipLocked ? 0 : remainShipQty
  const shipWeight = roundDeliveryDecimal(Number(line.shipWeight ?? line.itemWeightKg ?? 0), 4)

  return {
    ...JSON.parse(JSON.stringify(line)),
    orderQty,
    shippedQty,
    confirmedOutboundQty,
    appliedShipQty,
    occupiedShipQty: appliedShipQty,
    remainShipQty,
    shipLocked,
    lineShipStatus: calcLineShipStatus(confirmedOutboundQty, orderQty, appliedShipQty),
    unitPriceExTax,
    unitPriceInTax,
    drawingNo: line.drawingNo || '',
    shipQty,
    shipWeight,
    deliveryUnitPriceExTax: unitPriceExTax,
    deliveryAmountExTax: calcDeliveryAmount(shipQty, unitPriceExTax),
    deliveryMode: normalizeDeliveryMode(line, order),
    packagingForm: line.packagingForm || '',
    lineRemark: line.lineRemark || '',
    shipWarehouse: line.shipWarehouse || '',
    stockQty: line.stockQty ?? null,
    warehouseStockQty: line.warehouseStockQty ?? null,
    variantAttr: resolveDeliveryVariantAttr(line),
  }
}

/** 刷新发货明细行库存（与出库明细一致） */
export function refreshDeliveryLineStock(line) {
  if (!line) return line
  const stock = enrichOutboundLineStock({
    itemCode: line.productCode || line.itemCode || '',
    shipWarehouse: line.shipWarehouse || '',
  })
  line.stockQty = stock.stockQty
  line.warehouseStockQty = stock.warehouseStockQty
  return line
}

/** 将销售订单明细转为申请发货明细行（仅整机行） */
export function mapSalesLineToDeliveryLine(line, order) {
  if (order && !isWholeMachineLine(line, order)) return null
  return buildDeliveryLineBase(line, order)
}

/** 散件发运产品行展示（字段与整机一致，不含本次发货数量列） */
export function mapScatterShipDisplayLine(line, order) {
  if (order && !isScatterLine(line, order)) return null
  const base = buildDeliveryLineBase(line, order)
  return {
    ...base,
    id: line.id,
    salesLineId: line.id,
  }
}

export function calcDeliveryAmount(shipQty, unitPriceExTax) {
  return roundDeliveryDecimal((Number(shipQty) || 0) * (Number(unitPriceExTax) || 0), 4)
}

export function recalcDeliveryLine(line) {
  line.shipQty = roundDeliveryDecimal(line.shipQty, 4)
  line.shipWeight = roundDeliveryDecimal(line.shipWeight, 4)
  line.deliveryUnitPriceExTax = roundDeliveryDecimal(line.deliveryUnitPriceExTax, 4)
  line.deliveryAmountExTax = calcDeliveryAmount(line.shipQty, line.deliveryUnitPriceExTax)
}

export function formatDeliveryQty(val) {
  return formatNumber(val, 4, { empty: '-' })
}

export function formatDeliveryPrice(val) {
  return formatNumber(val, 4, { empty: '-' })
}

export function formatDeliveryWeight(val) {
  return formatNumber(val, 4, { empty: '-' })
}

/** InputNumber：展示去尾 0，录入按数字解析 */
export function deliveryDecimalFormatter(value) {
  if (value === undefined || value === null || value === '') return ''
  return formatNumber(value, 4, { empty: '' })
}

export function deliveryDecimalParser(value) {
  const raw = String(value ?? '').replace(/[^\d.-]/g, '')
  if (raw === '' || raw === '-' || raw === '.') return raw
  return raw
}
