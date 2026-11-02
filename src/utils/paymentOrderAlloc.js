import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { getOrdersLinkedToContract } from '@/store/salesContractStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { sumPaymentsBySalesOrder } from '@/store/salesPaymentStore'

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** 销售订单含税金额 */
export function resolveSalesOrderAmountInTax(order) {
  if (!order) return 0
  return round2(Number(order.totalAmountInTax ?? order.amountInTax) || 0)
}

/** 销售订单已发货含税金额（发货单合计） */
export function sumShippedAmountBySalesOrder(salesOrderNo) {
  if (!salesOrderNo) return 0
  return round2(
    (deliveryOrderState.orders || [])
      .filter((d) => d.salesOrderNo === salesOrderNo && d.status !== '已作废')
      .reduce((s, d) => s + (Number(d.totalAmountInTax ?? d.amountInTax) || 0), 0),
  )
}

export function buildPaymentOrderAllocRow(orderNo, allocAmount = null) {
  const order = findSalesOrderByOrderNo(orderNo)
  return {
    orderNo,
    customerName: order?.customerName || '—',
    orderAmount: resolveSalesOrderAmountInTax(order),
    shippedAmount: sumShippedAmountBySalesOrder(orderNo),
    paidAmount: sumPaymentsBySalesOrder(orderNo),
    allocAmount: allocAmount != null && allocAmount !== '' ? round2(allocAmount) : null,
  }
}

/** 合同关联销售订单 → 分配行（默认带出） */
export function buildAllocRowsForContract(contractNo) {
  if (!contractNo) return []
  return (getOrdersLinkedToContract(contractNo) || []).map((o) =>
    buildPaymentOrderAllocRow(o.orderNo, null),
  )
}

export function sumAllocAmounts(rows = []) {
  return round2(
    (rows || []).reduce((s, r) => s + (Number(r.allocAmount) > 0 ? Number(r.allocAmount) : 0), 0),
  )
}

export function positiveAllocations(rows = []) {
  return (rows || [])
    .filter((r) => r?.orderNo && Number(r.allocAmount) > 0)
    .map((r) => ({
      salesOrderNo: r.orderNo,
      amount: round2(r.allocAmount),
    }))
}
