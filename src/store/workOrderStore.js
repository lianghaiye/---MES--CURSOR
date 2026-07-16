import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { resolveDefaultWarehouseByProductName } from '@/utils/warehouseResolver'
import { buildProcessesFromRoute, getDefaultProductRoute } from '@/mock/processRoutes'
import {
  resolveOrderField,
  generateProductionWorkOrderCode,
  generateProductionWorkOrderName,
} from '@/utils/workOrderNaming'
import {
  createLaborDemoProductionOrders,
  createLaborDemoAssemblyOrders,
  isLaborDemoWorkOrder,
} from '@/mock/laborHourDemoSeed'
import { ensureProductionPlanOrderTreeDemoWorkOrders } from '@/mock/productionPlanOrderTreeSeed'
import { findWorkItemForPlanRow } from '@/utils/productionPlanMaterial'

function resolvePlanRowBomFields(row, sourceOrder) {
  const wi = findWorkItemForPlanRow(sourceOrder, row)
  return {
    productId: row.productId || wi?.productId || '',
    bomId: row.bomId || wi?.bomId || '',
    bomLabel: row.bomName || wi?.bomName || row.bom || '',
    ebomSnapshot: row.ebomSnapshot || wi?.ebomSnapshot || null,
    salesLineId: row.salesLineId || wi?.salesLineId || '',
    bom: row.bom || wi?.bomName || row.productName,
  }
}

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

const DEMO_ORDER_ID = 'wo-init-demo'

function createDemoWorkOrder() {
  const routeName = '蒸馏生产路线'
  return {
    id: DEMO_ORDER_ID,
    code: 'T-HHHSCGD20260531002',
    name: '衡环(毛坯) 260531生产工单',
    productName: '衡环(毛坯)',
    orderCategory: '生产工单',
    status: '待下发',
    progressLabel: '新建',
    taskStatus: '正常',
    scheduleQty: 3,
    planQty: 3,
    actualQty: 0,
    workCenter: '默认工厂',
    bom: '',
    warehouse: '报废仓',
    urgency: '正常',
    planDateRange: ['2026-05-31', '2026-05-31'],
    remark: '',
    processRouteName: routeName,
    source: 'manual',
    sourceOrderNo: '1-20260531-002',
    owner: 'admin1',
    submittedAt: '2026-05-31 17:41:31',
    submittedBy: 'admin',
    processes: buildProcessesFromRoute(routeName).map((p) => ({
      ...p,
      executors: ['admin'],
    })),
    createdAt: '2026-05-31',
  }
}

function ensureDemoWorkOrder(orders) {
  if (!orders.some((o) => o.id === DEMO_ORDER_ID)) {
    orders.unshift(createDemoWorkOrder())
  }
  return orders
}

function ensureLaborDemoProductionOrders(orders) {
  const demos = [...createLaborDemoProductionOrders(), ...createLaborDemoAssemblyOrders()]
  const rest = orders.filter((o) => !isLaborDemoWorkOrder(o.id))
  return ensureProductionPlanOrderTreeDemoWorkOrders([...demos, ...rest])
}

function createInitialOrders() {
  const routeName = '机加标准路线'
  return ensureDemoWorkOrder(
    ensureLaborDemoProductionOrders([
      {
        id: 'wo-init-1',
        code: 'WO202505280-001',
        name: '下导轴承座毛坯生产工单',
        productName: '下导轴承座毛坯',
        materialCode: 'CP2510001',
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
        materialCode: 'CP2510002',
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
        materialCode: 'CP2510003',
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
    ]),
  )
}

const loadedOrders = loadFromStorage()
export const workOrderState = reactive({
  orders: loadedOrders
    ? ensureDemoWorkOrder(ensureLaborDemoProductionOrders(loadedOrders))
    : createInitialOrders(),
})

watch(
  () => workOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getWorkOrders() {
  return workOrderState.orders
}

/** 已下发（非待下发）的生产工单，供登记产出-工单登记选择 */
export function getDispatchedProductionWorkOrders() {
  return workOrderState.orders.filter((o) => o.status && o.status !== '待下发')
}

export function addWorkOrder(order) {
  workOrderState.orders.unshift(order)
}

export function deleteWorkOrder(id) {
  const idx = workOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  workOrderState.orders.splice(idx, 1)
  return true
}

export function cloneWorkOrder(id) {
  const source = workOrderState.orders.find((o) => o.id === id)
  if (!source) return null
  const cloned = JSON.parse(JSON.stringify(source))
  cloned.id = `wo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  cloned.code = generateCode()
  cloned.name = `${source.productName}${source.orderCategory || '生产工单'}`
  cloned.status = '待下发'
  cloned.createdAt = dayjs().format('YYYY-MM-DD')
  cloned.source = 'manual'
  addWorkOrder(cloned)
  return cloned
}

export function updateWorkOrder(id, patch) {
  const idx = workOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(workOrderState.orders[idx], patch)
  return workOrderState.orders[idx]
}

export function createWorkOrderPayload(partial) {
  const isOutsource = partial.orderCategory === '外协工单'
  const isMaintenance = partial.orderCategory === '维修工单'
  const skipEbomCategory = isOutsource || isMaintenance
  const routeName =
    partial.processRouteName ||
    (skipEbomCategory ? '' : getDefaultProductRoute(partial.productName))
  const existingCodes = workOrderState.orders.map((o) => o.code)
  const category = partial.orderCategory || '生产工单'
  const productName = partial.productName?.trim() || ''
  const code = resolveOrderField(partial.code, () => generateProductionWorkOrderCode(existingCodes))
  const name = resolveOrderField(partial.name, () =>
    generateProductionWorkOrderName(productName, category),
  )
  return {
    id: `wo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    code,
    name,
    productName,
    orderCategory: partial.orderCategory || '生产工单',
    status: '待下发',
    scheduleQty: partial.scheduleQty ?? partial.planQty ?? 0,
    planQty: partial.planQty ?? 0,
    workCenter: partial.workCenter || '默认工厂',
    owner: partial.owner || '',
    bom: skipEbomCategory ? '' : partial.bom || partial.productName,
    bomId: partial.bomId || '',
    warehouse: partial.warehouse || resolveDefaultWarehouseByProductName(productName) || '',
    urgency: partial.urgency || '普通',
    planDateRange: partial.planDateRange || [
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(14, 'day').format('YYYY-MM-DD'),
    ],
    remark: partial.remark || '',
    processRouteName: routeName,
    source: partial.source || 'manual',
    sourceOrderNo: partial.sourceOrderNo || '',
    salesLineId: partial.salesLineId || '',
    salesOrderId: partial.salesOrderId || '',
    materialCode: partial.materialCode || '',
    productId: partial.productId || '',
    specModel: partial.specModel || '',
    material: partial.material || '',
    drawingNo: partial.drawingNo || '',
    techParams: partial.techParams || '',
    matchingRequirements: partial.matchingRequirements || '',
    bomLabel: partial.bomLabel || '',
    customerName: partial.customerName || '',
    salesperson: partial.salesperson || '',
    componentLines: partial.componentLines || [],
    ebomSnapshot: partial.ebomSnapshot || null,
    supplier: partial.supplier || '',
    skipEbom: Boolean(partial.skipEbom || skipEbomCategory),
    processes: routeName ? buildProcessesFromRoute(routeName) : [],
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

    const bomFields = resolvePlanRowBomFields(row, sourceOrder)
    const wo = createWorkOrderPayload({
      productName: row.productName,
      orderCategory: '生产工单',
      scheduleQty: row.planQty,
      planQty: row.planQty,
      workCenter: row.workCenter,
      bom: bomFields.bom,
      bomId: bomFields.bomId,
      bomLabel: bomFields.bomLabel,
      warehouse: row.warehouse,
      urgency: row.urgency,
      remark: row.remark,
      planDateRange: row.planDateRange,
      processRouteName: row.processRoute,
      source: 'production-plan',
      sourceOrderNo: sourceOrder.orderNo,
      materialCode: row.code,
      productId: bomFields.productId,
      ebomSnapshot: bomFields.ebomSnapshot,
      salesLineId: bomFields.salesLineId,
      salesOrderId: sourceOrder.salesOrderId || '',
      specModel: row.spec || '',
      material: row.material || '',
      drawingNo: row.drawingNo || '',
    })
    addWorkOrder(wo)
    created.push(wo)
  })
  return created
}

/** 生产计划保存外协工单后同步创建工单 */
export function addOutsourceWorkOrdersFromPlanRows(rows, sourceOrder) {
  const created = []
  rows.forEach((row) => {
    const exists = workOrderState.orders.some(
      (o) =>
        o.orderCategory === '外协工单' &&
        o.source === 'production-plan' &&
        o.materialCode === row.code &&
        o.sourceOrderNo === sourceOrder.orderNo,
    )
    if (exists) return

    const wo = createWorkOrderPayload({
      productName: row.productName,
      orderCategory: '外协工单',
      scheduleQty: row.planQty,
      planQty: row.planQty,
      warehouse: row.warehouse,
      urgency: row.urgency,
      remark: row.remark,
      planDateRange: row.expectedArrivalDate
        ? [row.expectedArrivalDate, row.expectedArrivalDate]
        : undefined,
      supplier: row.supplier,
      source: 'production-plan',
      sourceOrderNo: sourceOrder.orderNo,
      materialCode: row.code,
      skipEbom: true,
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
