import { getActiveBomForItem } from '@/store/productBomStore'
import {
  isCustomSalesBusinessType,
  isSelfMadeBusinessType,
  resolveLineBusinessType,
} from '@/utils/salesOrderBusiness'

/** 自产销售行 BOM 来源 */
export const BOM_FULFILLMENT_PATH = {
  USE_CATALOG_BOM: 'use_catalog_bom',
  DESIGN_REQUIRED: 'design_required',
  /** @deprecated 已废弃，迁移为 design_required */
  PENDING_BOM: 'pending_bom',
}

export const BOM_FULFILLMENT_PATH_LABELS = {
  [BOM_FULFILLMENT_PATH.USE_CATALOG_BOM]: '使用产品BOM',
  [BOM_FULFILLMENT_PATH.DESIGN_REQUIRED]: '需设计任务',
  [BOM_FULFILLMENT_PATH.PENDING_BOM]: '暂缓等待 BOM',
}

/** 字段展示名：说明 BOM 从哪来（产品库 / 设计任务） */
export const BOM_FULFILLMENT_FIELD_LABEL = 'BOM来源'

export const WORK_ITEM_STATUS_PENDING_BOM = '待BOM'

export function bomFulfillmentPathLabel(path) {
  return BOM_FULFILLMENT_PATH_LABELS[path] || '—'
}

export function isSelfMadeFulfillmentLine(line, order) {
  return isSelfMadeBusinessType(resolveLineBusinessType(line, order))
}

export function lineHasActiveCatalogBom(line) {
  return Boolean(line?.productId && getActiveBomForItem('product', line.productId))
}

/** 历史 pending_bom → design_required；审核/迁移统一口径 */
export function normalizeBomFulfillmentPath(path) {
  if (path === BOM_FULFILLMENT_PATH.PENDING_BOM) {
    return BOM_FULFILLMENT_PATH.DESIGN_REQUIRED
  }
  return path || ''
}

export function normalizeLineBomFulfillmentPath(line) {
  if (!line) return line
  const normalized = normalizeBomFulfillmentPath(line.bomFulfillmentPath)
  if (normalized !== line.bomFulfillmentPath) {
    line.bomFulfillmentPath = normalized
  }
  return line
}

/** 选品 / 改业务类型后的建议默认路径 */
export function suggestDefaultFulfillmentPath(line, order) {
  const lineBusinessType = resolveLineBusinessType(line, order)
  if (!isSelfMadeBusinessType(lineBusinessType)) return ''

  if (isCustomSalesBusinessType(lineBusinessType)) {
    return BOM_FULFILLMENT_PATH.DESIGN_REQUIRED
  }

  if (lineHasActiveCatalogBom(line)) {
    return BOM_FULFILLMENT_PATH.USE_CATALOG_BOM
  }

  return BOM_FULFILLMENT_PATH.DESIGN_REQUIRED
}

export function getFulfillmentPathOptions(line, order) {
  void order
  const hasBom = lineHasActiveCatalogBom(line)
  const opts = []

  if (hasBom) {
    opts.push({
      label: BOM_FULFILLMENT_PATH_LABELS[BOM_FULFILLMENT_PATH.USE_CATALOG_BOM],
      value: BOM_FULFILLMENT_PATH.USE_CATALOG_BOM,
    })
  }

  opts.push({
    label: BOM_FULFILLMENT_PATH_LABELS[BOM_FULFILLMENT_PATH.DESIGN_REQUIRED],
    value: BOM_FULFILLMENT_PATH.DESIGN_REQUIRED,
  })

  return opts
}

/** 审核前校验单行履约路径 */
export function validateFulfillmentPathForApprove(line, order) {
  const lineBusinessType = resolveLineBusinessType(line, order)
  if (!isSelfMadeBusinessType(lineBusinessType)) {
    return { ok: true }
  }

  const path = line.bomFulfillmentPath
  const lineName = line.productName || '未命名'

  if (!path) {
    return {
      ok: false,
      message: `明细「${lineName}」请先选择${BOM_FULFILLMENT_FIELD_LABEL}（使用产品BOM / 需设计任务）`,
    }
  }

  if (path === BOM_FULFILLMENT_PATH.USE_CATALOG_BOM) {
    if (!line.productId) {
      return { ok: false, message: `明细「${lineName}」未关联产品，无法使用产品 BOM` }
    }
    if (!lineHasActiveCatalogBom(line)) {
      return {
        ok: false,
        message: `产品「${lineName}」无使用中的 BOM，请改选「需设计任务」`,
      }
    }
  }

  if (path === BOM_FULFILLMENT_PATH.DESIGN_REQUIRED) {
    if (!line.productName?.trim()) {
      return { ok: false, message: `明细「${lineName}」请填写产品名称` }
    }
    if (line.isManualLine || isCustomSalesBusinessType(lineBusinessType)) {
      return { ok: true }
    }
    if (!line.productId) {
      return { ok: false, message: `明细「${lineName}」未关联产品，请重新选择产品` }
    }
  }

  return { ok: true }
}

/** 历史数据迁移：补全 bomFulfillmentPath（仅按 BOM 快照/产品 BOM，不看产品属性） */
export function migrateLineFulfillmentPath(line, order) {
  const migrated = { ...line }
  migrated.bomFulfillmentPath = normalizeBomFulfillmentPath(migrated.bomFulfillmentPath)
  if (migrated.bomFulfillmentPath) return migrated

  const lineBusinessType = resolveLineBusinessType(migrated, order)
  if (!isSelfMadeBusinessType(lineBusinessType)) return migrated

  if (migrated.ebomSnapshot?.materials?.length) {
    return { ...migrated, bomFulfillmentPath: BOM_FULFILLMENT_PATH.USE_CATALOG_BOM }
  }

  if (isCustomSalesBusinessType(lineBusinessType)) {
    return { ...migrated, bomFulfillmentPath: BOM_FULFILLMENT_PATH.DESIGN_REQUIRED }
  }

  if (lineHasActiveCatalogBom(migrated)) {
    return { ...migrated, bomFulfillmentPath: BOM_FULFILLMENT_PATH.USE_CATALOG_BOM }
  }

  return { ...migrated, bomFulfillmentPath: BOM_FULFILLMENT_PATH.DESIGN_REQUIRED }
}

export function migrateOrdersFulfillmentPath(orders = []) {
  return orders.map((order) => ({
    ...order,
    lineItems: (order.lineItems || []).map((line) => migrateLineFulfillmentPath(line, order)),
  }))
}
