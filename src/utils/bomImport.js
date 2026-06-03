import dayjs from 'dayjs'
import { importTemplateChildren, bomTemplateCatalog } from '@/mock/bomTemplates'
import { createRootTreeNode, mergeTemplateIntoRoot } from '@/utils/bomTree'

function reIdStructure(raw, templateRef) {
  const idMap = new Map([['__ROOT__', '__ROOT__']])
  raw.treeNodes.forEach((n) => {
    idMap.set(n.id, `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  })

  const treeNodes = raw.treeNodes.map((n) => ({
    ...n,
    id: idMap.get(n.id),
    parentId:
      n.parentId === '__ROOT__' || !n.parentId
        ? '__ROOT__'
        : idMap.get(n.parentId) || '__ROOT__',
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

/** 从 BOM 记录或模板目录解析可导入的结构 */
export function resolveBomStructure(bom) {
  if (bom?.treeNodes?.length && bom?.lineItems?.length) {
    return reIdStructure(
      { treeNodes: bom.treeNodes, lineItems: bom.lineItems },
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
    bomType: bom.bomType || '基础BOM',
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
  const structure = resolveBomStructure(bom)
  if (!structure) return null

  if (hasExistingRoot) {
    const cleared = clearBomChildren(flatNodes)
    const merged = mergeTemplateIntoRoot(
      cleared.flatNodes,
      cleared.lineItems,
      structure,
    )
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
