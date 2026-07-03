import dayjs from 'dayjs'
import { workOrderState, addWorkOrder, createWorkOrderPayload } from '@/store/workOrderStore'
import { resolveProductDefaultProcessRoute } from '@/utils/workOrderProcessRoute'

export const MAINTENANCE_WORK_ORDER_CATEGORY = '维修工单'

function findExistingMaintenanceWorkOrder(order, line) {
  return workOrderState.orders.find(
    (wo) =>
      wo.orderCategory === MAINTENANCE_WORK_ORDER_CATEGORY &&
      wo.salesLineId === line.id &&
      wo.sourceOrderNo === order.orderNo,
  )
}

/** 销售订单审核通过：维修服务明细生成维修工单 */
export function createMaintenanceWorkOrdersFromSalesOrder(order, lines = []) {
  const created = []
  ;(lines || []).forEach((line) => {
    const existing = findExistingMaintenanceWorkOrder(order, line)
    if (existing) {
      created.push(existing)
      return
    }

    const qty = Number(line.salesQty ?? line.qty) || 1
    const deliveryDate = line.deliveryDate || order.documentDate || dayjs().format('YYYY-MM-DD')
    const productName = line.productName?.trim() || '维修产品'

    const draft = {
      productName,
      materialCode: line.productCode || '',
      productId: line.productId || '',
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      techParams: line.techParams || '',
      matchingRequirements: line.matchingRequirements || '',
      orderCategory: MAINTENANCE_WORK_ORDER_CATEGORY,
      scheduleQty: qty,
      planQty: qty,
      bom: '',
      remark: line.supplementDesc || line.lineRemark || '',
      planDateRange: [deliveryDate, deliveryDate],
      urgency: order.urgency || '普通',
      customerName: order.customerName || '',
      salesperson: order.salesperson || '',
      source: 'sales-order',
      sourceOrderNo: order.orderNo,
      salesLineId: line.id,
      salesOrderId: order.id,
    }

    const profile = { productName, materialCode: line.productCode }
    const defaultRoute = resolveProductDefaultProcessRoute(profile)
    if (defaultRoute) {
      draft.processRouteName = defaultRoute
    }

    const wo = createWorkOrderPayload(draft)
    wo.orderCategory = MAINTENANCE_WORK_ORDER_CATEGORY
    wo.bom = ''
    wo.skipEbom = true
    addWorkOrder(wo)
    created.push(wo)
  })
  return created
}
