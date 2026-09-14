import { saveProductBom, generateBomNo } from '@/store/productBomStore'
import { BOM_TYPE } from '@/mock/bomMaterialColumns'
import { syncRootNodeFromItem } from '@/utils/bomImport'
import { findInvalidBlankSizeLine } from '@/utils/bomBlankSize'
import { validateLinesSkuResolved } from '@/utils/spuLineResolve'
import { validateAllBomParentChildLines } from '@/utils/bomValidation'

/**
 * 校验产品新增页的 BOM 草稿。
 * - 无明细：跳过（不建空 BOM）
 * - 有明细：与正式 BOM 新建页同口径校验
 */
export function validateProductBomDraft(draft) {
  if (!draft?.lineItems?.length) {
    return { ok: true, skip: true }
  }

  const skuCheck = validateLinesSkuResolved(draft.lineItems)
  if (!skuCheck.ok) return { ok: false, message: skuCheck.message, skip: false }

  if (draft.lineItems.some((l) => !l.materialCode)) {
    return { ok: false, message: 'BOM 维护：请为所有子项选择物料', skip: false }
  }

  const vlCheck = findInvalidBlankSizeLine(draft.lineItems)
  if (!vlCheck.ok) return { ok: false, message: vlCheck.message, skip: false }

  const parentChildCheck = validateAllBomParentChildLines(draft.lineItems, draft.flatNodes || [], {
    itemCode: draft.itemCode,
    itemName: draft.itemName,
  })
  if (!parentChildCheck.ok) {
    return { ok: false, message: parentChildCheck.message, skip: false }
  }

  return { ok: true, skip: false }
}

/**
 * 将产品新增草稿落为待发布「产品BOM」。
 * @returns {{ saved: boolean, skipped?: boolean, record?: object, error?: string }}
 */
export function persistProductBomDraft({
  draft,
  itemId,
  itemType = 'product',
  itemCode = '',
  itemName = '',
  specModel = '',
  material = '',
  drawingNo = '',
  techParams = '',
  processRoute = '',
  matchingRequirements = '',
}) {
  if (!itemId) return { saved: false, error: '缺少产品 ID' }
  if (!draft?.lineItems?.length) return { saved: false, skipped: true }

  const check = validateProductBomDraft({
    ...draft,
    itemCode,
    itemName,
  })
  if (!check.ok) return { saved: false, error: check.message }
  if (check.skip) return { saved: false, skipped: true }

  let treeNodes = Array.isArray(draft.flatNodes) ? draft.flatNodes : []
  treeNodes = syncRootNodeFromItem(treeNodes, {
    itemCode,
    itemName,
    specModel,
    bomName: itemName || '',
  })

  const lineItems = draft.lineItems.map((line) => {
    const copy = { ...line }
    delete copy.children
    delete copy._treeIndex
    return copy
  })

  const payload = {
    bomNo: generateBomNo(),
    bomName: itemName || itemCode || '产品BOM',
    bomType: BOM_TYPE.PRODUCT,
    itemType,
    itemId,
    itemName,
    itemCode,
    specModel: specModel || '',
    material: material || '',
    drawingNo: drawingNo || '',
    techParams: techParams || '',
    processRoute: processRoute || '',
    matchingRequirements: matchingRequirements || '',
    treeNodes,
    lineItems,
    templateRef: null,
    columnSettings: Array.isArray(draft.columnSettings) ? draft.columnSettings : [],
  }

  const res = saveProductBom(null, payload)
  if (res?.error || res?.ok === false) {
    return { saved: false, error: res.error || res.message || 'BOM 保存失败' }
  }
  return { saved: true, record: res.record }
}
