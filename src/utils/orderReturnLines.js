/**
 * 订单详情 — 退货/异常处理信息（一物料一行）
 */
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { outsourcingReturnState } from '@/store/outsourcingReturnStore'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

function flattenReturns(returns, matchFn, mapLine) {
  const rows = []
  ;(returns || []).filter(matchFn).forEach((ret) => {
    ;(ret.lineItems || []).forEach((line, idx) => {
      rows.push(mapLine(ret, line, idx))
    })
  })
  return rows
}

export function listReturnLinesForPurchaseOrder(po) {
  if (!po) return []
  void purchaseReturnState.returns
  return flattenReturns(
    purchaseReturnState.returns,
    (r) =>
      (po.id && r.purchaseOrderId === po.id) || (po.orderNo && r.purchaseOrderNo === po.orderNo),
    (ret, line, idx) => ({
      id: `${ret.id}-${line.id || idx}`,
      returnId: ret.id,
      returnNo: ret.returnNo || '',
      itemName: line.productName || line.itemName || '',
      itemCode: line.productCode || line.itemCode || '',
      purchaseQty: Number(line.purchaseQty) || Number(line.planQty) || 0,
      qty: Number(line.returnQty) || 0,
      returnType: line.returnType || '',
      shipWarehouse: line.shipWarehouse || '',
      creator: ret.creator || '',
      createdAt: formatDateTimeMinute(ret.createdAt),
    }),
  )
}

export function listReturnLinesForOutsourcingOrder(order) {
  if (!order) return []
  void outsourcingReturnState.returns
  return flattenReturns(
    outsourcingReturnState.returns,
    (r) =>
      (order.id && (r.outsourcingOrderId === order.id || r.purchaseOrderId === order.id)) ||
      (order.orderNo &&
        (r.outsourcingOrderNo === order.orderNo || r.purchaseOrderNo === order.orderNo)),
    (ret, line, idx) => {
      let shipWarehouse = line.shipWarehouse || ''
      if (!shipWarehouse && Array.isArray(ret.outboundOrders)) {
        for (const order of ret.outboundOrders) {
          const hit = (order.lineItems || []).some(
            (ol) => ol.returnLineId === line.id || ol.productCode === line.productCode,
          )
          if (hit && order.shipWarehouse) {
            shipWarehouse = order.shipWarehouse
            break
          }
        }
        if (!shipWarehouse) shipWarehouse = ret.outboundOrders[0]?.shipWarehouse || ''
      }
      return {
        id: `${ret.id}-${line.id || idx}`,
        returnId: ret.id,
        returnNo: ret.returnNo || '',
        itemName: line.productName || line.itemName || '',
        itemCode: line.productCode || line.itemCode || '',
        planQty: Number(line.planQty) || Number(line.purchaseQty) || 0,
        qty: Number(line.returnQty) || 0,
        shipWarehouse,
        returnType: line.returnType || '',
        compensationMethod: line.compensationMethod || '',
        compensationAmount: line.compensationAmount,
        creator: ret.creator || '',
        createdAt: formatDateTimeMinute(ret.createdAt),
      }
    },
  )
}
