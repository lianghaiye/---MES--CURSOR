/**
 * 产品 BOM 编辑升版演示：已归档旧版 + 生效新版，变更来源「产品BOM编辑」
 * 打开「化工流程泵 IH80-65-125」产品 BOM 详情 → 历史版本
 */
import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { BOM_STATUS, isBomActive } from '@/mock/productBomOptions'
import { BOM_CHANGE_SOURCE_TYPE, BOM_MANUAL_CHANGE_SOURCE_LABEL } from '@/constants/bomChangeSource'
import { formatBomVersion, getBomVersionYear, nextSubVersionForYear } from '@/utils/bomVersion'

export const MANUAL_BOM_EDIT_DEMO = {
  marker: '_manualBomEditDemo',
  oldId: 'bom-manual-edit-demo-old',
  preferredItemIds: ['prod-00006', 'prod-00005', 'prod-00004'],
  addedMaterialCode: 'WL-SEAL-GHMB-35',
  addedMaterialName: '机械密封 GHMB-35',
}

function cloneBom(bom) {
  return JSON.parse(JSON.stringify(bom))
}

function pickTargetActiveBom(boms) {
  const byId = (itemId) =>
    boms.find(
      (b) =>
        b.itemType === 'product' &&
        String(b.itemId) === itemId &&
        isBomActive(b) &&
        (b.lineItems || []).length,
    )
  for (const itemId of MANUAL_BOM_EDIT_DEMO.preferredItemIds) {
    const hit = byId(itemId)
    if (hit) return hit
  }
  return boms.find((b) => b.itemType === 'product' && isBomActive(b) && (b.lineItems || []).length)
}

function bumpVersion(bom, boms) {
  const year = getBomVersionYear()
  const groupVersions = boms
    .filter((b) => b.versionGroupId === bom.versionGroupId)
    .map((b) => b.version)
  const sub = nextSubVersionForYear([...groupVersions, bom.version], year)
  bom.version = formatBomVersion(year, sub)
  bom.versionYear = year
  bom.versionSub = sub
}

function applyManualEditDiff(bom) {
  const lines = bom.lineItems || []
  const first = lines[0]
  if (first) {
    const oldQty = Number(first.unitQty) || 1
    first.unitQty = oldQty + 1
    const node = (bom.treeNodes || []).find((n) => n.id === first.treeNodeId)
    if (node) node.quantity = first.unitQty
  }

  const rootId =
    (bom.treeNodes || []).find((n) => n.isRoot || n.parentId == null)?.id ||
    (bom.treeNodes || [])[0]?.id
  if (!rootId) return

  const alreadyAdded = lines.some(
    (line) => line.materialCode === MANUAL_BOM_EDIT_DEMO.addedMaterialCode,
  )
  if (alreadyAdded) return

  const line = createBomLineItem({
    parentTreeId: rootId,
    treeNodeId: '',
    materialCode: MANUAL_BOM_EDIT_DEMO.addedMaterialCode,
    itemName: MANUAL_BOM_EDIT_DEMO.addedMaterialName,
    specModel: 'φ35',
    categoryName: '零件',
    materialType: '标准件',
    supplyForm: '外购件',
    material: '碳化硅+氟橡胶',
    unit: '套',
    unitQty: 1,
    unitPrice: 85,
    remark: '产品BOM编辑演示：新增机械密封',
  })
  const node = createBomTreeNode({
    parentId: rootId,
    title: `${MANUAL_BOM_EDIT_DEMO.addedMaterialCode} ${MANUAL_BOM_EDIT_DEMO.addedMaterialName}`,
    quantity: 1,
    nodeType: 'material',
    lineId: line.id,
    materialCode: MANUAL_BOM_EDIT_DEMO.addedMaterialCode,
  })
  line.treeNodeId = node.id
  bom.treeNodes = [...(bom.treeNodes || []), node]
  bom.lineItems = [...lines, line]
}

/** 幂等：为指定产品 BOM 注入一次「编辑发布」升版记录 */
export function ensureManualBomEditDemo(boms) {
  if (!Array.isArray(boms)) return boms
  if (boms.some((b) => b[MANUAL_BOM_EDIT_DEMO.marker] || b.id === MANUAL_BOM_EDIT_DEMO.oldId)) {
    return boms
  }

  const active = pickTargetActiveBom(boms)
  if (!active) return boms

  const sameProduct = boms.filter(
    (b) => b.itemType === 'product' && String(b.itemId) === String(active.itemId),
  )
  if (sameProduct.some((b) => b.changeSourceType === BOM_CHANGE_SOURCE_TYPE.MANUAL_EDIT)) {
    return boms
  }

  const archived = cloneBom(active)
  archived.id = MANUAL_BOM_EDIT_DEMO.oldId
  archived.status = BOM_STATUS.ARCHIVED
  archived.isDefault = false
  archived.expiredAt = '2026-08-20 10:00'
  archived.updatedAt = '2026-08-20 10:00'
  archived.operator = '李工'
  archived[MANUAL_BOM_EDIT_DEMO.marker] = true
  delete archived.changeSourceType
  delete archived.changeSourceLabel
  delete archived.sourceEcnNo
  delete archived.changeSummary
  delete archived.upgradedBy
  delete archived.upgradedAt

  applyManualEditDiff(active)
  bumpVersion(active, [...boms, archived])
  active.status = BOM_STATUS.ACTIVE
  active.isDefault = true
  active.effectiveAt = '2026-08-20 10:05'
  active.expiredAt = ''
  active.updatedAt = '2026-08-20 10:05'
  active.operator = '李工'
  active.changeSourceType = BOM_CHANGE_SOURCE_TYPE.MANUAL_EDIT
  active.changeSourceLabel = BOM_MANUAL_CHANGE_SOURCE_LABEL
  active.upgradedBy = '李工'
  active.upgradedAt = '2026-08-20 10:05'
  active[MANUAL_BOM_EDIT_DEMO.marker] = true

  boms.unshift(archived)
  return boms
}
