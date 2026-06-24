import { parseMaterialCodeFromNodeTitle, getOrderedChildNodeIds } from '@/utils/bomTree'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'

function countDirectChildren(flatNodes, nodeId) {
  return flatNodes.filter((n) => n.parentId === nodeId && !n.isRoot).length
}

function resolveNodeLine(node, lineItems) {
  if (node.lineId) return lineItems.find((l) => l.id === node.lineId)
  if (node.id) return lineItems.find((l) => l.treeNodeId === node.id)
  return null
}

function lookupMasterByCode(code) {
  if (!code) return null
  return (
    materialInfoState.materials.find((m) => m.code === code) ||
    productInfoState.products.find((p) => p.code === code) ||
    null
  )
}

/** 解析树节点对应的父项展示信息 */
export function resolveBomNodeItemInfo(node, lineItems, rootForm = {}) {
  if (!node) return null

  if (node.isRoot) {
    return {
      itemName: rootForm.itemName || '',
      itemCode: rootForm.itemCode || '',
      specModel: rootForm.specModel || '',
      material: rootForm.material || '',
      drawingNo: rootForm.drawingNo || '',
      techParams: rootForm.techParams || '',
      processRoute: rootForm.processRoute || '',
      matchingRequirements: rootForm.matchingRequirements || '',
    }
  }

  const line = resolveNodeLine(node, lineItems)
  const master = lookupMasterByCode(line?.materialCode)

  return {
    itemName: line?.itemName || node.title || '',
    itemCode: line?.materialCode || '',
    specModel: line?.specModel || master?.specModel || '',
    material: line?.material || master?.material || '',
    drawingNo: master?.drawingNo || '',
    techParams: master?.techParams || '',
    processRoute: line?.processRoute || master?.production?.defaultProcessRoute || '',
    matchingRequirements: master?.matchingRequirements || master?.remark || '',
  }
}

export { resolveNodeLine }

/**
 * BOM 树层级编号：顶级 0；一级 1、2、3…；二级 1.1、1.2…；三级 1.1.1…
 */
export function buildBomTreeLevelNoMap(flatNodes, lineItems = []) {
  const map = new Map()
  const root = flatNodes.find((n) => n.isRoot)
  if (!root) return map

  map.set(root.id, '0')

  function walk(parentId, parentLevelNo) {
    const childIds = getOrderedChildNodeIds(parentId, flatNodes, lineItems)
    childIds.forEach((childId, idx) => {
      const levelNo = parentLevelNo === '0' ? String(idx + 1) : `${parentLevelNo}.${idx + 1}`
      map.set(childId, levelNo)
      walk(childId, levelNo)
    })
  }

  walk(root.id, '0')
  return map
}

export function getBomTreeLevelNo(nodeId, flatNodes, lineItems = []) {
  const node = flatNodes.find((n) => n.id === nodeId)
  if (!node) return ''
  if (node.isRoot) return '0'
  return buildBomTreeLevelNoMap(flatNodes, lineItems).get(nodeId) || ''
}

/** 按字段配置格式化树节点标题 */
export function formatBomTreeNodeTitle(
  node,
  flatNodes,
  lineItems,
  fieldSettings = [],
  rootMeta = {},
) {
  const visible = [...fieldSettings].filter((f) => !f.hidden).sort((a, b) => a.order - b.order)

  const line = resolveNodeLine(node, lineItems)
  const levelNoMap = buildBomTreeLevelNoMap(flatNodes, lineItems)
  const levelNo = node.isRoot ? '0' : levelNoMap.get(node.id) || ''
  const code =
    line?.materialCode ||
    node.materialCode ||
    parseMaterialCodeFromNodeTitle(node.title) ||
    (node.isRoot ? rootMeta.code : '') ||
    ''
  const name = line?.itemName || (node.isRoot ? rootMeta.name : '') || node.title || ''
  const spec = line?.specModel || (node.isRoot ? rootMeta.specModel : '') || ''
  const supply = line?.supplyForm || (node.isRoot ? rootMeta.supplyForm : '') || ''
  const childCount = countDirectChildren(flatNodes, node.id)
  const qtySuffix = node.isRoot ? (rootMeta.subItemCount ?? childCount) : childCount

  const valueMap = {
    levelNo,
    productCode: code,
    productName: name,
    productSpec: spec,
    supplyForm: supply,
    subItemCount: String(qtySuffix),
  }

  const parts = visible
    .filter((f) => f.key !== 'subItemCount')
    .map((f) => valueMap[f.key])
    .filter((v) => v !== undefined && v !== '')

  const showCount = visible.some((f) => f.key === 'subItemCount')
  if (showCount) {
    parts.push(`(${qtySuffix})`)
  }

  return parts.join(' | ') || node.title || '—'
}

/** 按关键字过滤树（保留匹配节点及其祖先） */
export function filterTreeNodesByKeyword(flatNodes, keyword, rootMeta = {}) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return flatNodes

  const matchedIds = new Set()
  flatNodes.forEach((n) => {
    const text = [n.title, n.materialCode, rootMeta.code, rootMeta.name, rootMeta.specModel]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (text.includes(kw)) matchedIds.add(n.id)
  })

  if (!matchedIds.size) return []

  const keep = new Set()
  matchedIds.forEach((id) => {
    let cur = flatNodes.find((n) => n.id === id)
    while (cur) {
      keep.add(cur.id)
      if (!cur.parentId) break
      cur = flatNodes.find((n) => n.id === cur.parentId)
    }
  })

  return flatNodes.filter((n) => keep.has(n.id))
}
