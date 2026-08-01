import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { getRootTreeId } from '@/utils/bomTree'
import { createSpuLineDraft, applyResolvedSkuToBomLine, isSpuLine } from '@/utils/spuLineResolve'
import { inferUomRelation } from '@/utils/variableLengthMaterial'

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

function isSpuPickerPayload(material) {
  return Boolean(material?.pickType === 'spu' || material?.isSpuTemplate || material?.isSpuLine)
}

export function applyMaterialToLine(flatNodes, lineItems, lineId, material) {
  if (isSpuPickerPayload(material)) {
    return applySpuDraftToLine(flatNodes, lineItems, lineId, material)
  }

  const idx = lineItems.findIndex((l) => l.id === lineId)
  if (idx === -1) return { flatNodes, lineItems }

  const line = lineItems[idx]
  const isVL = Boolean(material.isVariableLength)
  const stockUnit = isVL
    ? material.stockUnit || material.inventoryUnit || '米'
    : material.inventoryUnit || line.unit || '件'
  const patch = {
    materialCode: material.code,
    itemName: material.name,
    specModel: material.specModel || '',
    categoryName: material.categoryName || '零件',
    materialType: material.materialType || '零部件',
    supplyForm: material.supplyForm || '外购件',
    material: material.material || '',
    drawingNo: material.drawingNo || '',
    unit: stockUnit,
    unitPrice: material.unitPrice ?? line.unitPrice ?? 0,
    isVariableLength: isVL,
    uomRelation: isVL ? inferUomRelation(stockUnit, material.uomRelation) : '',
    blankLength: isVL ? (line.blankLength ?? null) : null,
    blankArea: isVL ? (line.blankArea ?? null) : null,
    blankLossRate: isVL ? (line.blankLossRate ?? null) : null,
    isSpuLine: false,
    spuId: material.spuId || '',
    spuName: material.spuName || '',
    variantValues: material.variantValues ? { ...material.variantValues } : {},
    variantSummary: material.variantSummary || '',
    productId: material.itemId || material.id || '',
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

/** 子项内选择产品族：写入草稿行（未解析 SKU） */
export function applySpuDraftToLine(flatNodes, lineItems, lineId, spuPayload) {
  const idx = lineItems.findIndex((l) => l.id === lineId)
  if (idx === -1) return { flatNodes, lineItems }

  const draft = createSpuLineDraft(spuPayload)
  const line = lineItems[idx]
  const patch = {
    materialCode: '',
    itemName: draft.productName,
    specModel: '',
    material: '',
    drawingNo: draft.drawingNo || '',
    categoryName: draft.category || line.categoryName || '零件',
    materialType: line.materialType || '零部件',
    supplyForm: line.supplyForm || '外购件',
    unit: draft.unit || line.unit || '件',
    unitPrice: line.unitPrice || 0,
    isSpuLine: true,
    spuId: draft.spuId,
    spuName: draft.spuName,
    variantValues: { ...draft.variantValues },
    variantSummary: '',
    productId: '',
  }

  let nodes = flatNodes
  const title = draft.productName || '产品族'
  if (line.treeNodeId) {
    nodes = nodes.map((n) => (n.id === line.treeNodeId ? { ...n, title } : n))
  } else {
    const parentId = line.parentTreeId || getRootTreeId(flatNodes)
    const node = createBomTreeNode({
      parentId,
      title,
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

/** 变体配置确认后刷新 BOM 行与树节点标题 */
export function applyResolvedSkuToBomLineInTree(flatNodes, lineItems, lineId, resolved) {
  const idx = lineItems.findIndex((l) => l.id === lineId)
  if (idx === -1 || !resolved?.sku) return { flatNodes, lineItems, ok: false }

  const lines = [...lineItems]
  const line = { ...lines[idx] }
  applyResolvedSkuToBomLine(line, resolved)
  lines[idx] = line

  let nodes = flatNodes
  if (line.treeNodeId) {
    const title = `${line.materialCode} ${line.itemName}`.trim()
    nodes = nodes.map((n) => (n.id === line.treeNodeId ? { ...n, title } : n))
  }

  return { flatNodes: nodes, lineItems: lines, ok: true, line }
}

export { isSpuLine }
