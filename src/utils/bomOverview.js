import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { getLinesForTreeNode, getRootTreeId } from '@/utils/bomTree'

function roundQty(val) {
  return Math.round(Number(val) * 100) / 100
}

function lookupDrawingNo(line) {
  const code = line.materialCode
  if (!code) return ''
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material?.drawingNo) return material.drawingNo
  const product = productInfoState.products.find((p) => p.code === code)
  return product?.drawingNo || ''
}

function lineToOverviewRow(line, scale) {
  const baseQty = Number(line.unitQty) || 1
  return {
    key: line.id,
    itemName: line.itemName || '—',
    materialCode: line.materialCode || '—',
    specModel: line.specModel || '—',
    material: line.material || '—',
    drawingNo: lookupDrawingNo(line) || '—',
    baseUnitQty: baseQty,
    unitQty: roundQty(baseQty * scale),
    unit: line.unit || '件',
    materialType: line.materialType || '—',
    categoryName: line.categoryName || '—',
    supplyForm: line.supplyForm || '—',
    processDocName: line.processDocName || '—',
    processRoute: line.processRoute || '—',
  }
}

function buildChildren(parentNodeId, flatNodes, lineItems, scale) {
  const lines = getLinesForTreeNode(lineItems, parentNodeId, flatNodes)
  return lines.map((line) => {
    const row = lineToOverviewRow(line, scale)
    if (line.treeNodeId) {
      const children = buildChildren(line.treeNodeId, flatNodes, lineItems, scale)
      if (children.length) row.children = children
    }
    return row
  })
}

/** 构建 BOM 概览树形表格数据 */
export function buildBomOverviewTree(flatNodes, lineItems, scale = 1) {
  const rootId = getRootTreeId(flatNodes)
  return buildChildren(rootId, flatNodes, lineItems, scale)
}

/** 为树形行分配序号（1、1.1、1.2…） */
export function assignOverviewIndexes(rows, prefix = '') {
  return rows.map((row, i) => {
    const index = prefix ? `${prefix}.${i + 1}` : String(i + 1)
    const next = { ...row, index }
    if (row.children?.length) {
      next.children = assignOverviewIndexes(row.children, index)
    }
    return next
  })
}

/** 收集所有行 key，用于展开/收起 */
export function collectOverviewRowKeys(rows) {
  const keys = []
  function walk(list) {
    list.forEach((row) => {
      keys.push(row.key)
      if (row.children?.length) walk(row.children)
    })
  }
  walk(rows)
  return keys
}
