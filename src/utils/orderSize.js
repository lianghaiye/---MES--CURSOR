/**
 * 订货尺寸：采购侧独立字段，与生产「下料尺寸」分离。
 * 定尺外发时可默认带出下料尺寸；买标板/拼板可不同。
 */

/** 从来源行取订货尺寸；未单独维护时默认用下料尺寸 */
export function pickOrderSizeFields(source = {}) {
  const blankSizeText = source.blankSizeText || ''
  const blankSize = source.blankSize || null
  const blankSizeMode = source.blankSizeMode || ''
  return {
    orderSizeText: source.orderSizeText || blankSizeText || '',
    orderSize: source.orderSize ?? blankSize ?? null,
    orderSizeMode: source.orderSizeMode || blankSizeMode || '',
  }
}

/** 列表/详情展示文案（兼容旧数据仅有 blankSizeText） */
export function displayOrderSizeText(line) {
  if (!line) return ''
  return line.orderSizeText || line.blankSizeText || ''
}

/** createLineItem 等工厂：补齐订货尺寸默认 */
export function ensureOrderSizeDefaults(line) {
  if (!line || typeof line !== 'object') return line
  if (!line.orderSizeText && line.blankSizeText) {
    line.orderSizeText = line.blankSizeText
  }
  if (line.orderSize == null && line.blankSize != null) {
    line.orderSize = line.blankSize
  }
  if (!line.orderSizeMode && line.blankSizeMode) {
    line.orderSizeMode = line.blankSizeMode
  }
  if (line.orderSizeText == null) line.orderSizeText = ''
  if (line.orderSize === undefined) line.orderSize = null
  if (line.orderSizeMode == null) line.orderSizeMode = ''
  return line
}
