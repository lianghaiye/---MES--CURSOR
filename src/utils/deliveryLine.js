import { isWholeMachineLine, isScatterLine, normalizeDeliveryMode } from '@/utils/salesDeliveryMode'
import { calcSalesLineAppliedShipQty, calcSalesLineShippedQty } from '@/utils/salesLineShipped'

/** 行级发货状态：未发货、部分发货、已发完 */
export function calcLineShipStatus(shippedQty, orderQty) {
  const shipped = Number(shippedQty) || 0
  const order = Number(orderQty) || 0
  if (order <= 0 || shipped <= 0) return '未发货'
  if (shipped >= order - 1e-9) return '已发完'
  return '部分发货'
}

export function lineShipStatusColor(status) {
  const map = {
    未发货: 'default',
    部分发货: 'processing',
    已发完: 'success',
  }
  return map[status] || 'default'
}

/** 最多保留 maxDecimals 位小数四舍五入 */
export function roundDeliveryDecimal(val, maxDecimals = 4) {
  const n = Number(val)
  if (!Number.isFinite(n)) return 0
  const factor = 10 ** maxDecimals
  return Math.round(n * factor) / factor
}

/**
 * 数字展示：内部按 maxDecimals 四舍五入；有小数显示有效小数位，无小数不补 0
 */
export function formatDeliveryDecimal(val, maxDecimals = 4) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '-'
  const rounded = roundDeliveryDecimal(n, maxDecimals)
  if (Math.abs(rounded - Math.round(rounded)) < 1e-12) {
    return String(Math.round(rounded))
  }
  let s = rounded.toFixed(maxDecimals)
  s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s
}

/** @deprecated 使用 formatDeliveryDecimal */
export function formatDeliveryQtyInt(val) {
  return formatDeliveryDecimal(val, 4)
}

/**
 * 发货进度：已确认出库数量 / 申请发货数量 / 订单数量
 */
export function formatShipProgress(confirmedOutboundQty, appliedShipQty, orderQty) {
  return `${formatDeliveryDecimal(confirmedOutboundQty, 4)} / ${formatDeliveryDecimal(appliedShipQty, 4)} / ${formatDeliveryDecimal(orderQty, 4)}`
}

export const SHIP_PROGRESS_TOOLTIP = '格式：已确认出库的数量 / 申请发货的数量 / 订单数量'

function buildDeliveryLineBase(line, order) {
  const orderQty = roundDeliveryDecimal(Number(line.salesQty ?? line.qty ?? 0), 4)
  const confirmedOutboundQty = roundDeliveryDecimal(calcSalesLineShippedQty(order, line), 4)
  const appliedShipQty = roundDeliveryDecimal(calcSalesLineAppliedShipQty(order, line), 4)
  const shippedQty = confirmedOutboundQty
  const remain = Math.max(0, orderQty - appliedShipQty)
  const unitPriceExTax = roundDeliveryDecimal(Number(line.unitPriceExTax ?? 0), 4)
  const unitPriceInTax = roundDeliveryDecimal(Number(line.unitPriceInTax ?? 0), 4)
  const shipQty = remain > 0 ? remain : 0
  const shipWeight = roundDeliveryDecimal(Number(line.shipWeight ?? line.itemWeightKg ?? 0), 4)

  return {
    ...JSON.parse(JSON.stringify(line)),
    orderQty,
    shippedQty,
    confirmedOutboundQty,
    appliedShipQty,
    lineShipStatus: calcLineShipStatus(confirmedOutboundQty, orderQty),
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
  }
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
  return formatDeliveryDecimal(val, 4)
}

export function formatDeliveryPrice(val) {
  return formatDeliveryDecimal(val, 4)
}

export function formatDeliveryWeight(val) {
  return formatDeliveryDecimal(val, 4)
}

/** InputNumber：展示去尾 0，录入按数字解析 */
export function deliveryDecimalFormatter(value) {
  if (value === undefined || value === null || value === '') return ''
  return formatDeliveryDecimal(value, 4)
}

export function deliveryDecimalParser(value) {
  const raw = String(value ?? '').replace(/[^\d.-]/g, '')
  if (raw === '' || raw === '-' || raw === '.') return raw
  return raw
}
