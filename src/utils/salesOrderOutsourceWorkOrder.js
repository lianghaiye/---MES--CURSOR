import dayjs from 'dayjs'
import { workOrderState, addWorkOrder, createWorkOrderPayload } from '@/store/workOrderStore'
import { resolveProductDefaultProcessRoute } from '@/utils/workOrderProcessRoute'

function findExistingOutsourceWorkOrder(order, line) {
  return workOrderState.orders.find(
    (wo) =>
      wo.orderCategory === '外协工单' &&
      wo.salesLineId === line.id &&
      wo.sourceOrderNo === order.orderNo,
  )
}

/** 销售订单审核通过：外协销售明细生成外协工单 */
export function createOutsourcingWorkOrdersFromSalesOrder(order, lines = []) {
  const created = []
  ;(lines || []).forEach((line) => {
    const existing = findExistingOutsourceWorkOrder(order, line)
    if (existing) {
      created.push(existing)
      return
    }

    const qty = Number(line.salesQty ?? line.qty) || 1
    const deliveryDate = line.deliveryDate || order.documentDate || dayjs().format('YYYY-MM-DD')
    const productName = line.productName?.trim() || '外协产品'

    const draft = {
      productName,
      materialCode: line.productCode || '',
      orderCategory: '外协工单',
      scheduleQty: qty,
      planQty: qty,
      bom: '',
      remark: line.supplementDesc || line.lineRemark || '',
      planDateRange: [deliveryDate, deliveryDate],
      urgency: order.urgency || '普通',
      source: 'sales-order',
      sourceOrderNo: order.orderNo,
      salesLineId: line.id,
      salesOrderId: order.id,
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      variantSummary: line.variantSummary || line.variantAttr || '',
      variantValues: line.variantValues ? { ...line.variantValues } : {},
    }

    const profile = { productName, materialCode: line.productCode }
    const defaultRoute = resolveProductDefaultProcessRoute(profile)
    if (defaultRoute) {
      draft.processRouteName = defaultRoute
    }

    const wo = createWorkOrderPayload(draft)
    wo.orderCategory = '外协工单'
    wo.bom = ''
    wo.skipEbom = true
    addWorkOrder(wo)
    created.push(wo)
  })
  return created
}
