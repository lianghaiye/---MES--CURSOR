import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { createSpuLineDraft } from '@/utils/spuLineResolve'

const ROOT_ID = 'bom-root'

export function createRootTreeNode({ itemCode, itemName, specModel, bomName }) {
  const title = [itemCode, itemName, specModel].filter(Boolean).join(' ').trim()
  const suffix = bomName ? `（${bomName}）` : ''
  return createBomTreeNode({
    id: ROOT_ID,
    parentId: null,
    title: `${title}${suffix}`.trim() || '请选择产品/物料',
    quantity: 1,
    isRoot: true,
    nodeType: 'product',
    lineId: '',
  })
}

export function getRootTreeId(flatNodes) {
  return flatNodes?.find((n) => n.isRoot)?.id || ROOT_ID
}

/** 确保 flatNodes 含 isRoot 根节点（基准 BOM 导入的结构可能缺少根） */
export function normalizeFlatNodesWithRoot(flatNodes, rootMeta = {}) {
  const nodes = Array.isArray(flatNodes) ? flatNodes.map((n) => ({ ...n })) : []
  if (nodes.some((n) => n.isRoot)) return nodes
  const root = createRootTreeNode({
    itemCode: rootMeta.itemCode || '',
    itemName: rootMeta.itemName || '',
    specModel: rootMeta.specModel || '',
    bomName: rootMeta.bomName || '',
  })
  return [root, ...nodes]
}

export function isRootNode(nodeId, flatNodes) {
  if (!nodeId) return true
  if (nodeId === ROOT_ID) return true
  const rootId = getRootTreeId(flatNodes)
  return nodeId === rootId
}

/** 按物料清单顺序获取父节点下子树节点 id 列表 */
export function getOrderedChildNodeIds(parentId, flatNodes, lineItems = []) {
  const childNodes = flatNodes.filter((n) => n.parentId === parentId && !n.isRoot)
  if (!childNodes.length) return []

  const lines = getLinesForTreeNode(lineItems, parentId, flatNodes)
  const ordered = []
  const seen = new Set()

  lines.forEach((line) => {
    const nodeId = line.treeNodeId
    if (!nodeId || nodeId === parentId || seen.has(nodeId)) return
    const node = flatNodes.find((n) => n.id === nodeId)
    if (!node || node.parentId !== parentId || node.isRoot) return
    ordered.push(nodeId)
    seen.add(nodeId)
  })

  childNodes.forEach((node) => {
    if (!seen.has(node.id)) {
      ordered.push(node.id)
      seen.add(node.id)
    }
  })

  return ordered
}

/** 扁平树节点转 ant-design treeData（子节点顺序与物料清单一致） */
export function buildAntTreeData(flatNodes, lineItems = []) {
  const root = flatNodes.find((n) => n.isRoot)
  if (!root) return []

  function mapNode(node) {
    const childIds = getOrderedChildNodeIds(node.id, flatNodes, lineItems)
    const children = childIds.map((id) => flatNodes.find((n) => n.id === id)).filter(Boolean)
    return {
      key: node.id,
      title: node.title,
      quantity: node.quantity,
      isRoot: node.isRoot,
      isKeyPart: node.isKeyPart,
      nodeType: node.nodeType,
      children: children.length ? children.map(mapNode) : undefined,
    }
  }
  return [mapNode(root)]
}

/** 从树节点标题解析展示用物料编码（模板节点 title 常为「编码 名称」） */
export function parseMaterialCodeFromNodeTitle(title) {
  const t = String(title || '').trim()
  const m = t.match(/^(\d{6,})\s+/)
  return m ? m[1] : ''
}

export function getChildTreeNodes(flatNodes, parentId) {
  if (parentId === ROOT_ID || !parentId) {
    return flatNodes.filter((n) => n.parentId === ROOT_ID && !n.isRoot)
  }
  return flatNodes.filter((n) => n.parentId === parentId)
}

/** 当前选中节点下展示的物料行（直属子级，保持 lineItems 中的顺序） */
export function getLinesForTreeNode(lineItems, treeNodeId, flatNodes = []) {
  const rootId = getRootTreeId(flatNodes)
  const pid = !treeNodeId || isRootNode(treeNodeId, flatNodes) ? rootId : treeNodeId
  return lineItems.filter((l) => {
    if (l.parentTreeId === pid) return true
    if (l.parentTreeId === '__ROOT__' && (pid === rootId || pid === ROOT_ID)) return true
    return false
  })
}

/** 物料行所属父节点（根下统一归一到 rootId） */
export function normalizeLineParentId(line, flatNodes = []) {
  const pid = line?.parentTreeId
  if (!pid || pid === '__ROOT__' || isRootNode(pid, flatNodes)) {
    return getRootTreeId(flatNodes)
  }
  return pid
}

/** 按行 id 调整同级顺序；跨层级不改动 */
export function reorderSiblingLinesByIds(lineItems, flatNodes, fromLineId, toLineId) {
  if (!fromLineId || !toLineId || fromLineId === toLineId) {
    return { lineItems, flatNodes }
  }
  const fromLine = lineItems.find((l) => l.id === fromLineId)
  const toLine = lineItems.find((l) => l.id === toLineId)
  if (!fromLine || !toLine) return { lineItems, flatNodes }
  const fromParent = normalizeLineParentId(fromLine, flatNodes)
  const toParent = normalizeLineParentId(toLine, flatNodes)
  if (fromParent !== toParent) return { lineItems, flatNodes }
  const displayed = getLinesForTreeNode(lineItems, fromParent, flatNodes)
  const fromIndex = displayed.findIndex((l) => l.id === fromLineId)
  const toIndex = displayed.findIndex((l) => l.id === toLineId)
  return reorderLinesForTreeNode(lineItems, flatNodes, fromParent, fromIndex, toIndex)
}

/** 调整当前节点下物料行顺序，并同步同级树节点顺序 */
export function reorderLinesForTreeNode(lineItems, flatNodes, treeNodeId, fromIndex, toIndex) {
  if (fromIndex === toIndex) return { lineItems, flatNodes }

  const displayed = getLinesForTreeNode(lineItems, treeNodeId, flatNodes)
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= displayed.length ||
    toIndex >= displayed.length
  ) {
    return { lineItems, flatNodes }
  }

  const ids = displayed.map((l) => l.id)
  const reorderedIds = [...ids]
  const [moved] = reorderedIds.splice(fromIndex, 1)
  reorderedIds.splice(toIndex, 0, moved)

  const idSet = new Set(ids)
  const sortedLines = reorderedIds.map((id) => lineItems.find((l) => l.id === id))
  const firstIdx = lineItems.findIndex((l) => idSet.has(l.id))
  const nextLines = lineItems.filter((l) => !idSet.has(l.id))
  nextLines.splice(firstIdx >= 0 ? firstIdx : nextLines.length, 0, ...sortedLines)

  const rootId = getRootTreeId(flatNodes)
  const pid = !treeNodeId || isRootNode(treeNodeId, flatNodes) ? rootId : treeNodeId
  const nodeOrderMap = new Map(
    sortedLines.map((line, idx) => [line.treeNodeId, idx]).filter(([nodeId]) => nodeId),
  )
  const siblingIds = new Set(
    flatNodes.filter((n) => n.parentId === pid && !n.isRoot).map((n) => n.id),
  )
  if (!siblingIds.size) return { lineItems: nextLines, flatNodes }

  const sortedSiblings = flatNodes
    .filter((n) => siblingIds.has(n.id))
    .sort((a, b) => (nodeOrderMap.get(a.id) ?? 999) - (nodeOrderMap.get(b.id) ?? 999))
  const firstSiblingIdx = flatNodes.findIndex((n) => siblingIds.has(n.id))
  const nextFlat = flatNodes.filter((n) => !siblingIds.has(n.id))
  nextFlat.splice(firstSiblingIdx >= 0 ? firstSiblingIdx : nextFlat.length, 0, ...sortedSiblings)

  return { lineItems: nextLines, flatNodes: nextFlat }
}

export function addChildMaterial(flatNodes, lineItems, parentId, material) {
  const parent = flatNodes.find((n) => n.id === parentId)
  if (!parent) return { flatNodes, lineItems }

  const isSpu = Boolean(material?.pickType === 'spu' || material?.isSpuTemplate)
  let line
  let nodeTitle

  if (isSpu) {
    const draft = createSpuLineDraft(material)
    line = createBomLineItem({
      parentTreeId: parentId,
      treeNodeId: '',
      materialCode: '',
      itemName: draft.productName,
      specModel: '',
      categoryName: draft.category || '零件',
      materialType: '零部件',
      supplyForm: '外购件',
      material: '',
      drawingNo: draft.drawingNo || '',
      unit: draft.unit || '件',
      unitPrice: 0,
      isSpuLine: true,
      spuId: draft.spuId,
      spuName: draft.spuName,
      variantValues: { ...draft.variantValues },
      variantSummary: '',
      productId: '',
    })
    nodeTitle = draft.productName || '产品族'
  } else {
    line = createBomLineItem({
      parentTreeId: parentId,
      treeNodeId: '',
      materialCode: material.code,
      itemName: material.name,
      specModel: material.specModel || '',
      categoryName: material.categoryName || '零件',
      materialType: material.materialType || '零部件',
      supplyForm: material.supplyForm || '外购件',
      material: material.material || '',
      drawingNo: material.drawingNo || '',
      unit: material.inventoryUnit || '件',
      unitPrice: material.unitPrice || 0,
      isSpuLine: false,
      spuId: material.spuId || '',
      spuName: material.spuName || '',
      variantValues: material.variantValues ? { ...material.variantValues } : {},
      variantSummary: material.variantSummary || '',
      productId: material.itemId || material.id || '',
    })
    nodeTitle = `${material.code} ${material.name}`
  }

  const node = createBomTreeNode({
    parentId,
    title: nodeTitle,
    quantity: 1,
    nodeType: 'material',
    lineId: line.id,
    isKeyPart: false,
  })
  line.treeNodeId = node.id

  return {
    flatNodes: [...flatNodes, node],
    lineItems: [...lineItems, line],
    newNodeId: node.id,
  }
}

export function deleteTreeNode(flatNodes, lineItems, nodeId) {
  if (isRootNode(nodeId)) return { flatNodes, lineItems }

  const toDelete = new Set([nodeId])
  let changed = true
  while (changed) {
    changed = false
    flatNodes.forEach((n) => {
      if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
        toDelete.add(n.id)
        changed = true
      }
    })
  }

  const nextNodes = flatNodes.filter((n) => !toDelete.has(n.id))
  const nextLines = lineItems.filter(
    (l) => !toDelete.has(l.treeNodeId) && !toDelete.has(l.parentTreeId),
  )
  return { flatNodes: nextNodes, lineItems: nextLines }
}

export function mergeTemplateIntoRoot(flatNodes, lineItems, imported) {
  const root = flatNodes.find((n) => n.isRoot)
  if (!root) return { flatNodes, lineItems, templateRef: imported.templateRef }

  const idMap = new Map([['__ROOT__', ROOT_ID]])
  imported.treeNodes.forEach((n) => {
    const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    idMap.set(n.id, newId)
  })

  const newNodes = imported.treeNodes.map((n) => ({
    ...n,
    id: idMap.get(n.id),
    parentId: n.parentId === '__ROOT__' ? ROOT_ID : idMap.get(n.parentId) || ROOT_ID,
    isRoot: false,
  }))

  const newLines = imported.lineItems.map((line) => ({
    ...line,
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    parentTreeId:
      line.parentTreeId === '__ROOT__' ? ROOT_ID : idMap.get(line.parentTreeId) || ROOT_ID,
    treeNodeId: line.treeNodeId ? idMap.get(line.treeNodeId) || '' : '',
  }))

  newNodes.forEach((n) => {
    const line = newLines.find((l) => l.id === n.lineId || l.treeNodeId === n.id)
    if (line) n.lineId = line.id
  })

  return {
    flatNodes: [...flatNodes, ...newNodes],
    lineItems: [...lineItems, ...newLines],
    templateRef: imported.templateRef,
  }
}

/** 将模板/引用 BOM 的子级结构挂到指定树节点下（本级节点需已存在） */
export function mergeTemplateIntoParent(flatNodes, lineItems, parentId, imported) {
  if (!parentId || !imported?.treeNodes?.length) {
    return { flatNodes, lineItems, templateRef: imported?.templateRef }
  }

  const idMap = new Map([['__ROOT__', parentId]])
  imported.treeNodes.forEach((n, idx) => {
    const newId = `node-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`
    idMap.set(n.id, newId)
  })

  const newNodes = imported.treeNodes.map((n) => ({
    ...n,
    id: idMap.get(n.id),
    parentId: n.parentId === '__ROOT__' ? parentId : idMap.get(n.parentId) || parentId,
    isRoot: false,
  }))

  const newLines = (imported.lineItems || []).map((line, idx) => ({
    ...line,
    id: `line-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    parentTreeId:
      line.parentTreeId === '__ROOT__' ? parentId : idMap.get(line.parentTreeId) || parentId,
    treeNodeId: line.treeNodeId ? idMap.get(line.treeNodeId) || '' : '',
  }))

  newNodes.forEach((n) => {
    const line = newLines.find((l) => l.id === n.lineId || l.treeNodeId === n.id)
    if (line) n.lineId = line.id
  })

  return {
    flatNodes: [...flatNodes, ...newNodes],
    lineItems: [...lineItems, ...newLines],
    templateRef: imported.templateRef,
  }
}

/** 清除 lineItems 上用于树形展示的临时字段（保存前调用） */
export function stripLineTreeChildren(lineItems) {
  if (!Array.isArray(lineItems)) return
  lineItems.forEach((line) => {
    delete line.children
    delete line._treeIndex
    delete line._stripeAlt
  })
}

/** 构建物料清单树形表格数据（复用 lineItems 引用以支持行内编辑） */
export function buildBomMaterialTree(flatNodes, lineItems) {
  if (!Array.isArray(lineItems) || !lineItems.length) return []
  stripLineTreeChildren(lineItems)
  const rootId = getRootTreeId(flatNodes)

  function buildLevel(parentId) {
    const lines = getLinesForTreeNode(lineItems, parentId, flatNodes)
    const linkedNodeIds = new Set()

    lines.forEach((line) => {
      const subNodeId = line.treeNodeId
      if (subNodeId && subNodeId !== parentId) {
        linkedNodeIds.add(subNodeId)
        const children = buildLevel(subNodeId)
        if (children.length) line.children = children
      }
    })

    getOrderedChildNodeIds(parentId, flatNodes, lineItems).forEach((childNodeId) => {
      if (linkedNodeIds.has(childNodeId)) return
      const nodeChildren = buildLevel(childNodeId)
      if (!nodeChildren.length) return
      const node = flatNodes.find((n) => n.id === childNodeId)
      const placeholderLine = lineItems.find((l) => l.treeNodeId === childNodeId)
      if (placeholderLine) {
        placeholderLine.children = nodeChildren
      } else if (node?.lineId) {
        const linked = lineItems.find((l) => l.id === node.lineId)
        if (linked) linked.children = nodeChildren
      }
    })

    return lines
  }

  return buildLevel(rootId)
}

/** 为树形物料行分配序号（1、1.1、1.2…） */
export function assignMaterialTreeIndexes(rows, prefix = '') {
  if (!Array.isArray(rows)) return []
  rows.forEach((row, i) => {
    const index = prefix ? `${prefix}.${i + 1}` : String(i + 1)
    row._treeIndex = index
    if (row.children?.length) assignMaterialTreeIndexes(row.children, index)
  })
  return rows
}

/** 一级物料间隔底色，下级继承所属一级物料的底色标记 */
export function assignMaterialTreeStripe(rows) {
  if (!Array.isArray(rows)) return []
  rows.forEach((row, i) => {
    applyMaterialTreeStripeBranch(row, i % 2 === 1)
  })
  return rows
}

function applyMaterialTreeStripeBranch(row, stripeAlt) {
  row._stripeAlt = stripeAlt
  if (row.children?.length) {
    row.children.forEach((child) => applyMaterialTreeStripeBranch(child, stripeAlt))
  }
}

/** 收集树形物料行 id，用于展开/收起 */
export function collectMaterialTreeRowKeys(rows) {
  const keys = []
  function walk(list) {
    list.forEach((row) => {
      keys.push(row.id)
      if (row.children?.length) walk(row.children)
    })
  }
  walk(rows || [])
  return keys
}

/** 展平树形物料行（勾选、合计等） */
export function flattenMaterialTreeLines(rows) {
  const result = []
  function walk(list) {
    list.forEach((row) => {
      result.push(row)
      if (row.children?.length) walk(row.children)
    })
  }
  walk(rows || [])
  return result
}

/** 节点是否有下级子节点 */
export function nodeHasTreeChildren(flatNodes, nodeId, lineItems = []) {
  if (!nodeId) return false
  return getOrderedChildNodeIds(nodeId, flatNodes, lineItems).length > 0
}

export { ROOT_ID }
