import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { buildProcessesFromRoute, getDefaultProductRoute } from '@/mock/processRoutes'

const STORAGE_KEY = 'i_doms_work_orders'
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: workOrderState.orders }))
}

function generateCode() {
  const code = `WO${dayjs().format('YYYYMMDD')}-${String(codeSeq++).padStart(3, '0')}`
  return code
}

function createInitialOrders() {
  const routeName = '机加标准路线'
  return [
    {
      id: 'wo-init-1',
      code: 'WO202505280-001',
      name: '下导轴承座毛坯生产工单',
      productName: '下导轴承座毛坯',
      orderCategory: '生产工单',
      status: '待下发',
      scheduleQty: 12,
      planQty: 12,
      workCenter: '默认工厂',
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
      id: 'wo-init-2',
      code: 'WO202505280-002',
      name: '上导轴承座生产工单',
      productName: '上导轴承座',
      orderCategory: '生产工单',
      status: '执行中',
      scheduleQty: 24,
      planQty: 24,
      workCenter: '机加车间',
      bom: '潜水电机',
      warehouse: '半成品仓',
      urgency: '加急',
      planDateRange: ['2026-05-25', '2026-06-10'],
      remark: '加急排产',
      processRouteName: '装配标准路线',
      source: 'manual',
      sourceOrderNo: 'SO202505002',
      processes: buildProcessesFromRoute('装配标准路线').map((p, i) =>
        i < 2 ? { ...p, executors: ['孙琴丽', '张三'] } : p,
      ),
      createdAt: '2025-05-27',
    },
    {
      id: 'wo-init-3',
      code: 'WO202505280-003',
      name: '定子铁芯组件生产工单',
      productName: '定子铁芯组件',
      orderCategory: '生产工单',
      status: '完成',
      scheduleQty: 18,
      planQty: 18,
      workCenter: '装配车间',
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
        executors: ['李四'],
      })),
      createdAt: '2025-05-20',
    },
  ]
}

export const workOrderState = reactive({
  orders: loadFromStorage() || createInitialOrders(),
})

watch(
  () => workOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getWorkOrders() {
  return workOrderState.orders
}

export function addWorkOrder(order) {
  workOrderState.orders.unshift(order)
}

export function updateWorkOrder(id, patch) {
  const idx = workOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(workOrderState.orders[idx], patch)
  return workOrderState.orders[idx]
}

export function createWorkOrderPayload(partial) {
  const routeName = partial.processRouteName || getDefaultProductRoute(partial.productName)
  return {
    id: `wo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    code: generateCode(),
    name: `${partial.productName}${partial.orderCategory || '生产工单'}`,
    productName: partial.productName,
    orderCategory: partial.orderCategory || '生产工单',
    status: '待下发',
    scheduleQty: partial.scheduleQty ?? partial.planQty ?? 0,
    planQty: partial.planQty ?? 0,
    workCenter: partial.workCenter || '默认工厂',
    bom: partial.bom || partial.productName,
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
    materialCode: partial.materialCode || '',
    processes: buildProcessesFromRoute(routeName),
    createdAt: dayjs().format('YYYY-MM-DD'),
  }
}

/** 生产计划保存加工工单后同步创建工单 */
export function addWorkOrdersFromPlanRows(rows, sourceOrder) {
  const created = []
  rows.forEach((row) => {
    const exists = workOrderState.orders.some(
      (o) =>
        o.source === 'production-plan' &&
        o.materialCode === row.code &&
        o.sourceOrderNo === sourceOrder.orderNo,
    )
    if (exists) return

    const wo = createWorkOrderPayload({
      productName: row.productName,
      orderCategory: '生产工单',
      scheduleQty: row.planQty,
      planQty: row.planQty,
      workCenter: row.workCenter,
      bom: row.bom,
      warehouse: row.warehouse,
      urgency: row.urgency,
      remark: row.remark,
      processRouteName: row.processRoute,
      source: 'production-plan',
      sourceOrderNo: sourceOrder.orderNo,
      materialCode: row.code,
    })
    addWorkOrder(wo)
    created.push(wo)
  })
  return created
}

export function filterWorkOrders(list, filters) {
  return list.filter((wo) => {
    if (filters.code && !wo.code.includes(filters.code)) return false
    if (filters.name && !wo.name.includes(filters.name)) return false
    if (filters.salesOrderNo && !(wo.sourceOrderNo || '').includes(filters.salesOrderNo))
      return false
    if (filters.status && wo.status !== filters.status) return false
    if (filters.orderCategory && wo.orderCategory !== filters.orderCategory) return false
    if (filters.workCenter && wo.workCenter !== filters.workCenter) return false
    return true
  })
}

export function canShowDispatchTab(status) {
  return status === '待下发'
}
