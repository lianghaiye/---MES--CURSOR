import { ECN_CHANGE_ITEM_TYPE } from '@/constants/ecn'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getActiveBomForItem, getBomInfoLabelForItem } from '@/store/productBomStore'
import { extractBomChildrenStructure, resolveBomStructure } from '@/utils/bomImport'

import {
  deleteTreeNode,
  getRootTreeId,
  mergeTemplateIntoParent,
  addChildMaterial,
} from '@/utils/bomTree'

/** 按编码解析主数据 itemType / itemId */
export function resolveMasterItemByCode(code) {
  if (!code) return null
  const product = productInfoState.products.find((p) => p.code === code)
  if (product) return { itemType: 'product', itemId: product.id, record: product }
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material) return { itemType: 'material', itemId: material.id, record: material }
  return null
}

/** 新物料关联 BOM 展示：BOM名称 + 版本号 */
export function resolveMaterialBomLabel(materialOrCode) {
  const code = typeof materialOrCode === 'string' ? materialOrCode : materialOrCode?.code
  if (!code) return ''
  const ref = resolveMasterItemByCode(code)
  if (!ref) return ''
  return getBomInfoLabelForItem(ref.itemType, ref.itemId) || ''
}

export function resolveMaterialBomMeta(materialOrCode) {
  const code = typeof materialOrCode === 'string' ? materialOrCode : materialOrCode?.code
  const ref = resolveMasterItemByCode(code)
  if (!ref) {
    return {
      replaceBomLabel: '',
      newMaterialItemType: '',
      newMaterialItemId: '',
      replaceBomId: '',
    }
  }
  const bom = getActiveBomForItem(ref.itemType, ref.itemId)
  return {
    replaceBomLabel: bom ? getBomInfoLabelForItem(ref.itemType, ref.itemId) : '',
    newMaterialItemType: ref.itemType,
    newMaterialItemId: ref.itemId,
    replaceBomId: bom?.id || '',
  }
}

function findLineIndex(lineItems, item) {
  return lineItems.findIndex(
    (line) =>
      (item.bomLineId && line.id === item.bomLineId) ||
      (item.origMaterialCode && line.materialCode === item.origMaterialCode),
  )
}

function patchLineFromChangeItem(line, item) {
  if (item.newMaterialCode) line.materialCode = item.newMaterialCode
  if (item.newMaterialName) {
    line.materialName = item.newMaterialName
    line.itemName = item.newMaterialName
  }
  if (item.newSpecModel) line.specModel = item.newSpecModel
  if (item.newMaterial) line.material = item.newMaterial
  if (item.newDrawingNo) line.drawingNo = item.newDrawingNo
  if (item.newUnitQty != null) line.unitQty = item.newUnitQty
  if (item.supplyForm) line.supplyForm = item.supplyForm
  if (item.changeNote) {
    line.remark = [line.remark, item.changeNote].filter(Boolean).join('；')
  }
}

function deleteChildSubtree(flatNodes, lineItems, parentNodeId) {
  const toDelete = new Set()
  const walk = (pid) => {
    flatNodes.forEach((n) => {
      if (n.parentId === pid && !toDelete.has(n.id)) {
        toDelete.add(n.id)
        walk(n.id)
      }
    })
  }
  walk(parentNodeId)
  return {
    flatNodes: flatNodes.filter((n) => !toDelete.has(n.id)),
    lineItems: lineItems.filter(
      (l) => !toDelete.has(l.treeNodeId) && !toDelete.has(l.parentTreeId),
    ),
  }
}

function resolveParentNodeId(flatNodes, parentPath, rootLabel = '') {
  const rootId = getRootTreeId(flatNodes)
  const root = flatNodes.find((n) => n.isRoot)
  const rootPath = String(root?.title || rootLabel || '').trim()
  if (!parentPath || parentPath === rootPath) return rootId

  const lastSeg = String(parentPath).split(' › ').pop()?.trim()
  if (!lastSeg) return rootId

  const hit = flatNodes.find(
    (n) =>
      !n.isRoot &&
      (n.title === lastSeg ||
        String(n.title || '').includes(lastSeg) ||
        lastSeg.includes(String(n.title || ''))),
  )
  return hit?.id || rootId
}

function applyReplaceChange(flatNodes, lineItems, item) {
  const idx = findLineIndex(lineItems, item)
  if (idx < 0) return { flatNodes, lineItems }

  const lines = lineItems.map((l) => ({ ...l }))
  const nodes = flatNodes.map((n) => ({ ...n }))
  const line = lines[idx]
  patchLineFromChangeItem(line, item)

  const ref = resolveMasterItemByCode(item.newMaterialCode)
  if (!ref) return { flatNodes: nodes, lineItems: lines }

  let nextNodes = nodes
  let nextLines = lines

  if (line.treeNodeId) {
    const subtree = deleteChildSubtree(nextNodes, nextLines, line.treeNodeId)
    nextNodes = subtree.flatNodes
    nextLines = subtree.lineItems

    const bom = getActiveBomForItem(ref.itemType, ref.itemId)
    if (bom) {
      const structure = extractBomChildrenStructure(resolveBomStructure(bom))
      if (structure?.treeNodes?.length) {
        const merged = mergeTemplateIntoParent(nextNodes, nextLines, line.treeNodeId, {
          ...structure,
          templateRef: {
            bomId: bom.id,
            bomNo: bom.bomNo,
            version: bom.version,
          },
        })
        nextNodes = merged.flatNodes
        nextLines = merged.lineItems
      }
    }

    const nodeIdx = nextNodes.findIndex((n) => n.id === line.treeNodeId)
    if (nodeIdx >= 0) {
      nextNodes[nodeIdx] = {
        ...nextNodes[nodeIdx],
        title: `${item.newMaterialCode} ${item.newMaterialName}`.trim(),
      }
    }
    line.childBom = item.replaceBomLabel || resolveMaterialBomLabel(item.newMaterialCode)
  }

  return { flatNodes: nextNodes, lineItems: nextLines }
}

function applyAddChange(flatNodes, lineItems, item, rootLabel) {
  const parentId = resolveParentNodeId(flatNodes, item.parentPath || item.parentMaterial, rootLabel)
  const ref = resolveMasterItemByCode(item.newMaterialCode)
  const material = ref?.record || {
    code: item.newMaterialCode,
    name: item.newMaterialName,
    specModel: item.newSpecModel,
    material: item.newMaterial,
    drawingNo: item.newDrawingNo,
    supplyForm: item.supplyForm,
    inventoryUnit: '件',
  }

  if (ref) {
    const bom = getActiveBomForItem(ref.itemType, ref.itemId)
    if (bom) {
      const added = addChildMaterial(flatNodes, lineItems, parentId, material)
      if (!added.newNodeId) return { flatNodes, lineItems }
      let nextFlat = added.flatNodes
      let nextLines = added.lineItems.map((l) =>
        l.treeNodeId === added.newNodeId ? { ...l, unitQty: item.newUnitQty ?? l.unitQty ?? 1 } : l,
      )
      const structure = extractBomChildrenStructure(resolveBomStructure(bom))
      if (structure?.treeNodes?.length) {
        const merged = mergeTemplateIntoParent(nextFlat, nextLines, added.newNodeId, structure)
        nextFlat = merged.flatNodes
        nextLines = merged.lineItems
      }
      return { flatNodes: nextFlat, lineItems: nextLines }
    }
  }

  const added = addChildMaterial(flatNodes, lineItems, parentId, material)
  const nextLines = added.lineItems.map((l) =>
    l.id === added.lineItems[added.lineItems.length - 1]?.id
      ? { ...l, unitQty: item.newUnitQty ?? l.unitQty ?? 1 }
      : l,
  )
  return { flatNodes: added.flatNodes, lineItems: nextLines }
}

function applyRemoveChange(flatNodes, lineItems, item) {
  const idx = findLineIndex(lineItems, item)
  if (idx < 0) return { flatNodes, lineItems }
  const line = lineItems[idx]
  if (line.treeNodeId) return deleteTreeNode(flatNodes, lineItems, line.treeNodeId)
  return {
    flatNodes,
    lineItems: lineItems.filter((_, i) => i !== idx),
  }
}

function applyModifyChange(flatNodes, lineItems, item) {
  const idx = findLineIndex(lineItems, item)
  if (idx < 0) return { flatNodes, lineItems }
  const lines = lineItems.map((l) => ({ ...l }))
  patchLineFromChangeItem(lines[idx], item)
  return { flatNodes, lineItems: lines }
}

/**
 * 将当前变更项应用到 BOM 结构，生成预览用 flatNodes / lineItems（不落库）
 */
export function buildEcnPreviewBomStructure(
  flatNodes = [],
  lineItems = [],
  changeItems = [],
  rootLabel = '',
) {
  let nodes = JSON.parse(JSON.stringify(flatNodes))
  let lines = JSON.parse(JSON.stringify(lineItems))

  changeItems.forEach((item) => {
    if (item.changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
      const res = applyAddChange(nodes, lines, item, rootLabel)
      nodes = res.flatNodes
      lines = res.lineItems
    } else if (item.changeType === ECN_CHANGE_ITEM_TYPE.REMOVE) {
      const res = applyRemoveChange(nodes, lines, item)
      nodes = res.flatNodes
      lines = res.lineItems
    } else if (item.changeType === ECN_CHANGE_ITEM_TYPE.REPLACE) {
      const res = applyReplaceChange(nodes, lines, item)
      nodes = res.flatNodes
      lines = res.lineItems
    } else {
      const res = applyModifyChange(nodes, lines, item)
      nodes = res.flatNodes
      lines = res.lineItems
    }
  })

  return { flatNodes: nodes, lineItems: lines }
}
