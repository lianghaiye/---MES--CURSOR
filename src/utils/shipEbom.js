import { mapScatterShipDisplayLine } from '@/utils/deliveryLine'

/** 支持展开下级 BOM 的供应型态（未展开时可勾选父项按半成品发运） */
export const EXPANDABLE_SUPPLY_TYPES = ['组装', '虚拟件', '虚拟']

export function isExpandableSupplyType(supplyType) {
  const t = String(supplyType || '')
  return EXPANDABLE_SUPPLY_TYPES.some((key) => t.includes(key))
}

export function createShipMaterialPickRow(mat, depth = 0, parentMaterialId = null) {
  const demandQty = Number(mat.demandQty) || 0
  const availableStock = Number(mat.availableStock) ?? Number(mat.stockQty) ?? 0
  const gapQty = Math.max(0, demandQty - availableStock)
  const supplyType = mat.supplyType || '其他'
  const materialType = mat.type || mat.materialType || ''
  const hasChildren = Boolean(mat.children?.length)
  const canExpand = hasChildren && isExpandableSupplyType(supplyType)

  return {
    materialId: mat.id,
    parentMaterialId,
    name: mat.name,
    code: mat.code,
    spec: mat.spec,
    unit: mat.unit || '件',
    supplyType,
    materialType,
    demandQty,
    availableStock,
    gapQty,
    depth,
    hasChildren,
    canExpand,
    /** 由 refreshMaterialPickSelectability 按是否展开动态计算 */
    selectable: true,
    selected: false,
    shipQty: 0,
  }
}

function buildPickRowsFromTree(materials, parentMaterialId = null, depth = 0, out = []) {
  if (!Array.isArray(materials)) return out
  for (const mat of materials) {
    const row = createShipMaterialPickRow(mat, depth, parentMaterialId)
    out.push(row)
    if (mat.children?.length) {
      buildPickRowsFromTree(mat.children, row.materialId, depth + 1, out)
    }
  }
  return out
}

export function buildShipMaterialRowsFromSnapshot(snapshot) {
  return buildPickRowsFromTree(snapshot?.materials || [])
}

/** 将已保存的勾选状态合并到完整拣选列表 */
export function mergeMaterialPicksWithSaved(allRows, savedRows) {
  const savedMap = new Map((savedRows || []).map((r) => [r.materialId, r]))
  return allRows.map((row) => {
    const saved = savedMap.get(row.materialId)
    if (!saved) return { ...row }
    return {
      ...row,
      selected: Boolean(saved.selected),
      shipQty: Number(saved.shipQty) || 0,
    }
  })
}

function rowsByParent(allRows) {
  const map = new Map()
  for (const row of allRows) {
    const key = row.parentMaterialId ?? '__root__'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  }
  return map
}

function shouldRevealChildren(row, expandedIds) {
  if (!row.hasChildren) return false
  return expandedIds.has(row.materialId)
}

/** 按展开状态计算表格可见行 */
export function getVisibleMaterialPickRows(allRows, expandedMaterialIds = []) {
  const expanded = new Set(expandedMaterialIds)
  const byParent = rowsByParent(allRows)
  const visible = []

  function walk(parentKey, depth) {
    const siblings = byParent.get(parentKey) || []
    for (const row of siblings) {
      const item = { ...row, depth }
      visible.push(item)
      if (shouldRevealChildren(row, expanded)) {
        walk(row.materialId, depth + 1)
      }
    }
  }

  walk('__root__', 0)
  return visible
}

export function getExpandableMaterialIds(allRows) {
  return (allRows || []).filter((r) => r.canExpand).map((r) => r.materialId)
}

export function isAssemblySupplyRow(row) {
  return String(row?.supplyType || '').includes('组装')
}

export function isVirtualMaterialRow(row) {
  const t = String(row?.materialType || '')
  const s = String(row?.supplyType || '')
  return t === '虚拟件' || s.includes('虚拟')
}

/** 某父项下全部后代行（不含父项自身） */
export function getDescendantPickRows(allRows, parentMaterialId) {
  const byParent = rowsByParent(allRows)
  const out = []
  const stack = [parentMaterialId]
  while (stack.length) {
    const pid = stack.pop()
    for (const child of byParent.get(pid) || []) {
      out.push(child)
      stack.push(child.materialId)
    }
  }
  return out
}

/** 打开抽屉时的默认展开：虚拟件默认展开二级；已勾选子项的组装父项保持展开 */
export function resolveInitialExpandedMaterialIds(allRows, savedRows = []) {
  const expanded = new Set()
  const savedMap = new Map((savedRows || []).map((r) => [r.materialId, r]))

  for (const row of allRows || []) {
    if (!row.canExpand) continue
    if (isVirtualMaterialRow(row)) {
      expanded.add(row.materialId)
      continue
    }
    const descendants = getDescendantPickRows(allRows, row.materialId)
    if (descendants.some((d) => savedMap.get(d.materialId)?.selected)) {
      expanded.add(row.materialId)
    }
  }
  return [...expanded]
}

/** 取消某父项下所有后代的勾选 */
export function unselectDescendantPicks(allRows, parentMaterialId) {
  const byParent = rowsByParent(allRows)
  const stack = [parentMaterialId]
  while (stack.length) {
    const pid = stack.pop()
    for (const child of byParent.get(pid) || []) {
      child.selected = false
      child.shipQty = 0
      stack.push(child.materialId)
    }
  }
}

/**
 * 发运勾选规则：
 * - 可展开父项：未展开时可勾选（按半成品发运）；展开后父项不可选，仅可选下级
 * - 父项未展开时，下级不可选（不可见）
 */
export function refreshMaterialPickSelectability(allRows, expandedMaterialIds = []) {
  const expanded = new Set(expandedMaterialIds)
  for (const row of allRows || []) {
    if (row.canExpand) {
      const isExpanded = expanded.has(row.materialId)
      row.selectable = !isExpanded
      if (isExpanded && row.selected) {
        row.selected = false
        row.shipQty = 0
      }
      continue
    }
    const parentId = row.parentMaterialId
    if (!parentId) {
      row.selectable = true
      continue
    }
    const parent = allRows.find((r) => r.materialId === parentId)
    if (parent?.canExpand && !expanded.has(parentId)) {
      row.selectable = false
      if (row.selected) {
        row.selected = false
        row.shipQty = 0
      }
    } else {
      row.selectable = true
    }
  }
  return allRows
}

export function createAccessoryPickRows(kits) {
  const rows = []
  for (const kit of kits || []) {
    for (const item of kit.items || []) {
      rows.push({
        kitId: kit.id,
        kitCode: kit.kitCode,
        kitName: kit.kitName,
        itemId: item.id,
        materialCode: item.materialCode,
        name: item.name,
        spec: item.spec,
        unit: item.unit,
        qtyPerKit: item.qtyPerKit,
        stockQty: item.stockQty ?? 0,
        selected: false,
        shipQty: 0,
      })
    }
  }
  return rows
}

export function initScatterShipment(salesLine, order) {
  const display = mapScatterShipDisplayLine(salesLine, order)
  if (!display) return null

  const snapshot =
    salesLine.ebomSnapshot ||
    (salesLine.materials?.length ? { materials: salesLine.materials } : null)

  return {
    ...display,
    ebomSnapshot: snapshot,
    ebomSnapshotId: snapshot?.snapshotId,
    materialPicks: buildShipMaterialRowsFromSnapshot(snapshot),
    remark: '',
  }
}

/** 已勾选且填写发运数量的 EBOM 行 */
export function getSelectedMaterialPicks(shipment) {
  return (shipment?.materialPicks || []).filter(
    (r) => r.selectable !== false && r.selected && Number(r.shipQty) > 0,
  )
}

export function countScatterPicks(shipment) {
  const materials = getSelectedMaterialPicks(shipment).length
  return { materials, accessories: 0 }
}

/** EBOM 需发物料项需求数之和（可发运叶子/明细项） */
export function sumEbomDemandQty(materialPicks) {
  return (materialPicks || [])
    .filter((r) => r.selectable !== false)
    .reduce((s, r) => s + (Number(r.demandQty) || 0), 0)
}

/** 本次已选发运物料数量合计 */
export function sumSelectedShipQty(shipment) {
  return getSelectedMaterialPicks(shipment).reduce((s, r) => s + (Number(r.shipQty) || 0), 0)
}

function formatProgressQty(val) {
  const n = Number(val) || 0
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(3).replace(/\.?0+$/, '')
}

/** 散件发货进度：已发物料数 / EBOM 需发物料需求数之和 */
export function formatScatterShipProgress(shipment) {
  const shippedSum = sumSelectedShipQty(shipment)
  const demandSum = sumEbomDemandQty(shipment?.materialPicks)
  return `${formatProgressQty(shippedSum)} / ${formatProgressQty(demandSum)}`
}

/** 散件行发货状态（按已选物料与 EBOM 需求对比） */
export function calcScatterLineShipStatus(shipment) {
  const picked = getSelectedMaterialPicks(shipment)
  if (!picked.length) return '未发货'
  const shipSum = picked.reduce((s, r) => s + (Number(r.shipQty) || 0), 0)
  const demandSum = sumEbomDemandQty(shipment?.materialPicks)
  if (demandSum <= 0) return picked.length ? '部分发货' : '未发货'
  if (shipSum >= demandSum - 1e-9) return '已发完'
  return '部分发货'
}

export function refreshScatterShipmentMeta(shipment) {
  if (!shipment) return
  shipment.lineShipStatus = calcScatterLineShipStatus(shipment)
}

/** 从发运单中移除已添加的物料项 */
export function removeMaterialPickFromShipment(shipment, materialId) {
  const row = shipment?.materialPicks?.find((r) => r.materialId === materialId)
  if (!row) return false
  row.selected = false
  row.shipQty = 0
  refreshScatterShipmentMeta(shipment)
  return true
}

/** @deprecated 使用 buildShipMaterialRowsFromSnapshot */
export function flattenEbomMaterials(materials, depth = 0, out = []) {
  return buildPickRowsFromTree(materials, null, depth, out)
}
