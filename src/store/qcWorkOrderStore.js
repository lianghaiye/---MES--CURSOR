import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { buildProcessesFromRoute, getDefaultProductRoute } from '@/mock/processRoutes'

const STORAGE_KEY = 'i_doms_qc_work_orders'
let codeSeq = 1

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: qcWorkOrderState.orders }))
}

/** ZJGD + 6位年月日 + 3位流水，如 ZJGD20250528001 */
function generateQcCode() {
  return `ZJGD${dayjs().format('YYYYMMDD')}${String(codeSeq++).padStart(3, '0')}`
}

function createInitialOrders() {
  const routeName = '机加标准路线'
  return [
    {
      id: 'qc-init-1',
      code: 'ZJGD20250528001',
      name: '下导轴承座毛坯质检工单',
      productName: '下导轴承座毛坯',
      orderCategory: '质检工单',
      status: '待下发',
      execStatus: '未开始',
      scheduleQty: 12,
      planQty: 12,
      workCenter: '质检中心',
      bom: '潜水电机',
      warehouse: '半成品仓',
      urgency: '紧急',
      planDateRange: ['2026-05-30', '2026-06-17'],
      remark: '',
      processRouteName: routeName,
      source: 'manual',
      sourceOrderNo: 'SO202505001',
      processes: buildProcessesFromRoute(routeName),
      createdAt: '2025-05-28',
    },
    {
      id: 'qc-init-2',
      code: 'ZJGD20250527002',
      name: '上导轴承座质检工单',
      productName: '上导轴承座',
      orderCategory: '质检工单',
      status: '执行中',
      execStatus: '执行中',
      scheduleQty: 24,
      planQty: 24,
      workCenter: '质检中心',
      bom: '潜水电机',
      warehouse: '半成品仓',
      urgency: '普通',
      planDateRange: ['2026-05-25', '2026-06-10'],
      remark: '',
      processRouteName: '装配标准路线',
      source: 'manual',
      sourceOrderNo: 'SO202505002',
      processes: buildProcessesFromRoute('装配标准路线').map((p, i) =>
        i < 1 ? { ...p, executors: ['王检验'] } : p,
      ),
      createdAt: '2025-05-27',
    },
    {
      id: 'qc-init-3',
      code: 'ZJGD20250520003',
      name: '定子铁芯组件质检工单',
      productName: '定子铁芯组件',
      orderCategory: '质检工单',
      status: '完成',
      execStatus: '已完成',
      scheduleQty: 18,
      planQty: 18,
      workCenter: '质检中心',
      bom: '潜水电机',
      warehouse: '成品仓',
      urgency: '普通',
      planDateRange: ['2026-05-01', '2026-05-20'],
      remark: '',
      processRouteName: '装配标准路线',
      source: 'manual',
      sourceOrderNo: 'SO202505003',
      processes: buildProcessesFromRoute('装配标准路线').map((p) => ({
        ...p,
        executors: ['李质检'],
      })),
      createdAt: '2025-05-20',
    },
  ]
}

export const qcWorkOrderState = reactive({
  orders: loadFromStorage() || createInitialOrders(),
})

watch(
  () => qcWorkOrderState.orders,
  () => persist(),
  { deep: true },
)

export function addQcWorkOrder(order) {
  qcWorkOrderState.orders.unshift(order)
}

export function deleteQcWorkOrder(id) {
  const idx = qcWorkOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  qcWorkOrderState.orders.splice(idx, 1)
  return true
}

export function cloneQcWorkOrder(id) {
  const source = qcWorkOrderState.orders.find((o) => o.id === id)
  if (!source) return null
  const cloned = JSON.parse(JSON.stringify(source))
  cloned.id = `qc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  cloned.code = generateQcCode()
  cloned.name = `${source.productName}质检工单`
  cloned.status = '待下发'
  cloned.execStatus = '未开始'
  cloned.createdAt = dayjs().format('YYYY-MM-DD')
  cloned.source = 'manual'
  addQcWorkOrder(cloned)
  return cloned
}

export function updateQcWorkOrder(id, patch) {
  const idx = qcWorkOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(qcWorkOrderState.orders[idx], patch)
  return qcWorkOrderState.orders[idx]
}

export function createQcWorkOrderPayload(partial) {
  const routeName = partial.processRouteName || getDefaultProductRoute(partial.productName)
  const productName = partial.productName?.trim() || ''
  return {
    id: `qc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    code: generateQcCode(),
    name: `${productName}质检工单`,
    productName,
    orderCategory: '质检工单',
    status: '待下发',
    execStatus: '未开始',
    scheduleQty: partial.scheduleQty ?? partial.planQty ?? 0,
    planQty: partial.planQty ?? 0,
    workCenter: partial.workCenter || '质检中心',
    bom: partial.bom || productName,
    warehouse: partial.warehouse || '半成品仓',
    urgency: partial.urgency || '普通',
    planDateRange: partial.planDateRange || [
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(14, 'day').format('YYYY-MM-DD'),
    ],
    remark: partial.remark || '',
    processRouteName: routeName,
    source: partial.source || 'manual',
    sourceOrderNo: partial.sourceOrderNo || '',
    processes: buildProcessesFromRoute(routeName),
    createdAt: dayjs().format('YYYY-MM-DD'),
  }
}

export function filterQcWorkOrders(list, filters) {
  return list.filter((wo) => {
    if (filters.code && !wo.code.includes(filters.code)) return false
    if (filters.name && !wo.name.includes(filters.name)) return false
    if (filters.salesOrderNo && !(wo.sourceOrderNo || '').includes(filters.salesOrderNo))
      return false
    if (filters.status && wo.status !== filters.status) return false
    if (filters.execStatus && wo.execStatus !== filters.execStatus) return false
    if (filters.orderCategory && wo.orderCategory !== filters.orderCategory) return false
    if (filters.workCenter && wo.workCenter !== filters.workCenter) return false
    return true
  })
}

export function canShowQcDispatchTab(status) {
  return status === '待下发'
}
