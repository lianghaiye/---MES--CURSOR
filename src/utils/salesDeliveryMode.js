/** 行级交付方式 */
export const DELIVERY_MODE_WHOLE = '整件'
export const DELIVERY_MODE_SCATTER = '散件'
/** 历史文案，读取时归一为整件 */
export const DELIVERY_MODE_WHOLE_LEGACY = '整机'

export const deliveryModeOptions = [DELIVERY_MODE_WHOLE, DELIVERY_MODE_SCATTER]

/** 将历史订单头「履约方式」及旧「整机」映射为行级交付方式 */
export function normalizeDeliveryMode(line, order) {
  const mode = line?.deliveryMode
  if (mode === DELIVERY_MODE_WHOLE || mode === DELIVERY_MODE_WHOLE_LEGACY) {
    return DELIVERY_MODE_WHOLE
  }
  if (mode === DELIVERY_MODE_SCATTER) {
    return DELIVERY_MODE_SCATTER
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
