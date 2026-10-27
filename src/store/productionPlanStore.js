import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildPagedMockBoms } from '@/mock/productBomSeed'
import { mockMaterials } from '@/mock/materialInfo'
import { buildMockSalesOrders } from '@/mock/salesOrderSeed'
import { buildInitialProductionPlans } from '@/mock/productionPlanSeed'
import { getOwnActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { buildEbomSnapshotFromBom, createPlanMaterial } from '@/utils/ebomSnapshot'
import { enrichWorkItem, resolveSalesLineForWorkItem } from '@/utils/productionPlanWorkItem'
import { resolveWorkItemMaterials } from '@/utils/productionPlanMaterial'
import { applyCrossDemoStockToPlanMaterials } from '@/mock/crossModuleDemoSeed'
import { ensurePackageConvertDemoOnPlans } from '@/mock/packageConvertPurchaseDemoSeed'
import { ensureShipAccessoryProduceDemoPlans } from '@/mock/shipAccessoryProduceDemoSeed'
import { PLAN_SOURCE } from '@/utils/planSource'
import { MATERIAL_RELEASE_STATUS } from '@/constants/ecnPlanReschedule'
import { flattenMaterials } from '@/utils/material'

const STORAGE_KEY = 'i_doms_production_plans'
/** v11：物料投产状态 releasable/pending_spec + 分批计划字段 */
const DATA_VERSION = 11

function normalizePlanStatuses(orders) {
  const normalized = (orders || []).map((o) => {
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
    if (plan.deductInventory == null) plan.deductInventory = true
    if (Array.isArray(plan.tags)) {
      plan.tags = plan.tags.map((t) => {
        if (t === '待排产') return '待下达'
        if (t === '生产中') return '执行中'
        return t
      })
    }
    plan.workItems?.forEach((wi, idx) => {
      const salesLine = resolveSalesLineForWorkItem(plan, wi)
      Object.assign(wi, enrichWorkItem(wi, salesLine, idx, plan.deductInventory !== false))
      if (wi.expanded == null) wi.expanded = idx === 0
    })
    plan.workItems?.forEach((wi) => {
      if (!wi.planBatch) wi.planBatch = plan.planBatch || 1
      resolveWorkItemMaterials(wi)
      applyCrossDemoStockToPlanMaterials(wi.materials)
      const flat = []
      flattenMaterials(wi.materials, flat)
      flat.forEach((m) => {
        if (!m.releaseStatus) m.releaseStatus = MATERIAL_RELEASE_STATUS.RELEASABLE
      })
    })
    if (!plan.planBatch) plan.planBatch = 1
    return plan
  })

  // 演示：首个销售计划的首条非顶级料标为「待定」，便于二期分批联调（仅未打标时）
  const firstSales = normalized.find((p) => p.planSource !== PLAN_SOURCE.STOCK_REPLENISH)
  if (firstSales && !firstSales._pendingDemoApplied) {
    const wi = firstSales.workItems?.[0]
    const flat = []
    flattenMaterials(wi?.materials, flat)
    const demoMat = flat.find(
      (m) =>
        !m.isTopLevel &&
        (m.supplyType === '自制件' || m.supplyType === '外购件' || m.supplyType === '外购'),
    )
    if (demoMat) {
      demoMat.releaseStatus = MATERIAL_RELEASE_STATUS.PENDING_SPEC
      demoMat.joinPlan = '否'
    }
    firstSales._pendingDemoApplied = true
  }

  return ensureShipAccessoryProduceDemoPlans(
    ensurePackageConvertDemoOnPlans(ensureEcnCoverPlanMaterials(normalized)),
  )
}

/** 让 ECN-DEMO-COVER 的修改/替换/取消能对上这张订单的计划物料 */
function ensureEcnCoverPlanMaterials(plans) {
  const plan = (plans || []).find(
    (p) => p.salesOrderNo === '1-20260512-005' || p.orderNo === '1-20260512-005',
  )
  const wi = plan?.workItems?.find(
    (w) => String(w.productName || '').includes('ISG50-160') || w.productCode === 'CP2610001',
  )
  if (!wi) return plans
  if (!Array.isArray(wi.materials)) wi.materials = []
  const flat = []
  flattenMaterials(wi.materials, flat)
  const codes = new Set(flat.map((m) => m.code))
  const qty = Number(wi.planQty ?? wi.orderQty ?? wi.salesQty) || 1
  const extras = [
    { code: '010050003', name: '叶轮', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050004', name: '机械密封组件', supplyType: '外购件', spec: 'φ25×180mm' },
    { code: '010050002', name: '泵盖', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050006', name: '地脚螺栓组', supplyType: '外购件', spec: 'M16' },
  ]
  extras.forEach((row) => {
    if (codes.has(row.code)) return
    wi.materials.push(
      createPlanMaterial({
        name: row.name,
        code: row.code,
        spec: row.spec,
        supplyType: row.supplyType,
        unitUsage: 1,
        demandQty: qty,
        planQty: qty,
        joinPlan: '是',
        status: '待下达',
      }),
    )
  })
  return plans
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
    deductInventory: true,
    workItems,
  }

  addProductionPlan(plan)
  return plan
}

/** 按配件编码解析主数据与自有生效产品 BOM（非发运 BOM） */
function resolveShipAccessoryProduceBom(row = {}) {
  const code = String(row.materialCode || row.itemCode || '').trim()
  const products = productInfoState.products || []
  const materials = materialInfoState.materials || []
  const product =
    (row.masterProductId && products.find((p) => String(p.id) === String(row.masterProductId))) ||
    (code && products.find((p) => String(p.code || '').trim() === code)) ||
    null
  const material =
    (row.masterMaterialId &&
      materials.find((m) => String(m.id) === String(row.masterMaterialId))) ||
    (code && materials.find((m) => String(m.code || '').trim() === code)) ||
    null

  if (product) {
    const bom = getOwnActiveBomForItem('product', product.id)
    return {
      itemType: 'product',
      productId: product.id,
      productCode: product.code || code,
      productName: product.name || row.materialName || code,
      bom,
    }
  }
  if (material) {
    const bom = getOwnActiveBomForItem('material', material.id)
    return {
      itemType: 'material',
      productId: material.id,
      productCode: material.code || code,
      productName: material.name || row.materialName || code,
      bom,
    }
  }
  return {
    itemType: '',
    productId: '',
    productCode: code,
    productName: row.materialName || code,
    bom: null,
  }
}

/**
 * 随货配件自制/组装缺口 → 生产计划工作项
 * 有自有生效 BOM → 待下达 + EBOM 快照；无 BOM → 待 BOM + 补 BOM 轻类型设计任务
 * @returns {{ plan, workItems, created, appended, designTasks }}
 */
export function appendOrCreateProductionPlanForShipAccessories(salesOrder, accessoryRows = []) {
  const rows = (accessoryRows || []).filter((r) => (Number(r.planQty) || Number(r.qty) || 0) > 0)
  if (!rows.length || !salesOrder?.orderNo) {
    return { plan: null, workItems: [], created: false, appended: false, designTasks: [] }
  }

  const deliveryDate = resolveDeliveryDate(salesOrder.lineItems, salesOrder.documentDate)
  const designTasks = []
  const newWorkItems = rows.map((row, index) => {
    const planQty = Math.max(0, Number(row.planQty ?? row.qty) || 0)
    const supplyForm = String(row.supplyForm || '自制件')
    const topLevelSupplyType = /组装/.test(supplyForm) ? '组装' : '自制件'
    const stockQty = Math.max(0, Number(row.availableStock) || 0)
    const master = resolveShipAccessoryProduceBom(row)
    const bom = master.bom
    let status = '待下达'
    let designTaskId = ''
    let snapshot = { materials: [] }
    let bomId = ''
    let bomName = ''
    let bomVersion = ''

    if (bom) {
      snapshot = buildEbomSnapshotFromBom(bom, planQty)
      bomId = bom.id || ''
      bomName = bom.bomName || ''
      bomVersion = bom.version || ''
    } else {
      status = '待BOM'
      // 运行时再取，避免 productionPlanStore ↔ designTaskStore 循环依赖
      // eslint-disable-next-line global-require
      const { createBomOnlyDesignTaskFromShipAccessory } = require('@/store/designTaskStore')
      const task = createBomOnlyDesignTaskFromShipAccessory(salesOrder, row, {
        productId: master.productId,
        productCode: master.productCode,
        productName: master.productName,
        itemType: master.itemType,
      })
      designTaskId = task?.id || ''
      if (task) designTasks.push(task)
    }

    return enrichWorkItem(
      {
        id: `wi-acc-${row.id || row.materialCode || index}-${Date.now()}-${index}`,
        salesLineId: row.salesLineId || '',
        shipAccessoryLineId: row.id || '',
        fromShipAccessory: true,
        designTaskId,
        status,
        expanded: index === 0,
        salesQty: planQty,
        orderQty: planQty,
        planQty,
        stockQty,
        productName: master.productName || row.materialName || row.materialCode || '',
        productCode: master.productCode || row.materialCode || row.itemCode || '',
        productId: master.productId || '',
        productAttr: '随货配件',
        productType: '随货配件',
        model: row.specModel || '',
        spec: row.specModel || '',
        unit: row.unit || '件',
        deliveryDate: row.deliveryDate || deliveryDate,
        topLevelSupplyType,
        bomId,
        bomName,
        bomVersion,
        ebomSnapshot: snapshot,
        materials: snapshot.materials || [],
        matchingRequirements: bom
          ? `随货配件缺口转生产（供应型态：${supplyForm}）`
          : `随货配件待BOM，请完成补BOM设计任务（供应型态：${supplyForm}）`,
        remark: bom
          ? `随货配件缺口转生产（供应型态：${supplyForm}）`
          : `随货配件待BOM（供应型态：${supplyForm}）`,
      },
      null,
      index,
      true,
    )
  })

  const existing = findPlanBySalesOrderNo(salesOrder.orderNo)
  if (existing) {
    const known = new Set(
      (existing.workItems || []).map((w) => String(w.shipAccessoryLineId || '')).filter(Boolean),
    )
    const toAdd = newWorkItems.filter((w) => {
      const key = String(w.shipAccessoryLineId || '')
      return !key || !known.has(key)
    })
    if (!toAdd.length) {
      return { plan: existing, workItems: [], created: false, appended: false, designTasks: [] }
    }
    existing.workItems = [...(existing.workItems || []), ...toAdd]
    const addQty = toAdd.reduce((s, w) => s + (Number(w.planQty) || 0), 0)
    existing.productQty = (Number(existing.productQty) || 0) + addQty
    if (!String(existing.remark || '').includes('随货配件')) {
      existing.remark = existing.remark
        ? `${existing.remark}；含随货配件自制/组装`
        : '含随货配件自制/组装'
    }
    if (!Array.isArray(existing.tags)) existing.tags = []
    if (toAdd.some((w) => w.status === '待BOM') && !existing.tags.includes('待BOM')) {
      existing.tags.push('待BOM')
    }
    if (toAdd.some((w) => w.status === '待下达') && !existing.tags.includes('待下达')) {
      existing.tags.push('待下达')
    }
    designTasks.forEach((t) => {
      t.productionPlanId = existing.id
    })
    return { plan: existing, workItems: toAdd, created: false, appended: true, designTasks }
  }

  const totalQty = newWorkItems.reduce((s, w) => s + (Number(w.planQty) || 0), 0)
  const daysToDelivery = Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day'))
  const hasPendingBom = newWorkItems.some((w) => w.status === '待BOM')
  const plan = {
    id: `pp-${Date.now()}`,
    planSource: PLAN_SOURCE.SALES_ORDER,
    salesOrderNo: salesOrder.orderNo,
    orderNo: salesOrder.orderNo,
    customerName: salesOrder.customerName,
    productQty: totalQty,
    salesperson: salesOrder.salesperson || '',
    urgency: mapUrgencyToPlan(salesOrder.urgency),
    orderStatus: hasPendingBom ? '待BOM' : '待下达',
    orderDate: salesOrder.documentDate || dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: salesOrder.region || '',
    settlementType: salesOrder.settlementType || '',
    deliveryMethod: salesOrder.deliveryMethod || '',
    remark: `由销售订单 ${salesOrder.orderNo} 随货配件自制/组装缺口生成`,
    tags: hasPendingBom ? ['待BOM'] : ['待下达'],
    daysToDelivery,
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    deductInventory: true,
    workItems: newWorkItems,
  }
  addProductionPlan(plan)
  designTasks.forEach((t) => {
    t.productionPlanId = plan.id
  })
  return { plan, workItems: newWorkItems, created: true, appended: false, designTasks }
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
    deductInventory: true,
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

/** 终止生产计划；关联的未完成设计任务由调用方作废 */
export function terminateProductionPlan(id) {
  const plan = productionPlanState.orders.find((o) => o.id === id)
  if (!plan) return { ok: false, message: '生产计划不存在' }
  if (plan.orderStatus === '已终止') return { ok: false, message: '生产计划已终止' }
  plan.orderStatus = '已终止'
  plan.terminatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  ;(plan.workItems || []).forEach((wi) => {
    if (wi.status !== '已完成') wi.status = '已终止'
  })
  return { ok: true, plan, message: `生产计划「${plan.orderNo || ''}」已终止` }
}
