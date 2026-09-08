/**
 * 生产/总装工单一键转采购、转外协
 */
import dayjs from 'dayjs'
import { getBatchesScheduledQty, getRemainScheduleQty } from '@/utils/workOrderScheduleBatch'
import {
  resolveWorkOrderProcurementSource,
  PROCUREMENT_DOC_SOURCE,
} from '@/constants/procurementDocSource'
import { updateWorkOrder } from '@/store/workOrderStore'
import { updateAssemblyWorkOrder } from '@/store/assemblyWorkOrderStore'

const CONVERTIBLE_STATUSES = ['待下发', '已下发', '执行中']
const DONE_BATCH_STATUSES = new Set(['完成', '已完成'])

/** 待下发 / 已下发 / 执行中，且仍有待排产数量 */
export function canConvertWorkOrderToPurchaseOrOutsource(wo) {
  if (!wo) return false
  if (!CONVERTIBLE_STATUSES.includes(wo.status)) return false
  return getRemainScheduleQty(wo) > 0
}

/** 本次可转数量 = 当前待排产数量 */
export function getWorkOrderConvertQty(wo) {
  return getRemainScheduleQty(wo)
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

function purchaseReqOccupyQty(requisition) {
  if (!requisition) return 0
  if (requisition.plannedQty != null && requisition.plannedQty !== '') {
    return Math.max(0, Number(requisition.plannedQty) || 0)
  }
  return (requisition.lineItems || []).reduce(
    (s, l) => s + (Number(l.planQty ?? l.purchaseQty ?? l.qty) || 0),
    0,
  )
}

function outsourcingOccupyQty(order) {
  if (!order) return 0
  if (order.outsourceQty != null && order.outsourceQty !== '') {
    return Math.max(0, Number(order.outsourceQty) || 0)
  }
  if (order.totalQty != null && order.totalQty !== '') {
    return Math.max(0, Number(order.totalQty) || 0)
  }
  return (order.lineItems || []).reduce((s, l) => s + (Number(l.planQty ?? l.outsourceQty) || 0), 0)
}

/**
 * 转单数量不可超过当前待排产（保存前校验，不含本单）
 * @returns {{ ok: boolean, message?: string, remain: number, qty: number }}
 */
export function validateWorkOrderConvertQty(wo, qty) {
  const remain = getRemainScheduleQty(wo)
  const n = Math.max(0, Number(qty) || 0)
  if (n <= 0) return { ok: false, message: '转换数量须大于 0', remain, qty: n }
  if (n > remain) {
    return {
      ok: false,
      message: `转换数量不可超过待排产 ${remain}`,
      remain,
      qty: n,
    }
  }
  return { ok: true, remain, qty: n }
}

export function validateWorkOrderConvertPurchaseQty(wo, requisition) {
  return validateWorkOrderConvertQty(wo, purchaseReqOccupyQty(requisition))
}

export function validateWorkOrderConvertOutsourceQty(wo, order) {
  return validateWorkOrderConvertQty(wo, outsourcingOccupyQty(order))
}

/** 是否仍有未完成的下发/排产任务 */
export function hasUnfinishedDispatchedWork(wo) {
  if (!wo) return false
  const batches = wo.scheduleBatches || []
  if (batches.length) {
    return batches.some((b) => !DONE_BATCH_STATUSES.has(String(b.status || '')))
  }
  const scheduled = getBatchesScheduledQty(wo)
  if (scheduled <= 0) return false
  const finished = Math.max(0, Number(wo.finishedQty) || 0)
  return finished < scheduled
}

/**
 * 待排产归零后：仅当没有未完成下发任务时，才自动已完成。
 * 若已下发任务未做完，只是不能再下发/转采购/转外协，状态保持不变。
 */
export function completeWorkOrderIfNoRemainSchedule(wo) {
  if (!wo?.id) return false
  if (getRemainScheduleQty(wo) > 0) return false
  if (hasUnfinishedDispatchedWork(wo)) return false
  if (['暂停', '终止', '已完成', '完成'].includes(wo.status)) return false
  const patch = { status: '已完成' }
  const source = resolveWorkOrderProcurementSource(wo)
  if (source === PROCUREMENT_DOC_SOURCE.ASSEMBLY_WO) {
    updateAssemblyWorkOrder(wo.id, patch)
  } else {
    updateWorkOrder(wo.id, patch)
  }
  return true
}
