import dayjs from 'dayjs'
import { importTemplateChildren, bomTemplateCatalog } from '@/mock/bomTemplates'
import {
  createRootTreeNode,
  mergeTemplateIntoRoot,
  mergeTemplateIntoParent,
  addChildMaterial,
} from '@/utils/bomTree'
import { getActiveBomForItem } from '@/store/productBomStore'
import { toBomSubItemPayload } from '@/utils/bomSubItemPicker'

function reIdStructure(raw, templateRef) {
  const idMap = new Map([['__ROOT__', '__ROOT__']])
  raw.treeNodes.forEach((n) => {
    idMap.set(n.id, `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  })

  const treeNodes = raw.treeNodes.map((n) => ({
    ...n,
    id: idMap.get(n.id),
    parentId:
      n.parentId === '__ROOT__' || !n.parentId ? '__ROOT__' : idMap.get(n.parentId) || '__ROOT__',
    isRoot: false,
  }))

  const lineItems = raw.lineItems.map((line) => ({
    ...line,
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    parentTreeId:
      line.parentTreeId === '__ROOT__' || !line.parentTreeId
        ? '__ROOT__'
        : idMap.get(line.parentTreeId) || '__ROOT__',
    treeNodeId: line.treeNodeId ? idMap.get(line.treeNodeId) || '' : '',
  }))

  treeNodes.forEach((n) => {
    const line = lineItems.find((l) => l.treeNodeId === n.id || l.id === n.lineId)
    if (line) n.lineId = line.id
  })

  return {
    treeNodes,
    lineItems,
    templateRef: templateRef || raw.templateRef,
  }
}

/** 去掉 BOM 根节点，子级挂到虚拟 __ROOT__ */
function normalizeToVirtualRoot(structure) {
  if (!structure?.treeNodes?.length) return structure

  const rootNode = structure.treeNodes.find((n) => n.isRoot)
  if (!rootNode) return structure

  const rootId = rootNode.id
  const treeNodes = structure.treeNodes
    .filter((n) => n.id !== rootId)
    .map((n) => ({
      ...n,
      parentId: n.parentId === rootId ? '__ROOT__' : n.parentId,
      isRoot: false,
    }))

  const lineItems = (structure.lineItems || []).map((line) => ({
    ...line,
    parentTreeId: line.parentTreeId === rootId ? '__ROOT__' : line.parentTreeId,
  }))

  return { ...structure, treeNodes, lineItems }
}

/**
 * 模板导入：仅保留下级物料，不带入顶级物料
 * - 去掉 parentId 为 __ROOT__ 的树节点
 * - 去掉 parentTreeId 为 __ROOT__ 的物料行
 * - 原挂在顶级节点下的子级提升到 __ROOT__
 */
export function stripTopLevelMaterials(structure) {
  if (!structure) return structure

  const topNodeIds = new Set(
    (structure.treeNodes || [])
      .filter((n) => n.parentId === '__ROOT__' || n.parentId == null)
      .map((n) => n.id),
  )

  if (!topNodeIds.size && !(structure.lineItems || []).some((l) => l.parentTreeId === '__ROOT__')) {
    return structure
  }

  const treeNodes = (structure.treeNodes || [])
    .filter((n) => !topNodeIds.has(n.id))
    .map((n) => ({
      ...n,
      parentId: topNodeIds.has(n.parentId) ? '__ROOT__' : n.parentId,
    }))

  const lineItems = (structure.lineItems || [])
    .filter((line) => line.parentTreeId !== '__ROOT__' && line.parentTreeId != null)
    .map((line) => ({
      ...line,
      parentTreeId: topNodeIds.has(line.parentTreeId) ? '__ROOT__' : line.parentTreeId,
      treeNodeId: topNodeIds.has(line.treeNodeId) ? '' : line.treeNodeId,
    }))

  return { ...structure, treeNodes, lineItems }
}

/** 解析模板/BOM 可导入的子级结构（不含顶级物料） */
export function resolveTemplateImportStructure(bom) {
  const raw = resolveBomStructure(bom)
  if (!raw) return null

  let structure = normalizeToVirtualRoot(raw)
  structure = extractBomChildrenStructure(structure) || structure
  structure = stripTopLevelMaterials(structure)
  if (structure.templateRef) {
    structure = { ...structure, templateRef: raw.templateRef || structure.templateRef }
  }
  return structure
}

/** 从 BOM 记录或模板目录解析可导入的结构 */
export function resolveBomStructure(bom) {
  if (bom?.treeNodes?.length) {
    return reIdStructure(
      { treeNodes: bom.treeNodes, lineItems: bom.lineItems || [] },
      {
        bomId: bom.id,
        bomNo: bom.bomNo,
        version: bom.version,
        effectiveAt: bom.effectiveAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
      },
    )
  }

  const catalog = bomTemplateCatalog.find((t) => t.bomId === bom.id)
  if (catalog) {
    const data = importTemplateChildren(catalog.templateKey)
    if (data) {
      data.templateRef = {
        bomId: bom.id,
        bomNo: bom.bomNo,
        version: bom.version,
        effectiveAt: bom.effectiveAt || catalog.effectiveAt,
      }
      return data
    }
  }

  const fallback = importTemplateChildren('isg50-standard')
  if (fallback) {
    fallback.templateRef = {
      bomId: bom.id,
      bomNo: bom.bomNo,
      version: bom.version,
      effectiveAt: bom.effectiveAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
  }
  return fallback
}

export function clearBomChildren(flatNodes) {
  return {
    flatNodes: flatNodes.filter((n) => n.isRoot),
    lineItems: [],
  }
}

export function buildBasicInfoFromBom(bom) {
  return {
    bomName: bom.bomName || '',
    bomType: bom.bomType === '基础BOM' ? '基准BOM' : bom.bomType || '基准BOM',
    itemId: `${bom.itemType}:${bom.itemId}`,
    itemType: bom.itemType,
    itemName: bom.itemName,
    itemCode: bom.itemCode || '',
    specModel: bom.specModel || '',
    remark: bom.remark || '',
  }
}

/**
 * @param {object} bom 使用中的 BOM 记录
 * @param {boolean} hasExistingRoot 是否已有根节点
 * @param {array} flatNodes
 * @param {array} lineItems
 */
export function applyBomTemplateImport(bom, hasExistingRoot, flatNodes) {
  const structure = resolveTemplateImportStructure(bom)
  if (!structure) return null
  if (!structure.lineItems?.length && !structure.treeNodes?.length) return null

  const hasRoot = flatNodes.some((n) => n.isRoot)
  if (hasExistingRoot && hasRoot) {
    const cleared = clearBomChildren(flatNodes)
    const merged = mergeTemplateIntoRoot(cleared.flatNodes, cleared.lineItems, structure)
    if (!merged.lineItems.length && !(merged.flatNodes.length > cleared.flatNodes.length)) {
      return null
    }
    return {
      mode: 'children',
      flatNodes: merged.flatNodes,
      lineItems: merged.lineItems,
      templateRef: merged.templateRef,
    }
  }

  const basicInfo = buildBasicInfoFromBom(bom)
  const root = createRootTreeNode({
    itemCode: basicInfo.itemCode,
    itemName: basicInfo.itemName,
    specModel: basicInfo.specModel,
    bomName: basicInfo.bomName,
  })
  const merged = mergeTemplateIntoRoot([root], [], structure)
  return {
    mode: 'full',
    basicInfo,
    flatNodes: merged.flatNodes,
    lineItems: merged.lineItems,
    templateRef: merged.templateRef,
  }
}

export function syncRootNodeFromItem(flatNodes, { itemCode, itemName, specModel, bomName }) {
  const root = createRootTreeNode({ itemCode, itemName, specModel, bomName })
  const others = flatNodes.filter((n) => !n.isRoot)
  return [root, ...others]
}

/** 详情页：解析 BOM 树与物料清单 */
export function loadBomDetailStructure(bom) {
  if (!bom) return { flatNodes: [], lineItems: [] }

  if (bom.treeNodes?.length) {
    const hasRoot = bom.treeNodes.some((n) => n.isRoot)
    if (hasRoot) {
      return {
        flatNodes: JSON.parse(JSON.stringify(bom.treeNodes)),
        lineItems: JSON.parse(JSON.stringify(bom.lineItems || [])),
      }
    }
  }

  const structure = resolveBomStructure(bom)
  if (!structure) {
    const root = createRootTreeNode({
      itemCode: bom.itemCode,
      itemName: bom.itemName,
      specModel: bom.specModel || '',
      bomName: bom.bomName,
    })
    return { flatNodes: [root], lineItems: [] }
  }

  const root = createRootTreeNode({
    itemCode: bom.itemCode,
    itemName: bom.itemName,
    specModel: bom.specModel || '',
    bomName: bom.bomName,
  })
  const merged = mergeTemplateIntoRoot([root], [], structure)
  return {
    flatNodes: merged.flatNodes,
    lineItems: merged.lineItems,
  }
}

function scaleUnitQty(baseQty, coefficient) {
  return Math.round((Number(baseQty) || 1) * (Number(coefficient) || 1) * 100) / 100
}

/** 仅保留 BOM 根下直接子级（不递归展开子件自有 BOM） */
export function extractBomOneLevelChildren(structure) {
  if (!structure) return structure

  const directNodes = (structure.treeNodes || []).filter((n) => n.parentId === '__ROOT__')
  const lineItems = (structure.lineItems || []).filter((line) => line.parentTreeId === '__ROOT__')

  return {
    ...structure,
    treeNodes: directNodes,
    lineItems,
  }
}

/** 复制结构时去掉子行的 BOM 引用字段，避免误计入当前 BOM 关联 */
function stripNestedChildBomRefs(structure) {
  if (!structure?.lineItems?.length) return structure
  return {
    ...structure,
    lineItems: structure.lineItems.map((line) => ({
      ...line,
      childBomId: undefined,
      childBom: '',
      childBomVersion: '',
      referencedItemId: undefined,
      referencedItemType: undefined,
    })),
  }
}

/**
 * 添加明细行内联选料：若物品有生效 BOM，在其下展开一层下级并建立引用
 * @returns {{ flatNodes, lineItems, expanded: boolean, hasChildren?: boolean }}
 */
export function expandActiveBomOneLevelUnderLine(
  flatNodes,
  lineItems,
  lineId,
  material,
  usageCoefficient = 1,
) {
  const line = lineItems.find((l) => l.id === lineId)
  if (!line?.treeNodeId) {
    return { flatNodes, lineItems, expanded: false }
  }
  if (material?.pickType === 'spu' || material?.isSpuTemplate || material?.isSpuLine) {
    return { flatNodes, lineItems, expanded: false }
  }

  const itemType = material?.itemType === '产品' ? 'product' : 'material'
  const itemId = material?.itemId || material?.id || material?.productId
  if (!itemId) return { flatNodes, lineItems, expanded: false }

  const bom = getActiveBomForItem(itemType, itemId)
  if (!bom) return { flatNodes, lineItems, expanded: false }

  const coef = Number(usageCoefficient)
  const coefficient = Number.isNaN(coef) || coef < 0 ? 1 : coef

  let structure = extractBomOneLevelChildren(extractBomChildrenStructure(resolveBomStructure(bom)))
  structure = stripNestedChildBomRefs(structure)

  const refPatch = {
    childBom: bom.bomName || bom.bomNo || '',
    childBomVersion: bom.version || '',
    childBomId: bom.id,
    referencedItemId: bom.itemId,
    referencedItemType: bom.itemType,
  }

  let nextLines = lineItems.map((l) => (l.id === lineId ? { ...l, ...refPatch } : l))

  if (!structure?.treeNodes?.length && !structure?.lineItems?.length) {
    return {
      flatNodes,
      lineItems: nextLines,
      expanded: true,
      hasChildren: false,
    }
  }

  const scaledStructure = {
    ...structure,
    treeNodes: structure.treeNodes.map((node) => ({
      ...node,
      quantity: scaleUnitQty(node.quantity ?? 1, coefficient),
    })),
    lineItems: structure.lineItems.map((item) => ({
      ...item,
      unitQty: scaleUnitQty(item.unitQty ?? 1, coefficient),
    })),
  }

  const merged = mergeTemplateIntoParent(flatNodes, nextLines, line.treeNodeId, scaledStructure)
  return {
    flatNodes: merged.flatNodes,
    lineItems: merged.lineItems,
    expanded: true,
    hasChildren: true,
  }
}

/** 引用 BOM 时去掉其根节点，仅保留下级（本级已由 addChildMaterial 添加） */
export function extractBomChildrenStructure(structure) {
  if (!structure?.treeNodes?.length) return structure

  const topNodes = structure.treeNodes.filter((n) => n.parentId === '__ROOT__')
  if (topNodes.length !== 1) return structure

  const bomRootId = topNodes[0].id
  const treeNodes = structure.treeNodes
    .filter((n) => n.id !== bomRootId)
    .map((n) => (n.parentId === bomRootId ? { ...n, parentId: '__ROOT__' } : n))

  const lineItems = (structure.lineItems || []).map((line) => ({
    ...line,
    parentTreeId: line.parentTreeId === bomRootId ? '__ROOT__' : line.parentTreeId,
  }))

  return { ...structure, treeNodes, lineItems }
}

/** 按 BOM 引用：在当前父节点下添加所选物品（本级）及其 BOM 下级结构 */
export function importBomByReference(
  parentTreeId,
  pickerRow,
  flatNodes,
  lineItems,
  usageCoefficient = 1,
) {
  if (!parentTreeId || !pickerRow?.itemId) return null

  const coef = Number(usageCoefficient)
  const coefficient = Number.isNaN(coef) || coef < 0 ? 1 : coef

  const itemType = pickerRow.itemType === '产品' ? 'product' : 'material'
  const bom = getActiveBomForItem(itemType, pickerRow.itemId)
  if (!bom) return null

  const structure = extractBomChildrenStructure(resolveBomStructure(bom))
  const material = toBomSubItemPayload(pickerRow)
  const added = addChildMaterial(flatNodes, lineItems, parentTreeId, material)
  if (!added.newNodeId) return null

  let nextFlat = added.flatNodes.map((n) =>
    n.id === added.newNodeId ? { ...n, quantity: coefficient } : n,
  )
  let nextLines = added.lineItems.map((l) =>
    l.treeNodeId === added.newNodeId
      ? {
          ...l,
          unitQty: coefficient,
          childBom: bom.bomName || bom.bomNo || '',
          childBomVersion: bom.version || '',
          childBomId: bom.id,
          referencedItemId: bom.itemId,
          referencedItemType: bom.itemType,
        }
      : l,
  )

  if (!structure?.treeNodes?.length) {
    return {
      flatNodes: nextFlat,
      lineItems: nextLines,
      newNodeId: added.newNodeId,
    }
  }

  const scaledStructure = {
    ...structure,
    treeNodes: structure.treeNodes.map((node) => ({
      ...node,
      quantity: scaleUnitQty(node.quantity ?? 1, coefficient),
    })),
    lineItems: (structure.lineItems || []).map((line) => ({
      ...line,
      unitQty: scaleUnitQty(line.unitQty ?? 1, coefficient),
    })),
    templateRef: {
      bomId: bom.id,
      bomNo: bom.bomNo,
      version: bom.version,
      effectiveAt: bom.effectiveAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    },
  }

  const merged = mergeTemplateIntoParent(nextFlat, nextLines, added.newNodeId, scaledStructure)

  return {
    flatNodes: merged.flatNodes,
    lineItems: merged.lineItems,
    newNodeId: added.newNodeId,
  }
}
