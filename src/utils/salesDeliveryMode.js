/** 行级交付方式 */
export const DELIVERY_MODE_WHOLE = '整机'
export const DELIVERY_MODE_SCATTER = '散件'

export const deliveryModeOptions = [DELIVERY_MODE_WHOLE, DELIVERY_MODE_SCATTER]

/** 将历史订单头「履约方式」映射为行级交付方式 */
export function normalizeDeliveryMode(line, order) {
  if (line?.deliveryMode === DELIVERY_MODE_WHOLE || line?.deliveryMode === DELIVERY_MODE_SCATTER) {
    return line.deliveryMode
  }
  if (order?.fulfillmentMethod === '软件零部件发货') return DELIVERY_MODE_SCATTER
  return DELIVERY_MODE_WHOLE
}

export function isWholeMachineLine(line, order) {
  return normalizeDeliveryMode(line, order) === DELIVERY_MODE_WHOLE
}

export function isScatterLine(line, order) {
  return normalizeDeliveryMode(line, order) === DELIVERY_MODE_SCATTER
}
