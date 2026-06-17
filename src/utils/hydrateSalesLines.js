import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { buildLineAccessoryKits, buildOrderAccessoryKits } from '@/mock/accessoryPacks'
import { normalizeDeliveryMode } from '@/utils/salesDeliveryMode'
import { isSelfMadeBusinessType, resolveLineBusinessType } from '@/utils/salesOrderBusiness'
import { getActiveBomForItem, getProductBomById } from '@/store/productBomStore'

/** 为已审自产订单行补齐 EBOM 快照与配件包（演示数据 / 升级迁移） */
export function hydrateApprovedSelfProdOrder(order) {
  if (!order || order.progressStatus !== '已审') return order

  for (const line of order.lineItems || []) {
    if (!isSelfMadeBusinessType(resolveLineBusinessType(line, order))) continue
    line.deliveryMode = normalizeDeliveryMode(line, order)

    if (!line.productId) continue

    const bom =
      (line.bomId ? getProductBomById(line.bomId) : null) ||
      getActiveBomForItem('product', line.productId)

    if (bom) {
      if (!line.bomId) {
        line.bomId = bom.id
        line.bomName = bom.bomName
        line.bomVersion = bom.version
      }
      if (!line.ebomSnapshot?.materials?.length) {
        const salesQty = Number(line.salesQty ?? line.qty) || 1
        line.ebomSnapshot = buildEbomSnapshotFromBom(bom, salesQty)
      }
    }

    if (!line.lineAccessoryKits?.length) {
      line.lineAccessoryKits = buildLineAccessoryKits(line)
    }
  }

  if (!order.orderAccessoryKits?.length) {
    order.orderAccessoryKits = buildOrderAccessoryKits(order)
  }

  return order
}

export function hydrateApprovedSelfProdOrders(orders) {
  return (orders || []).map((o) => {
    hydrateApprovedSelfProdOrder(o)
    return o
  })
}
