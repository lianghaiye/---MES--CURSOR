/** 倒冲件判定：领料属性关闭 → 不进领料单，完工倒冲 */

/**
 * @param {object|null|undefined} material 物料主数据
 * @returns {boolean}
 */
export function isBackflushMaterial(material) {
  if (!material) return false
  if (material.requisitionEnabled === false) return true
  if (material.requisitionAttr === 0 || material.requisitionAttr === '0') return true
  if (material.requisitionAttr === false) return true
  return false
}

/**
 * 领料属性开启（参与领料）
 * 空值视为开启（兼容历史数据）
 */
export function isRequisitionEnabledMaterial(material) {
  if (!material) return true
  return !isBackflushMaterial(material)
}
