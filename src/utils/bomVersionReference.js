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
    // 就地水合，保证后续按 lineId 改母件时 id 一致
    return hydrateCatalogBom(bom, mockProducts).lineItems || []
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

/** 确保母件具备可写的 treeNodes / lineItems（catalog 种子按需水合） */
function ensureParentWritable(parent) {
  if (!parent) return null
  if (parent.lineItems?.length) return parent
  if (isCatalogSeedBom(parent)) {
    const hydrated = hydrateCatalogBom(parent, mockProducts)
    parent.treeNodes = hydrated.treeNodes || []
    parent.lineItems = hydrated.lineItems || []
    if (parent.seedSource === 'catalog') parent.seedSource = 'catalog-hydrated'
  }
  return parent
}

function collectSubtreeNodeIds(treeNodes = [], rootNodeId) {
  if (!rootNodeId) return new Set()
  const ids = new Set([rootNodeId])
  let grew = true
  while (grew) {
    grew = false
    treeNodes.forEach((n) => {
      if (n?.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
        ids.add(n.id)
        grew = true
      }
    })
  }
  return ids
}

function removeSubtreeFromParent(parent, nodeIds) {
  if (!parent || !nodeIds?.size) return
  parent.treeNodes = (parent.treeNodes || []).filter((n) => !nodeIds.has(n.id))
  parent.lineItems = (parent.lineItems || []).filter((line) => {
    if (nodeIds.has(line.treeNodeId)) return false
    if (line.treeNodeId) return true
    // 无 treeNodeId 时仅按行 id 由调用方处理
    return true
  })
}

/**
 * 从母件中移除该子件（含本级）：删除引用行及其树节点、下级结构
 * @returns {number} 删除的引用行数
 */
export function removeParentBomReferences(refs = []) {
  if (!refs.length) return 0
  const ts = dayjs().format('YYYY-MM-DD HH:mm')
  let removed = 0

  refs.forEach((ref) => {
    const parent = ensureParentWritable(productBomState.boms.find((b) => b.id === ref.parentBomId))
    if (!parent?.lineItems?.length) return

    const lineIdSet = new Set(ref.lineIds || [])
    const linesToRemove = parent.lineItems.filter((line) => lineIdSet.has(line.id))
    if (!linesToRemove.length) return

    const nodeIds = new Set()
    linesToRemove.forEach((line) => {
      if (line.treeNodeId) {
        collectSubtreeNodeIds(parent.treeNodes, line.treeNodeId).forEach((id) => nodeIds.add(id))
      }
      removed += 1
    })

    if (nodeIds.size) {
      removeSubtreeFromParent(parent, nodeIds)
    }
    parent.lineItems = parent.lineItems.filter((line) => !lineIdSet.has(line.id))
    // 清理挂在已删节点上、但 lineId 未在 ref.lineIds 中的下级行
    if (nodeIds.size) {
      parent.lineItems = parent.lineItems.filter((line) => !nodeIds.has(line.treeNodeId))
    }
    parent.updatedAt = ts
  })

  return removed
}

/**
 * 仅保留该子件本级，移除其下级：清空 BOM 引用，删除展开出来的下级节点
 * @param {object} [childBom] 用于回填本级物品信息
 * @returns {number} 处理的引用行数
 */
export function detachChildBomKeepLine(refs = [], childBom = null) {
  if (!refs.length) return 0
  const ts = dayjs().format('YYYY-MM-DD HH:mm')
  let updated = 0

  refs.forEach((ref) => {
    const parent = ensureParentWritable(productBomState.boms.find((b) => b.id === ref.parentBomId))
    if (!parent?.lineItems?.length) return

    const lineIdSet = new Set(ref.lineIds || [])
    const descendantNodeIds = new Set()

    parent.lineItems.forEach((line) => {
      if (!lineIdSet.has(line.id)) return

      if (!line.materialCode && childBom?.itemCode) line.materialCode = childBom.itemCode
      if (!line.itemName && childBom?.itemName) line.itemName = childBom.itemName
      if (!line.specModel && childBom?.specModel) line.specModel = childBom.specModel

      line.childBomId = undefined
      line.childBom = ''
      line.childBomVersion = ''
      line.referencedItemId = undefined
      line.referencedItemType = undefined

      const node = (parent.treeNodes || []).find((n) => n.id === line.treeNodeId)
      if (node) {
        node.nodeType = 'material'
        // 本级节点保留；收集其直接下级及更下层以便删除
        ;(parent.treeNodes || []).forEach((n) => {
          if (n.parentId === node.id) {
            collectSubtreeNodeIds(parent.treeNodes, n.id).forEach((id) => descendantNodeIds.add(id))
          }
        })
      }
      updated += 1
    })

    if (descendantNodeIds.size) {
      removeSubtreeFromParent(parent, descendantNodeIds)
    }
    parent.updatedAt = ts
  })

  return updated
}
