import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getProductBomById, productBomState } from '@/store/productBomStore'
import { getRootTreeId } from '@/utils/bomTree'
import { normalizeVersionDisplay } from '@/utils/bomVersion'
import { findParentBomReferences, getBomLineItems } from '@/utils/bomVersionReference'
import { normalizeBomStatusValue } from '@/mock/productBomOptions'

function resolveMaster(bom) {
  if (!bom?.itemId) return null
  if (bom.itemType === 'product') {
    return productInfoState.products.find((p) => p.id === bom.itemId)
  }
  return materialInfoState.materials.find((m) => m.id === bom.itemId)
}

function resolveField(bom, master, field) {
  const fromBom = bom?.[field]
  if (fromBom !== undefined && fromBom !== null && String(fromBom).trim() !== '') {
    return fromBom
  }
  const fromMaster = master?.[field]
  if (fromMaster !== undefined && fromMaster !== null && String(fromMaster).trim() !== '') {
    return fromMaster
  }
  return '—'
}

function calcDirectSubItemCount(bom) {
  const full = getProductBomById(bom.id) || bom
  const lines = getBomLineItems(full)
  const nodes = full.treeNodes || []
  if (!nodes.length && !lines.length) return 0
  const rootId = nodes.length ? getRootTreeId(nodes) : '__ROOT__'
  return lines.filter((line) => line.parentTreeId === rootId).length
}

function toRelationRow(bom, unitQty, refBomVersion) {
  const full = getProductBomById(bom.id) || bom
  const master = resolveMaster(full)
  const version =
    refBomVersion != null && String(refBomVersion).trim() !== ''
      ? normalizeVersionDisplay(refBomVersion)
      : normalizeVersionDisplay(full.version) || '—'
  return {
    id: full.id,
    bomId: full.id,
    bomStatus: normalizeBomStatusValue(full.status),
    bomName: full.bomName || '—',
    bomNo: full.bomNo || '—',
    refBomVersion: version,
    itemName: full.itemName || master?.name || '—',
    specModel: resolveField(full, master, 'specModel'),
    material: resolveField(full, master, 'material'),
    drawingNo: resolveField(full, master, 'drawingNo'),
    unitQty: unitQty != null && unitQty !== '' ? Number(unitQty).toFixed(2) : '—',
    subItemCount: calcDirectSubItemCount(full),
    version: full.version || '—',
  }
}

function resolveChildBomFromLine(line) {
  if (line.childBomId) {
    const byId = getProductBomById(line.childBomId)
    if (byId) return byId
  }

  const lineVer = normalizeVersionDisplay(line.childBomVersion)

  if (line.referencedItemId && line.referencedItemType) {
    const matched = productBomState.boms.filter(
      (b) => b.itemId === line.referencedItemId && b.itemType === line.referencedItemType,
    )
    if (lineVer) {
      const byVer = matched.find((b) => normalizeVersionDisplay(b.version) === lineVer)
      if (byVer) return ensureBomRow(byVer)
    }
    if (matched.length === 1) return ensureBomRow(matched[0])
  }

  const childBom = String(line.childBom || '').trim()
  if (childBom) {
    const byName = productBomState.boms.find((b) => b.bomName === childBom || b.bomNo === childBom)
    if (byName) return ensureBomRow(byName)
  }

  return null
}

function ensureBomRow(bom) {
  return getProductBomById(bom.id) || bom
}

function lineHasChildBomRef(line) {
  return Boolean(line.childBomId || line.childBom || line.referencedItemId)
}

/** 当前 BOM 引用的子件 BOM（按 BOM 添加） */
export function findChildBomReferenceRows(bom, lineItemsOverride) {
  const lines = lineItemsOverride ?? getBomLineItems(bom)
  const rows = []
  const seen = new Set()

  lines.forEach((line) => {
    if (!lineHasChildBomRef(line)) return
    const childBom = resolveChildBomFromLine(line)
    if (!childBom || seen.has(childBom.id)) return
    seen.add(childBom.id)
    rows.push(toRelationRow(childBom, line.unitQty, line.childBomVersion || childBom.version))
  })

  return rows
}

/** 引用本 BOM 的父级 BOM */
export function findParentBomReferenceRows(bom) {
  if (!bom?.id) return []
  const full = getProductBomById(bom.id) || bom
  const refs = findParentBomReferences(full)
  return refs
    .map((ref) => {
      const parent = getProductBomById(ref.parentBomId)
      if (!parent) return null
      const lines = getBomLineItems(parent)
      const matchedLine = lines.find((line) => ref.lineIds.includes(line.id))
      return toRelationRow(
        parent,
        matchedLine?.unitQty,
        matchedLine?.childBomVersion || full.version,
      )
    })
    .filter(Boolean)
}
