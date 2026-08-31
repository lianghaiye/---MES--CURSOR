/** 明细行是否仍引用子件 BOM（供关联查询 / 升版同步） */
export function lineHasChildBomRef(line) {
  return Boolean(line?.childBomId || line?.childBom || line?.referencedItemId)
}

/** 清除行上的子件 BOM 引用标记（保留下级结构副本） */
export function clearLineChildBomRef(line) {
  if (!line || !lineHasChildBomRef(line)) return false
  line.childBomId = undefined
  line.childBom = ''
  line.childBomVersion = ''
  line.referencedItemId = undefined
  line.referencedItemType = undefined
  return true
}

function getNodeParentId(flatNodes, nodeId) {
  return flatNodes.find((n) => n.id === nodeId)?.parentId || null
}

function getLineByTreeNodeId(lineItems, nodeId) {
  return lineItems.find((l) => l.treeNodeId === nodeId) || null
}

/**
 * 查找「被编辑明细行」所属的子件 BOM 引用父行（不含引用行自身）
 * @returns {object|null} 带 childBomId 的上级明细行
 */
export function findChildBomRefAncestorLine(flatNodes, lineItems, editedLineId) {
  const edited = lineItems.find((l) => l.id === editedLineId)
  if (!edited?.treeNodeId) return null

  let nodeId = edited.treeNodeId
  let parentId = getNodeParentId(flatNodes, nodeId)

  while (parentId) {
    const parentLine = getLineByTreeNodeId(lineItems, parentId)
    if (parentLine && lineHasChildBomRef(parentLine)) {
      return parentLine
    }
    nodeId = parentId
    parentId = getNodeParentId(flatNodes, nodeId)
  }
  return null
}

/**
 * 按树节点查找需断开的子件 BOM 引用父行
 * - 在引用行下新增明细：parentTreeId 为引用行节点
 * - 在引用行下级编辑：向上追溯引用行
 */
export function findChildBomRefAncestorByTreeNode(flatNodes, lineItems, treeNodeId) {
  if (!treeNodeId) return null

  const hostLine = getLineByTreeNodeId(lineItems, treeNodeId)
  if (hostLine && lineHasChildBomRef(hostLine)) {
    return hostLine
  }

  let nodeId = treeNodeId
  let parentId = getNodeParentId(flatNodes, nodeId)

  while (parentId) {
    const parentLine = getLineByTreeNodeId(lineItems, parentId)
    if (parentLine && lineHasChildBomRef(parentLine)) {
      return parentLine
    }
    nodeId = parentId
    parentId = getNodeParentId(flatNodes, nodeId)
  }
  return null
}

/** 下级明细变更时断开上级子件 BOM 引用 */
export function detachChildBomRefForDescendantEdit(flatNodes, lineItems, editedLineId) {
  const ancestor = findChildBomRefAncestorLine(flatNodes, lineItems, editedLineId)
  if (!ancestor) return { detached: false, lineItems }
  return {
    detached: clearLineChildBomRef(ancestor),
    ancestorLineId: ancestor.id,
    lineItems,
  }
}

/** 在引用行子树下新增明细等场景：按父树节点断开引用 */
export function detachChildBomRefForTreeNodeEdit(flatNodes, lineItems, treeNodeId) {
  const ancestor = findChildBomRefAncestorByTreeNode(flatNodes, lineItems, treeNodeId)
  if (!ancestor) return { detached: false, lineItems }
  return {
    detached: clearLineChildBomRef(ancestor),
    ancestorLineId: ancestor.id,
    lineItems,
  }
}
