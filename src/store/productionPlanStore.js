import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildPagedMockBoms } from '@/mock/productBomSeed'
import { mockMaterials } from '@/mock/materialInfo'
import { buildMockSalesOrders } from '@/mock/salesOrderSeed'
import { buildInitialProductionPlans } from '@/mock/productionPlanSeed'
import { getOwnActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { enrichWorkItem, resolveSalesLineForWorkItem } from '@/utils/productionPlanWorkItem'
import { resolveWorkItemMaterials } from '@/utils/productionPlanMaterial'
import { applyCrossDemoStockToPlanMaterials } from '@/mock/crossModuleDemoSeed'
import { PLAN_SOURCE } from '@/utils/planSource'

const STORAGE_KEY = 'i_doms_production_plans'
/** v9：计划来源（销售订单 / 库存补货） */
const DATA_VERSION = 9

function normalizePlanStatuses(orders) {
  return orders.map((o) => {
    const plan = { ...o }
    if (!plan.planSource) {
      plan.planSource = plan.salesOrderNo ? 'sales-order' : 'manual'
    }
    // 库存补货：操作人为生成计划的人（兼容旧数据）
    if (plan.planSource === PLAN_SOURCE.STOCK_REPLENISH && !plan.operator) {
      plan.operator = plan.creator || plan.salesperson || 'admin1'
    }
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
      const salesLine = resolveSalesLineForWorkItem(plan, wi)
      Object.assign(wi, enrichWorkItem(wi, salesLine, idx))
      if (wi.expanded == null) wi.expanded = idx === 0
    })
    plan.workItems?.forEach((wi) => {
      resolveWorkItemMaterials(wi)
      applyCrossDemoStockToPlanMaterials(wi.materials)
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
  const boms = buildPagedMockBoms(mockProducts, mockMaterials)
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
 * @param {object} salesOrder
 * @param {{ lineItemsOverride?: object[], designingLineIds?: Set<string>, designTasksByLineId?: Map<string, object> }} [options]
 */
export function createProductionPlanFromSalesOrder(salesOrder, options = {}) {
  const lineItems = options.lineItemsOverride || salesOrder.lineItems || []
  const designingLineIds = options.designingLineIds || new Set()
  const designTasksByLineId = options.designTasksByLineId || new Map()

  const totalQty = lineItems.reduce((s, i) => s + (Number(i.planProduceQty ?? i.salesQty) || 0), 0)
  const deliveryDate = resolveDeliveryDate(lineItems, salesOrder.documentDate)
  const daysToDelivery = Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day'))

  const workItems = lineItems.map((line, index) => {
    const isDesigning = designingLineIds.has(line.id)
    const designTask = designTasksByLineId.get?.(line.id)
    const planQty = Math.max(0, Number(line.planProduceQty ?? line.salesQty) || 0)

    if (isDesigning) {
      return enrichWorkItem(
        {
          id: `wi-${line.id}`,
          salesLineId: line.id,
          designTaskId: designTask?.id || '',
          status: '设计中',
          expanded: index === 0,
          salesQty: planQty || Number(line.salesQty) || 1,
          productName: line.productName,
          productCode: line.productCode,
          productId: line.productId || '',
          productAttr: line.productAttr,
          productType: line.category || line.productAttr || '',
          model: line.specModel,
          spec: line.specAttr,
          techParams: line.techParams || '',
          deliveryDate: line.deliveryDate || deliveryDate,
          bomId: '',
          bomName: '',
          bomVersion: '',
          ebomSnapshot: { materials: [] },
          materials: [],
        },
        line,
        index,
      )
    }

    // 投产口径：仅 SKU 自有生效 BOM；禁止族模板解析 fallback
    const bom =
      (line.bomId ? getProductBomById(line.bomId) : null) ||
      getOwnActiveBomForItem('product', line.productId)

    const salesQty = planQty || Number(line.salesQty) || 1
    const snapshot =
      line.ebomSnapshot || (bom ? buildEbomSnapshotFromBom(bom, salesQty) : { materials: [] })

    return enrichWorkItem(
      {
        id: `wi-${line.id}`,
        salesLineId: line.id,
        status: '待下达',
        expanded: index === 0,
        salesQty,
        productName: line.productName,
        productCode: line.productCode,
        productId: line.productId,
        productAttr: line.productAttr,
        productType: line.category || line.productAttr || '',
        model: line.specModel,
        spec: line.specAttr,
        deliveryDate: line.deliveryDate || deliveryDate,
        bomId: line.bomId || bom?.id || '',
        bomName: line.bomName || bom?.bomName || '',
        bomVersion: line.bomVersion || bom?.version || '',
        ebomSnapshot: snapshot,
        materials: snapshot.materials || [],
      },
      line,
      index,
    )
  })

  const plan = {
    id: `pp-${Date.now()}`,
    planSource: PLAN_SOURCE.SALES_ORDER,
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

let replenishPlanSeq = 1

function nextReplenishPlanNo() {
  const no = `BH${dayjs().format('YYYYMMDD')}${String(replenishPlanSeq).padStart(4, '0')}`
  replenishPlanSeq += 1
  return no
}

/**
 * 由库存补货建议生成生产计划（无销售单号）
 * @param {Array<object>} suggestionRows listStockReplenishSuggestions 行，可含 planQty 覆盖
 * @param {{ operator?: string }} [options]
 */
export function createProductionPlanFromStockReplenish(suggestionRows = [], options = {}) {
  const rows = (suggestionRows || []).filter(
    (r) => (Number(r.planQty) || Number(r.suggestQty) || 0) > 0,
  )
  if (!rows.length) return null

  const operator = String(options.operator || '').trim() || 'admin1'
  const deliveryDate = dayjs().add(7, 'day').format('YYYY-MM-DD')
  const orderNo = nextReplenishPlanNo()
  const totalQty = rows.reduce((s, r) => s + (Number(r.planQty) || Number(r.suggestQty) || 0), 0)

  const workItems = rows.map((row, index) => {
    const planQty = Number(row.planQty) || Number(row.suggestQty) || 0
    const bom =
      (row.bomId ? getProductBomById(row.bomId) : null) ||
      getOwnActiveBomForItem('product', row.productId)
    const snapshot = bom ? buildEbomSnapshotFromBom(bom, planQty) : { materials: [] }

    return enrichWorkItem(
      {
        id: `wi-bh-${row.productId}-${Date.now()}-${index}`,
        salesLineId: '',
        status: '待下达',
        expanded: index === 0,
        salesQty: planQty,
        orderQty: planQty,
        stockQty: Number(row.availableStock) || 0,
        planQty,
        productName: row.productName,
        productCode: row.productCode,
        productId: row.productId,
        productAttr: '标准产品',
        productType: '标准产品',
        model: row.specModel,
        spec: row.specModel,
        deliveryDate,
        bomId: row.bomId || bom?.id || '',
        bomName: row.bomName || bom?.bomName || '',
        bomVersion: row.bomVersion || bom?.version || '',
        ebomSnapshot: snapshot,
        materials: snapshot.materials || [],
        unit: row.unit || '件',
      },
      null,
      index,
    )
  })

  const plan = {
    id: `pp-bh-${Date.now()}`,
    planSource: PLAN_SOURCE.STOCK_REPLENISH,
    salesOrderNo: '',
    orderNo,
    customerName: '库存补货',
    productQty: totalQty,
    salesperson: '',
    operator,
    creator: operator,
    urgency: '普通',
    orderStatus: '待下达',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: '',
    settlementType: '',
    deliveryMethod: '',
    remark: '按库存MTS · 库存补货',
    tags: ['待下达', '库存补货'],
    daysToDelivery: Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day')),
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    workItems,
  }

  addProductionPlan(plan)
  return plan
}

function cloneWorkItem(wi) {
  return JSON.parse(JSON.stringify(wi))
}

/** 同步生产计划工作项交付方式（支持拆行） */
export function syncProductionPlanDeliveryMode(salesOrderNo, planOps) {
  const plan = findPlanBySalesOrderNo(salesOrderNo)
  if (!plan?.workItems?.length || !planOps?.length) return

  planOps.forEach((op) => {
    if (op.type === 'update') {
      const wi = plan.workItems.find((w) => w.salesLineId === op.lineId)
      if (!wi) return
      wi.deliveryMode = op.deliveryMode
      wi.salesQty = op.qty
      wi.orderQty = op.qty
      enrichWorkItem(wi)
      return
    }

    if (op.type === 'create') {
      const sourceWi = plan.workItems.find((w) => w.salesLineId === op.sourceLineId)
      const newWi = sourceWi
        ? cloneWorkItem(sourceWi)
        : enrichWorkItem(
            {
              id: `wi-${op.lineId}`,
              salesLineId: op.lineId,
              status: '待下达',
              productName: op.line?.productName,
              productCode: op.line?.productCode,
              model: op.line?.specModel,
              materials: op.line?.ebomSnapshot?.materials || [],
              ebomSnapshot: op.line?.ebomSnapshot,
            },
            op.line,
          )
      newWi.id = `wi-${op.lineId}`
      newWi.salesLineId = op.lineId
      newWi.deliveryMode = op.deliveryMode
      newWi.salesQty = op.qty
      newWi.orderQty = op.qty
      newWi.shippedQty = 0
      enrichWorkItem(newWi, op.line)
      plan.workItems.push(newWi)
    }
  })
}

export function filterProductionPlans(list, filters) {
  return list.filter((order) => {
    if (filters.orderNo && !(order.orderNo || '').includes(filters.orderNo)) return false
    if (filters.customerName && !(order.customerName || '').includes(filters.customerName))
      return false
    if (filters.urgency && order.urgency !== filters.urgency) return false
    if (filters.orderStatus && order.orderStatus !== filters.orderStatus) return false
    if (filters.planSource) {
      const source = order.planSource || (order.salesOrderNo ? 'sales-order' : 'manual')
      if (source !== filters.planSource) return false
    }
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
