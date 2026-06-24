import dayjs from 'dayjs'
import { productBomState } from '@/store/productBomStore'
import { normalizeVersionDisplay } from '@/utils/bomVersion'
import { isCatalogSeedBom, hydrateCatalogBom } from '@/mock/productBomSeed'
import { mockProducts } from '@/mock/productInfo'
import { isBomArchived, isBomPending } from '@/mock/productBomOptions'

export function getBomLineItems(bom) {
  if (!bom) return []
  if (bom.lineItems?.length) return bom.lineItems
  if (isCatalogSeedBom(bom)) {
    return hydrateCatalogBom({ ...bom }, mockProducts).lineItems || []
  }
  return []
}

/** 子项行是否引用指定 BOM 版本 */
export function lineReferencesBom(line, bom) {
  if (!line || !bom) return false
  if (line.childBomId && line.childBomId === bom.id) return true

  const lineVer = normalizeVersionDisplay(line.childBomVersion)
  const bomVer = normalizeVersionDisplay(bom.version)
  if (!lineVer || lineVer !== bomVer) return false

  if (
    line.referencedItemId &&
    line.referencedItemId === bom.itemId &&
    line.referencedItemType === bom.itemType
  ) {
    return true
  }

  const childBom = String(line.childBom || '').trim()
  return childBom === bom.bomName || childBom === bom.bomNo
}

/** 查找引用了该 BOM 版本的父级 BOM */
export function findParentBomReferences(bom) {
  if (!bom) return []
  const refs = []

  productBomState.boms.forEach((parent) => {
    if (parent.id === bom.id || isBomArchived(parent)) return
    const lines = getBomLineItems(parent)
    const matched = lines.filter((line) => lineReferencesBom(line, bom))
    if (!matched.length) return
    refs.push({
      parentBomId: parent.id,
      parentBomName: parent.bomName,
      parentItemName: parent.itemName,
      parentVersion: parent.version,
      lineIds: matched.map((l) => l.id),
      count: matched.length,
    })
  })

  return refs
}

/** 启用新版本前：查找引用同物品旧版 BOM 的父级 */
export function findParentRefsForBomUpgrade(newBom) {
  if (!newBom) return []
  const olderBoms = productBomState.boms.filter(
    (b) =>
      b.itemType === newBom.itemType &&
      b.itemId === newBom.itemId &&
      b.id !== newBom.id &&
      !isBomPending(b),
  )
  const seen = new Set()
  const refs = []
  olderBoms.forEach((oldBom) => {
    findParentBomReferences(oldBom).forEach((ref) => {
      if (seen.has(ref.parentBomId)) return
      seen.add(ref.parentBomId)
      refs.push(ref)
    })
  })
  return refs
}

/** 父级 BOM 子项引用同步升级到新版本 */
export function upgradeParentBomReferences(newBom, refs) {
  if (!newBom || !refs?.length) return 0
  const ts = dayjs().format('YYYY-MM-DD HH:mm')
  let updated = 0

  refs.forEach((ref) => {
    const parent = productBomState.boms.find((b) => b.id === ref.parentBomId)
    if (!parent?.lineItems?.length) return
    parent.lineItems.forEach((line) => {
      if (!ref.lineIds.includes(line.id)) return
      line.childBomId = newBom.id
      line.childBom = newBom.bomName || newBom.bomNo || line.childBom
      line.childBomVersion = newBom.version
      line.referencedItemId = newBom.itemId
      line.referencedItemType = newBom.itemType
      updated += 1
    })
    parent.updatedAt = ts
  })

  return updated
}
