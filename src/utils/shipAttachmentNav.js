import { isShipBomType, BOM_TYPE } from '@/mock/bomMaterialColumns'

/** 菜单与页面展示名；落库仍用 bomType = 发运BOM */
export const SHIP_ATTACHMENT_DISPLAY_NAME = '随货附件'

export const SHIP_ATTACHMENT_LIST_PATH = '/product-process/ship-attachments'

export const SHIP_ATTACHMENT_ROUTE = {
  list: 'product-process-ship-attachments',
  create: 'product-process-ship-attachments-new',
  edit: 'product-process-ship-attachments-edit',
  detail: 'product-process-ship-attachments-detail',
}

export const PRODUCT_BOM_ROUTE = {
  list: 'product-process-bom',
  create: 'product-process-bom-new',
  edit: 'product-process-bom-edit',
  detail: 'product-process-bom-detail',
}

export function formatBomTypeLabel(bomType) {
  if (isShipBomType(bomType)) return SHIP_ATTACHMENT_DISPLAY_NAME
  return bomType || '—'
}

export function isShipAttachmentPath(path = '') {
  return String(path).includes('/product-process/ship-attachments')
}

export function isBomCreateRouteName(name) {
  return name === PRODUCT_BOM_ROUTE.create || name === SHIP_ATTACHMENT_ROUTE.create
}

export function isBomEditRouteName(name) {
  return name === PRODUCT_BOM_ROUTE.edit || name === SHIP_ATTACHMENT_ROUTE.edit
}

export function isBomEditorRouteName(name) {
  return isBomCreateRouteName(name) || isBomEditRouteName(name)
}

export function shipAttachmentCreatePath() {
  return `${SHIP_ATTACHMENT_LIST_PATH}/new`
}

export function shipAttachmentDetailPath(id) {
  return `${SHIP_ATTACHMENT_LIST_PATH}/${id}`
}

export function shipAttachmentEditPath(id) {
  return `${SHIP_ATTACHMENT_LIST_PATH}/${id}/edit`
}

export function productBomListPath() {
  return '/product-process/bom'
}

export function bomWorkspaceListPath(bom) {
  return isShipBomType(bom?.bomType) ? SHIP_ATTACHMENT_LIST_PATH : productBomListPath()
}

export function bomWorkspaceDetailPath(bom) {
  if (!bom?.id) return productBomListPath()
  return isShipBomType(bom.bomType)
    ? shipAttachmentDetailPath(bom.id)
    : `/product-process/bom/${bom.id}`
}

export function bomWorkspaceEditPath(bom) {
  if (!bom?.id) return productBomListPath()
  return isShipBomType(bom.bomType)
    ? shipAttachmentEditPath(bom.id)
    : `/product-process/bom/${bom.id}/edit`
}

export function bomWorkspaceDetailRouteName(bom) {
  return isShipBomType(bom?.bomType) ? SHIP_ATTACHMENT_ROUTE.detail : PRODUCT_BOM_ROUTE.detail
}

export { BOM_TYPE }
