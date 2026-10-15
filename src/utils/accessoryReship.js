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

export const ACCESSORY_RESHIP_REASON_OPTIONS = [
  { value: '少发', label: '少发' },
  { value: '错发换发', label: '错发换发' },
  { value: '赠送补发', label: '赠送补发' },
  { value: '其他', label: '其他' },
]

export function isAccessoryReshipDelivery(row) {
  return (
    row?.deliveryKind === DELIVERY_KIND.ACCESSORY_RESHIP ||
    row?.rawApplication?.deliveryKind === DELIVERY_KIND.ACCESSORY_RESHIP
  )
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
