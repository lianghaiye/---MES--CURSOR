/**
 * 生产/总装工单一键转采购、转外协
 */
import dayjs from 'dayjs'
import { getWorkOrderPlanQty } from '@/utils/workOrderScheduleBatch'

/** 待下发 / 执行中，且仍有计划数量 */
export function canConvertWorkOrderToPurchaseOrOutsource(wo) {
  if (!wo) return false
  if (!['待下发', '执行中'].includes(wo.status)) return false
  return getWorkOrderPlanQty(wo) > 0
}

/** 转换数量：优先剩余（计划−完工），否则用计划数 */
export function getWorkOrderConvertQty(wo) {
  const plan = getWorkOrderPlanQty(wo)
  if (plan <= 0) return 0
  const finished = Math.max(0, Number(wo?.finishedQty) || 0)
  const remain = plan - finished
  return remain > 0 ? remain : plan
}

/** 构造采购申请弹窗用的物料行（供应型态按外购件） */
export function buildConvertMaterialFromWorkOrder(wo, supplyType = '外购件') {
  const qty = getWorkOrderConvertQty(wo)
  return {
    id: wo.id || `wo-convert-${Date.now()}`,
    name: wo.productName || wo.name || '',
    code: wo.materialCode || wo.productCode || '',
    spec: wo.specModel || '',
    material: wo.material || '',
    drawingNo: wo.drawingNo || '',
    type: '成品',
    supplyType,
    unit: wo.unit || '件',
    demandQty: qty,
    gapQty: qty,
    planQty: qty,
    availableStock: 0,
    stockQty: 0,
    warehouse: wo.warehouse || '',
    workCenter: wo.workCenter || '',
    urgency: wo.urgency || '普通',
    isTopLevel: true,
    productId: wo.productId || '',
    bomId: wo.bomId || '',
    remark: `来源工单 ${wo.code || ''}`,
  }
}

/** 构造采购申请弹窗用的伪订单头 */
export function buildConvertSyntheticOrder(wo, actionLabel = '采购') {
  const planEnd = Array.isArray(wo?.planDateRange) ? wo.planDateRange[1] : ''
  return {
    id: `wo-convert-order-${wo.id || Date.now()}`,
    orderNo: wo.sourceOrderNo || wo.code || '',
    urgency: wo.urgency || '普通',
    remark: `工单 ${wo.code || ''} 一键转${actionLabel}`,
    productQty: getWorkOrderConvertQty(wo),
    planSource: 'work-order-convert',
    planAssemblyDate: planEnd || dayjs().add(14, 'day').format('YYYY-MM-DD'),
    salesOrderId: wo.salesOrderId || '',
    workItems: [],
  }
}
