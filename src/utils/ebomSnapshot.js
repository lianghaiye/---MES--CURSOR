import dayjs from 'dayjs'
import { loadBomDetailStructure } from '@/utils/bomImport'
import { getLinesForTreeNode, isRootNode, parseMaterialCodeFromNodeTitle } from '@/utils/bomTree'

let materialSeq = 0

function nextMaterialId() {
  materialSeq += 1
  return `ebom-m-${Date.now()}-${materialSeq}`
}

function mapSupplyType(supplyForm) {
  if (supplyForm === '自制件') return '自制件'
  if (supplyForm === '外购件') return '外购件'
  if (supplyForm === '外协件') return '外协件'
  if (supplyForm === '组装' || supplyForm === '组装件') return '组装'
  if (supplyForm === '其他') return '其他'
  return supplyForm || '其他'
}

/** 与生产计划物料行结构一致 */
export function createPlanMaterial(partial = {}) {
  const unitUsage = partial.unitUsage ?? 1
  const demandQty = partial.demandQty ?? 0
  const availableStock = partial.availableStock ?? 0
  const mat = {
    status: '待下达',
    name: '',
    code: '',
    spec: '',
    specAttr: '',
    material: '',
    type: '',
    unitUsage,
    unit: '件',
    supplyType: '其他',
    stockQty: 0,
    availableStock,
    inTransitQty: 0,
    demandQty,
    planQty: partial.planQty ?? Math.max(0, demandQty - availableStock),
    joinPlan: '否',
    designateSupplier: false,
    supplier: '',
    processRoute: '',
    processFile: '',
    standardCycle: '',
    latestProcessTime: '',
    remark: '',
    bom: '',
    workCenter: '',
    personInCharge: '',
    warehouse: '',
    urgency: '',
    workOrderRemark: '',
    children: [],
    ...partial,
  }
  const demand = mat.demandQty ?? 0
  const avail = mat.availableStock ?? 0
  mat.gapQty = Math.max(0, demand - avail)
  if (mat.planQty == null) mat.planQty = mat.gapQty
  return mat
}

function lineToMaterial(line, flatNodes, lineItems, demandQty) {
  const treeNode = flatNodes.find((n) => n.lineId === line.id || n.id === line.treeNodeId)
  const childNodes = treeNode
    ? flatNodes.filter((n) => n.parentId === treeNode.id && !n.isRoot)
    : []

  const children = childNodes.length
    ? childNodes.flatMap((cn) => buildSubtreeFromNode(cn, flatNodes, lineItems, demandQty))
    : []

  const supplyType = mapSupplyType(line.supplyForm)
  return createPlanMaterial({
    id: nextMaterialId(),
    name: line.itemName,
    code: line.materialCode,
    spec: line.specModel,
    specAttr: line.categoryName || '',
    material: line.material || '',
    type: line.materialType || '零部件',
    unitUsage: line.unitQty ?? 1,
    unit: line.unit || '件',
    supplyType,
    demandQty,
    planQty: demandQty,
    bom: line.childBom || '',
    processRoute: line.processRoute || '',
    joinPlan: supplyType === '自制件' ? '是' : '否',
    remark: line.remark || '',
    children,
  })
}

function nodeTitleParts(node) {
  const code = node.materialCode || parseMaterialCodeFromNodeTitle(node.title) || ''
  const name = String(node.title || '')
    .replace(/^\d+\s+/, '')
    .trim()
  return { code, name: name || node.title || code }
}

function isAssemblyGroupNode(node) {
  return node.nodeType === 'virtual' || node.nodeType === 'assembly'
}

function buildSubtreeFromNode(node, flatNodes, lineItems, parentDemand) {
  const nodeQty = Number(node.quantity) || 1
  const nodeDemand = parentDemand * nodeQty

  const lines = getLinesForTreeNode(lineItems, node.id, flatNodes)
  const fromLines = lines.map((line) => {
    const lineQty = Number(line.unitQty) || 1
    return lineToMaterial(line, flatNodes, lineItems, nodeDemand * lineQty)
  })

  const childNodes = flatNodes.filter(
    (n) => n.parentId === node.id && !n.isRoot && !lines.some((l) => l.treeNodeId === n.id),
  )
  const fromChildren = childNodes.flatMap((cn) =>
    buildSubtreeFromNode(cn, flatNodes, lineItems, nodeDemand),
  )

  const childMaterials = [...fromLines, ...fromChildren]
  if (isAssemblyGroupNode(node) && childMaterials.length) {
    const { code, name } = nodeTitleParts(node)
    const supplyType = mapSupplyType('组装')
    return [
      createPlanMaterial({
        id: nextMaterialId(),
        name,
        code,
        spec: node.specModel || '',
        type: '半成品',
        unitUsage: nodeQty,
        unit: '套',
        supplyType,
        demandQty: nodeDemand,
        planQty: nodeDemand,
        joinPlan: '否',
        remark: '',
        children: childMaterials,
      }),
    ]
  }

  return childMaterials
}

function explodeToMaterials(flatNodes, lineItems, salesQty) {
  const root = flatNodes.find((n) => n.isRoot)
  const rootId = root?.id || 'bom-root'
  const qty = Number(salesQty) || 1

  const topNodes = flatNodes.filter(
    (n) => (n.parentId === rootId || n.parentId === '__ROOT__' || !n.parentId) && !n.isRoot,
  )

  if (!topNodes.length) {
    const rootLines = getLinesForTreeNode(lineItems, rootId, flatNodes)
    return rootLines.map((line) => {
      const lineQty = Number(line.unitQty) || 1
      return lineToMaterial(line, flatNodes, lineItems, qty * lineQty)
    })
  }

  return topNodes.flatMap((node) => buildSubtreeFromNode(node, flatNodes, lineItems, qty))
}

/** 从 EBOM 快照解析物料树（优先 materials，否则按 treeNodes 重新展开） */
export function resolveMaterialsFromEbomSnapshot(snapshot, salesQty) {
  if (!snapshot) return []
  if (snapshot.materials?.length) return snapshot.materials
  if (!snapshot.treeNodes?.length) return []
  materialSeq = 0
  return explodeToMaterials(snapshot.treeNodes, snapshot.lineItems || [], salesQty)
}

/**
 * 基于 EBOM 记录与销售数量生成生产计划物料快照
 */
export function buildEbomSnapshotFromEbomRecord(ebom, salesQty) {
  materialSeq = 0
  const flatNodes = ebom.treeNodes || []
  const lineItems = ebom.lineItems || []
  const materials = explodeToMaterials(flatNodes, lineItems, salesQty)

  return {
    snapshotId: `ebom-snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ebomId: ebom.id,
    ebomNo: ebom.ebomNo,
    ebomName: ebom.ebomName,
    bomVersion: ebom.version || '',
    snapshotAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    treeNodes: JSON.parse(JSON.stringify(flatNodes)),
    lineItems: JSON.parse(JSON.stringify(lineItems)),
    materials,
  }
}

/**
 * 基于使用中 BOM 与销售数量生成 EBOM 快照（含展开物料树）
 * @param {object} bom 产品 BOM 记录
 * @param {number} salesQty 销售数量
 */
export function buildEbomSnapshotFromBom(bom, salesQty) {
  materialSeq = 0
  const { flatNodes, lineItems } = loadBomDetailStructure(bom)
  const materials = explodeToMaterials(flatNodes, lineItems, salesQty)

  return {
    snapshotId: `ebom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bomId: bom.id,
    bomNo: bom.bomNo,
    bomVersion: bom.version,
    bomName: bom.bomName,
    snapshotAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    treeNodes: JSON.parse(JSON.stringify(flatNodes)),
    lineItems: JSON.parse(JSON.stringify(lineItems)),
    materials,
  }
}

export function resolveRootNodeId(flatNodes) {
  const root = flatNodes.find((n) => n.isRoot)
  return root?.id || 'bom-root'
}

export { isRootNode }
