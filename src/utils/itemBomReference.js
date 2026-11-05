import {
  productBomState,
  getProductBomById,
  createBomNewVersion,
  enableProductBom,
} from '@/store/productBomStore'
import {
  getBomLineItems,
  formatParentBomItemLabel,
  removeParentBomReferences,
  replaceParentBomItemReferences,
} from '@/utils/bomVersionReference'
import { findChildBomRefAncestorLine } from '@/utils/bomChildRefDetach'
import { isBomArchived, isBomActive, normalizeBomStatusValue } from '@/mock/productBomOptions'
import { isShipBomType } from '@/mock/bomMaterialColumns'
import { bomWorkspaceDetailPath } from '@/utils/shipAttachmentNav'

export function lineMatchesItem(line, id, code) {
  const lineId = String(line.referencedItemId || line.itemId || '')
  const lineCode = String(
    line.materialCode || line.itemCode || line.productCode || line.inventoryCode || '',
  ).trim()
  return (id && lineId === id) || (code && lineCode === code)
}

/**
 * 是否为母件 BOM 的直接引用行：
 * - 计入：本 BOM 结构里直接挂上的子件（含引用子件 BOM 的那一行本身）
 * - 不计：挂在「子件 BOM 引用」节点下的展开下级（间接出现）
 */
export function isDirectItemReferenceLine(parent, line) {
  if (!line) return false
  const flatNodes = parent.treeNodes || []
  const lineItems = getBomLineItems(parent)
  if (line.id && findChildBomRefAncestorLine(flatNodes, lineItems, line.id)) {
    return false
  }
  let parentId = line.parentTreeId
  const seen = new Set()
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parentNode = flatNodes.find((n) => n.id === parentId)
    if (parentNode?.nodeType === 'bom-ref') return false
    const parentLine =
      lineItems.find((l) => l.treeNodeId === parentId) ||
      (parentNode?.lineId ? lineItems.find((l) => l.id === parentNode.lineId) : null)
    if (parentLine && (parentLine.childBomId || parentLine.childBom)) return false
    parentId = parentNode?.parentId || null
  }
  return true
}

/**
 * 查找直接引用该物品作为子件的 BOM（供归档联动 / 详情引用列表）
 * - 仅直接引用；不含自身 BOM、已归档、随货配件
 * @returns {Array<{
 *   parentBomId: string,
 *   parentBomName: string,
 *   parentItemLabel: string,
 *   parentVersion: string,
 *   parentBomStatus: string,
 *   lineIds: string[],
 *   count: number,
 *   bomNo: string,
 *   detailPath: string,
 * }>}
 */
export function findDirectBomRefsForItem(record) {
  const id = String(record?.id || '')
  const code = String(record?.code || '').trim()
  if (!id && !code) return []
  const refs = []

  ;(productBomState.boms || []).forEach((parent) => {
    if (!parent?.id || isBomArchived(parent) || isShipBomType(parent.bomType)) return
    if (id && String(parent.itemId) === id) return
    const lines = getBomLineItems(parent)
    const matched = lines.filter(
      (line) => lineMatchesItem(line, id, code) && isDirectItemReferenceLine(parent, line),
    )
    if (!matched.length) return
    const unitQtySum = matched.reduce((s, l) => s + (Number(l.unitQty) || 0), 0)
    const defaultUnitQty =
      matched.length === 1
        ? Number(matched[0].unitQty) || 1
        : unitQtySum > 0
          ? unitQtySum / matched.length
          : 1
    refs.push({
      parentBomId: parent.id,
      parentBomName: parent.bomName || '—',
      parentItemName: parent.itemName || '—',
      parentItemCode: parent.itemCode || '',
      parentSpecModel: parent.specModel || '',
      parentMaterial: parent.material || '',
      parentItemLabel: formatParentBomItemLabel(parent),
      parentVersion: parent.version || '—',
      parentBomStatus: normalizeBomStatusValue(parent.status),
      bomNo: parent.bomNo || '—',
      lineIds: matched.map((l) => l.id),
      count: matched.length,
      defaultUnitQty,
      detailPath: bomWorkspaceDetailPath(getProductBomById(parent.id) || parent),
    })
  })

  return refs
}

/**
 * 归档产品时处理母件引用：
 * - 生效母件：先升版出待发布 → 改结构 → 自动审核发布
 * - 待发布母件：原地修改
 */
export function applyProductArchiveBomRefActions({ removeRefs = [], replaceRefs = [] } = {}) {
  const parentIds = [
    ...new Set([...removeRefs, ...replaceRefs].map((r) => r.parentBomId).filter(Boolean)),
  ]
  let removed = 0
  let replaced = 0
  let autoPublished = 0

  parentIds.forEach((parentBomId) => {
    const source = productBomState.boms.find((b) => b.id === parentBomId)
    if (!source) return
    const wasActive = isBomActive(source)
    let workingId = parentBomId
    if (wasActive) {
      const neu = createBomNewVersion(parentBomId)
      if (!neu) return
      workingId = neu.id
    }
    const remap = (ref) => ({ ...ref, parentBomId: workingId })
    const rm = removeRefs.filter((r) => r.parentBomId === parentBomId).map(remap)
    const rp = replaceRefs.filter((r) => r.parentBomId === parentBomId).map(remap)
    removed += removeParentBomReferences(rm)
    replaced += replaceParentBomItemReferences(rp)
    if (wasActive) {
      const en = enableProductBom(workingId)
      if (!en?.error) autoPublished += 1
    }
  })

  return { removed, replaced, autoPublished }
}
