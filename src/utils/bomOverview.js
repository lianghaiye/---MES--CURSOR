import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import {
  getLinesForTreeNode,
  getOrderedChildNodeIds,
  getRootTreeId,
  parseMaterialCodeFromNodeTitle,
} from '@/utils/bomTree'
import { formatSubstitutePartLabel } from '@/mock/bomMaterialColumns'
import { normalizeSupplyForm } from '@/utils/masterDataMigrate'

function roundQty(val) {
  return Math.round(Number(val) * 100) / 100
}

function lookupMasterProduction(code) {
  if (!code) return { supplyForm: '', production: {} }
  const product = productInfoState.products.find((p) => p.code === code)
  const material = materialInfoState.materials.find((m) => m.code === code)
  const supplyForm = (material || product)?.supplyForm || ''
  const production = product?.production || material?.production || {}
  return { supplyForm, production }
}

/** 按供应型态格式化供应单位展示文案 */
export function formatSupplyUnitDisplay(supplyForm, production = {}) {
  const sf = normalizeSupplyForm(supplyForm)
  const supplier = String(production.defaultSupplier || '').trim()
  const workCenter = String(production.defaultWorkCenter || '').trim()

  if (sf === '外协件') {
    const outsource = String(
      production.defaultOutsourceSupplier || production.defaultSupplier || '',
    ).trim()
    return outsource ? `外协：${outsource}` : '外协：—'
  }
  if (sf === '外购件') {
    return supplier ? `采购：${supplier}` : '采购：—'
  }
  if (sf === '自制件') {
    return workCenter ? `自制：${workCenter}` : '自制：—'
  }
  return '—'
}

function lookupDrawingNo(line) {
  const code = line.materialCode
  if (!code) return ''
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material?.drawingNo) return material.drawingNo
  const product = productInfoState.products.find((p) => p.code === code)
  return product?.drawingNo || ''
}

function lookupSupplyUnit(line) {
  const master = lookupMasterProduction(line.materialCode)
  const supplyForm = line.supplyForm || master.supplyForm
  return formatSupplyUnitDisplay(supplyForm, master.production)
}

function lineToOverviewRow(line, scale, materialQtyByCode) {
  const baseQty = Number(line.unitQty) || 1
  const code = line.materialCode || ''
  const qtyInfo = materialQtyByCode?.[code]
  const row = {
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
    supplyUnit: lookupSupplyUnit(line),
    substitutePart: formatSubstitutePartLabel(line) || '—',
    processDocName: line.processDocName || '—',
    processRoute: line.processRoute || '—',
    remark: line.remark || '—',
  }
  if (materialQtyByCode) {
    row.stockQty =
      qtyInfo?.stockQty != null && qtyInfo.stockQty !== '' ? roundQty(qtyInfo.stockQty) : '—'
    row.demandQty =
      qtyInfo?.demandQty != null && qtyInfo.demandQty !== '' ? roundQty(qtyInfo.demandQty) : '—'
  }
  return row
}

function parseNodeTitle(title) {
  const t = String(title || '').trim()
  const code = parseMaterialCodeFromNodeTitle(t)
  if (code) {
    return { materialCode: code, itemName: t.slice(code.length).trim() || t }
  }
  return { materialCode: '—', itemName: t || '—' }
}

function nodeToOverviewRow(node, scale, materialQtyByCode, children) {
  const parsed = parseNodeTitle(node.title)
  const code = node.materialCode || parsed.materialCode
  const master = lookupMasterProduction(code !== '—' ? code : '')
  const baseQty = Number(node.quantity) || 1
  const row = {
    key: `node-${node.id}`,
    itemName: parsed.itemName,
    materialCode: code || '—',
    specModel: '—',
    material: '—',
    drawingNo: '—',
    baseUnitQty: baseQty,
    unitQty: roundQty(baseQty * scale),
    unit: '件',
    materialType: node.nodeType === 'assembly' ? '部件' : '—',
    categoryName: '—',
    supplyForm: master.supplyForm || '—',
    supplyUnit: formatSupplyUnitDisplay(master.supplyForm, master.production),
    substitutePart: '—',
    processDocName: '—',
    processRoute: '—',
    remark: '—',
  }
  if (children?.length) row.children = children
  if (materialQtyByCode) {
    row.stockQty = '—'
    row.demandQty = '—'
  }
  return row
}

function buildChildren(parentNodeId, flatNodes, lineItems, scale, materialQtyByCode) {
  const lines = getLinesForTreeNode(lineItems, parentNodeId, flatNodes)
  const result = []
  const linkedNodeIds = new Set()

  lines.forEach((line) => {
    const row = lineToOverviewRow(line, scale, materialQtyByCode)
    const subNodeId = line.treeNodeId
    if (subNodeId && subNodeId !== parentNodeId) {
      linkedNodeIds.add(subNodeId)
      const children = buildChildren(subNodeId, flatNodes, lineItems, scale, materialQtyByCode)
      if (children.length) row.children = children
    }
    result.push(row)
  })

  getOrderedChildNodeIds(parentNodeId, flatNodes, lineItems).forEach((childNodeId) => {
    if (linkedNodeIds.has(childNodeId)) return
    const node = flatNodes.find((n) => n.id === childNodeId)
    if (!node) return
    const nodeChildren = buildChildren(childNodeId, flatNodes, lineItems, scale, materialQtyByCode)
    if (!nodeChildren.length) return
    result.push(nodeToOverviewRow(node, scale, materialQtyByCode, nodeChildren))
  })

  return result
}

/** 构建 BOM 概览树形表格数据 */
export function buildBomOverviewTree(flatNodes, lineItems, scale = 1, materialQtyByCode = null) {
  const rootId = getRootTreeId(flatNodes)
  return buildChildren(rootId, flatNodes, lineItems, scale, materialQtyByCode)
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

/** 将树形概览数据展平为打印/预览列表 */
export function flattenOverviewRows(rows, depth = 0) {
  const result = []
  rows.forEach((row) => {
    const { children, ...rest } = row
    result.push({ ...rest, depth })
    if (children?.length) {
      result.push(...flattenOverviewRows(children, depth + 1))
    }
  })
  return result
}
