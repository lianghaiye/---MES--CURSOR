/**
 * 工序外协：工单工序 ↔ 外协订单联动
 */
import dayjs from 'dayjs'
import {
  OUTSOURCE_MODE,
  PROCESS_OUTSOURCE_STATUS,
  isProcessOutsourceOrder,
} from '@/utils/outsourcingMode'
import { getWorkOrders, updateWorkOrder } from '@/store/workOrderStore'
import { assemblyWorkOrderState, updateAssemblyWorkOrder } from '@/store/assemblyWorkOrderStore'
import { addOutsourcingOrder, outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { createOutsourcingLine, recalcOutsourcingLine } from '@/mock/outsourcingOrders'
import { getProcessById, getProcessByName } from '@/store/processConfigStore'
import { resolveWorkOrderProcurementSource } from '@/constants/procurementDocSource'

function getWorkOrderById(id) {
  if (!id) return null
  const fromProd = getWorkOrders().find((o) => o.id === id)
  if (fromProd) return fromProd
  return (assemblyWorkOrderState.orders || []).find((o) => o.id === id) || null
}

function patchWorkOrderProcesses(workOrderId, processes) {
  if (getWorkOrders().some((o) => o.id === workOrderId)) {
    updateWorkOrder(workOrderId, { processes })
    return
  }
  if ((assemblyWorkOrderState.orders || []).some((o) => o.id === workOrderId)) {
    updateAssemblyWorkOrder(workOrderId, { processes })
  }
}

function resolveProcessMaster(process) {
  if (!process) return null
  if (process.processId) {
    const byId = getProcessById(process.processId)
    if (byId) return byId
  }
  return getProcessByName(process.name) || null
}

export function resolveProcessOpOutsource(process) {
  if (!process) return false
  if (process.opOutsource != null) return Boolean(process.opOutsource)
  if (process.operations?.opOutsource) return true
  const master = resolveProcessMaster(process)
  return Boolean(master?.operations?.opOutsource)
}

export function canCreateProcessOutsource(workOrder, process) {
  if (!workOrder || !process) return false
  const st = String(workOrder.status || '')
  if (!['待下发', '已下发', '执行中'].includes(st)) return false
  if (!resolveProcessOpOutsource(process)) return false
  const status = process.outsourceStatus || ''
  if (status === PROCESS_OUTSOURCE_STATUS.RETURNED) return false
  return true
}

export function listProcessOutsourceOrders(workOrder, process) {
  if (!workOrder || !process) return []
  const pid = String(process.id || '')
  return (outsourcingOrderState.orders || []).filter((o) => {
    if (!isProcessOutsourceOrder(o)) return false
    if (String(o.status || '') === '已作废') return false
    if (String(o.sourceProcessId || '') !== pid) return false
    const id = String(workOrder.id || '')
    const code = String(workOrder.code || '')
    if (id && String(o.sourceWorkOrderId || '') === id) return true
    if (code && (o.sourceWorkOrderNo === code || o.sourceOrderNo === code)) return true
    return false
  })
}

export function calcProcessOutsourcedQty(workOrder, process) {
  return listProcessOutsourceOrders(workOrder, process).reduce((sum, o) => {
    if (o.status === '已作废') return sum
    const q =
      o.totalQty != null
        ? Number(o.totalQty) || 0
        : (o.lineItems || []).reduce((s, l) => s + (Number(l.planQty) || 0), 0)
    return sum + q
  }, 0)
}

/** 工序可外协剩余数量（一期：工单计划量 − 已下发工序外协量） */
export function calcProcessOutsourceRemainQty(workOrder, process) {
  const plan = Math.max(0, Number(workOrder?.planQty) || Number(workOrder?.scheduleQty) || 0)
  const used = calcProcessOutsourcedQty(workOrder, process)
  return Math.max(0, Math.round((plan - used) * 10000) / 10000)
}

export function buildProcessOutsourceSeed(workOrder, process) {
  return {
    workOrder,
    process,
    outsourceMode: OUTSOURCE_MODE.PROCESS,
  }
}

/** 创建/更新工序外协单后回写工单工序 */
export function linkWorkOrderProcessOutsource(order) {
  if (!isProcessOutsourceOrder(order)) return
  const woId = order.sourceWorkOrderId
  const processId = order.sourceProcessId
  if (!woId || !processId) return
  const wo = getWorkOrderById(woId)
  if (!wo) return
  const processes = (wo.processes || []).map((p) => {
    if (String(p.id) !== String(processId)) return p
    const ids = Array.isArray(p.outsourcingOrderIds) ? [...p.outsourcingOrderIds] : []
    if (order.id && !ids.includes(order.id)) ids.push(order.id)
    const qty = calcProcessOutsourcedQty(
      { ...wo, id: woId, code: wo.code },
      { ...p, id: processId },
    )
    let outsourceStatus = p.outsourceStatus || PROCESS_OUTSOURCE_STATUS.NONE
    if (order.status === '已完成' || (Number(order.lineItems?.[0]?.receivedQty) || 0) > 0) {
      const allReturned = (order.lineItems || []).every(
        (l) => (Number(l.receivedQty) || 0) >= (Number(l.planQty) || 0) - 1e-9,
      )
      if (allReturned && (order.returnStatus === '已入库' || order.status === '已完成')) {
        outsourceStatus = PROCESS_OUTSOURCE_STATUS.RETURNED
      } else {
        outsourceStatus = PROCESS_OUTSOURCE_STATUS.OUTSOURCING
      }
    } else if (order.status !== '已作废') {
      outsourceStatus = PROCESS_OUTSOURCE_STATUS.OUTSOURCING
    }
    return {
      ...p,
      opOutsource: true,
      outsourcingOrderIds: ids,
      outsourceQty: qty,
      outsourceStatus,
    }
  })
  patchWorkOrderProcesses(woId, processes)
}

/** 收货/入库后按外协单状态重算工序外协状态 */
export function syncProcessOutsourceStatusFromOrder(order) {
  if (!isProcessOutsourceOrder(order)) return
  const woId = order.sourceWorkOrderId
  const processId = order.sourceProcessId
  if (!woId || !processId) return
  const wo = getWorkOrderById(woId)
  if (!wo) return
  const related = listProcessOutsourceOrders(wo, { id: processId })
  const processes = (wo.processes || []).map((p) => {
    if (String(p.id) !== String(processId)) return p
    const qty = related.reduce((s, o) => {
      return (
        s +
        (o.totalQty != null
          ? Number(o.totalQty) || 0
          : (o.lineItems || []).reduce((a, l) => a + (Number(l.planQty) || 0), 0))
      )
    }, 0)
    const active = related.filter((o) => o.status !== '已作废')
    let outsourceStatus = PROCESS_OUTSOURCE_STATUS.NONE
    if (active.length) {
      const allDone = active.every(
        (o) =>
          o.status === '已完成' ||
          o.returnStatus === '已入库' ||
          (o.lineItems || []).every(
            (l) => (Number(l.receivedQty) || 0) >= (Number(l.planQty) || 0) - 1e-9,
          ),
      )
      outsourceStatus = allDone
        ? PROCESS_OUTSOURCE_STATUS.RETURNED
        : PROCESS_OUTSOURCE_STATUS.OUTSOURCING
    }
    return {
      ...p,
      outsourceQty: qty,
      outsourceStatus,
      outsourcingOrderIds: active.map((o) => o.id).filter(Boolean),
    }
  })
  patchWorkOrderProcesses(woId, processes)
}

/**
 * 工单下发自动创建工序外协单（允许供应商为空，状态待提交）
 * @returns {{ ok: boolean, order?: object, message?: string }}
 */
export function createProcessOutsourceOrderFromDispatch({
  workOrder,
  process,
  batchQty,
  scheduleBatchId = '',
}) {
  const qty = Math.max(0, Number(batchQty) || 0)
  if (!workOrder?.id || !process?.id) {
    return { ok: false, message: '工单或工序无效' }
  }
  if (!(qty > 0)) return { ok: false, message: '本批数量无效' }
  if (!resolveProcessOpOutsource(process)) {
    return { ok: false, message: '工序未开启外协' }
  }

  const code = workOrder.materialCode || workOrder.productCode || ''
  const name = workOrder.productName || workOrder.name || ''
  const shipWarehouse = workOrder.warehouse || ''
  const supplier = String(workOrder.supplier || process.supplier || '').trim()
  const start = dayjs()
  const line = createOutsourcingLine({
    productName: name,
    productCode: code,
    itemName: name,
    itemCode: code,
    specModel: workOrder.specModel || '',
    material: workOrder.material || '',
    drawingNo: workOrder.drawingNo || '',
    planQty: qty,
    unit: workOrder.unit || '个',
    shipWarehouse,
    processId: process.id,
    processName: process.name || '',
  })
  recalcOutsourcingLine(line)

  const order = addOutsourcingOrder({
    workOrderName: workOrder.name || workOrder.code || '',
    salesOrderNo: workOrder.sourceOrderNo || '',
    salesOrderId: workOrder.salesOrderId || '',
    source: resolveWorkOrderProcurementSource(workOrder),
    sourceOrderNo: workOrder.code || '',
    sourceWorkOrderId: workOrder.id || '',
    sourceWorkOrderNo: workOrder.code || '',
    sourceScheduleBatchId: scheduleBatchId || '',
    outsourceMode: OUTSOURCE_MODE.PROCESS,
    sourceProcessId: process.id || '',
    sourceProcessCode: process.processCode || '',
    sourceProcessName: process.name || '',
    sourceProcessIndex: process.index ?? process.stepNo ?? null,
    supplier,
    planStartDate: start.format('YYYY-MM-DD'),
    planEndDate: start.add(14, 'day').format('YYYY-MM-DD'),
    planDate: start.add(14, 'day').format('YYYY-MM-DD'),
    shipWarehouse,
    status: '待提交',
    remark: `工单下发自动生成 · 批次量 ${qty} · 工序「${process.name || ''}」`,
    lineItems: [line],
  })
  linkWorkOrderProcessOutsource(order)
  return { ok: true, order }
}

/** 排产批次维度：查找工序外协单（严格按批次绑定，避免误挂历史孤儿单） */
export function findProcessOutsourceOrderForSchedule(workOrder, process, batchId) {
  const list = listProcessOutsourceOrders(workOrder, process)
  if (!list.length) return null
  const bid = String(batchId || '')
  if (bid) {
    return list.find((o) => String(o.sourceScheduleBatchId || '') === bid) || null
  }
  return list[0] || null
}

/** 排产行外协状态文案 */
export function resolveScheduleProcessOutsourceStatusLabel(workOrder, process, batchId) {
  if (!resolveProcessOpOutsource(process)) return '—'
  const order = findProcessOutsourceOrderForSchedule(workOrder, process, batchId)
  return order?.status ? String(order.status) : '未生成'
}

/** 下发时读取「本次不出 / 下发前确认」：工序模板或本批指派均可 */
function resolveDispatchOutsourceFlags(process, batch) {
  const assignment = (batch?.processAssignments || []).find(
    (a) =>
      (process?.id && String(a.processId) === String(process.id)) ||
      (process?.name && a.processName === process.name),
  )
  return {
    skip:
      Boolean(process?.skipProcessOutsourceOnDispatch) ||
      Boolean(assignment?.skipProcessOutsourceOnDispatch),
    confirm:
      Boolean(process?.outsourceConfirmBeforeDispatch) ||
      Boolean(assignment?.outsourceConfirmBeforeDispatch),
  }
}

/**
 * 下发成功后：按工序自动/确认生成工序外协单
 * - 本次不出：跳过
 * - 下发前确认：打开表单，保存则出单、取消则跳过
 * - 均未勾选：自动出单
 * @param {{ workOrder: object, batchQty: number, scheduleBatchId?: string, confirmProcess?: (ctx) => Promise<{ saved: boolean, order?: object }> }} opts
 * @returns {Promise<{ created: number, skipped: number, orders: object[] }>}
 */
export async function ensureProcessOutsourceOrdersAfterDispatch({
  workOrder,
  batchQty,
  scheduleBatchId = '',
  confirmProcess,
}) {
  const qty = Math.max(0, Number(batchQty) || 0)
  const result = { created: 0, skipped: 0, orders: [] }
  if (!workOrder || !(qty > 0)) return result

  const batch = scheduleBatchId
    ? (workOrder.scheduleBatches || []).find((b) => String(b.id) === String(scheduleBatchId))
    : null

  const processes = (workOrder.processes || []).filter((p) => resolveProcessOpOutsource(p))
  for (const process of processes) {
    const { skip, confirm } = resolveDispatchOutsourceFlags(process, batch)
    if (skip) {
      result.skipped += 1
      continue
    }
    if (findProcessOutsourceOrderForSchedule(workOrder, process, scheduleBatchId)) {
      result.skipped += 1
      continue
    }
    if (confirm && typeof confirmProcess === 'function') {
      const res = await confirmProcess({
        workOrder,
        process,
        batchQty: qty,
        scheduleBatchId,
      })
      if (res?.saved && res.order) {
        result.created += 1
        result.orders.push(res.order)
      } else {
        result.skipped += 1
      }
      continue
    }
    const created = createProcessOutsourceOrderFromDispatch({
      workOrder,
      process,
      batchQty: qty,
      scheduleBatchId,
    })
    if (created.ok && created.order) {
      result.created += 1
      result.orders.push(created.order)
    } else {
      result.skipped += 1
    }
  }
  return result
}

/** 工序外协发料物料：优先工序投料；无投料则发外协产品本身（不展开 BOM） */
export function resolveMaterialsForProcessOutsource(order, setQty = 1, productLine = null) {
  const qty = Number(setQty) || 0
  if (qty <= 0 || !isProcessOutsourceOrder(order)) return []
  const line =
    productLine ||
    (order.lineItems || []).find((l) => l.id && productLine?.id && l.id === productLine.id) ||
    (order.lineItems || [])[0] ||
    {}
  const wo = getWorkOrderById(order.sourceWorkOrderId)
  const process = (wo?.processes || []).find((p) => String(p.id) === String(order.sourceProcessId))
  const feeds = (process?.feedingMaterials || []).filter(
    (m) =>
      (m.materialName || m.itemName || m.name) && (m.materialId || m.itemCode || m.materialCode),
  )
  if (feeds.length) {
    return feeds.map((mat, index) => {
      const unitUsage = Number(mat.qty ?? mat.unitUsage ?? mat.unitQty) || 1
      return {
        id: `proc-feed-${order.id}-${line.id || index}-${index}`,
        itemCode: mat.itemCode || mat.materialCode || mat.materialId || '',
        itemName: mat.materialName || mat.itemName || mat.name || '',
        specModel: mat.specModel || '',
        material: mat.material || '',
        drawingNo: mat.drawingNo || '',
        unit: mat.unit || '件',
        unitUsage,
        planIssueQty: Math.round(unitUsage * qty * 10000) / 10000,
        shipWarehouse: mat.shipWarehouse || line.shipWarehouse || order.shipWarehouse || '',
        sourceProductLineIds: line.id ? [line.id] : [],
        lineId: line.id || '',
        fromProcessFeeding: true,
      }
    })
  }

  const itemCode = line.productCode || line.itemCode || ''
  const itemName = line.productName || line.itemName || ''
  if (!itemCode && !itemName) return []
  return [
    {
      id: `proc-product-${order.id}-${line.id || '0'}`,
      itemCode,
      itemName,
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      unit: line.unit || '件',
      unitUsage: 1,
      planIssueQty: Math.round(qty * 10000) / 10000,
      shipWarehouse: line.shipWarehouse || order.shipWarehouse || '',
      sourceProductLineIds: line.id ? [line.id] : [],
      lineId: line.id || '',
      fromProcessProduct: true,
    },
  ]
}
