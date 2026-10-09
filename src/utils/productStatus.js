/** 产品信息状态：启用 / 已归档（归档不影响已被 BOM/工单/订单引用） */
export const PRODUCT_STATUS = {
  ACTIVE: '启用',
  ARCHIVED: '已归档',
}

export const productStatusOptions = [
  { label: '启用', value: PRODUCT_STATUS.ACTIVE },
  { label: '已归档', value: PRODUCT_STATUS.ARCHIVED },
]

export function normalizeProductStatus(status) {
  if (status === PRODUCT_STATUS.ARCHIVED || status === 'archived' || status === '停用') {
    return PRODUCT_STATUS.ARCHIVED
  }
  return PRODUCT_STATUS.ACTIVE
}

export function isProductArchived(record) {
  return normalizeProductStatus(record?.status) === PRODUCT_STATUS.ARCHIVED
}

export function isProductActive(record) {
  return !isProductArchived(record)
}

export function productStatusColor(status) {
  return normalizeProductStatus(status) === PRODUCT_STATUS.ARCHIVED ? 'warning' : 'processing'
}
