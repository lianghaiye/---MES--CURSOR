/**
 * 工单详情关联信息（排产任务行 / 领料 / 入库 / 质检）
 */
import dayjs from 'dayjs'
import { getActiveScheduleBatch } from '@/utils/workOrderScheduleBatch'
import { materialRequisitionState } from '@/store/materialRequisitionStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { outboundState } from '@/store/outboundStore'

function sumLineQty(lines) {
  return (lines || []).reduce((s, l) => s + (Number(l.qty ?? l.applyQty ?? l.reqQty) || 0), 0)
}

/** 排产信息：按批次展开工序任务行 */
export function buildWorkOrderScheduleInfoRows(workOrder) {
  const batches = workOrder?.scheduleBatches || []
  if (!batches.length) {
    // 无批次时用工序模板占位一行提示
    return []
  }
  const rows = []
  let seq = 0
  batches.forEach((batch) => {
    const assignments = batch.processAssignments?.length
      ? batch.processAssignments
      : (workOrder.processes || []).map((p) => ({
          processId: p.id,
          processName: p.name,
          executors: p.executors || [],
        }))
    assignments.forEach((a, ai) => {
      const executors = a.executors?.length ? a.executors : ['—']
      executors.forEach((executor, ei) => {
        seq += 1
        const reported = batch.status === '完成'
        const dispatched = batch.status !== '待下发'
        let status = '待领取'
        if (reported) status = '已报工'
        else if (dispatched) status = '待报工'
        rows.push({
          id: `${batch.id}-${a.processId || ai}-${ei}`,
          batchId: batch.id,
          batchNo: batch.batchNo,
          seq,
          processName: a.processName || '—',
          status,
          taskNo: `${workOrder.code || 'WO'}-B${batch.batchNo}-${ai + 1}-${ei + 1}`,
          executor,
          scheduleQty: batch.qty,
          reportQty: reported ? batch.qty : 0,
          goodQty: reported ? batch.qty : 0,
          badQty: 0,
          reportDuration: reported ? '2.5h' : '—',
          dispatchedAt: batch.dispatchedAt || '—',
          reportedAt: reported ? batch.dispatchedAt || '—' : '—',
        })
      })
    })
  })
  return rows
}

export function scheduleTaskStatusColor(status) {
  const map = { 待领取: 'default', 待报工: 'processing', 已报工: 'success' }
  return map[status] || 'default'
}

/** 领料信息 */
export function buildWorkOrderMaterialReqRows(workOrder) {
  if (!workOrder) return []
  const woId = String(workOrder.id || '')
  const woCode = String(workOrder.code || '')
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
        outboundStatus: '—',
        applicant: workOrder.owner || 'admin',
        appliedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      },
    ]
  }
  return []
}

/** 入库信息 */
export function buildWorkOrderInboundRows(workOrder) {
  if (!workOrder) return []
  const woCode = String(workOrder.code || '')
  const product = String(workOrder.productName || '')
  const list = (inboundOrderState.orders || []).filter((o) => {
    const src = String(o.sourceOrderNo || o.salesOrderNo || '')
    const name = String(o.productName || o.lineItems?.[0]?.itemName || '')
    return (woCode && src.includes(woCode)) || (product && name.includes(product))
  })
  if (list.length) {
    return list.map((o, idx) => ({
      id: o.id || `ib-${idx}`,
      index: idx + 1,
      status: o.status || '待处理',
      docNo: o.docNo || '—',
      docId: o.id,
      summary: o.lineItems?.[0]?.itemName || o.productName || workOrder.productName || '—',
      qty: sumLineQty(o.lineItems) || o.totalQty || 0,
      warehouse: o.warehouse || workOrder.warehouse || '—',
      creator: o.creator || o.handler || '—',
      createdAt: o.createdAt || '—',
      confirmer: o.confirmer || '—',
      confirmedAt: o.confirmedAt || '—',
    }))
  }
  if ((workOrder.scheduleBatches || []).some((b) => b.status === '完成' || b.status === '执行中')) {
    return [
      {
        id: `ib-demo-${workOrder.id}`,
        index: 1,
        status: '待处理',
        docNo: `1-${dayjs().format('YYYYMMDD')}-001`,
        docId: '',
        summary: workOrder.productName || '—',
        qty: workOrder.scheduleQty || 0,
        warehouse: workOrder.warehouse || '成品仓',
        creator: workOrder.owner || 'admin',
        createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
        confirmer: '—',
        confirmedAt: '—',
      },
    ]
  }
  return []
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

export { getActiveScheduleBatch }
