/**
 * 工序外协：工单工序 ↔ 外协订单联动
 */
import {
  OUTSOURCE_MODE,
  PROCESS_OUTSOURCE_STATUS,
  isProcessOutsourceOrder,
} from '@/utils/outsourcingMode'
import { getWorkOrders, updateWorkOrder } from '@/store/workOrderStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

function getWorkOrderById(id) {
  if (!id) return null
  return getWorkOrders().find((o) => o.id === id) || null
}

export function resolveProcessOpOutsource(process) {
  if (!process) return false
  if (process.opOutsource != null) return Boolean(process.opOutsource)
  return Boolean(process.operations?.opOutsource)
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
  updateWorkOrder(woId, { processes })
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
  updateWorkOrder(woId, { processes })
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
