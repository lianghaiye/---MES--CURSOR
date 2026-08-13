import dayjs from 'dayjs'
import { buildProcessesFromRoute } from '@/mock/processRoutes'

const DEMO_ROUTE = '蒸馏生产路线'

/** 根据工单生成详情页展示数据 */
export function buildWorkOrderDetail(workOrder) {
  if (!workOrder) return null

  const processes =
    workOrder.processes?.length > 0
      ? workOrder.processes
      : buildProcessesFromRoute(workOrder.processRouteName || DEMO_ROUTE)

  const planStart =
    workOrder.planDateRange?.[0] || workOrder.createdAt || dayjs().format('YYYY-MM-DD')
  const planEnd = workOrder.planDateRange?.[1] || planStart
  const scheduleQty = workOrder.scheduleQty ?? workOrder.planQty ?? 0
  const actualQty = workOrder.actualQty ?? 0
  const progressPct = scheduleQty > 0 ? ((actualQty / scheduleQty) * 100).toFixed(2) : '0.00'

  return {
    timeline: buildTimeline(workOrder, { planEnd, scheduleQty, actualQty, progressPct }),
    basic: {
      code: workOrder.code,
      name: workOrder.name,
      processRoute: workOrder.processRouteName || '',
      workCenter: workOrder.workCenter || '',
      taskStatus: workOrder.taskStatus || '正常',
      scrapQty: workOrder.scrapQty ?? '',
      createdAt: workOrder.createdAt || planStart,
      salesOrderNo: workOrder.sourceOrderNo || '',
      bom: workOrder.bom || '',
      urgency: workOrder.urgency || '正常',
      planQty: workOrder.planQty ?? scheduleQty,
      planStartDate: planStart,
      owner: workOrder.owner || 'admin1',
      productName: workOrder.productName || '',
      warehouse: workOrder.warehouse || '',
      progress: workOrder.status || '待下发',
      scheduleQty,
      planEndDate: planEnd,
    },
    processes,
    processGridCols: 9,
    processExecutions: buildProcessExecutions(processes, scheduleQty),
    processTasks: buildProcessTasks(processes, scheduleQty),
    qcDetails: buildQcDetails(processes, scheduleQty),
    feedingDetails: buildFeedingDetails(processes, scheduleQty),
    inboundDetails: buildInboundDetails(workOrder, scheduleQty),
    defaultProcessId: processes[0]?.id,
  }
}

function buildTimeline(wo, ctx) {
  const submitted = wo.submittedAt || `${wo.createdAt || '2026-05-31'} 17:41:31`
  const submittedBy = wo.submittedBy || 'admin'
  const isPendingDispatch = wo.status === '待下发'
  const isDispatched = ['已下发', '执行中', '完成'].includes(wo.status)
  const isExecuting = wo.status === '执行中' || wo.status === '完成'
  const isDone = wo.status === '完成'

  if (isPendingDispatch) {
    return [
      {
        key: 'submit',
        title: '提交申请',
        status: 'finish',
        description: submitted,
        sub: submittedBy,
      },
      { key: 'dispatch', title: '工单派发', status: 'wait' },
      {
        key: 'execute',
        title: '工单执行',
        status: 'wait',
        description: `${ctx.progressPct}%`,
        sub: `计划/实际生产: ${ctx.scheduleQty}/${ctx.actualQty}`,
      },
      {
        key: 'complete',
        title: '完成工单',
        status: 'wait',
        sub: `计划完成: ${ctx.planEnd} 00:00:00`,
      },
    ]
  }

  return [
    {
      key: 'submit',
      title: '提交申请',
      status: 'finish',
      description: submitted,
      sub: submittedBy,
    },
    {
      key: 'dispatch',
      title: '工单派发',
      status: isDispatched ? 'finish' : 'wait',
    },
    {
      key: 'execute',
      title: '工单执行',
      status: isDone ? 'finish' : isExecuting ? 'process' : 'wait',
      description: isExecuting || isDone ? `${ctx.progressPct}%` : '',
      sub: isExecuting || isDone ? `计划/实际生产: ${ctx.scheduleQty}/${ctx.actualQty}` : '',
    },
    {
      key: 'complete',
      title: '完成工单',
      status: isDone ? 'finish' : 'wait',
      sub: `计划完成: ${ctx.planEnd} 00:00:00`,
    },
  ]
}

function buildProcessExecutions(processes, qty) {
  return processes.map((p, i) => ({
    id: `${p.id}-exec`,
    seq: `1-${i + 1}`,
    processName: p.name,
    executor: p.executors?.[0] || 'admin',
    planQty: qty,
    doneQty: i === 0 ? 0 : null,
    scrapQty: i === 0 ? 0 : null,
    planFinishDate: i === 0 ? '' : '',
    progress: i === 0 ? '0.00%' : '',
  }))
}

function buildProcessTasks(processes, qty) {
  const first = processes[0]
  return [
    {
      id: 'task-1-1',
      seq: '1-1',
      processName: first?.name || '配比',
      taskNo: 'T202606010001',
      executor: first?.executors?.[0] || 'admin',
      planQty: qty,
      normalQty: 0,
      scrapQty: 0,
      progressStatus: '进行中',
      taskStatus: '正常',
      startDate: '2026-06-01 08:00:00',
      finishDate: '',
    },
  ]
}

function buildQcDetails(processes, qty) {
  const qc = processes.find((p) => p.name === '质检') || processes[2]
  if (!qc) return []
  return [
    {
      id: 'qc-1',
      seq: '1-3',
      specAttr: '',
      processName: qc.name,
      inspectQty: qty * 2 || 20,
      scrapQty: '',
      qualified: '是',
      qualifiedQty: qty * 2 || 20,
      qualifiedRate: '100.00%',
      executor: 'admin',
    },
  ]
}

function buildFeedingDetails(processes, qty) {
  const pb = processes.find((p) => p.name === '配比') || processes[0]
  if (!pb) return []
  return [
    {
      id: 'feed-1',
      seq: '1-1',
      processName: pb.name,
      materialCode: '010040045',
      materialName: '一批一码测试0001',
      feedQty: Number(qty).toFixed(4),
      batchNo: 'wl20260514002',
      executor: 'admin',
    },
  ]
}

function buildInboundDetails(wo, qty) {
  return [
    {
      id: 'in-1',
      seq: '1',
      specAttr: '',
      warehouse: wo.warehouse || '库库仓',
      inboundQty: (qty * 2 || 20).toFixed(4),
    },
  ]
}

export function getProcessDetail(process, qty = 10) {
  if (!process) return { materials: [] }
  const materials =
    process.name === '配比'
      ? [{ name: '一批一码+批量计件+计件工资', qty: 1 }]
      : process.feedingMaterials?.length
        ? process.feedingMaterials.map((m) => ({
            name: m.materialName || '物料',
            qty: m.qty ?? 0,
          }))
        : []
  return {
    name: process.name,
    planStartDate: '',
    planEndDate: '',
    executor: process.executors?.[0] || 'admin',
    materials,
    planQty: qty,
  }
}
