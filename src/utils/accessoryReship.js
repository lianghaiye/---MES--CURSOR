/**
 * 随货配件补发：整机发完后仍可单独再发配件
 */
import {
  collectShipAttachmentsFromSalesLines,
  enrichShipAttachmentsWithShipStatus,
  calcAttachmentShipQtyBySets,
} from '@/utils/shipBomAttachments'
import { cloneOrderShipAccessoriesForDelivery } from '@/utils/salesOrderShipAccessories'

export const DELIVERY_KIND = {
  NORMAL: 'normal',
  ACCESSORY_RESHIP: 'accessory_reship',
}

/** 发货单头「发货类型」。历史 normal 视为销售发货 */
export const DELIVERY_TYPE = {
  SALES: 'sales',
  ACCESSORY_RESHIP: 'accessory_reship',
  AFTER_SALES: 'after_sales',
  OTHER: 'other',
}

export const DELIVERY_TYPE_OPTIONS = [
  { value: DELIVERY_TYPE.SALES, label: '销售发货' },
  { value: DELIVERY_TYPE.ACCESSORY_RESHIP, label: '配件补发' },
  { value: DELIVERY_TYPE.AFTER_SALES, label: '售后发货' },
  { value: DELIVERY_TYPE.OTHER, label: '其他' },
]

export function normalizeDeliveryType(value) {
  if (value === DELIVERY_TYPE.ACCESSORY_RESHIP || value === DELIVERY_KIND.ACCESSORY_RESHIP) {
    return DELIVERY_TYPE.ACCESSORY_RESHIP
  }
  if (value === DELIVERY_TYPE.AFTER_SALES) return DELIVERY_TYPE.AFTER_SALES
  if (value === DELIVERY_TYPE.OTHER) return DELIVERY_TYPE.OTHER
  return DELIVERY_TYPE.SALES
}

export function deliveryTypeLabel(value) {
  const type = normalizeDeliveryType(value)
  return DELIVERY_TYPE_OPTIONS.find((item) => item.value === type)?.label || '销售发货'
}

export const ACCESSORY_RESHIP_REASON_OPTIONS = [
  { value: '少发', label: '少发' },
  { value: '错发换发', label: '错发换发' },
  { value: '赠送补发', label: '赠送补发' },
  { value: '其他', label: '其他' },
]

export function isAccessoryReshipDelivery(row) {
  const type = row?.deliveryType || row?.rawApplication?.deliveryType
  const kind = row?.deliveryKind || row?.rawApplication?.deliveryKind
  return normalizeDeliveryType(type || kind) === DELIVERY_TYPE.ACCESSORY_RESHIP
}

/** 销售明细 → 配件分组锚点（含已发完行） */
export function salesOrderLinesAsAttachmentAnchors(order) {
  return (order?.lineItems || [])
    .map((line) => {
      const productId = line.productId || line.itemId
      const productCode = line.productCode || line.itemCode || ''
      if (!productId && !productCode) return null
      return {
        id: line.id,
        salesLineId: line.id,
        productId,
        productCode,
        productName: line.productName || line.itemName || '',
        orderQty: Number(line.salesQty ?? line.qty) || 0,
        salesQty: Number(line.salesQty ?? line.qty) || 0,
        qty: Number(line.salesQty ?? line.qty) || 0,
      }
    })
    .filter(Boolean)
}

/**
 * 带出补发候选清单：优先订单 shipAccessories 快照，否则按销售行匹配标准包
 * 默认勾选仍有缺口的项，数量按剩余可发套数建议
 */
export function buildAccessoryReshipSeed(order, options = {}) {
  const warehouse = options.warehouse || order?.defaultWarehouse || ''
  let seed = []
  if (order?.shipAccessories?.length) {
    seed = cloneOrderShipAccessoriesForDelivery(order, { warehouse })
  } else {
    seed = collectShipAttachmentsFromSalesLines(order?.lineItems || [], { warehouse })
  }
  const enriched = enrichShipAttachmentsWithShipStatus(seed, order)
  return enriched.map((row) => {
    const planQty = Number(row.planQty) || 0
    const appliedQty = Number(row.appliedQty) || 0
    const remain = Math.max(0, planQty - appliedQty)
    const unitQty = Number(row.unitQty) || 1
    const remainSets = unitQty > 0 ? Math.floor((remain + 1e-9) / unitQty) : 0
    const hasGap = remain > 1e-9
    // 错发/赠送场景允许手工加；默认只勾缺口
    const kitSets = hasGap ? Math.max(1, remainSets || 1) : 0
    const shipQty = hasGap ? calcAttachmentShipQtyBySets(unitQty, kitSets) || remain : 0
    return {
      ...row,
      selected: hasGap,
      kitSets,
      shipQty,
      planQty,
      remark: row.remark || '',
    }
  })
}

export function countAccessoryReshipGaps(order) {
  return buildAccessoryReshipSeed(order).filter((r) => r.selected).length
}

export function canShowAccessoryReshipAction(order) {
  if (!order?.id) return false
  const status = order.progressStatus || ''
  // 进行中订单才允许补发（与申请发货同门槛由调用方再校验反审态）
  return status === '进行中' || status === '部分发货' || status === '已发货'
}
