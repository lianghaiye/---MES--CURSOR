/**
 * 工单详情关联信息（排产任务行 / 领料 / 入库 / 质检 / 采购 / 外协）
 */
import dayjs from 'dayjs'
import { getActiveScheduleBatch } from '@/utils/workOrderScheduleBatch'
import { materialRequisitionState } from '@/store/materialRequisitionStore'
import { listMobileMaterialReqs } from '@/store/mobileMaterialReqStore'
import { inboundOrderState, getInboundOrderById } from '@/store/inboundOrderStore'
import {
  listMobileFinishedInbounds,
  relatedProductText as finishedInboundProductText,
} from '@/store/mobileFinishedInboundStore'
import { outboundState } from '@/store/outboundStore'
import { getPurchaseOrdersByRequisition } from '@/store/purchaseOrderStore'
import { listMobileTasksForWorkOrder } from '@/utils/workOrderStatus'
import { flattenMaterialReqOutboundLines } from '@/utils/materialReqOutboundLines'
import { flattenOutboundOrdersToIssueLines } from '@/utils/outboundIssueLines'
import {
  getWorkOrderConvertedOutsourceQty,
  getWorkOrderConvertedPurchaseQty,
  getWorkOrderConvertOccupyQty,
  getWorkOrderConvertSideLabel,
  getWorkOrderConvertSideTagColor,
  listWorkOrderOutsourcingOrders,
  listWorkOrderPurchaseRequisitions,
} from '@/utils/workOrderConvertOccupy'
import { resolveWorkOrderProcessConfigTags } from '@/utils/workOrderProcessDisplay'
import {
  resolveProcessOpOutsource,
  resolveScheduleProcessOutsourceStatusLabel,
} from '@/utils/workOrderProcessOutsource'

function sumLineQty(lines) {
  return (lines || []).reduce((s, l) => s + (Number(l.qty ?? l.applyQty ?? l.reqQty) || 0), 0)
}

function findMobileTaskForRow(tasks, processName, executor, batch) {
  let list = (tasks || []).filter((t) => !t.hiddenByTerminate && t.processName === processName)
  if (!list.length) return null

  if (batch?.id) {
    const linked = list.filter((t) => t.scheduleBatchId === batch.id || t.batchId === batch.id)
    if (linked.length) list = linked
    else {
      const batchQty = Math.max(0, Number(batch.qty) || 0)
      const byQty = list.filter(
        (t) => Math.max(0, Number(t.expectedQty ?? t.targetQty) || 0) === batchQty,
      )
      if (byQty.length) list = byQty
    }
  }

  if (executor && executor !== '—') {
    return (
      list.find((t) => t.executor === executor || t.claimedBy === executor) ||
      list.find((t) => !t.executor) ||
      list[0]
    )
  }
  return list[0]
}

function mapMobileTaskStatus(task) {
  if (!task) return ''
  if (task.taskStatus === '已终止') return '已终止'
  if (task.controlStatus === '暂停' && task.taskStatus !== '已完成') return '暂停'
  if (task.taskStatus === '已完成') return '已报工'
  if (Number(task.reportedFinishedQty) > 0 || Number(task.reportedGoodQty) > 0) return '已报工'
  if (task.taskStatus === '待领取') return '待领取'
  if (['待报工', '待开始', '执行中'].includes(task.taskStatus)) return '待报工'
  return task.taskStatus || '待报工'
}

/** 排产信息：按批次展开工序任务行 */
export function buildWorkOrderScheduleInfoRows(workOrder) {
  return buildWorkOrderScheduleInfoBatchGroups(workOrder).flatMap((g) => g.rows)
}

/** 排产信息：按批次分组（含批次头信息） */
export function buildWorkOrderScheduleInfoBatchGroups(workOrder) {
  const batches = workOrder?.scheduleBatches || []
  if (!batches.length) return []

  const mobileTasks = listMobileTasksForWorkOrder(workOrder.id)
  const groups = []

  batches.forEach((batch) => {
    const assignments = batch.processAssignments?.length
      ? batch.processAssignments
      : (workOrder.processes || []).map((p) => ({
          processId: p.id,
          processName: p.name,
          executors: p.executors || [],
        }))
    const rows = []
    let seq = 0
    assignments.forEach((a, ai) => {
      const process = (workOrder.processes || []).find(
        (p) =>
          (a.processId && String(p.id) === String(a.processId)) ||
          (a.processName && p.name === a.processName),
      ) || {
        id: a.processId,
        name: a.processName,
        processCode: a.processCode,
        resourceType: a.resourceType,
        opOutsource: a.opOutsource,
        operations: a.operations,
      }
      const executors = a.executors?.length ? a.executors : ['—']
      executors.forEach((executor, ei) => {
        seq += 1
        const task = findMobileTaskForRow(mobileTasks, a.processName, executor, batch)
        const dispatched = batch.status !== '待下发'
        let status = '待领取'
        let reportQty = 0
        let goodQty = 0
        let badQty = 0
        let reportDuration = '—'
        let reportedAt = '—'
        let taskNo = `${workOrder.code || 'WO'}-B${batch.batchNo}-${ai + 1}-${ei + 1}`

        if (task) {
          status = mapMobileTaskStatus(task)
          reportQty = Number(task.reportedFinishedQty || task.reportQty || 0) || 0
          goodQty = Number(task.reportedGoodQty || 0) || 0
          badQty = Number(task.reportedBadQty || task.badQty || 0) || 0
          reportDuration = task.reportDuration ? String(task.reportDuration) : '—'
          reportedAt = task.reportedAt || '—'
          // 多批次共工序时避免任务编号串批展示
          const taskBatchOk =
            !task.scheduleBatchId && !task.batchId
              ? true
              : task.scheduleBatchId === batch.id || task.batchId === batch.id
          taskNo = taskBatchOk && task.taskNo ? task.taskNo : taskNo
        } else if (a.reportCleared || a.scheduleTaskStatus) {
          status = a.scheduleTaskStatus || '待报工'
          reportQty = Number(a.reportQty) || 0
          goodQty = Number(a.goodQty) || 0
          badQty = Number(a.badQty) || 0
          reportDuration = a.reportDuration || '—'
          reportedAt = a.reportedAt || '—'
        } else {
          const reported = batch.status === '完成' || batch.status === '已完成'
          if (reported) status = '已报工'
          else if (dispatched) status = '待报工'
          reportQty = reported ? batch.qty : 0
          goodQty = reported ? batch.qty : 0
          reportDuration = reported ? '2.5h' : '—'
          reportedAt = reported ? batch.dispatchedAt || '—' : '—'
        }

        rows.push({
          id: `${batch.id}-${a.processId || ai}-${ei}`,
          batchId: batch.id,
          batchNo: batch.batchNo,
          batchStatus: batch.status || '待下发',
          seq,
          processId: process?.id || a.processId || '',
          processName: a.processName || '—',
          processConfigTags: resolveWorkOrderProcessConfigTags(process),
          isOutsourceProcess: resolveProcessOpOutsource(process),
          outsourceStatus: resolveScheduleProcessOutsourceStatusLabel(workOrder, process, batch.id),
          processLead: ei === 0,
          status,
          taskNo,
          executor,
          scheduleQty: batch.qty,
          reportQty,
          goodQty,
          badQty,
          reportDuration,
          dispatchedAt: batch.dispatchedAt || '—',
          reportedAt,
        })
      })
    })

    groups.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      status: batch.status || '待下发',
      qty: Math.max(0, Number(batch.qty) || 0),
      dispatchedAt: batch.dispatchedAt || '—',
      createdAt: batch.createdAt || '—',
      processCount: rows.length,
      rows,
    })
  })

  return groups
}

export function scheduleTaskStatusColor(status) {
  const map = {
    待领取: 'default',
    待报工: 'processing',
    已报工: 'success',
    暂停: 'warning',
    已终止: 'default',
  }
  return map[status] || 'default'
}

/** 领料信息 */
export function buildWorkOrderMaterialReqRows(workOrder) {
  if (!workOrder) return []
  const woId = String(workOrder.id || '')
  const woCode = String(workOrder.code || '')

  const mobileList = listMobileMaterialReqs().filter((r) => {
    if (woId && String(r.workOrderId || '') === woId) return true
    if (woCode && String(r.workOrderCode || '') === woCode) return true
    if (woId && (r.workOrderIds || []).map(String).includes(woId)) return true
    if (woCode && (r.workOrders || []).some((w) => String(w.code || '') === woCode)) return true
    return false
  })
  if (mobileList.length) {
    return mobileList.map((r, idx) => {
      const refs = Array.isArray(r.outboundOrders) ? r.outboundOrders.filter((o) => o.docNo) : []
      const outboundOrders = refs.length
        ? refs.map((ref) => ({
            id: ref.id || '',
            docNo: ref.docNo || '',
          }))
        : r.outboundId || r.outboundDocNo
          ? [{ id: r.outboundId || '', docNo: r.outboundDocNo || '' }]
          : []
      return {
        id: r.id || `mr-${idx}`,
        index: idx + 1,
        status: r.auditStatus || '待审核',
        reqNo: r.reqNo || '—',
        reqId: r.id,
        summary: r.productName || relatedMobileSummary(r, workOrder),
        qty: r.totalQty || sumLineQty(r.lines) || 0,
        workshop: r.workshop || workOrder.workCenter || '—',
        outboundNo:
          outboundOrders
            .map((o) => o.docNo)
            .filter(Boolean)
            .join('、') || '—',
        outboundId: outboundOrders[0]?.id || '',
        outboundOrders,
        outboundStatus: r.outboundStatus || '—',
        applicant: r.applicant || '—',
        appliedAt: r.createdAt || '—',
      }
    })
  }

  const list = (materialRequisitionState.records || []).filter(
    (r) =>
      String(r.workOrderId || '') === woId ||
      String(r.workOrderNo || '') === woCode ||
      (woCode && String(r.workOrderNo || '').includes(woCode)),
  )
  if (list.length) {
    return list.map((r, idx) => {
      const outbound =
        (outboundState.orders || []).find(
          (o) =>
            o.id === r.outboundId ||
            o.docNo === r.outboundNo ||
            (r.reqNo && String(o.sourceDocNo || '') === String(r.reqNo)),
        ) || null
      const outboundOrders = outbound
        ? [{ id: outbound.id, docNo: outbound.docNo }]
        : r.outboundId || r.outboundNo
          ? [{ id: r.outboundId || '', docNo: r.outboundNo || '' }]
          : []
      return {
        id: r.id || `mr-${idx}`,
        index: idx + 1,
        status: r.status || '待确认',
        reqNo: r.reqNo || r.requisitionNo || '—',
        reqId: r.id,
        summary: r.productName || r.summary || workOrder.productName || '—',
        qty: sumLineQty(r.lines) || r.totalQty || r.qty || 0,
        workshop: r.workshop || r.receiveWorkshop || workOrder.workCenter || '—',
        outboundNo: outbound?.docNo || r.outboundNo || '—',
        outboundId: outbound?.id || r.outboundId || '',
        outboundOrders,
        outboundStatus: outbound?.status || r.outboundStatus || '—',
        applicant: r.applicant || r.creator || r.createdBy || '—',
        appliedAt: r.appliedAt || r.createdAt || r.applyTime || '—',
      }
    })
  }
  // 演示占位：有排产批次时造 1 条
  if ((workOrder.scheduleBatches || []).length) {
    return [
      {
        id: `mr-demo-${workOrder.id}`,
        index: 1,
        status: '待出库',
        reqNo: `LL${dayjs().format('YYYYMMDD')}001`,
        reqId: '',
        summary: workOrder.productName || workOrder.name || '—',
        qty: workOrder.scheduleQty || workOrder.planQty || 0,
        workshop: workOrder.workCenter || '—',
        outboundNo: '—',
        outboundId: '',
        outboundOrders: [],
        outboundStatus: '—',
        applicant: workOrder.owner || 'admin',
        appliedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      },
    ]
  }
  return []
}

/**
 * 工单详情「出库信息」：汇总关联领料申请及工单关联出库单，字段对齐领料申请出库信息
 */
export function buildWorkOrderOutboundIssueLines(workOrder) {
  if (!workOrder) return []
  void outboundState.orders

  const woId = String(workOrder.id || '')
  const woCode = String(workOrder.code || '')
  const lineMap = new Map()

  function addLines(lines) {
    for (const line of lines || []) {
      const key = line.id || `${line.outboundOrderNo}-${line.productCode}-${line.productName}`
      if (!key || lineMap.has(key)) continue
      lineMap.set(key, line)
    }
  }

  function matchesWorkOrder(order) {
    if (!order) return false
    if (woCode && String(order.workOrderCode || '') === woCode) return true
    if (woCode && String(order.sourceOrderNo || '') === woCode) return true
    return (order.workOrders || []).some(
      (w) =>
        (woId && String(w.id || w.workOrderId || '') === woId) ||
        (woCode && String(w.code || w.workOrderCode || '') === woCode),
    )
  }

  const mobileList = listMobileMaterialReqs().filter((r) => {
    if (woId && String(r.workOrderId || '') === woId) return true
    if (woCode && String(r.workOrderCode || '') === woCode) return true
    if (woId && (r.workOrderIds || []).map(String).includes(woId)) return true
    if (woCode && (r.workOrders || []).some((w) => String(w.code || '') === woCode)) return true
    return false
  })

  for (const r of mobileList) {
    addLines(flattenMaterialReqOutboundLines(r))
  }

  for (const order of outboundState.orders || []) {
    if (matchesWorkOrder(order)) addLines(flattenOutboundOrdersToIssueLines([order]))
  }

  return [...lineMap.values()]
}

function relatedMobileSummary(r, workOrder) {
  if (r.productName) return r.productName
  if (Array.isArray(r.workOrders) && r.workOrders.length) {
    return r.workOrders
      .map((w) => w.productName)
      .filter(Boolean)
      .slice(0, 2)
      .join('、')
  }
  return workOrder.productName || '—'
}

function finishedInboundMatchesWorkOrder(req, workOrder) {
  if (!req || !workOrder) return false
  const id = workOrder.id
  const code = String(workOrder.code || '').trim()
  if (id && (req.workOrderId === id || (req.workOrderIds || []).includes(id))) return true
  if (code && req.workOrderCode === code) return true
  if (
    (req.workOrders || []).some(
      (w) => (id && w.id === id) || (code && String(w.code || '') === code),
    )
  ) {
    return true
  }
  return (req.lines || []).some(
    (l) =>
      (id && l.sourceWorkOrderId === id) || (code && String(l.sourceWorkOrderCode || '') === code),
  )
}

function inboundOrderMatchesWorkOrder(order, workOrder) {
  if (!order || !workOrder) return false
  const id = workOrder.id
  const code = String(workOrder.code || '').trim()
  if (order.finishedInboundReqId || order.finishedInboundReqNo) {
    const apps = listMobileFinishedInbounds()
    if (
      apps.some(
        (r) =>
          finishedInboundMatchesWorkOrder(r, workOrder) &&
          (r.id === order.finishedInboundReqId || r.reqNo === order.finishedInboundReqNo),
      )
    ) {
      return true
    }
  }
  if (
    (order.workOrders || []).some(
      (w) => (id && w.id === id) || (code && String(w.code || '') === code),
    )
  ) {
    return true
  }
  const src = String(order.sourceOrderNo || '')
  if (code && src.includes(code)) return true
  return (order.lineItems || []).some((l) => code && String(l.sourceDocNo || '').includes(code))
}

function isConfirmedInboundOrder(order) {
  const status = order?.status || ''
  return status === '已完成' || status === '已入库' || status === '已确认'
}

/** 工单详情 · 入库申请（成品入库申请） */
export function buildWorkOrderFinishedInboundAppRows(workOrder) {
  if (!workOrder) return []
  return listMobileFinishedInbounds()
    .filter((r) => finishedInboundMatchesWorkOrder(r, workOrder))
    .map((r, idx) => ({
      id: r.id,
      index: idx + 1,
      status: r.auditStatus || '—',
      reqId: r.id,
      reqNo: r.reqNo || '—',
      modeLabel: r.modeLabel || '—',
      summary: finishedInboundProductText(r) || workOrder.productName || '—',
      applyQty: r.totalQty ?? sumLineQty(r.lines) ?? 0,
      workshop: r.workshop || '—',
      warehouse: r.warehouse || '—',
      inboundDocNo: r.inboundDocNo || '—',
      inboundOrders: Array.isArray(r.inboundOrders) ? r.inboundOrders : [],
      inboundId: r.inboundId || '',
      inboundStatus: r.inboundStatus || '—',
      applicant: r.applicant || '—',
      createdAt: r.createdAt || '—',
    }))
}

/** 工单详情 · 入库信息（一产品一行） */
export function buildWorkOrderInboundRows(workOrder) {
  if (!workOrder) return []
  const relatedApps = listMobileFinishedInbounds().filter((r) =>
    finishedInboundMatchesWorkOrder(r, workOrder),
  )
  const orderMap = new Map()
  relatedApps.forEach((app) => {
    ;(app.inboundOrders || []).forEach((ref) => {
      const live = ref.id ? getInboundOrderById(ref.id) : null
      const order = live || (inboundOrderState.orders || []).find((o) => o.docNo === ref.docNo)
      if (order?.id) orderMap.set(order.id, order)
    })
    if (app.inboundId) {
      const live = getInboundOrderById(app.inboundId)
      if (live?.id) orderMap.set(live.id, live)
    }
  })
  ;(inboundOrderState.orders || []).forEach((o) => {
    if (o?.id && inboundOrderMatchesWorkOrder(o, workOrder)) orderMap.set(o.id, o)
  })

  const rows = []
  ;[...orderMap.values()].forEach((order) => {
    const confirmed = isConfirmedInboundOrder(order)
    const lines = order.lineItems || []
    if (!lines.length) {
      rows.push({
        id: `${order.id}-empty`,
        status: order.status || '—',
        docNo: order.docNo || '—',
        docId: order.id,
        itemName: order.productName || workOrder.productName || '—',
        itemCode: '',
        specModel: '',
        material: '',
        applyQty: order.totalQty || 0,
        actualQty: confirmed ? order.totalQty || 0 : 0,
        warehouse: order.warehouse || '—',
        inboundAt: order.confirmedAt || order.inboundDate || '—',
        confirmer: order.confirmer || '—',
        confirmedAt: order.confirmedAt || '—',
      })
      return
    }
    lines.forEach((line, idx) => {
      const applyQty = Number(line.applyQty ?? line.qty) || 0
      const actualQty = confirmed
        ? Number(line.actualQty ?? line.receivedQty ?? line.qty) || 0
        : Number(line.actualQty ?? line.receivedQty) || 0
      rows.push({
        id: `${order.id}-${line.id || idx}`,
        status: order.status || line.lineStatus || '—',
        docNo: order.docNo || '—',
        docId: order.id,
        itemName: line.itemName || line.productName || workOrder.productName || '—',
        itemCode: line.itemCode || line.productCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty,
        actualQty,
        warehouse: line.warehouse || order.warehouse || '—',
        inboundAt: order.confirmedAt || order.inboundDate || '—',
        confirmer: order.confirmer || '—',
        confirmedAt: order.confirmedAt || '—',
      })
    })
  })
  return rows.map((r, idx) => ({ ...r, index: idx + 1 }))
}

/** 成品入库申请详情 · 入库信息行 */
export function flattenFinishedInboundDetailLines(record) {
  if (!record) return []
  const refs = Array.isArray(record.inboundOrders) ? record.inboundOrders : []
  const orders = []
  refs.forEach((ref) => {
    const live = ref.id ? getInboundOrderById(ref.id) : null
    if (live) orders.push(live)
  })
  if (!orders.length && record.inboundId) {
    const live = getInboundOrderById(record.inboundId)
    if (live) orders.push(live)
  }
  const rows = []
  orders.forEach((order) => {
    const confirmed = isConfirmedInboundOrder(order)
    ;(order.lineItems || []).forEach((line, idx) => {
      const applyQty = Number(line.applyQty ?? line.qty) || 0
      const actualQty = confirmed
        ? Number(line.actualQty ?? line.receivedQty ?? line.qty) || 0
        : Number(line.actualQty ?? line.receivedQty) || 0
      rows.push({
        id: `${order.id}-${line.id || idx}`,
        status: order.status || line.lineStatus || '—',
        docNo: order.docNo || '—',
        docId: order.id,
        itemName: line.itemName || '',
        itemCode: line.itemCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty,
        actualQty,
        warehouse: line.warehouse || order.warehouse || '—',
        inboundAt: order.confirmedAt || order.inboundDate || '—',
        confirmer: order.confirmer || '—',
        confirmedAt: order.confirmedAt || '—',
      })
    })
  })
  return rows
}

/** 质检信息 */
export function buildWorkOrderQcInfoRows(workOrder) {
  const scheduleRows = buildWorkOrderScheduleInfoRows(workOrder)
  if (!scheduleRows.length) return []
  return scheduleRows.map((r, idx) => {
    const done = r.status === '已报工'
    return {
      id: `qc-${r.id}`,
      index: idx + 1,
      status: done ? '已完成' : '待质检',
      result: done ? '质检通过' : '—',
      qcNo: done ? `ZJ${dayjs().format('YYYYMMDD')}${String(idx + 1).padStart(3, '0')}` : '—',
      qcMode: idx % 2 === 0 ? '抽检' : '全检',
      processName: r.processName,
      taskNo: r.taskNo,
      taskExecutor: r.executor,
      qcAt: done ? r.reportedAt : '—',
      qcBy: done ? '质检员' : '—',
    }
  })
}

export function qcInfoStatusColor(status) {
  return status === '已完成' ? 'success' : 'warning'
}

export function qcInfoResultColor(result) {
  if (result === '质检通过') return 'success'
  if (result === '部分通过') return 'processing'
  if (result === '不通过') return 'error'
  return 'default'
}

/** 由工单关联采购申请派生的采购订单 */
export function listWorkOrderPurchaseOrders(workOrder) {
  const reqs = listWorkOrderPurchaseRequisitions(workOrder)
  const map = new Map()
  reqs.forEach((req) => {
    getPurchaseOrdersByRequisition(req).forEach((po) => {
      if (po?.id) map.set(po.id, po)
    })
  })
  return [...map.values()]
}

export {
  getWorkOrderConvertedOutsourceQty,
  getWorkOrderConvertedPurchaseQty,
  getWorkOrderConvertOccupyQty,
  getWorkOrderConvertSideLabel,
  getWorkOrderConvertSideTagColor,
  listWorkOrderOutsourcingOrders,
  listWorkOrderPurchaseRequisitions,
}

export { getActiveScheduleBatch }
