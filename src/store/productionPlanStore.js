import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildCatalogProductBoms } from '@/mock/productBomSeed'
import { buildMockSalesOrders } from '@/mock/salesOrderSeed'
import { buildInitialProductionPlans } from '@/mock/productionPlanSeed'
import { getActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'

const STORAGE_KEY = 'i_doms_production_plans'
const DATA_VERSION = 2

function normalizePlanStatuses(orders) {
  return orders.map((o) => {
    const plan = { ...o }
    if (plan.orderStatus === '待排产') plan.orderStatus = '待下达'
    if (plan.orderStatus === '生产中') plan.orderStatus = '执行中'
    if (Array.isArray(plan.tags)) {
      plan.tags = plan.tags.map((t) => {
        if (t === '待排产') return '待下达'
        if (t === '生产中') return '执行中'
        return t
      })
    }
    plan.workItems?.forEach((wi, idx) => {
      if (wi.expanded == null) wi.expanded = idx === 0
      if (!wi.salesQty && plan.productQty) wi.salesQty = plan.productQty
    })
    return plan
  })
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.plans)) {
        return normalizePlanStatuses(parsed.plans)
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, plans: productionPlanState.plans }),
  )
}

function loadInitialPlans() {
  const stored = loadFromStorage()
  if (stored) return stored
  const boms = buildCatalogProductBoms(mockProducts)
  const salesOrders = buildMockSalesOrders(mockProducts)
  return normalizePlanStatuses(buildInitialProductionPlans(boms, salesOrders))
}

export const productionPlanState = reactive({
  plans: loadInitialPlans(),
})

watch(
  () => productionPlanState.plans,
  () => persist(),
  { deep: true },
)

export function findPlanBySalesOrderNo(salesOrderNo) {
  return productionPlanState.plans.find((p) => p.salesOrderNo === salesOrderNo) || null
}

export function addProductionPlan(plan) {
  productionPlanState.plans.unshift(plan)
  return plan
}

export function updateProductionPlan(id, patch) {
  const idx = productionPlanState.plans.findIndex((p) => p.id === id)
  if (idx === -1) return null
  Object.assign(productionPlanState.plans[idx], patch)
  return productionPlanState.plans[idx]
}

function resolveDeliveryDate(lineItems, fallback) {
  const dates = (lineItems || []).map((l) => l.deliveryDate).filter(Boolean)
  if (!dates.length) return fallback || dayjs().format('YYYY-MM-DD')
  return dates.sort()[0]
}

function mapUrgencyToPlan(urgency) {
  if (urgency === '紧急' || urgency === '加急') return urgency === '加急' ? '加急' : '紧急'
  return '普通'
}

/**
 * 自产销售订单审核通过后生成生产计划任务
 */
export function createProductionPlanFromSalesOrder(salesOrder) {
  const lineItems = salesOrder.lineItems || []
  const totalQty = lineItems.reduce((s, i) => s + (Number(i.salesQty) || 0), 0)
  const deliveryDate = resolveDeliveryDate(lineItems, salesOrder.documentDate)
  const daysToDelivery = Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day'))

  const workItems = lineItems.map((line, index) => {
    const bom =
      (line.bomId ? getProductBomById(line.bomId) : null) ||
      getActiveBomForItem('product', line.productId)

    const salesQty = Number(line.salesQty) || 1
    const snapshot = bom ? buildEbomSnapshotFromBom(bom, salesQty) : { materials: [] }

    return {
      id: `wi-${line.id}`,
      salesLineId: line.id,
      status: '待下达',
      expanded: index === 0,
      salesQty,
      productName: line.productName,
      productCode: line.productCode,
      productAttr: line.productAttr,
      productType: line.category || line.productAttr || '',
      model: line.specModel,
      spec: line.specAttr,
      deliveryDate: line.deliveryDate || deliveryDate,
      bomId: line.bomId,
      bomName: line.bomName,
      bomVersion: line.bomVersion,
      ebomSnapshot: snapshot,
      materials: snapshot.materials || [],
    }
  })

  const plan = {
    id: `pp-${Date.now()}`,
    salesOrderNo: salesOrder.orderNo,
    orderNo: salesOrder.orderNo,
    customerName: salesOrder.customerName,
    productQty: totalQty,
    salesperson: salesOrder.salesperson || '',
    urgency: mapUrgencyToPlan(salesOrder.urgency),
    orderStatus: '待下达',
    orderDate: salesOrder.documentDate || dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: salesOrder.region || '',
    settlementType: salesOrder.settlementType || '',
    deliveryMethod: salesOrder.deliveryMethod || '',
    remark: salesOrder.remark || '',
    tags: ['待下达'],
    daysToDelivery,
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    workItems,
  }

  addProductionPlan(plan)
  return plan
}

export function filterProductionPlans(list, filters) {
  return list.filter((order) => {
    if (filters.orderNo && !order.orderNo.includes(filters.orderNo)) return false
    if (filters.customerName && !order.customerName.includes(filters.customerName)) return false
    if (filters.urgency && order.urgency !== filters.urgency) return false
    if (filters.orderStatus && order.orderStatus !== filters.orderStatus) return false
    if (filters.orderDateRange?.length === 2) {
      const [start, end] = filters.orderDateRange
      if (
        dayjs(order.orderDate).isBefore(start, 'day') ||
        dayjs(order.orderDate).isAfter(end, 'day')
      )
        return false
    }
    if (filters.deliveryDateRange?.length === 2) {
      const [start, end] = filters.deliveryDateRange
      if (
        dayjs(order.deliveryDate).isBefore(start, 'day') ||
        dayjs(order.deliveryDate).isAfter(end, 'day')
      )
        return false
    }
    return true
  })
}
