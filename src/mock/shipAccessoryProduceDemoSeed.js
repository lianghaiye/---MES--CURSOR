/**
 * 自制随货配件 → 生产计划 / 补BOM设计任务 联调演示
 *
 * 订单 A：自制配件有产品 BOM → 计划「待下达」
 * 订单 B：自制配件无 BOM → 计划「待BOM」+ 补BOM 轻类型设计任务
 */
import dayjs from 'dayjs'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { createShipAttachmentLine } from '@/utils/shipBomAttachments'
import { DESIGN_TASK_KIND, DESIGN_TASK_SOURCE, DESIGN_TASK_STATUS } from '@/constants/designTask'
import { PLAN_SOURCE } from '@/utils/planSource'
import { enrichWorkItem } from '@/utils/productionPlanWorkItem'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'

export const SHIP_ACC_PRODUCE_DEMO = {
  /** 有 BOM：待下达 */
  orderReadyId: 'so-ship-acc-produce-ready',
  orderReadyNo: 'XSDD20261027-ACC-PRODUCE',
  lineReady: 'line-ship-acc-produce-ready',
  accReadyId: 'ship-acc-produce-ready-bracket',
  /** 用已有生效产品 BOM 的 SKU 充当自制配件编码 */
  accReadyCode: 'CP2610001',
  accReadyName: '联轴器护罩（自制演示·有BOM）',
  planReadyId: 'pp-ship-acc-produce-ready',
  wiReadyId: 'wi-ship-acc-produce-ready',

  /** 无 BOM：待BOM + 补BOM任务 */
  orderPendingId: 'so-ship-acc-produce-pending',
  orderPendingNo: 'XSDD20261027-ACC-PENDING',
  linePending: 'line-ship-acc-produce-pending',
  accPendingId: 'ship-acc-produce-pending-flange',
  accPendingCode: 'ACC-SELF-FLANGE',
  accPendingName: '配套法兰盘（自制演示·无BOM）',
  planPendingId: 'pp-ship-acc-produce-pending',
  wiPendingId: 'wi-ship-acc-produce-pending',
  designTaskId: 'dt-ship-acc-bom-only-001',
  designTaskNo: 'SJ-2026-ACC01',
}

function accessorySelfMade(partial) {
  return {
    ...createShipAttachmentLine({
      selected: true,
      source: '主数据',
      sourceBomId: '',
      sourceBomNo: '',
      ...partial,
    }),
    sourceBomName: '',
    supplyForm: '自制件',
    materialType: '配件',
    stockFulfillmentMode: partial.stockFulfillmentMode || 'force_mto',
    produceConverted: true,
  }
}

function buildPumpLine(id, overrides = {}) {
  return createLineItem({
    id,
    productId: 'prod-00004',
    productName: '潜水电泵 QJ200-40/3',
    productCode: 'CP2610004',
    specModel: 'QJ200-40/3',
    material: '不锈钢316L',
    unit: '台',
    salesQty: 1,
    qty: 1,
    shippedQty: 0,
    deliveryMode: '整件',
    deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    unitPriceExTax: 8500,
    totalPriceExTax: 8500,
    totalPriceInTax: 9605,
    stockFulfillmentMode: 'prefer_stock',
    planProduceQty: 1,
    ...overrides,
  })
}

/** 订单 A：自制配件有 BOM */
export function buildShipAccProduceReadySalesOrder() {
  const now = dayjs()
  const d = SHIP_ACC_PRODUCE_DEMO
  return createSalesOrder({
    id: d.orderReadyId,
    orderNo: d.orderReadyNo,
    contractNo: 'HT-20261027-ACC-P',
    customerName: '自制随货配件演示·有BOM',
    region: '华东',
    salesperson: '王芳',
    progressStatus: '进行中',
    deliveryStatus: '未发货',
    businessType: '自产销售',
    documentDate: now.format('YYYY-MM-DD'),
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    creator: '王芳',
    approver: 'admin1',
    approvedAt: now.format('YYYY-MM-DD HH:mm'),
    urgency: '正常',
    remark: '演示：随货配件自制件已有产品 BOM，审核后进生产计划待下达',
    inventoryStatus: '充足',
    contactPerson: '张工',
    contactPhone: '13800003301',
    deliveryAddress: '苏州市工业园区演示路 1 号',
    deliveryMethod: '送货',
    defaultWarehouse: '成品仓',
    lineItems: [buildPumpLine(d.lineReady)],
    shipAccessories: [
      accessorySelfMade({
        id: d.accReadyId,
        materialCode: d.accReadyCode,
        materialName: d.accReadyName,
        specModel: 'ISG50 配套',
        unit: '件',
        unitQty: 1,
        kitSets: 1,
        shipQty: 1,
        planQty: 1,
        availableStock: 0,
        gapQty: 1,
        salesLineId: d.lineReady,
        productCode: 'CP2610004',
        productName: '潜水电泵 QJ200-40/3',
      }),
    ],
  })
}

/** 订单 B：自制配件无 BOM */
export function buildShipAccProducePendingSalesOrder() {
  const now = dayjs()
  const d = SHIP_ACC_PRODUCE_DEMO
  return createSalesOrder({
    id: d.orderPendingId,
    orderNo: d.orderPendingNo,
    contractNo: 'HT-20261027-ACC-N',
    customerName: '自制随货配件演示·待BOM',
    region: '华北',
    salesperson: '李强',
    progressStatus: '进行中',
    deliveryStatus: '未发货',
    businessType: '自产销售',
    documentDate: now.format('YYYY-MM-DD'),
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    creator: '李强',
    approver: 'admin1',
    approvedAt: now.format('YYYY-MM-DD HH:mm'),
    urgency: '加急',
    remark: '演示：随货配件自制件无产品 BOM → 计划待BOM + 补BOM设计任务',
    inventoryStatus: '缺口',
    contactPerson: '赵收货',
    contactPhone: '13800003302',
    deliveryAddress: '淄博市高新区演示路 27 号',
    deliveryMethod: '物流',
    defaultWarehouse: '成品仓',
    lineItems: [buildPumpLine(d.linePending)],
    shipAccessories: [
      accessorySelfMade({
        id: d.accPendingId,
        materialCode: d.accPendingCode,
        materialName: d.accPendingName,
        specModel: 'DN80 PN16',
        unit: '件',
        unitQty: 2,
        kitSets: 1,
        shipQty: 2,
        planQty: 2,
        availableStock: 0,
        gapQty: 2,
        salesLineId: d.linePending,
        productCode: 'CP2610004',
        productName: '潜水电泵 QJ200-40/3',
      }),
    ],
  })
}

function upsertById(list, row, idKey = 'id') {
  const arr = Array.isArray(list) ? [...list] : []
  const idx = arr.findIndex((x) => x?.[idKey] === row[idKey])
  if (idx === -1) arr.unshift(row)
  else arr[idx] = { ...arr[idx], ...row }
  return arr
}

export function ensureShipAccessoryProduceDemoSalesOrders(orders = []) {
  let list = Array.isArray(orders) ? [...orders] : []
  list = upsertById(list, buildShipAccProduceReadySalesOrder())
  list = upsertById(list, buildShipAccProducePendingSalesOrder())
  return list
}

function buildReadyPlanWorkItem() {
  const d = SHIP_ACC_PRODUCE_DEMO
  // 运行时取 BOM，避免 mock ↔ productBomStore 循环依赖
  // eslint-disable-next-line global-require
  const { getOwnActiveBomForItem } = require('@/store/productBomStore')
  const bom = getOwnActiveBomForItem('product', 'prod-00001')
  const planQty = 1
  const snapshot = bom ? buildEbomSnapshotFromBom(bom, planQty) : { materials: [] }
  return enrichWorkItem(
    {
      id: d.wiReadyId,
      salesLineId: d.lineReady,
      shipAccessoryLineId: d.accReadyId,
      fromShipAccessory: true,
      status: '待下达',
      expanded: true,
      salesQty: planQty,
      orderQty: planQty,
      planQty,
      stockQty: 0,
      productName: d.accReadyName,
      productCode: d.accReadyCode,
      productId: 'prod-00001',
      productAttr: '随货配件',
      productType: '随货配件',
      model: 'ISG50 配套',
      spec: 'ISG50 配套',
      unit: '件',
      deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      topLevelSupplyType: '自制件',
      bomId: bom?.id || '',
      bomName: bom?.bomName || '',
      bomVersion: bom?.version || '',
      ebomSnapshot: snapshot,
      materials: snapshot.materials || [],
      matchingRequirements: '随货配件缺口转生产（供应型态：自制件·有BOM演示）',
      remark: '随货配件自制演示·有BOM',
    },
    null,
    0,
    true,
  )
}

function buildPendingPlanWorkItem() {
  const d = SHIP_ACC_PRODUCE_DEMO
  const planQty = 2
  return enrichWorkItem(
    {
      id: d.wiPendingId,
      salesLineId: d.linePending,
      shipAccessoryLineId: d.accPendingId,
      fromShipAccessory: true,
      designTaskId: d.designTaskId,
      status: '待BOM',
      expanded: true,
      salesQty: planQty,
      orderQty: planQty,
      planQty,
      stockQty: 0,
      productName: d.accPendingName,
      productCode: d.accPendingCode,
      productId: '',
      productAttr: '随货配件',
      productType: '随货配件',
      model: 'DN80 PN16',
      spec: 'DN80 PN16',
      unit: '件',
      deliveryDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      topLevelSupplyType: '自制件',
      bomId: '',
      bomName: '',
      bomVersion: '',
      ebomSnapshot: { materials: [] },
      materials: [],
      matchingRequirements: '随货配件待BOM，请完成补BOM设计任务',
      remark: '随货配件自制演示·无BOM',
    },
    null,
    0,
    true,
  )
}

export function buildShipAccProduceReadyPlan() {
  const d = SHIP_ACC_PRODUCE_DEMO
  const deliveryDate = dayjs().add(14, 'day').format('YYYY-MM-DD')
  return {
    id: d.planReadyId,
    planSource: PLAN_SOURCE.SALES_ORDER,
    salesOrderNo: d.orderReadyNo,
    orderNo: d.orderReadyNo,
    customerName: '自制随货配件演示·有BOM',
    productQty: 1,
    salesperson: '王芳',
    urgency: '普通',
    orderStatus: '待下达',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: '华东',
    settlementType: '',
    deliveryMethod: '送货',
    remark: '演示：随货配件自制·有BOM → 待下达',
    tags: ['待下达', '随货配件'],
    daysToDelivery: 14,
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    deductInventory: true,
    workItems: [buildReadyPlanWorkItem()],
  }
}

export function buildShipAccProducePendingPlan() {
  const d = SHIP_ACC_PRODUCE_DEMO
  const deliveryDate = dayjs().add(14, 'day').format('YYYY-MM-DD')
  return {
    id: d.planPendingId,
    planSource: PLAN_SOURCE.SALES_ORDER,
    salesOrderNo: d.orderPendingNo,
    orderNo: d.orderPendingNo,
    customerName: '自制随货配件演示·待BOM',
    productQty: 2,
    salesperson: '李强',
    urgency: '加急',
    orderStatus: '待BOM',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: '华北',
    settlementType: '',
    deliveryMethod: '物流',
    remark: '演示：随货配件自制·无BOM → 待BOM + 补BOM设计任务',
    tags: ['待BOM', '随货配件'],
    daysToDelivery: 14,
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    deductInventory: true,
    workItems: [buildPendingPlanWorkItem()],
  }
}

export function ensureShipAccessoryProduceDemoPlans(plans = []) {
  let list = Array.isArray(plans) ? [...plans] : []
  list = upsertById(list, buildShipAccProduceReadyPlan())
  list = upsertById(list, buildShipAccProducePendingPlan())
  return list
}

export function buildShipAccBomOnlyDesignTask() {
  const d = SHIP_ACC_PRODUCE_DEMO
  const now = dayjs()
  return {
    id: d.designTaskId,
    taskNo: d.designTaskNo,
    status: DESIGN_TASK_STATUS.PENDING,
    source: DESIGN_TASK_SOURCE.SHIP_ACCESSORY,
    taskKind: DESIGN_TASK_KIND.BOM_ONLY,
    salesOrderNo: d.orderPendingNo,
    salesLineId: '',
    shipAccessoryLineId: d.accPendingId,
    fromShipAccessory: true,
    customerName: '自制随货配件演示·待BOM',
    contractNo: 'HT-20261027-ACC-N',
    remark: '随货配件补BOM（供应型态：自制件）',
    quantity: 2,
    orderType: '标准订单',
    orderDate: now.format('YYYY-MM-DD'),
    urgency: '加急',
    deliveryDate: now.add(14, 'day').format('YYYY-MM-DD'),
    productId: '',
    productCode: d.accPendingCode,
    productName: d.accPendingName,
    productAttr: '随货配件',
    specModel: 'DN80 PN16',
    specAttr: '',
    material: '',
    techParams: '',
    matchingRequirements: '',
    supplementDesc: '',
    ebomId: '',
    ebomName: '',
    ebomCode: '',
    baselineBomId: '',
    processFile: '',
    designer: '',
    designTime: '',
    checker: '',
    checkTime: '',
    salesperson: '李强',
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    productionPlanId: d.planPendingId,
    hasEbomDraft: false,
  }
}

/** 另备一条待审核的补BOM任务，便于列表操作列点「审核」 */
export function buildShipAccBomOnlyPendingAuditTask() {
  const d = SHIP_ACC_PRODUCE_DEMO
  const now = dayjs()
  return {
    ...buildShipAccBomOnlyDesignTask(),
    id: 'dt-ship-acc-bom-only-audit',
    taskNo: 'SJ-2026-ACC02',
    status: DESIGN_TASK_STATUS.PENDING_AUDIT,
    designer: '工艺员甲',
    designTime: now.subtract(1, 'hour').format('YYYY-MM-DD HH:mm'),
    hasEbomDraft: true,
    ebomId: 'ebom-seed-002',
    ebomName: `${d.accPendingName} EBOM`,
    ebomCode: 'EBOM-2026-0202',
    remark: '演示：随货配件补BOM已定稿，待审核',
    productionPlanId: d.planPendingId,
  }
}

export function ensureShipAccessoryProduceDemoDesignTasks(tasks = []) {
  let list = Array.isArray(tasks) ? [...tasks] : []
  list = upsertById(list, buildShipAccBomOnlyDesignTask())
  list = upsertById(list, buildShipAccBomOnlyPendingAuditTask())
  return list
}
