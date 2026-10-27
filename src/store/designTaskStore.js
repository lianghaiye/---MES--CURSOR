import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildMockDesignTasks } from '@/mock/designTaskSeed'
import {
  DESIGN_TASK_KIND,
  DESIGN_TASK_SOURCE,
  DESIGN_TASK_STATUS,
  isBomOnlyDesignTask,
} from '@/constants/designTask'
import { EBOM_STATUS } from '@/constants/ebom'
import { addProductionPlan, findPlanBySalesOrderNo } from '@/store/productionPlanStore'
import { findEbomById, revertEbomToDraft } from '@/store/ebomStore'
import { buildEbomSnapshotFromEbomRecord } from '@/utils/ebomSnapshot'
import { enrichWorkItem } from '@/utils/productionPlanWorkItem'
import { productInfoState } from '@/store/productInfoStore'
import { publishEbomToProductBom } from '@/utils/publishEbomToProductBom'
import { designTaskCanPublishProductBom } from '@/utils/designTaskProductMaster'

const STORAGE_KEY = 'i_doms_design_tasks'
/** v4：种子含「待审核」任务，列表操作列可点审核 */
const DATA_VERSION = 4
let taskSeq = 100

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.tasks)) {
        taskSeq = parsed.taskSeq ?? taskSeq
        return parsed.tasks
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
    JSON.stringify({ version: DATA_VERSION, taskSeq, tasks: designTaskState.tasks }),
  )
}

function loadInitialDesignTasks() {
  // eslint-disable-next-line global-require
  const {
    ensureShipAccessoryProduceDemoDesignTasks,
  } = require('@/mock/shipAccessoryProduceDemoSeed')
  const base = loadFromStorage() || buildMockDesignTasks(mockProducts)
  return ensureShipAccessoryProduceDemoDesignTasks(base)
}

export const designTaskState = reactive({
  tasks: loadInitialDesignTasks(),
})

watch(
  () => designTaskState.tasks,
  () => persist(),
  { deep: true },
)

export function generateDesignTaskNo() {
  taskSeq += 1
  return `SJ-${dayjs().format('YYYY')}-${String(taskSeq).padStart(4, '0')}`
}

export function findDesignTaskById(id) {
  return designTaskState.tasks.find((t) => t.id === id) || null
}

export function findDesignTaskBySalesLine(salesOrderNo, salesLineId) {
  return (
    designTaskState.tasks.find(
      (t) => t.salesOrderNo === salesOrderNo && t.salesLineId === salesLineId,
    ) || null
  )
}

function resolveProduct(productId) {
  return productInfoState.products.find((p) => p.id === productId) || null
}

function syncTaskFromEbom(task, ebom) {
  task.ebomId = ebom.id
  task.ebomName = ebom.ebomName
  task.ebomCode = ebom.ebomNo
  task.baselineBomId = ebom.baselineBomId || task.baselineBomId || ''
}

function buildTaskBase(salesOrder, line, product, source, extras = {}) {
  return {
    status: DESIGN_TASK_STATUS.PENDING,
    source,
    taskKind: extras.taskKind || DESIGN_TASK_KIND.FULL,
    salesOrderNo: line?.salesOrderNo || salesOrder?.orderNo || '',
    salesLineId: line?.id || '',
    shipAccessoryLineId: extras.shipAccessoryLineId || '',
    fromShipAccessory: !!extras.fromShipAccessory,
    customerName: line?.customerName || salesOrder?.customerName || '',
    contractNo: line?.contractNo || salesOrder?.contractNo || '',
    remark: line?.remark || extras.remark || '',
    quantity: Number(line?.quantity ?? line?.salesQty ?? extras.quantity) || 1,
    orderType: salesOrder?.orderType || line?.orderType || '标准订单',
    orderDate: salesOrder?.documentDate || line?.orderDate || dayjs().format('YYYY-MM-DD'),
    urgency: salesOrder?.urgency || line?.urgency || '普通',
    deliveryDate: line?.deliveryDate || salesOrder?.documentDate || '',
    productId: line?.productId || product?.id || extras.productId || '',
    productCode: line?.productCode || product?.code || extras.productCode || '',
    productName: line?.productName || product?.name || extras.productName || '',
    productAttr: line?.productAttr || product?.productAttribute || extras.productAttr || '',
    specModel: line?.specModel || product?.specModel || extras.specModel || '',
    specAttr: line?.specAttr || product?.standardSpec || '',
    material: line?.material || product?.material || '',
    techParams: line?.techParams || product?.techParams || '',
    matchingRequirements: line?.matchingRequirements || product?.matchingRequirements || '',
    supplementDesc: line?.supplementDesc || '',
    ebomId: '',
    ebomName: '',
    ebomCode: '',
    baselineBomId: '',
    processFile: line?.processFile || '',
    designer: '',
    designTime: '',
    checker: '',
    checkTime: '',
    salesperson: salesOrder?.salesperson || line?.salesperson || '',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    productionPlanId: '',
    hasEbomDraft: false,
  }
}

export function createDesignTaskFromSalesLine(salesOrder, line) {
  const existing = findDesignTaskBySalesLine(salesOrder.orderNo, line.id)
  if (existing) return existing

  const product = resolveProduct(line.productId)
  const task = {
    id: `dt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskNo: generateDesignTaskNo(),
    ...buildTaskBase(salesOrder, line, product, DESIGN_TASK_SOURCE.SALES_ORDER, {
      taskKind: DESIGN_TASK_KIND.FULL,
    }),
  }
  designTaskState.tasks.unshift(task)
  return task
}

export function findDesignTaskByShipAccessoryLine(salesOrderNo, shipAccessoryLineId) {
  const accId = String(shipAccessoryLineId || '')
  if (!salesOrderNo || !accId) return null
  return (
    designTaskState.tasks.find(
      (t) =>
        t.salesOrderNo === salesOrderNo &&
        String(t.shipAccessoryLineId || '') === accId &&
        t.status !== DESIGN_TASK_STATUS.VOIDED,
    ) || null
  )
}

/**
 * 随货配件无产品 BOM：创建补 BOM 轻类型设计任务
 * @param {object} salesOrder
 * @param {object} accessoryRow
 * @param {{ productId?: string, productCode?: string, productName?: string, itemType?: string }} master
 */
export function createBomOnlyDesignTaskFromShipAccessory(salesOrder, accessoryRow, master = {}) {
  const accId = accessoryRow?.id || ''
  if (accId) {
    const existing = findDesignTaskByShipAccessoryLine(salesOrder?.orderNo, accId)
    if (existing) return existing
  }

  const product = master.productId ? resolveProduct(master.productId) : null
  const qty = Number(accessoryRow?.planQty ?? accessoryRow?.shipQty ?? accessoryRow?.qty) || 1
  const task = {
    id: `dt-acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskNo: generateDesignTaskNo(),
    ...buildTaskBase(
      salesOrder,
      {
        id: '',
        salesQty: qty,
        productId: master.productId || '',
        productCode: master.productCode || accessoryRow?.materialCode || '',
        productName: master.productName || accessoryRow?.materialName || '',
        productAttr: '随货配件',
        specModel: accessoryRow?.specModel || '',
        deliveryDate: accessoryRow?.deliveryDate || '',
      },
      product,
      DESIGN_TASK_SOURCE.SHIP_ACCESSORY,
      {
        taskKind: DESIGN_TASK_KIND.BOM_ONLY,
        shipAccessoryLineId: accId,
        fromShipAccessory: true,
        quantity: qty,
        productId: master.productId || '',
        productCode: master.productCode || accessoryRow?.materialCode || '',
        productName: master.productName || accessoryRow?.materialName || '',
        productAttr: '随货配件',
        specModel: accessoryRow?.specModel || '',
        remark: `随货配件补BOM（供应型态：${accessoryRow?.supplyForm || '自制件'}）`,
      },
    ),
  }
  designTaskState.tasks.unshift(task)
  return task
}

export function createManualDesignTask(payload) {
  const taskNo = (payload.taskNo || '').trim() || generateDesignTaskNo()
  if (designTaskState.tasks.some((t) => t.taskNo === taskNo)) {
    return { ok: false, message: `设计单号「${taskNo}」已存在` }
  }

  const product = payload.productId ? resolveProduct(payload.productId) : null
  const task = {
    id: `dt-${Date.now()}`,
    taskNo,
    ...buildTaskBase(null, payload, product, DESIGN_TASK_SOURCE.MANUAL),
    productName: payload.productName?.trim() || product?.name || '',
    productCode: payload.productCode || product?.code || '',
    productAttr: payload.productAttr || product?.productAttribute || '',
    specModel: payload.specModel || product?.specModel || '',
    material: payload.material || product?.material || '',
    customerName: payload.customerName || '',
    salesOrderNo: payload.salesOrderNo || '',
    contractNo: payload.contractNo || '',
    remark: payload.remark || '',
    quantity: Number(payload.quantity) || 1,
    orderDate: payload.orderDate || dayjs().format('YYYY-MM-DD'),
    deliveryDate: payload.deliveryDate || '',
    techParams: payload.techParams || product?.techParams || '',
  }
  designTaskState.tasks.unshift(task)
  return { ok: true, task }
}

/** 设计页：保存 EBOM 草稿 */
export function onDesignTaskEbomDraftSaved(designTaskId, ebom, designer = '当前用户') {
  const task = findDesignTaskById(designTaskId)
  if (!task || !ebom) return null
  syncTaskFromEbom(task, ebom)
  task.status = DESIGN_TASK_STATUS.DESIGNING
  task.hasEbomDraft = true
  task.designer = designer
  task.designTime = dayjs().format('YYYY-MM-DD HH:mm')
  return task
}

/** 设计页：保存并提交（EBOM 定稿 → 设计任务待审核） */
export function onDesignTaskEbomSubmitted(designTaskId, ebom, designer = '当前用户') {
  const task = findDesignTaskById(designTaskId)
  if (!task || !ebom) return { ok: false, message: '设计任务或 EBOM 不存在' }
  if (ebom.status !== EBOM_STATUS.FINALIZED) {
    return { ok: false, message: 'EBOM 尚未定稿' }
  }
  syncTaskFromEbom(task, ebom)
  task.status = DESIGN_TASK_STATUS.PENDING_AUDIT
  task.hasEbomDraft = true
  task.designer = designer
  task.designTime = dayjs().format('YYYY-MM-DD HH:mm')
  return { ok: true, message: '已保存并提交，等待审核', task }
}

export function withdrawDesignTaskAudit(id) {
  const task = findDesignTaskById(id)
  if (!task) return { ok: false, message: '设计任务不存在' }
  if (task.status !== DESIGN_TASK_STATUS.PENDING_AUDIT) {
    return { ok: false, message: `任务「${task.taskNo}」不在待审核状态，无法撤回` }
  }
  task.status = DESIGN_TASK_STATUS.DESIGNING
  if (task.ebomId) revertEbomToDraft(task.ebomId)
  return { ok: true, message: '已撤回申请，可继续编辑 EBOM 草稿', task }
}

function applyEbomToPlanWorkItem(workItem, ebom, salesQty = 1) {
  const snapshot = buildEbomSnapshotFromEbomRecord(ebom, salesQty)
  workItem.ebomId = ebom.id
  workItem.ebomName = ebom.ebomName
  workItem.ebomCode = ebom.ebomNo
  workItem.bomId = ''
  workItem.bomName = ebom.ebomName
  workItem.bomVersion = ebom.version || ''
  workItem.ebomSnapshot = snapshot
  workItem.materials = snapshot.materials || []
  enrichWorkItem(workItem)
}

function onDesignTaskApproved(task, checker = 'admin1', options = {}) {
  const ebom = task.ebomId ? findEbomById(task.ebomId) : null
  if (!ebom || ebom.status !== EBOM_STATUS.FINALIZED) {
    return { ok: false, message: `任务「${task.taskNo}」无已定稿 EBOM，无法审核通过` }
  }

  let publishSuffix = ''
  if (options.publishProductBom && designTaskCanPublishProductBom(task)) {
    const pub = publishEbomToProductBom(ebom, task.productId)
    if (!pub.ok) {
      return {
        ok: false,
        message: `任务「${task.taskNo}」发布产品/变体 SKU BOM 失败：${pub.message}`,
      }
    }
    publishSuffix = `；${pub.message}`
  }

  task.status = DESIGN_TASK_STATUS.APPROVED
  task.checker = checker
  task.checkTime = dayjs().format('YYYY-MM-DD HH:mm')
  syncTaskFromEbom(task, ebom)

  if (
    (task.source === DESIGN_TASK_SOURCE.SALES_ORDER ||
      task.source === DESIGN_TASK_SOURCE.SHIP_ACCESSORY) &&
    task.salesOrderNo
  ) {
    const plan = findPlanBySalesOrderNo(task.salesOrderNo)
    if (plan) {
      const accId = String(task.shipAccessoryLineId || '')
      const wi =
        plan.workItems?.find((w) => w.designTaskId && w.designTaskId === task.id) ||
        (accId
          ? plan.workItems?.find((w) => String(w.shipAccessoryLineId || '') === accId)
          : null) ||
        (task.salesLineId ? plan.workItems?.find((w) => w.salesLineId === task.salesLineId) : null)
      if (wi) {
        wi.status = '待下达'
        wi.designTaskId = task.id
        applyEbomToPlanWorkItem(wi, ebom, Number(wi.salesQty) || 1)
      }
      task.productionPlanId = plan.id
    }
    const kindTip = isBomOnlyDesignTask(task) ? '（补BOM）' : ''
    return {
      ok: true,
      message: `设计任务「${task.taskNo}」${kindTip}审核通过，生产计划已关联 EBOM${publishSuffix}`,
      task,
    }
  }

  if (task.source === DESIGN_TASK_SOURCE.MANUAL && !task.productionPlanId) {
    const salesQty = 1
    const snapshot = buildEbomSnapshotFromEbomRecord(ebom, salesQty)
    const deliveryDate = task.deliveryDate || dayjs().add(30, 'day').format('YYYY-MM-DD')
    const plan = {
      id: `pp-dt-${Date.now()}`,
      salesOrderNo: '',
      orderNo: `JH-${task.taskNo}`,
      customerName: task.customerName,
      productQty: salesQty,
      salesperson: task.salesperson,
      urgency: task.urgency === '紧急' || task.urgency === '加急' ? task.urgency : '普通',
      orderStatus: '待下达',
      orderDate: task.orderDate || dayjs().format('YYYY-MM-DD'),
      deliveryDate,
      region: '',
      settlementType: '',
      deliveryMethod: '',
      remark: `来源设计任务 ${task.taskNo}`,
      tags: ['待下达'],
      daysToDelivery: Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day')),
      planAssemblyDate: '',
      planCompleteDate: deliveryDate,
      designTaskId: task.id,
      workItems: [
        enrichWorkItem(
          {
            id: `wi-${task.id}`,
            salesLineId: task.id,
            designTaskId: task.id,
            ebomId: ebom.id,
            status: '待下达',
            expanded: true,
            salesQty,
            productName: task.productName,
            productCode: task.productCode,
            productAttr: task.productAttr,
            productType: task.productAttr,
            model: task.specModel,
            spec: task.specAttr,
            techParams: task.techParams,
            deliveryDate,
            ebomName: ebom.ebomName,
            ebomCode: ebom.ebomNo,
            ebomSnapshot: snapshot,
            materials: snapshot.materials || [],
          },
          task,
          0,
        ),
      ],
    }
    addProductionPlan(plan)
    task.productionPlanId = plan.id
    return {
      ok: true,
      message: `设计任务「${task.taskNo}」审核通过，已生成生产计划 ${plan.orderNo}${publishSuffix}`,
      task,
      planOrderNo: plan.orderNo,
    }
  }

  return { ok: true, message: `设计任务「${task.taskNo}」审核通过${publishSuffix}`, task }
}

export function approveDesignTasks(ids, checker = 'admin1', options = {}) {
  return ids.map((id) => {
    const task = findDesignTaskById(id)
    if (!task) return { ok: false, message: '设计任务不存在' }
    if (task.status !== DESIGN_TASK_STATUS.PENDING_AUDIT) {
      return { ok: false, message: `任务「${task.taskNo}」不是待审核状态` }
    }
    return onDesignTaskApproved(task, checker, options)
  })
}

/** 生产计划终止后：未审核通过的设计任务自动作废 */
export function voidIncompleteDesignTasksForPlan(plan) {
  if (!plan) return { count: 0, tasks: [] }
  const taskIds = new Set()
  if (plan.designTaskId) taskIds.add(plan.designTaskId)
  const lineIds = new Set()
  ;(plan.workItems || []).forEach((wi) => {
    if (wi?.designTaskId) taskIds.add(wi.designTaskId)
    if (wi?.salesLineId) lineIds.add(wi.salesLineId)
  })

  const accessoryLineIds = new Set()
  ;(plan.workItems || []).forEach((wi) => {
    if (wi?.shipAccessoryLineId) accessoryLineIds.add(String(wi.shipAccessoryLineId))
  })

  const tasks = designTaskState.tasks.filter((task) => {
    if (task.status === DESIGN_TASK_STATUS.APPROVED || task.status === DESIGN_TASK_STATUS.VOIDED) {
      return false
    }
    if (taskIds.has(task.id)) return true
    if (plan.id && task.productionPlanId === plan.id) return true
    if (
      plan.salesOrderNo &&
      task.salesOrderNo === plan.salesOrderNo &&
      task.salesLineId &&
      lineIds.has(task.salesLineId)
    ) {
      return true
    }
    if (
      plan.salesOrderNo &&
      task.salesOrderNo === plan.salesOrderNo &&
      task.shipAccessoryLineId &&
      accessoryLineIds.has(String(task.shipAccessoryLineId))
    ) {
      return true
    }
    return false
  })

  const now = dayjs().format('YYYY-MM-DD HH:mm')
  tasks.forEach((task) => {
    task.status = DESIGN_TASK_STATUS.VOIDED
    task.voidedAt = now
    task.voidReason = '生产计划已终止'
  })
  return { count: tasks.length, tasks }
}

export function filterDesignTasks(list, filters) {
  return list.filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.taskNo && !row.taskNo.includes(filters.taskNo)) return false
    if (filters.urgency && row.urgency !== filters.urgency) return false
    if (filters.customerName && !row.customerName.includes(filters.customerName)) return false
    if (filters.orderType && row.orderType !== filters.orderType) return false
    if (filters.orderDateRange?.length === 2) {
      const [start, end] = filters.orderDateRange
      const startDay = start?.format ? start.format('YYYY-MM-DD') : start
      const endDay = end?.format ? end.format('YYYY-MM-DD') : end
      if (
        dayjs(row.orderDate).isBefore(startDay, 'day') ||
        dayjs(row.orderDate).isAfter(endDay, 'day')
      ) {
        return false
      }
    }
    return true
  })
}

export function canOpenEbomDesign(task) {
  return [
    DESIGN_TASK_STATUS.PENDING,
    DESIGN_TASK_STATUS.DESIGNING,
    DESIGN_TASK_STATUS.REJECTED,
  ].includes(task.status)
}
