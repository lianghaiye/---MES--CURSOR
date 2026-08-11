import dayjs from 'dayjs'
import { outboundState, generateOutboundNo } from '@/store/outboundStore'
import { createOutboundLine } from '@/mock/outboundOrders'
import { enrichOutboundLine } from '@/utils/outboundLineHelpers'
import { getSelectedMaterialPicks } from '@/utils/shipEbom'
/** 与发货单 1:1 关联的销售出库单 */
export function findLinkedSalesOutbound(deliveryRow) {
  if (!deliveryRow) return null
  const id = deliveryRow.id
  const code = deliveryRow.deliveryCode
  return (
    (outboundState.orders || []).find(
      (o) =>
        o.outboundType === '销售出库' &&
        (o.linkedDeliveryId === id ||
          (code && o.sourceOrderNo === code) ||
          (code && o.linkedDeliveryCode === code)),
    ) || null
  )
}

export function hasLinkedSalesOutbound(deliveryRow) {
  return Boolean(findLinkedSalesOutbound(deliveryRow))
}

/** 发货单 → 出库明细（整机行 + 散件 EBOM 勾选行） */
export function buildOutboundLinesFromDelivery(delivery) {
  const headerWarehouse = delivery.outboundWarehouse || delivery.warehouse || ''
  const lines = []
  for (const li of delivery.lineItems || []) {
    const qty = Number(li.shipQty) || 0
    if (qty <= 0) continue
    lines.push(
      enrichOutboundLine(
        createOutboundLine({
          itemName: li.productName || li.itemName || '',
          itemCode: li.productCode || li.itemCode || '',
          itemType: li.itemType || '产品',
          specModel: li.specModel || '',
          shipQty: qty,
          shipWarehouse: li.shipWarehouse || headerWarehouse || '成品仓',
          unit: li.unit || '件',
          packagingForm: li.packagingForm || '',
          deliveryRemark: li.lineRemark || '',
        }),
      ),
    )
  }
  for (const ship of delivery.scatterShipments || []) {
    for (const pick of getSelectedMaterialPicks(ship)) {
      const qty = Number(pick.shipQty) || 0
      if (qty <= 0) continue
      lines.push(
        enrichOutboundLine(
          createOutboundLine({
            itemName: pick.itemName || pick.materialName || pick.name || '',
            itemCode: pick.itemCode || pick.materialCode || pick.code || '',
            itemType: pick.itemType || '物料',
            specModel: pick.specModel || pick.spec || '',
            shipQty: qty,
            shipWarehouse: ship.shipWarehouse || headerWarehouse || '成品仓',
            unit: pick.unit || '件',
            deliveryRemark: ship.lineRemark || '',
          }),
        ),
      )
    }
  }
  for (const att of delivery.shipAttachments || []) {
    if (att.selected === false) continue
    const qty = Number(att.shipQty) || 0
    if (qty <= 0) continue
    lines.push(
      enrichOutboundLine(
        createOutboundLine({
          itemName: att.materialName || '',
          itemCode: att.materialCode || '',
          itemType: '物料',
          specModel: att.specModel || '',
          shipQty: qty,
          shipWarehouse: headerWarehouse || '成品仓',
          unit: att.unit || '件',
          deliveryRemark: att.remark || `发运附件（${att.source || 'BOM'}）`,
        }),
      ),
    )
  }
  return lines
}

/**
 * 由发货单创建或整单覆盖关联销售出库单（待出库）
 * @returns {{ ok: boolean, message?: string, outbound?: object }}
 */
export function upsertSalesOutboundFromDelivery(delivery, { forceNew = false } = {}) {
  if (!delivery?.deliveryCode) {
    return { ok: false, message: '发货单号不能为空' }
  }
  const existing = findLinkedSalesOutbound(delivery)
  if (existing && !forceNew) {
    if (existing.status !== '待出库') {
      return { ok: false, message: '关联出库单已出库，不可覆盖' }
    }
    const lineItems = buildOutboundLinesFromDelivery(delivery)
    if (!lineItems.length) return { ok: false, message: '无有效出库明细' }
    Object.assign(existing, {
      warehouse: delivery.outboundWarehouse || existing.warehouse || lineItems[0]?.shipWarehouse,
      sourceOrderNo: delivery.deliveryCode,
      salesOrderNo: delivery.salesOrderNo || delivery.sourceOrderNo || '',
      customerName: delivery.customerName || existing.customerName,
      lineItems,
      linkedDeliveryId: delivery.id,
      linkedDeliveryCode: delivery.deliveryCode,
    })
    return { ok: true, outbound: existing, updated: true }
  }
  if (existing && forceNew) {
    return { ok: false, message: '已存在关联出库单，禁止重复创建' }
  }
  const lineItems = buildOutboundLinesFromDelivery(delivery)
  if (!lineItems.length) {
    return { ok: false, message: '无有效出库明细，无法生成出库单' }
  }
  const outbound = {
    id: `ob-del-${Date.now()}`,
    docNo: generateOutboundNo(),
    outboundType: '销售出库',
    status: '待出库',
    warehouse: delivery.outboundWarehouse || lineItems[0]?.shipWarehouse || '成品仓',
    handler: 'admin1',
    creator: 'admin1',
    createdAt: dayjs().format('YYYY-MM-DD'),
    sourceOrderNo: delivery.deliveryCode,
    salesOrderNo: delivery.salesOrderNo || delivery.sourceOrderNo || '',
    customerName: delivery.customerName || '',
    linkedDeliveryId: delivery.id,
    linkedDeliveryCode: delivery.deliveryCode,
    lineItems,
    factoryQcId: '',
    remark: delivery.remark || '',
    workshop: '默认工厂',
    warehouseKeeper: 'admin1',
  }
  outboundState.orders.unshift(outbound)
  return { ok: true, outbound, updated: false }
}

export function sumOutboundLineQty(outbound) {
  return Math.round((outbound?.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0))
}

export function deleteLinkedSalesOutbound(deliveryRow) {
  const ob = findLinkedSalesOutbound(deliveryRow)
  if (!ob) return false
  const idx = outboundState.orders.findIndex((o) => o.id === ob.id)
  if (idx === -1) return false
  outboundState.orders.splice(idx, 1)
  return true
}
