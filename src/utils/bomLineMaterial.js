import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { getRootTreeId } from '@/utils/bomTree'

export function createEmptySubLine(parentTreeId) {
  return createBomLineItem({
    parentTreeId,
    treeNodeId: '',
    materialCode: '',
    itemName: '',
    specModel: '',
    categoryName: '',
    materialType: '',
    supplyForm: '',
    unitQty: 1,
    drawingNo: '',
  })
}

export function applyMaterialToLine(flatNodes, lineItems, lineId, material) {
  const idx = lineItems.findIndex((l) => l.id === lineId)
  if (idx === -1) return { flatNodes, lineItems }

  const line = lineItems[idx]
  const patch = {
    materialCode: material.code,
    itemName: material.name,
    specModel: material.specModel || '',
    categoryName: material.categoryName || '零件',
    materialType: material.materialType || '零部件',
    supplyForm: material.supplyForm || '外购件',
    material: material.material || '',
    drawingNo: material.drawingNo || '',
    unit: material.inventoryUnit || line.unit || '件',
    unitPrice: material.unitPrice ?? line.unitPrice ?? 0,
  }

  let nodes = flatNodes
  if (line.treeNodeId) {
    nodes = nodes.map((n) =>
      n.id === line.treeNodeId ? { ...n, title: `${material.code} ${material.name}` } : n,
    )
  } else {
    const parentId = line.parentTreeId || getRootTreeId(flatNodes)
    const node = createBomTreeNode({
      parentId,
      title: `${material.code} ${material.name}`,
      quantity: line.unitQty || 1,
      nodeType: 'material',
      lineId: line.id,
    })
    patch.treeNodeId = node.id
    nodes = [...nodes, node]
  }

  const lines = [...lineItems]
  lines[idx] = { ...line, ...patch }
  return { flatNodes: nodes, lineItems: lines }
}
