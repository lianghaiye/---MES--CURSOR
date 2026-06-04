import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'

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

export function isRootNode(nodeId, flatNodes) {
  if (!nodeId) return true
  if (nodeId === ROOT_ID) return true
  const rootId = getRootTreeId(flatNodes)
  return nodeId === rootId
}

/** 扁平树节点转 ant-design treeData */
export function buildAntTreeData(flatNodes) {
  const root = flatNodes.find((n) => n.isRoot)
  if (!root) return []

  function mapNode(node) {
    const children = flatNodes.filter((n) => n.parentId === node.id && !n.isRoot)
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

/** 当前选中节点下展示的物料行（直属子级） */
export function getLinesForTreeNode(lineItems, treeNodeId, flatNodes = []) {
  const rootId = getRootTreeId(flatNodes)
  const pid = !treeNodeId || isRootNode(treeNodeId, flatNodes) ? rootId : treeNodeId
  return lineItems.filter(
    (l) =>
      l.parentTreeId === pid ||
      l.treeNodeId === pid ||
      (l.parentTreeId === '__ROOT__' && (pid === rootId || pid === ROOT_ID)),
  )
}

export function addChildMaterial(flatNodes, lineItems, parentId, material) {
  const parent = flatNodes.find((n) => n.id === parentId)
  if (!parent) return { flatNodes, lineItems }

  const line = createBomLineItem({
    parentTreeId: parentId,
    treeNodeId: '',
    materialCode: material.code,
    itemName: material.name,
    specModel: material.specModel || '',
    categoryName: material.categoryName || '零件',
    materialType: material.materialType || '零部件',
    supplyForm: material.supplyForm || '外购件',
    material: material.material || '',
    unit: material.inventoryUnit || '件',
    unitPrice: material.unitPrice || 0,
  })

  const node = createBomTreeNode({
    parentId,
    title: `${material.code} ${material.name}`,
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
      line.parentTreeId === '__ROOT__'
        ? ROOT_ID
        : idMap.get(line.parentTreeId) || ROOT_ID,
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

export { ROOT_ID }
