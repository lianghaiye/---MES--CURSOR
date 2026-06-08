import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { buildProcessesFromRoute, getDefaultProductRoute } from '@/mock/processRoutes'
import {
  resolveOrderField,
  generateAssemblyWorkOrderCode,
  generateAssemblyWorkOrderName,
} from '@/utils/workOrderNaming'

const STORAGE_KEY = 'i_doms_assembly_work_orders'
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: assemblyWorkOrderState.orders }))
}

/** ZZGD + 年月日 + 3位流水 */
function generateAssemblyCode() {
  return `ZZGD${dayjs().format('YYYYMMDD')}${String(codeSeq++).padStart(3, '0')}`
}

function createInitialOrders() {
  const routeName = '装配标准路线'
  return [
    {
      id: 'asm-init-1',
      code: 'ZZGD20250528001',
      name: '潜水电机总装工单',
      productName: '潜水电机',
      orderCategory: '总装工单',
      status: '待下发',
      scheduleQty: 8,
      planQty: 8,
      workCenter: '总装车间',
      bom: '潜水电机',
      warehouse: '成品仓',
      urgency: '紧急',
      planDateRange: ['2026-05-30', '2026-06-17'],
      remark: '',
      processRouteName: routeName,
      source: 'manual',
      sourceOrderNo: 'SO202505101',
      processes: buildProcessesFromRoute(routeName),
      createdAt: '2025-05-28',
    },
    {
      id: 'asm-init-2',
      code: 'ZZGD20250527002',
      name: '立式多级泵总装工单',
      productName: '立式多级泵',
      orderCategory: '总装工单',
      status: '执行中',
      scheduleQty: 5,
      planQty: 5,
      workCenter: '总装车间',
      bom: '立式多级泵',
      warehouse: '成品仓',
      urgency: '加急',
      planDateRange: ['2026-05-25', '2026-06-10'],
      remark: '加急总装',
      processRouteName: routeName,
      source: 'manual',
      sourceOrderNo: 'SO202505102',
      processes: buildProcessesFromRoute(routeName).map((p, i) =>
        i < 2 ? { ...p, executors: ['王装配', '李总装'] } : p,
      ),
      createdAt: '2025-05-27',
    },
    {
      id: 'asm-init-3',
      code: 'ZZGD20250520003',
      name: '深井潜水泵总装工单',
      productName: '深井潜水泵',
      orderCategory: '总装工单',
      status: '完成',
      scheduleQty: 10,
      planQty: 10,
      workCenter: '总装车间',
      bom: '深井潜水泵',
      warehouse: '成品仓',
      urgency: '普通',
      planDateRange: ['2026-05-01', '2026-05-20'],
      remark: '',
      processRouteName: routeName,
      source: 'manual',
      sourceOrderNo: 'SO202505103',
      processes: buildProcessesFromRoute(routeName).map((p) => ({
        ...p,
        executors: ['赵工'],
      })),
      createdAt: '2025-05-20',
    },
  ]
}

export const assemblyWorkOrderState = reactive({
  orders: loadFromStorage() || createInitialOrders(),
})

watch(
  () => assemblyWorkOrderState.orders,
  () => persist(),
  { deep: true },
)

export function addAssemblyWorkOrder(order) {
  assemblyWorkOrderState.orders.unshift(order)
}

export function deleteAssemblyWorkOrder(id) {
  const idx = assemblyWorkOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  assemblyWorkOrderState.orders.splice(idx, 1)
  return true
}

export function cloneAssemblyWorkOrder(id) {
  const source = assemblyWorkOrderState.orders.find((o) => o.id === id)
  if (!source) return null
  const cloned = JSON.parse(JSON.stringify(source))
  cloned.id = `asm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  cloned.code = generateAssemblyCode()
  cloned.name = `${source.productName}总装工单`
  cloned.status = '待下发'
  cloned.createdAt = dayjs().format('YYYY-MM-DD')
  cloned.source = 'manual'
  addAssemblyWorkOrder(cloned)
  return cloned
}

export function updateAssemblyWorkOrder(id, patch) {
  const idx = assemblyWorkOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(assemblyWorkOrderState.orders[idx], patch)
  return assemblyWorkOrderState.orders[idx]
}

export function createAssemblyWorkOrderPayload(partial) {
  const routeName = partial.processRouteName || getDefaultProductRoute(partial.productName)
  const productName = partial.productName?.trim() || ''
  const existingCodes = assemblyWorkOrderState.orders.map((o) => o.code)
  const code = resolveOrderField(partial.code, () => generateAssemblyWorkOrderCode(existingCodes))
  const name = resolveOrderField(partial.name, () => generateAssemblyWorkOrderName(productName))
  return {
    id: `asm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    code,
    name,
    productName,
    orderCategory: '总装工单',
    status: '待下发',
    scheduleQty: partial.scheduleQty ?? partial.planQty ?? 0,
    planQty: partial.planQty ?? 0,
    workCenter: partial.workCenter || '总装车间',
    bom: partial.bom || productName,
    warehouse: partial.warehouse || '成品仓',
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

/** 按销售单号 + 产品名称匹配总装工单 */
export function findAssemblyOrdersBySalesProduct(salesOrderNo, productName) {
  if (!salesOrderNo || !productName) return []
  return assemblyWorkOrderState.orders.filter((wo) => {
    const source = wo.sourceOrderNo || ''
    const orderMatched =
      source === salesOrderNo || source.includes(salesOrderNo) || salesOrderNo.includes(source)
    return orderMatched && wo.productName === productName
  })
}

export function filterAssemblyWorkOrders(list, filters) {
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

export function canShowAssemblyDispatchTab(status) {
  return status === '待下发'
}
