import { materialInfoState } from '@/store/materialInfoStore'

/**
 * 是否为「仅从产品信息同步」的镜像行（产品编码 CP…，ID 与产品表一致）。
 * BOM 添加子项只使用物料信息主数据，不包含产品库独有记录。
 */
export function isProductSyncedMirror(material) {
  if (!material) return false
  const code = String(material.code || '')
  const id = String(material.id || '')
  if (material.isProductMaterial && code.startsWith('CP')) return true
  if (id.startsWith('prod-')) return true
  return false
}

/** 新增/编辑 BOM「添加子项」可选列表：仅物料信息 */
export function getBomPickableMaterials() {
  return materialInfoState.materials.filter((m) => !isProductSyncedMirror(m))
}

export function filterBomPickableMaterials(materials, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  const base = (materials || getBomPickableMaterials()).filter((m) => !isProductSyncedMirror(m))
  if (!kw) return base
  return base.filter(
    (m) =>
      String(m.code || '')
        .toLowerCase()
        .includes(kw) ||
      String(m.name || '')
        .toLowerCase()
        .includes(kw) ||
      String(m.specModel || '')
        .toLowerCase()
        .includes(kw),
  )
}
