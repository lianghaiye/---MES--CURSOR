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
import { ensureMaterialReqDemoWorkOrders } from '@/mock/materialReqWorkOrderSeed'
import { ensureCrossDemoWorkOrders } from '@/mock/crossModuleDemoSeed'
import { ensureBlankSizeDemoWorkOrders } from '@/mock/blankSizeBomDemoSeed'
import { ensureBlankingDispatchDemoWorkOrders } from '@/mock/blankingDispatchDemoSeed'
import { ensureMultiUnitFlowWorkOrders } from '@/mock/multiUnitFlowDemoSeed'
import { ensureWorkOrderControlDemoOrders } from '@/mock/workOrderControlDemoSeed'
import {
  normalizeWorkOrderScheduleFields,
  createScheduleBatch,
  dispatchScheduleBatch,
  removeScheduleBatch,
  touchWorkOrderOperateUpdatedAt,
  getWorkOrderOperatorName,
} from '@/utils/workOrderScheduleBatch'
import { syncWorkOrderBlankingMaterials } from '@/utils/blankingSettleMaterial'
import {
  migrateWorkOrderStatusFields,
  canContinueSchedule,
  isScheduleIncomplete,
} from '@/utils/workOrderStatus'

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
      if (Array.isArray(parsed.orders)) {
        return parsed.orders.map((o) =>
          migrateWorkOrderStatusFields(normalizeWorkOrderScheduleFields(o)),
        )
      }
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
    taskStatus: '正常',
    scheduleQty: 0,
    planQty: 20,
    actualQty: 0,
    workCenter: '默认工厂',
    bom: '',
    warehouse: '报废仓',
    urgency: '正常',
    planDateRange: ['2026-05-31', '2026-05-31'],
    remark: '演示：计划20，可分批排产并指定不同执行人',
    processRouteName: routeName,
    source: 'manual',
    sourceOrderNo: '1-20260531-002',
    owner: 'admin1',
    submittedAt: '2026-05-31 17:41:31',
    submittedBy: 'admin',
    processes: buildProcessesFromRoute(routeName).map((p) => ({
      ...p,
      executors: [],
    })),
    scheduleBatches: [],
    activeScheduleBatchId: '',
    createdAt: '2026-05-31',
  }
}

function ensureDemoWorkOrder(orders) {
  const existing = orders.find((o) => o.id === DEMO_ORDER_ID)
  if (!existing) {
    orders.unshift(createDemoWorkOrder())
  } else {
    const hasBatches = (existing.scheduleBatches || []).length > 0
    if (!hasBatches && Number(existing.planQty) <= 3) {
      existing.planQty = 20
      existing.scheduleQty = 0
      existing.scheduleBatches = []
      existing.activeScheduleBatchId = ''
      existing.remark = existing.remark || '演示：计划数量可大于排产，支持分批排产并指定不同执行人'
      existing.processes = (existing.processes || []).map((p) => ({
        ...p,
        executors: [],
      }))
    }
    normalizeWorkOrderScheduleFields(existing)
  }
  return ensureCompletionDeductDemoWorkOrders(orders)
}

/** 完工扣减演示工单：领料+倒冲同 BOM，强制覆盖本地旧数据 */
const COMPLETION_DEDUCT_DEMO_WO_IDS = ['wo-init-3', 'wo-init-4', 'wo-init-5']

function createCompletionDeductDemoWorkOrders() {
  const routeName = '机加标准路线'
  return [
    {
      id: 'wo-init-3',
      code: 'WO202505280-003',
      name: '定子铁芯组件生产工单',
      productName: '定子铁芯组件',
      materialCode: 'CP2510003',
      orderCategory: '生产工单',
      status: '已完成',
      scheduleQty: 18,
      planQty: 18,
      finishedQty: 18,
      workCenter: '装配车间',
      bom: '潜水电机',
      warehouse: '成品仓',
      receiveWarehouse: '库线边仓',
      urgency: '普通',
      planDateRange: ['2026-05-01', '2026-05-20'],
      remark: '完工扣减演示：待确认（领料展示+倒冲预扣）',
      processRouteName: '装配标准路线',
      source: 'manual',
      sourceOrderNo: 'SO202505003',
      componentLines: [
        {
          id: 'wo3-issue-lam',
          itemCode: 'M-061',
          itemName: '定子冲片',
          specModel: 'Φ180',
          material: '硅钢',
          unit: '个',
          unitQty: 1,
          requisitionAttr: 1,
        },
        {
          id: 'wo3-issue-coil',
          itemCode: 'M-062',
          itemName: '定子线圈',
          specModel: 'QZ-2.0',
          material: '铜',
          unit: '套',
          unitQty: 1,
          requisitionAttr: 1,
        },
        {
          id: 'wo3-issue-varnish',
          itemCode: 'M-063',
          itemName: '绝缘漆',
          specModel: 'H级',
          material: '树脂',
          unit: 'kg',
          unitQty: 0.5,
          requisitionAttr: 1,
        },
        {
          id: 'wo3-bf-bolt',
          itemCode: 'MAT-STD-100',
          itemName: '标准螺栓组',
          specModel: 'M12×40',
          material: '钢',
          unit: '个',
          unitQty: 8,
          requisitionAttr: 0,
        },
        {
          id: 'wo3-bf-washer',
          itemCode: 'MAT-STD-WASHER',
          itemName: '平垫圈 M12',
          specModel: 'M12',
          material: '钢',
          unit: '个',
          unitQty: 8,
          requisitionAttr: 0,
        },
      ],
      processes: buildProcessesFromRoute('装配标准路线').map((p) => ({
        ...p,
        executors: ['李四'],
      })),
      createdAt: '2025-05-20',
    },
    {
      id: 'wo-init-4',
      code: 'WO20260715-004',
      name: '泵体铸件生产工单',
      productName: '泵体铸件',
      materialCode: 'CP2510004',
      orderCategory: '生产工单',
      status: '已完成',
      scheduleQty: 10,
      planQty: 10,
      finishedQty: 10,
      workCenter: '铸造车间',
      bom: '离心泵',
      warehouse: '半成品仓',
      receiveWarehouse: '库线边仓',
      urgency: '普通',
      planDateRange: ['2026-07-01', '2026-07-15'],
      remark: '完工扣减演示：领料+倒冲已确认',
      processRouteName: routeName,
      source: 'manual',
      sourceOrderNo: 'SO202607004',
      componentLines: [
        {
          id: 'wo4-issue-cast',
          itemCode: 'M-001',
          itemName: '泵体铸件毛坯',
          specModel: 'HT250',
          material: 'HT250',
          unit: '件',
          unitQty: 1,
          requisitionAttr: 1,
        },
        {
          id: 'wo4-issue-seal',
          itemCode: 'M-003',
          itemName: '机械密封',
          specModel: '104-55',
          material: '碳化硅',
          unit: '套',
          unitQty: 1,
          requisitionAttr: 1,
        },
        {
          id: 'wo4-bf-bolt',
          itemCode: 'MAT-STD-100',
          itemName: '标准螺栓组',
          specModel: 'M12×40',
          material: '钢',
          unit: '个',
          unitQty: 6,
          requisitionAttr: 0,
        },
        {
          id: 'wo4-bf-washer',
          itemCode: 'MAT-STD-WASHER',
          itemName: '平垫圈 M12',
          specModel: 'M12',
          material: '钢',
          unit: '个',
          unitQty: 6,
          requisitionAttr: 0,
        },
      ],
      processes: buildProcessesFromRoute(routeName).map((p) => ({
        ...p,
        executors: ['王五'],
      })),
      createdAt: '2026-07-01',
    },
    {
      id: 'wo-init-5',
      code: 'WO20260801-005',
      name: '叶轮组件生产工单',
      productName: '叶轮组件',
      materialCode: 'CP2510005',
      orderCategory: '生产工单',
      status: '已完成',
      scheduleQty: 6,
      planQty: 6,
      finishedQty: 6,
      workCenter: '机加车间',
      bom: '排污泵',
      warehouse: '半成品仓',
      receiveWarehouse: '原料仓',
      urgency: '加急',
      planDateRange: ['2026-07-20', '2026-08-01'],
      remark: '完工扣减演示：倒冲库存不足部分失败',
      processRouteName: routeName,
      source: 'manual',
      sourceOrderNo: 'SO202608005',
      componentLines: [
        {
          id: 'wo5-issue-impeller',
          itemCode: 'M-012',
          itemName: '切割叶轮',
          specModel: 'WQ-φ220',
          material: 'HT250',
          unit: '件',
          unitQty: 1,
          requisitionAttr: 1,
        },
        {
          id: 'wo5-issue-shaft',
          itemCode: 'M-005',
          itemName: '轴',
          specModel: 'φ45×480',
          material: '45#钢',
          unit: '根',
          unitQty: 1,
          requisitionAttr: 1,
        },
        {
          id: 'wo5-bf-bolt',
          itemCode: 'MAT-STD-100',
          itemName: '标准螺栓组',
          specModel: 'M12×40',
          material: '钢',
          unit: '个',
          unitQty: 12,
          requisitionAttr: 0,
        },
      ],
      processes: buildProcessesFromRoute(routeName).map((p) => ({
        ...p,
        executors: ['赵六'],
      })),
      createdAt: '2026-07-20',
    },
  ]
}

function ensureCompletionDeductDemoWorkOrders(orders) {
  const demos = createCompletionDeductDemoWorkOrders()
  const rest = orders.filter((o) => !COMPLETION_DEDUCT_DEMO_WO_IDS.includes(o.id))
  return [...demos, ...rest]
}

function ensureLaborDemoProductionOrders(orders) {
  const demos = [...createLaborDemoProductionOrders(), ...createLaborDemoAssemblyOrders()]
  const rest = orders.filter((o) => !isLaborDemoWorkOrder(o.id))
  return ensureWorkOrderControlDemoOrders(
    ensureMultiUnitFlowWorkOrders(
      ensureBlankingDispatchDemoWorkOrders(
        ensureBlankSizeDemoWorkOrders(
          ensureCrossDemoWorkOrders(
            ensureMaterialReqDemoWorkOrders(
              ensureProductionPlanOrderTreeDemoWorkOrders([...demos, ...rest]),
            ),
          ),
        ),
      ),
    ),
  )
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
    ]),
  )
}

const loadedOrders = loadFromStorage()
function finalizeOrders(orders) {
  return (orders || []).map((o) =>
    migrateWorkOrderStatusFields(normalizeWorkOrderScheduleFields(o)),
  )
}
export const workOrderState = reactive({
  orders: finalizeOrders(
    loadedOrders
      ? ensureDemoWorkOrder(ensureLaborDemoProductionOrders(loadedOrders))
      : createInitialOrders(),
  ),
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

export function updateWorkOrder(id, patch, options = {}) {
  const idx = workOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  const prevStatus = workOrderState.orders[idx].status
  Object.assign(workOrderState.orders[idx], patch)
  const row = workOrderState.orders[idx]
  // 默认写入操作更新时间；报工完工等可传 touchOperateUpdatedAt: false
  if (options.touchOperateUpdatedAt !== false) {
    touchWorkOrderOperateUpdatedAt(row)
  }
  // 工单首次变为「已完成」时生成完工库存扣减单（BOM 领料+倒冲同单）
  const becameComplete =
    prevStatus !== '完成' &&
    prevStatus !== '已完成' &&
    (row.status === '完成' || row.status === '已完成')
  if (becameComplete) {
    if (row.status === '完成') row.status = '已完成'
    const finishedQty =
      Number(row.finishedQty) || Number(row.scheduleQty) || Number(row.planQty) || 0
    import('@/store/materialRequisitionStore')
      .then(({ createWorkOrderCompletionDeduct }) => {
        createWorkOrderCompletionDeduct(row, finishedQty)
      })
      .catch(() => {
        /* ignore */
      })
  }
  return row
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
  const payload = {
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
    creator: partial.creator || partial.owner || getWorkOrderOperatorName(),
    updater: partial.updater || partial.creator || partial.owner || getWorkOrderOperatorName(),
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
    planSource: partial.planSource || '',
    salesLineId: partial.salesLineId || '',
    salesOrderId: partial.salesOrderId || '',
    materialCode: partial.materialCode || '',
    productId: partial.productId || '',
    specModel: partial.specModel || '',
    material: partial.material || '',
    drawingNo: partial.drawingNo || '',
    variantSummary: partial.variantSummary || '',
    variantValues: partial.variantValues ? { ...partial.variantValues } : {},
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
    scheduleBatches: Array.isArray(partial.scheduleBatches) ? partial.scheduleBatches : [],
    activeScheduleBatchId: partial.activeScheduleBatchId || '',
    createdAt: dayjs().format('YYYY-MM-DD'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  // 下料工序挂上 BOM 中「需要下料结算」的物料，供下发页展示
  syncWorkOrderBlankingMaterials(payload)
  return payload
}

/** 新建排产批次 */
export function addWorkOrderScheduleBatch(workOrderId, input) {
  const wo = workOrderState.orders.find((o) => o.id === workOrderId)
  if (!wo) return { ok: false, message: '工单不存在' }
  normalizeWorkOrderScheduleFields(wo)
  return createScheduleBatch(wo, input)
}

/** 下发排产批次 */
export function dispatchWorkOrderScheduleBatch(workOrderId, batchId) {
  const wo = workOrderState.orders.find((o) => o.id === workOrderId)
  if (!wo) return { ok: false, message: '工单不存在' }
  return dispatchScheduleBatch(wo, batchId)
}

/** 删除待下发排产批次 */
export function removeWorkOrderScheduleBatch(workOrderId, batchId) {
  const wo = workOrderState.orders.find((o) => o.id === workOrderId)
  if (!wo) return { ok: false, message: '工单不存在' }
  return removeScheduleBatch(wo, batchId)
}

export function setActiveWorkOrderScheduleBatch(workOrderId, batchId) {
  const wo = workOrderState.orders.find((o) => o.id === workOrderId)
  if (!wo) return false
  wo.activeScheduleBatchId = batchId
  return true
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
      sourceOrderNo: sourceOrder.orderNo || '',
      planSource: sourceOrder.planSource || '',
      materialCode: row.code,
      productId: bomFields.productId,
      ebomSnapshot: bomFields.ebomSnapshot,
      salesLineId: bomFields.salesLineId || '',
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
    if (filters.productName && !(wo.productName || '').includes(filters.productName)) return false
    if (filters.materialCode) {
      const code = String(filters.materialCode)
      if (!(wo.materialCode || '').includes(code) && !(wo.productCode || '').includes(code)) {
        return false
      }
    }
    if (filters.specModel && !(wo.specModel || '').includes(filters.specModel)) return false
    if (filters.drawingNo && !(wo.drawingNo || '').includes(filters.drawingNo)) return false
    if (filters.status && wo.status !== filters.status) return false
    if (filters.orderCategory && wo.orderCategory !== filters.orderCategory) return false
    if (filters.workCenter && wo.workCenter !== filters.workCenter) return false
    if (filters.scheduleIncomplete && !isScheduleIncomplete(wo)) return false
    return true
  })
}

/** 可继续下发/排产的主状态 */
export function canShowDispatchTab(status) {
  return canContinueSchedule(status)
}

/** 待下发，或执行中/已下发且未排完时继续展示工单下发 */
export function shouldShowWorkOrderDispatchTab(workOrder) {
  if (!workOrder) return false
  if (workOrder.status === '暂停' || workOrder.status === '终止' || workOrder.status === '已完成') {
    return false
  }
  if (workOrder.status === '待下发') return true
  if (!canContinueSchedule(workOrder.status)) return false
  return isScheduleIncomplete(workOrder) || workOrder.status === '待下发'
}
