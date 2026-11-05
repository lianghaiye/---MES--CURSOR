/**
 * 需求计算：按产品 BOM 展开物料树（含顶级产品节点），对照当前库存算缺口
 */
import dayjs from 'dayjs'
import { buildEbomSnapshotFromBom, createPlanMaterial } from '@/utils/ebomSnapshot'
import { flattenMaterials, calcGapQty } from '@/utils/material'
import { getTotalStockQty } from '@/utils/inboundLineHelpers'
import { getProductBomById, getOwnActiveBomForItem } from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { formatBomInfoLabel } from '@/utils/itemBomInfo'
import { resolveInTransitOrWipForPlanNode } from '@/utils/planPurchaseInTransit'

/** 供应型态 → 处理方式（汇总抽屉用） */
export function resolveProcessMethod(supplyType) {
  const t = String(supplyType || '')
  if (t === '外购件' || t === '外购') return '采购'
  if (t === '外协件' || t === '外协') return '外协'
  if (t === '自制件' || t === '自制' || t === '组装' || t === '组装件') return '生产'
  return '其他'
}

export function resolveConclusion(gapQty) {
  return Number(gapQty) > 0 ? '库存不足' : '库存充足'
}

function resolveProductMaster(productId, productCode) {
  const products = productInfoState.products || []
  if (productId) {
    const byId = products.find((p) => String(p.id) === String(productId))
    if (byId) return byId
  }
  if (productCode) {
    return products.find((p) => p.code === productCode) || null
  }
  return null
}

function mapRootSupplyType(product, bom) {
  const form = product?.supplyForm || product?.supplyType || bom?.supplyForm || ''
  if (form) return form
  if (product?.isAssemblyPart) return '组装'
  return '自制件'
}

function enrichNode(node, parentPath = [], depth = 0) {
  const code = String(node.code || '').trim()
  const stockQty = code ? getTotalStockQty(code) : 0
  let inTransitQty = 0
  try {
    const hit = resolveInTransitOrWipForPlanNode({ ...node, code })
    inTransitQty = Number(hit?.inTransitQty) || 0
  } catch {
    inTransitQty = 0
  }
  // 缺口口径：需求 − 当前库存（在途仅展示，不参与扣减）
  const demandQty = Number(node.demandQty) || 0
  const gapQty = calcGapQty(demandQty, stockQty)
  const processMethod = resolveProcessMethod(node.supplyType)
  const key = node.id || `dc-${parentPath.join('-')}-${code || 'x'}`

  const children = (node.children || []).map((child, idx) =>
    enrichNode(child, [...parentPath, idx + 1], depth + 1),
  )

  return {
    ...node,
    key,
    depth,
    stockQty,
    availableStock: stockQty,
    inTransitQty,
    gapQty,
    processMethod,
    conclusion: resolveConclusion(gapQty),
    supplier: node.supplier || '',
    leadTimeDays: node.standardCycle || node.leadTimeDays || '',
    arrivalDate: node.arrivalDate || '',
    material: node.material || '',
    specAttr: node.specAttr || '',
    drawingNo: node.drawingNo || '',
    supplyType: node.supplyType || '',
    children: children.length ? children : undefined,
  }
}

function assignSerial(nodes, prefix = '') {
  ;(nodes || []).forEach((node, index) => {
    const serial = prefix ? `${prefix}.${index + 1}` : String(index + 1)
    node.serialNo = serial
    if (node.children?.length) assignSerial(node.children, serial)
  })
}

/** 收集指定深度以内仍需展开的节点 key（depth < maxDepth） */
export function collectExpandKeysToDepth(nodes, maxDepth, depth = 0, acc = []) {
  ;(nodes || []).forEach((n) => {
    if (n.children?.length && depth < maxDepth) {
      if (n.key) acc.push(n.key)
      collectExpandKeysToDepth(n.children, maxDepth, depth + 1, acc)
    }
  })
  return acc
}

export function collectAllExpandKeys(nodes, acc = []) {
  ;(nodes || []).forEach((n) => {
    if (n.children?.length) {
      if (n.key) acc.push(n.key)
      collectAllExpandKeys(n.children, acc)
    }
  })
  return acc
}

/**
 * 按 BOM + 订单数量展开并计算库存缺口（根节点为产品顶级）
 * @param {{ bomId?: string, bom?: object, orderQty: number, product?: object }} params
 */
export function calculateDemandTree({ bomId, bom, orderQty, product }) {
  const qty = Number(orderQty)
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, message: '请填写大于 0 的订单数量' }
  }
  const record = bom || (bomId ? getProductBomById(bomId) : null)
  if (!record) {
    return { ok: false, message: '请先选择产品 BOM' }
  }

  const snapshot = buildEbomSnapshotFromBom(record, qty)
  const childMaterials = snapshot.materials || []

  const master =
    resolveProductMaster(
      product?.id || product?.productId,
      product?.code || product?.productCode,
    ) || {}
  const rootCode = product?.code || product?.productCode || record.itemCode || master.code || ''
  const rootName = product?.name || product?.productName || record.itemName || master.name || ''
  const root = createPlanMaterial({
    id: `dc-root-${record.id}`,
    isTopLevel: true,
    name: rootName,
    code: rootCode,
    spec: product?.spec || master.specModel || master.spec || record.specModel || '',
    specAttr: product?.specAttr || master.specAttr || master.variantSummary || '',
    material: product?.material || master.material || record.material || '',
    drawingNo: product?.drawingNo || master.drawingNo || record.drawingNo || '',
    type: '产品',
    unitUsage: 1,
    unit: product?.unit || master.unit || '件',
    supplyType: mapRootSupplyType(master, record),
    demandQty: qty,
    planQty: qty,
    joinPlan: '是',
    bom: formatBomInfoLabel(record) || record.bomName || '',
    children: childMaterials,
  })

  const tree = [enrichNode(root, [1], 0)]
  assignSerial(tree)

  return {
    ok: true,
    bomId: record.id,
    bomLabel: formatBomInfoLabel(record) || record.bomName || record.bomNo || record.id,
    orderQty: qty,
    calculatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    tree,
    flat: flattenMaterials(tree, []),
  }
}

/** 取产品自有生效 BOM（无则 null） */
export function resolveDefaultBomForProduct(productId) {
  if (!productId) return null
  return getOwnActiveBomForItem('product', productId)
}

/**
 * 按处理方式汇总缺口行（仅缺口 > 0）
 */
export function summarizeDemandGaps(flatRows = []) {
  const groups = {
    采购: [],
    外协: [],
    生产: [],
  }
  flatRows.forEach((row) => {
    if (!(Number(row.gapQty) > 0)) return
    // 顶级产品行不进汇总清单（缺口仍算在树上）
    if (row.isTopLevel) return
    const method = row.processMethod || '其他'
    if (!groups[method]) return
    groups[method].push({
      key: row.key || `${method}-${groups[method].length}`,
      code: row.code || '',
      name: row.name || '',
      spec: row.spec || '',
      material: row.material || '',
      unit: row.unit || '件',
      demandQty: Number(row.demandQty) || 0,
      gapQty: Number(row.gapQty) || 0,
    })
  })
  Object.keys(groups).forEach((k) => {
    groups[k].forEach((item, idx) => {
      item.serialNo = idx + 1
    })
  })
  return groups
}
