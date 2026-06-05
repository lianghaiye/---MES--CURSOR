import dayjs from 'dayjs'
import { buildProcessesFromRoute } from '@/mock/processRoutes'

/** 拆解工单详情页展示数据 */
export function buildDisassemblyWorkOrderDetail(order) {
  if (!order) return null

  const processes =
    order.processes?.length > 0
      ? order.processes
      : buildProcessesFromRoute(order.processRouteName || '装配标准路线')

  const qty = order.disassemblyQty ?? 1
  const status = order.status || '待下发'

  return {
    timeline: buildTimeline(order),
    productLines: buildProductLines(order),
    processes,
    processExecutions: buildProcessExecutions(processes, qty, order),
    processTasks: buildProcessTasks(processes, qty, order),
    disassemblyMaterials: buildDisassemblyMaterials(order),
    inboundDetails: buildInboundDetails(order),
    scrapDetails: buildScrapDetails(order),
    status,
  }
}

function buildTimeline(order) {
  const createdAt = order.createdAt || dayjs().format('YYYY-MM-DD HH:mm')
  const creator = order.creator || '王小虎'
  const status = order.status || '待下发'
  const dispatched = ['已下发', '执行中', '待复核', '完成'].includes(status)
  const executing = ['执行中', '待复核', '完成'].includes(status)
  const done = status === '完成'

  return [
    {
      key: 'created',
      title: '已创建',
      status: 'finish',
      description: createdAt,
      sub: creator,
    },
    {
      key: 'dispatch',
      title: '工单派发',
      status: dispatched ? 'finish' : status === '待下发' ? 'wait' : 'process',
      description: order.dispatchedAt || (dispatched ? createdAt : ''),
      sub: order.dispatchedBy || (dispatched ? order.operator || creator : ''),
    },
    {
      key: 'execute',
      title: '工单执行',
      status: done ? 'finish' : executing ? 'process' : 'wait',
      description: order.executedAt || (executing ? order.updatedAt || '' : ''),
      sub: order.executedBy || (executing ? order.operator || '' : ''),
    },
  ]
}

function buildProductLines(order) {
  return [
    {
      id: 'line-1',
      itemName: order.itemName,
      itemCode: order.itemCode,
      itemType: '成品',
      specModel: order.specModel,
      material: order.material,
      specAttr: order.specAttr || '—',
      disassemblyQty: order.disassemblyQty ?? 1,
      ebomName: order.ebomName || order.bom,
      processRouteName: order.processRouteName,
    },
  ]
}

function buildProcessExecutions(processes, qty, order) {
  const status = order.status || '待下发'
  const started = ['执行中', '待复核', '完成'].includes(status)
  return processes.map((p, i) => ({
    id: `${p.id}-exec`,
    seq: i + 1,
    processName: p.name,
    executor: p.executors?.[0] || order.personInCharge || '—',
    planQty: qty,
    doneQty: started && i === 0 ? qty : started ? null : 0,
    scrapQty: 0,
    planFinishDate: order.planEndDate || '',
    progress: started && i === 0 ? '100%' : started ? '—' : '0%',
  }))
}

function buildProcessTasks(processes, qty, order) {
  if (!['执行中', '待复核', '完成'].includes(order.status)) return []
  const first = processes[0]
  if (!first) return []
  return [
    {
      id: 'task-1',
      seq: 1,
      processName: first.name,
      taskNo: `T${dayjs().format('YYYYMMDD')}001`,
      executor: order.personInCharge || '—',
      planQty: qty,
      normalQty: order.status === '完成' ? qty : 0,
      scrapQty: 0,
      progressStatus: order.status === '完成' ? '已完成' : '进行中',
      taskStatus: '正常',
      startDate: order.planStartDate ? `${order.planStartDate} 08:00:00` : '',
      finishDate: order.completedAt || '',
    },
  ]
}

function buildDisassemblyMaterials(order) {
  const base = order.itemName || '拆解件'
  return [
    {
      id: 'dm-1',
      materialName: `${base}-泵体`,
      materialCode: 'WL-DB-001',
      specModel: order.specModel,
      qty: 1,
      unit: '件',
      warehouse: order.warehouse || '半成品仓',
    },
    {
      id: 'dm-2',
      materialName: `${base}-叶轮`,
      materialCode: 'WL-YL-002',
      specModel: '—',
      qty: 1,
      unit: '件',
      warehouse: order.warehouse || '半成品仓',
    },
    {
      id: 'dm-3',
      materialName: `${base}-机械密封`,
      materialCode: 'WL-MF-003',
      specModel: '—',
      qty: 1,
      unit: '套',
      warehouse: order.warehouse || '半成品仓',
    },
  ]
}

function buildInboundDetails(order) {
  if (!['待复核', '完成'].includes(order.status)) return []
  return [
    {
      id: 'in-1',
      seq: 1,
      materialName: `${order.itemName || ''}-泵体`,
      warehouse: order.warehouse || '半成品仓',
      inboundQty: 1,
      inboundAt: order.completedAt || order.updatedAt || '',
    },
  ]
}

function buildScrapDetails(order) {
  if (!['待复核', '完成'].includes(order.status)) return []
  return [
    {
      id: 'sc-1',
      seq: 1,
      materialName: '损坏轴承',
      scrapQty: 1,
      scrapReason: '磨损报废',
      processMethod: '报废',
    },
  ]
}
