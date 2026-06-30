import { ECN_CHANGE_ITEM_TYPE } from '@/constants/ecn'
import {
  getProductBomById,
  getActiveBomForItem,
  saveProductBom,
  enableProductBom,
} from '@/store/productBomStore'

function summarizeChangeItems(items = []) {
  if (!items.length) return ''
  const notes = items.map((item) => item.changeNote).filter(Boolean)
  if (notes.length) return notes.join('；')
  return items
    .map((item) => {
      if (item.origMaterial && item.newMaterial && item.origMaterial !== item.newMaterial) {
        return `${item.origMaterialName || '物料'} ${item.origMaterial} -> ${item.newMaterial}`
      }
      return item.changeNote || ''
    })
    .filter(Boolean)
    .join('；')
}

function patchLineFromChangeItem(line, item) {
  if (item.newMaterialCode) line.materialCode = item.newMaterialCode
  if (item.newMaterialName) {
    line.materialName = item.newMaterialName
    line.itemName = item.newMaterialName
  }
  if (item.newSpecModel) line.specModel = item.newSpecModel
  if (item.newMaterial) line.material = item.newMaterial
  if (item.newDrawingNo) line.drawingNo = item.newDrawingNo
  if (item.newUnitQty != null) line.unitQty = item.newUnitQty
  if (item.changeNote) {
    line.remark = [line.remark, item.changeNote].filter(Boolean).join('；')
  }
}

function applyEcnChangeItems(bom, changeItems = []) {
  const lineItems = bom.lineItems || []
  changeItems.forEach((item) => {
    if (item.changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
      lineItems.push({
        id: item.id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        materialCode: item.newMaterialCode,
        materialName: item.newMaterialName,
        itemName: item.newMaterialName,
        specModel: item.newSpecModel,
        material: item.newMaterial,
        drawingNo: item.newDrawingNo,
        unitQty: item.newUnitQty ?? 1,
        remark: item.changeNote || '',
      })
      return
    }

    const idx = lineItems.findIndex(
      (line) =>
        (item.bomLineId && line.id === item.bomLineId) ||
        (item.origMaterialCode && line.materialCode === item.origMaterialCode),
    )

    if (item.changeType === ECN_CHANGE_ITEM_TYPE.REMOVE) {
      if (idx >= 0) lineItems.splice(idx, 1)
      return
    }

    if (idx >= 0) {
      patchLineFromChangeItem(lineItems[idx], item)
    }
  })
  bom.lineItems = lineItems
}

/**
 * ECN 执行：归档旧版 BOM，生成并发布新版本
 */
export function executeEcnBomVersionUpgrade(ecnRecord = {}, operator = '张工') {
  const changeItems = ecnRecord.changeItems || []
  if (!changeItems.length) {
    return { ok: false, message: '无变更项，跳过 BOM 升版' }
  }

  let sourceBom = ecnRecord.bomId ? getProductBomById(ecnRecord.bomId) : null
  if (!sourceBom && ecnRecord.productId) {
    sourceBom = getActiveBomForItem('product', ecnRecord.productId)
  }
  if (!sourceBom) {
    return { ok: false, message: '未找到关联 BOM，无法升版' }
  }

  const cloned = JSON.parse(JSON.stringify(sourceBom))
  applyEcnChangeItems(cloned, changeItems)

  const changeSummary = summarizeChangeItems(changeItems) || ecnRecord.description || ''
  const payload = {
    bomNo: sourceBom.bomNo,
    bomName: sourceBom.bomName,
    itemType: sourceBom.itemType,
    itemId: sourceBom.itemId,
    itemName: sourceBom.itemName,
    itemCode: sourceBom.itemCode,
    bomType: sourceBom.bomType,
    specModel: sourceBom.specModel,
    material: sourceBom.material,
    drawingNo: sourceBom.drawingNo,
    techParams: sourceBom.techParams,
    processRoute: sourceBom.processRoute,
    matchingRequirements: sourceBom.matchingRequirements,
    treeNodes: cloned.treeNodes || [],
    lineItems: cloned.lineItems || [],
    columnSettings: cloned.columnSettings || [],
    remark: [sourceBom.remark, `ECN ${ecnRecord.ecnNo || ''} 变更`].filter(Boolean).join('；'),
  }

  const saveRes = saveProductBom(sourceBom.id, payload)
  if (saveRes?.error) return { ok: false, message: saveRes.error }

  const enableRes = enableProductBom(saveRes.record.id)
  if (enableRes?.error) return { ok: false, message: enableRes.error }

  Object.assign(saveRes.record, {
    sourceEcnNo: ecnRecord.ecnNo || '',
    sourceEcnId: ecnRecord.id || '',
    changeSummary,
    upgradedBy: operator,
    upgradedAt: enableRes.effectiveAt || enableRes.updatedAt,
  })

  return {
    ok: true,
    oldBomId: sourceBom.id,
    oldVersion: sourceBom.version,
    newBomId: saveRes.record.id,
    newVersion: saveRes.record.version,
    versionGroupId: saveRes.record.versionGroupId,
    changeSummary,
  }
}

export { summarizeChangeItems }
