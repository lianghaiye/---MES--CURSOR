import { getActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { buildSalesOrderEbomRows } from '@/utils/salesOrderBomRows'
import { resolveWorkOrderLinkedBom } from '@/utils/workOrderEbomTree'

/** 工单 → 销售明细行口径（供 EBOM 信息 / 差异对比复用） */
export function buildWorkOrderEbomLine(workOrder, variant = 'production') {
  if (!workOrder) return null

  const linkedBom = resolveWorkOrderLinkedBom(workOrder, variant)
  const savedBom = workOrder.bomId ? getProductBomById(workOrder.bomId) : null
  const productId =
    workOrder.productId || (linkedBom?.itemType === 'product' ? linkedBom.itemId : '') || ''

  return {
    id: workOrder.id,
    productId,
    productName: workOrder.productName,
    productCode: workOrder.materialCode,
    bomId: workOrder.bomId || linkedBom?.id || '',
    bomName: workOrder.ebomSnapshot?.bomName || savedBom?.bomName || linkedBom?.bomName || '',
    bomVersion:
      workOrder.ebomSnapshot?.bomVersion ||
      savedBom?.version ||
      (workOrder.bomId ? linkedBom?.version : '') ||
      '',
    ebomSnapshot: workOrder.ebomSnapshot || null,
    salesQty: Number(workOrder.scheduleQty ?? workOrder.planQty) || 1,
    specModel: workOrder.specModel,
    material: workOrder.material,
    drawingNo: workOrder.drawingNo,
    ebomStatus: workOrder.ebomStatus,
  }
}

export function buildWorkOrderEbomRows(workOrder, variant = 'production') {
  const line = buildWorkOrderEbomLine(workOrder, variant)
  if (!line) return []
  return buildSalesOrderEbomRows([line])
}

export function workOrderBomVersionChanged(workOrder, variant = 'production') {
  const line = buildWorkOrderEbomLine(workOrder, variant)
  if (!line?.productId && !line?.bomId) return false

  const active = line.productId
    ? getActiveBomForItem('product', line.productId)
    : line.bomId
      ? getProductBomById(line.bomId)
      : null

  const boundVersion = line.bomVersion
  return Boolean(active?.version && boundVersion && active.version !== boundVersion)
}

export function workOrderActiveBomVersion(workOrder, variant = 'production') {
  const line = buildWorkOrderEbomLine(workOrder, variant)
  if (!line?.productId) return ''
  return getActiveBomForItem('product', line.productId)?.version || ''
}
