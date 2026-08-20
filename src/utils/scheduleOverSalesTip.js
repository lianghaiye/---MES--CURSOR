/**
 * 排产超过销售订货时仅提示（不拦截）
 */
import { salesOrderState } from '@/store/salesOrderStore'
import { findSalesOrderByNoOrId } from '@/utils/salesOrderDedicatedStock'

export function tipMessageIfScheduleOverSales(workOrder, thisBatchQty) {
  const wo = workOrder || {}
  const batchQty = Math.max(0, Number(thisBatchQty) || 0)
  if (!(batchQty > 0)) return ''
  const so =
    findSalesOrderByNoOrId({
      salesOrderId: wo.salesOrderId,
      salesOrderNo: wo.sourceOrderNo,
    }) ||
    (wo.sourceOrderNo ? salesOrderState.orders.find((o) => o.orderNo === wo.sourceOrderNo) : null)
  if (!so) return ''
  const code = String(wo.productCode || wo.itemCode || '').trim()
  const line =
    (so.lineItems || []).find((l) => String(l.productCode || '').trim() === code) ||
    (so.lineItems || [])[0]
  const salesQty = Math.max(0, Number(line?.salesQty ?? line?.qty) || 0)
  if (!(salesQty > 0)) return ''
  const scheduledBefore = Math.max(0, Number(wo.scheduleQty) || 0)
  const after = scheduledBefore + batchQty
  if (after <= salesQty + 1e-9) return ''
  return `排产合计 ${after} 已超过销售订货 ${salesQty}，超出部分入库后将为自由备货`
}
