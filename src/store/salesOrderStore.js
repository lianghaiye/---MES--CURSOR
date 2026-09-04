import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildMockSalesOrders } from '@/mock/salesOrderSeed'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import {
  addPurchaseRequisition,
  buildRequisitionFromSalesOrder,
} from '@/store/purchaseRequisitionStore'
import { getOwnActiveBomForItem } from '@/store/productBomStore'
import {
  BOM_FULFILLMENT_PATH,
  normalizeBomFulfillmentPath,
  validateFulfillmentPathForApprove,
} from '@/constants/salesOrderFulfillment'
import { createProductionPlanFromSalesOrder } from '@/store/productionPlanStore'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { buildLineAccessoryKits, buildOrderAccessoryKits } from '@/mock/accessoryPacks'
import { normalizeDeliveryMode } from '@/utils/salesDeliveryMode'
import {
  ensureEcnDemoBootstrap,
  isEcnDemoSalesOrder,
  buildEcnDemoSalesOrderApprovalRecords,
} from '@/mock/ecnDemoBootstrap'
import { hydrateApprovedSelfProdOrders } from '@/utils/hydrateSalesLines'
import { validateChangeDeliveryRows, applyDeliveryModeChanges } from '@/utils/changeDeliveryMode'
import { syncProductionPlanDeliveryMode } from '@/store/productionPlanStore'
import { applyOrderAmounts } from '@/utils/salesOrderPricing'
import {
  deriveOrderBusinessType,
  isOutsourcingBusinessType,
  isPurchasedBusinessType,
  isCustomSalesBusinessType,
  isSelfMadeBusinessType,
  isMaintenanceServiceBusinessType,
  normalizeSalesLineBusiness,
  resolveLineBusinessType,
} from '@/utils/salesOrderBusiness'
import { createOutsourcingWorkOrdersFromSalesOrder } from '@/utils/salesOrderOutsourceWorkOrder'
import { createMaintenanceWorkOrdersFromSalesOrder } from '@/utils/salesOrderMaintenanceWorkOrder'
import { createDesignTaskFromSalesLine } from '@/store/designTaskStore'
import {
  createLabelRequestFromSalesOrder,
  applyLabelSummaryToSalesLines,
  voidLabelsBySalesOrder,
  salesOrderHasBoundLabels,
  salesLineIndustrialLabelNeedQty,
} from '@/store/industrialLabelStore'
import { isCustomProductAttribute } from '@/constants/designTask'
import { productInfoState } from '@/store/productInfoStore'
import { validateSalesLinesSkuResolved } from '@/utils/spuLineResolve'
import {
  allocateStockOnSalesApprove,
  buildLineStockReminder,
  buildOrderInventoryStatus,
  getLineAllocatedQty,
  releaseOrderAllocations,
} from '@/store/salesStockAllocationStore'
import {
  buildLineStockFulfillmentPlan,
  listStockOnlyShortfalls,
  normalizeStockFulfillmentMode,
  stockFulfillmentModeLabel,
} from '@/utils/salesStockFulfillment'
import {
  hasSalesOrderRevokeBlockers,
  SALES_ORDER_REVOKE_BLOCKED_MESSAGE,
} from '@/utils/salesOrderRevokeApproval'
import {
  isSalesOrderApproved,
  normalizeSalesOrderProgressStatus,
  SALES_ORDER_STATUS,
} from '@/utils/salesOrderStatus'
import { ensureDedicatedShipDemoSalesOrders } from '@/mock/dedicatedShipDemoSeed'
import { ensureScatterEbomShipDemoSalesOrders } from '@/mock/scatterEbomShipDemoSeed'

const STORAGE_KEY = 'i_doms_sales_orders'
const DATA_VERSION = 11
let orderSeq = 20
let deliverySeq = 113

function migrateSalesOrderStatuses(orders) {
  return (orders || []).map((order) => {
    const progressStatus = normalizeSalesOrderProgressStatus(order.progressStatus)
    let approvalRecords = Array.isArray(order.approvalRecords) ? order.approvalRecords : []
    if (isEcnDemoSalesOrder(order)) {
      const hasReject = approvalRecords.some((r) => r.result === '已驳回' || r.result === '已拒绝')
      const hasPass = approvalRecords.some((r) => r.result === '已通过')
      if (!hasReject || !hasPass) {
        approvalRecords = buildEcnDemoSalesOrderApprovalRecords()
      }
    }
    return {
      ...order,
      progressStatus,
      approvalRecords,
      updatedAt: order.updatedAt || order.createdAt || '',
      updater: order.updater || order.creator || '',
    }
  })
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (
        Array.isArray(parsed.orders) &&
        (parsed.version === DATA_VERSION ||
          parsed.version === 8 ||
          parsed.version === 9 ||
          parsed.version === 10)
      ) {
        return migrateSalesOrderStatuses(parsed.orders)
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
    JSON.stringify({ version: DATA_VERSION, orders: salesOrderState.orders }),
  )
}

function loadInitialSalesOrders() {
  ensureEcnDemoBootstrap()
  const orders = migrateSalesOrderStatuses(loadFromStorage() || buildMockSalesOrders(mockProducts))
  return ensureIndustrialLabelDemoSalesOrder(
    ensureScatterEbomShipDemoSalesOrders(
      ensureDedicatedShipDemoSalesOrders(hydrateApprovedSelfProdOrders(orders)),
    ),
  )
}

/** 确保工业标识演示单存在：待审单 + 已审带 SN 单 */
function ensureIndustrialLabelDemoSalesOrder(orders) {
  const list = Array.isArray(orders) ? [...orders] : []
  const p0 = mockProducts[0]
  const p1 = mockProducts[1]
  const p3 = mockProducts[3]
  if (!p0 || !p1) return list
  const now = dayjs()

  if (!list.some((o) => o.id === 'so-seed-industrial-label')) {
    list.unshift(
      createSalesOrder({
        id: 'so-seed-industrial-label',
        orderNo: '1-20260903-IL01',
        customerName: '山东化工泵业集团',
        region: '华北',
        salesperson: '王芳',
        progressStatus: '待审核',
        businessType: '自产销售',
        documentDate: now.format('YYYY-MM-DD'),
        createdAt: now.format('YYYY-MM-DD HH:mm'),
        creator: '王芳',
        remark: '工业标识演示：行已勾选，审核后按现货占用+排产缺口自动申请 SN',
        lineItems: [
          createLineItem({
            id: 'line-seed-il-a',
            productId: p0.id,
            productName: p0.name,
            productCode: p0.code,
            productAttr: p0.productAttribute,
            salesQty: 4,
            needIndustrialLabel: true,
            stockFulfillmentMode: 'prefer_stock',
            deliveryMode: '整机',
            unit: p0.inventoryUnit || '台',
            businessType: '自产销售',
          }),
          createLineItem({
            id: 'line-seed-il-b',
            productId: p1.id,
            productName: p1.name,
            productCode: p1.code,
            productAttr: p1.productAttribute,
            salesQty: 2,
            needIndustrialLabel: true,
            stockFulfillmentMode: 'force_mto',
            deliveryMode: '整机',
            unit: p1.inventoryUnit || '台',
            businessType: '自产销售',
          }),
          ...(p3
            ? [
                createLineItem({
                  id: 'line-seed-il-c',
                  productId: p3.id,
                  productName: p3.name,
                  productCode: p3.code,
                  productAttr: p3.productAttribute,
                  salesQty: 1,
                  needIndustrialLabel: false,
                  deliveryMode: '整机',
                  unit: p3.inventoryUnit || '台',
                  businessType: '自产销售',
                }),
              ]
            : []),
        ],
      }),
    )
  }

  if (!list.some((o) => o.id === 'so-seed-industrial-label-done')) {
    list.unshift(
      createSalesOrder({
        id: 'so-seed-industrial-label-done',
        orderNo: '1-20260903-IL02',
        customerName: '华东机械制造有限公司',
        region: '华东',
        salesperson: '王芳',
        progressStatus: '进行中',
        businessType: '自产销售',
        documentDate: now.subtract(2, 'day').format('YYYY-MM-DD'),
        createdAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
        creator: '王芳',
        approver: 'admin1',
        approvedAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
        remark: '工业标识演示：已审核并预申请 SN（含现货占用），可在「工业标识」Tab 查看',
        approvalRecords: [
          {
            name: 'admin1',
            role: '销售审核',
            result: '已通过',
            time: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
            opinion: '同意，按现货占用+排产缺口申请工业标识',
          },
        ],
        lineItems: [
          createLineItem({
            id: 'line-seed-il2-a',
            productId: p0.id,
            productName: p0.name,
            productCode: p0.code,
            productAttr: p0.productAttribute,
            salesQty: 5,
            planProduceQty: 3,
            stockTakeQty: 2,
            needIndustrialLabel: true,
            industrialLabelStatus: '成功',
            industrialLabelSuccessCount: 5,
            industrialLabelFailCount: 0,
            industrialLabelRequestNo: 'GYHLBS260903001',
            stockFulfillmentMode: 'prefer_stock',
            deliveryMode: '整机',
            unit: p0.inventoryUnit || '台',
            businessType: '自产销售',
          }),
          createLineItem({
            id: 'line-seed-il2-b',
            productId: p1.id,
            productName: p1.name,
            productCode: p1.code,
            productAttr: p1.productAttribute,
            salesQty: 2,
            planProduceQty: 2,
            stockTakeQty: 0,
            needIndustrialLabel: true,
            industrialLabelStatus: '成功',
            industrialLabelSuccessCount: 2,
            industrialLabelFailCount: 0,
            industrialLabelRequestNo: 'GYHLBS260903001',
            stockFulfillmentMode: 'force_mto',
            deliveryMode: '整机',
            unit: p1.inventoryUnit || '台',
            businessType: '自产销售',
          }),
        ],
      }),
    )
  } else {
    // 方案 A：已有演示单补齐现货占用口径
    const done = list.find((o) => o.id === 'so-seed-industrial-label-done')
    const lineA = done?.lineItems?.find((l) => l.id === 'line-seed-il2-a')
    if (lineA && (Number(lineA.stockTakeQty) || 0) <= 0) {
      lineA.salesQty = 5
      lineA.stockTakeQty = 2
      lineA.planProduceQty = 3
      lineA.industrialLabelSuccessCount = 5
      lineA.industrialLabelStatus = '成功'
      lineA.stockFulfillmentMode = 'prefer_stock'
      done.remark = '工业标识演示：已审核并预申请 SN（含现货占用），可在「工业标识」Tab 查看'
    }
  }

  return list
}

function touchOrder(order) {
  order.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  order.updater = order.updater || 'admin1'
}

function pushApprovalRecord(order, { result, opinion }) {
  if (!Array.isArray(order.approvalRecords)) order.approvalRecords = []
  order.approvalRecords.unshift({
    name: 'admin1',
    role: '销售审核',
    result,
    time: dayjs().format('YYYY-MM-DD HH:mm'),
    opinion: String(opinion || '').trim(),
  })
}

export function generateSalesOrderNo() {
  orderSeq += 1
  return `XSDD${dayjs().format('YYYYMM')}${String(orderSeq).padStart(4, '0')}`
}

export function generateDeliveryCode() {
  deliverySeq += 1
  return `SH${dayjs().format('YYYYMMDD')}${String(deliverySeq).padStart(3, '0')}`
}

export const salesOrderState = reactive({
  orders: loadInitialSalesOrders(),
})

watch(
  () => salesOrderState.orders,
  () => persist(),
  { deep: true },
)

export function addSalesOrder(order) {
  salesOrderState.orders.unshift(order)
}

export function updateSalesOrder(id, patch) {
  const idx = salesOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(salesOrderState.orders[idx], patch)
  recalcOrderAmounts(salesOrderState.orders[idx])
  return salesOrderState.orders[idx]
}

export function deleteSalesOrder(id) {
  const idx = salesOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  salesOrderState.orders.splice(idx, 1)
  return true
}

export function getSalesOrderById(id) {
  return salesOrderState.orders.find((o) => o.id === id) || null
}

export function findSalesOrderByOrderNo(orderNo) {
  if (!orderNo) return null
  return salesOrderState.orders.find((o) => o.orderNo === orderNo) || null
}

/** 记录一次发货申请 */
export function addDeliveryApplication(orderId, application) {
  const order = salesOrderState.orders.find((o) => o.id === orderId)
  if (!order) return null
  if (!Array.isArray(order.deliveryApplications)) {
    order.deliveryApplications = []
  }
  const row = {
    id: `da-${Date.now()}`,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    status: '已提交',
    ...application,
  }
  order.deliveryApplications.unshift(row)
  const issued = Number(application.totalShipQty) || 0
  if (issued > 0) {
    order.totalIssuedQty = (Number(order.totalIssuedQty) || 0) + issued
    if (order.deliveryStatus === '未发货') order.deliveryStatus = '部分发货'
  }
  queueMicrotask(() => {
    import('@/store/deliveryOrderStore').then(({ registerDeliveryFromApplication }) => {
      registerDeliveryFromApplication(orderId, row)
    })
  })
  return row
}

export function findDeliveryApplicationById(orderId, applicationId) {
  const order = salesOrderState.orders.find((o) => o.id === orderId)
  if (!order || !applicationId) return null
  return (order.deliveryApplications || []).find((a) => a.id === applicationId) || null
}

/** 更新销售订单上的发货申请（发货单回写数量/状态） */
export function updateDeliveryApplication(orderId, applicationId, patch = {}) {
  const order = salesOrderState.orders.find((o) => o.id === orderId)
  if (!order || !applicationId) return null
  if (!Array.isArray(order.deliveryApplications)) order.deliveryApplications = []
  const idx = order.deliveryApplications.findIndex((a) => a.id === applicationId)
  if (idx === -1) return null
  const prev = order.deliveryApplications[idx]
  const next = { ...prev, ...patch, id: applicationId }
  order.deliveryApplications[idx] = next
  touchOrder(order)
  return next
}

export function recalcOrderAmounts(order) {
  applyOrderAmounts(order, { taxModeExcluding: true })
}

export function canEditSalesOrder(order) {
  const status = normalizeSalesOrderProgressStatus(order?.progressStatus)
  return status === SALES_ORDER_STATUS.DRAFT || status === SALES_ORDER_STATUS.REJECTED
}

export function canSubmitSalesOrder(order) {
  return normalizeSalesOrderProgressStatus(order?.progressStatus) === SALES_ORDER_STATUS.DRAFT
}

export function canWithdrawSalesOrder(order) {
  return normalizeSalesOrderProgressStatus(order?.progressStatus) === SALES_ORDER_STATUS.PENDING
}

export function canResubmitSalesOrder(order) {
  return normalizeSalesOrderProgressStatus(order?.progressStatus) === SALES_ORDER_STATUS.REJECTED
}

export function canApproveSalesOrder(order) {
  return normalizeSalesOrderProgressStatus(order?.progressStatus) === SALES_ORDER_STATUS.PENDING
}

export function canRevokeSalesOrderApproval(order) {
  return normalizeSalesOrderProgressStatus(order?.progressStatus) === SALES_ORDER_STATUS.IN_PROGRESS
}

export function canChangeDeliveryMode(order) {
  if (normalizeSalesOrderProgressStatus(order?.progressStatus) !== SALES_ORDER_STATUS.IN_PROGRESS) {
    return false
  }
  return (order.lineItems || []).some((line) =>
    isSelfMadeBusinessType(resolveLineBusinessType(line, order)),
  )
}

/** 变更销售明细交付方式，并同步生产计划 */
export function changeSalesOrderDeliveryMode(orderId, rows) {
  const order = salesOrderState.orders.find((o) => o.id === orderId)
  if (!order) return { ok: false, message: '销售订单不存在' }
  if (!canChangeDeliveryMode(order)) {
    return { ok: false, message: '仅已审核的自产销售订单可变更交付方式' }
  }

  const check = validateChangeDeliveryRows(order, rows)
  if (!check.ok) return check

  const planOps = applyDeliveryModeChanges(order, rows)
  syncProductionPlanDeliveryMode(order.orderNo, planOps)
  recalcOrderAmounts(order)

  return { ok: true, message: '交付方式变更成功' }
}

/** 待提交 → 待审核 */
export function submitSalesOrderForApprove(id) {
  const order = salesOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '订单不存在' }
  if (!canSubmitSalesOrder(order)) {
    return { ok: false, message: '仅「待提交」状态可提交审核' }
  }
  if (!order.lineItems?.length) {
    return { ok: false, message: `订单「${order.orderNo}」请先添加销售明细后再提交` }
  }
  order.progressStatus = SALES_ORDER_STATUS.PENDING
  touchOrder(order)
  return { ok: true, message: `订单「${order.orderNo}」已提交审核` }
}

/** 待审核 → 待提交 */
export function withdrawSalesOrder(id) {
  const order = salesOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '订单不存在' }
  if (!canWithdrawSalesOrder(order)) {
    return { ok: false, message: '仅「待审核」状态可撤回' }
  }
  order.progressStatus = SALES_ORDER_STATUS.DRAFT
  touchOrder(order)
  return { ok: true, message: `订单「${order.orderNo}」已撤回` }
}

/** 已拒绝 → 待审核 */
export function resubmitSalesOrder(id) {
  const order = salesOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '订单不存在' }
  if (!canResubmitSalesOrder(order)) {
    return { ok: false, message: '仅「已拒绝」状态可重新提交' }
  }
  order.progressStatus = SALES_ORDER_STATUS.PENDING
  touchOrder(order)
  return { ok: true, message: `订单「${order.orderNo}」已重新提交审核` }
}

/**
 * 审核销售订单；外购销售审核通过时自动生成采购申请
 * @returns {{ ok: boolean, message: string, purchaseReqNo?: string }}
 */
export function approveSalesOrder(id, opinion = '') {
  const order = salesOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '订单不存在' }
  if (!canApproveSalesOrder(order)) {
    return { ok: false, message: `订单「${order.orderNo}」不可审核` }
  }
  if (!order.lineItems?.length) {
    return { ok: false, message: `订单「${order.orderNo}」请先添加销售明细后再审核` }
  }

  order.lineItems = (order.lineItems || []).map((line) => normalizeSalesLineBusiness(line, order))

  const skuGuard = validateSalesLinesSkuResolved(order.lineItems)
  if (!skuGuard.ok) {
    return { ok: false, message: `订单「${order.orderNo}」${skuGuard.message}` }
  }

  const selfMadeLines = order.lineItems.filter((line) =>
    isSelfMadeBusinessType(resolveLineBusinessType(line, order)),
  )
  const purchaseLines = order.lineItems.filter((line) =>
    isPurchasedBusinessType(resolveLineBusinessType(line, order)),
  )
  const outsourcingLines = order.lineItems.filter((line) =>
    isOutsourcingBusinessType(resolveLineBusinessType(line, order)),
  )
  const maintenanceLines = order.lineItems.filter((line) =>
    isMaintenanceServiceBusinessType(resolveLineBusinessType(line, order)),
  )

  let purchaseReqNo
  let planOrderNo
  let outsourceWorkOrderCodes = []
  let maintenanceWorkOrderCodes = []
  let designTaskCount = 0
  const stockHints = []

  if (selfMadeLines.length) {
    const standardLines = []
    const customLines = []
    const designTasksByLineId = new Map()

    for (const line of selfMadeLines) {
      const lineBusinessType = resolveLineBusinessType(line, order)
      if (!line.productId && !isCustomSalesBusinessType(lineBusinessType)) {
        return {
          ok: false,
          message: `订单「${order.orderNo}」明细「${line.productName || '未命名'}」未关联产品，请重新选择产品`,
        }
      }
      if (isCustomSalesBusinessType(lineBusinessType) && !line.productName?.trim()) {
        return {
          ok: false,
          message: `订单「${order.orderNo}」定制销售明细请填写产品名称`,
        }
      }

      line.bomFulfillmentPath = normalizeBomFulfillmentPath(line.bomFulfillmentPath)
      if (!line.bomFulfillmentPath) {
        const ownBom = line.productId ? getOwnActiveBomForItem('product', line.productId) : null
        if (isCustomSalesBusinessType(lineBusinessType) || !ownBom) {
          line.bomFulfillmentPath = BOM_FULFILLMENT_PATH.DESIGN_REQUIRED
        } else {
          line.bomFulfillmentPath = BOM_FULFILLMENT_PATH.USE_CATALOG_BOM
        }
      }

      const pathCheck = validateFulfillmentPathForApprove(line, order)
      if (!pathCheck.ok) {
        return { ok: false, message: `订单「${order.orderNo}」${pathCheck.message}` }
      }

      if (line.bomFulfillmentPath === BOM_FULFILLMENT_PATH.DESIGN_REQUIRED) {
        const product = line.productId
          ? productInfoState.products.find((p) => p.id === line.productId)
          : null
        if (
          isCustomSalesBusinessType(lineBusinessType) ||
          isCustomProductAttribute(product?.productAttribute)
        ) {
          line.productAttr = line.productAttr || '定制产品'
        }
        line.bomId = ''
        line.bomName = ''
        line.bomVersion = ''
        customLines.push(line)
        continue
      }
      standardLines.push(line)
    }

    for (const line of standardLines) {
      const bom = getOwnActiveBomForItem('product', line.productId)
      if (!bom) {
        return {
          ok: false,
          message: `产品「${line.productName}」无自有生效 BOM，请改选「需设计任务」或先为该 SKU 维护并启用产品 BOM`,
        }
      }
      line.bomId = bom.id
      line.bomName = bom.bomName
      line.bomVersion = bom.version
      line.deliveryMode = normalizeDeliveryMode(line, order)
      line.stockFulfillmentMode = normalizeStockFulfillmentMode(line.stockFulfillmentMode)
      const salesQty = Number(line.salesQty ?? line.qty) || 1
      line.ebomSnapshot = buildEbomSnapshotFromBom(bom, salesQty)
      if (!line.lineAccessoryKits?.length) {
        line.lineAccessoryKits = buildLineAccessoryKits(line)
      }
    }

    for (const line of customLines) {
      line.deliveryMode = normalizeDeliveryMode(line, order)
      line.stockFulfillmentMode = normalizeStockFulfillmentMode(line.stockFulfillmentMode)
      const task = createDesignTaskFromSalesLine(order, line)
      designTasksByLineId.set(line.id, task)
      designTaskCount += 1
    }

    const fulfillmentRows = buildLineStockFulfillmentPlan(standardLines, {
      forceFullPlanLineIds: new Set(),
      getAllocatedQty: (line) => getLineAllocatedQty(order.id, line.id),
    })
    const shortfalls = listStockOnlyShortfalls(fulfillmentRows)
    if (shortfalls.length) {
      const detail = shortfalls
        .map((r) => `「${r.productName || r.productCode}」缺 ${r.shortfall}`)
        .join('；')
      return {
        ok: false,
        message: `订单「${order.orderNo}」存在「仅现货」行但自由备货不足：${detail}。请改履约方式或补货后再审`,
      }
    }

    const fulfillByLineId = new Map(fulfillmentRows.map((r) => [r.lineId, r]))
    for (const line of standardLines) {
      const row = fulfillByLineId.get(line.id)
      line.stockTakeQty = row?.stockTake ?? 0
      line.planProduceQty = row?.planQty ?? 0
    }
    for (const line of customLines) {
      const need = Number(line.salesQty ?? line.qty) || 0
      line.stockTakeQty = 0
      line.planProduceQty = need
    }

    const planLines = [
      ...standardLines.filter((l) => (Number(l.planProduceQty) || 0) > 0),
      ...customLines,
    ]
    if (planLines.length) {
      if (!order.orderAccessoryKits?.length && standardLines.length) {
        order.orderAccessoryKits = buildOrderAccessoryKits(order)
      }
      const plan = createProductionPlanFromSalesOrder(
        { ...order, lineItems: planLines },
        {
          lineItemsOverride: planLines,
          designingLineIds: new Set(customLines.map((l) => l.id)),
          designTasksByLineId,
        },
      )
      planOrderNo = plan.orderNo
      const coveredOnly = standardLines.filter(
        (l) => (Number(l.planProduceQty) || 0) <= 0 && (Number(l.stockTakeQty) || 0) > 0,
      )
      if (coveredOnly.length) {
        stockHints.push(
          `${coveredOnly.length} 行已由自由备货覆盖，未生成生产计划行（${coveredOnly
            .map((l) => l.productName || l.productCode)
            .join('、')}）`,
        )
      }
    } else if (standardLines.length) {
      stockHints.push('自产明细均由自由备货覆盖，未生成生产计划')
    }
  }

  if (purchaseLines.length) {
    if (order.purchaseRequisitionNo) {
      return { ok: false, message: `订单「${order.orderNo}」已关联采购申请` }
    }
    const requisition = buildRequisitionFromSalesOrder({ ...order, lineItems: purchaseLines })
    addPurchaseRequisition(requisition)
    order.purchaseRequisitionNo = requisition.reqNo
    order.purchaseRequisitionId = requisition.id
    purchaseReqNo = requisition.reqNo
  }

  if (outsourcingLines.length) {
    for (const line of outsourcingLines) {
      if (!line.productName?.trim()) {
        return {
          ok: false,
          message: `订单「${order.orderNo}」外协明细请填写产品名称`,
        }
      }
    }
    const created = createOutsourcingWorkOrdersFromSalesOrder(order, outsourcingLines)
    outsourceWorkOrderCodes = created.map((wo) => wo.code)
  }

  if (maintenanceLines.length) {
    for (const line of maintenanceLines) {
      if (!line.productName?.trim()) {
        return {
          ok: false,
          message: `订单「${order.orderNo}」维修服务明细请填写产品名称`,
        }
      }
    }
    const created = createMaintenanceWorkOrdersFromSalesOrder(order, maintenanceLines)
    maintenanceWorkOrderCodes = created.map((wo) => wo.code)
  }

  order.businessType = deriveOrderBusinessType(order.lineItems, order.businessType)
  order.progressStatus = SALES_ORDER_STATUS.IN_PROGRESS
  order.approver = order.approver || 'admin1'
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')

  const allocatableLines = [...selfMadeLines, ...purchaseLines].filter((l) => l.productCode)
  const selfTake = {}
  for (const line of selfMadeLines) {
    if (line.productCode) selfTake[line.id] = Number(line.stockTakeQty) || 0
  }
  allocateStockOnSalesApprove(
    order,
    selfMadeLines.filter((l) => l.productCode),
    { takeByLineId: selfTake },
  )
  allocateStockOnSalesApprove(
    order,
    purchaseLines.filter((l) => l.productCode),
  )
  order.inventoryStatus = buildOrderInventoryStatus(order)

  for (const line of allocatableLines) {
    const remind = buildLineStockReminder(line, order)
    const modeLabel = stockFulfillmentModeLabel(line.stockFulfillmentMode)
    if (remind.otherQty > 0) {
      stockHints.push(`「${line.productName}」他单占用 ${remind.otherQty}`)
    }
    if ((Number(line.planProduceQty) || 0) <= 0 && (Number(line.stockTakeQty) || 0) > 0) {
      stockHints.push(
        `「${line.productName}」履约「${modeLabel}」：占用现货 ${line.stockTakeQty}，无需排产`,
      )
    } else if ((Number(line.planProduceQty) || 0) > 0 && (Number(line.stockTakeQty) || 0) > 0) {
      stockHints.push(
        `「${line.productName}」履约「${modeLabel}」：占用现货 ${line.stockTakeQty}，排产 ${line.planProduceQty}`,
      )
    } else if (remind.status !== '充足') {
      stockHints.push(
        `「${line.productName}」库存${remind.status}：现有 ${remind.onHand}，自由备货 ${remind.freeQty}，需求 ${remind.need}`,
      )
    }
  }

  touchOrder(order)
  pushApprovalRecord(order, { result: '已通过', opinion })

  let industrialLabelHint = ''
  try {
    const labelRes = createLabelRequestFromSalesOrder(order)
    applyLabelSummaryToSalesLines(order, labelRes.lineResults || [])
    if (labelRes.request?.orderNo) {
      ;(order.lineItems || []).forEach((line) => {
        if (line.needIndustrialLabel && salesLineIndustrialLabelNeedQty(line) > 0) {
          line.industrialLabelRequestNo = labelRes.request.orderNo
        }
      })
    }
    if (labelRes.request) {
      industrialLabelHint = labelRes.ok
        ? `工业标识申请 ${labelRes.request.orderNo}（成功 ${labelRes.request.successCount}）`
        : `工业标识申请未全部成功（可在详情重试/补申请）`
    }
  } catch (e) {
    industrialLabelHint = '工业标识申请异常，订单已审核通过，可在详情重试'
  }

  const hints = []
  if (purchaseReqNo) hints.push(`已自动生成采购申请 ${purchaseReqNo}`)
  if (planOrderNo) {
    let planHint = `已自动生成生产计划 ${planOrderNo}`
    if (designTaskCount > 0) {
      planHint += `，已生成 ${designTaskCount} 条设计任务（明细状态：设计中）`
    }
    hints.push(planHint)
  }
  if (stockHints.length) hints.push(...stockHints)
  if (outsourceWorkOrderCodes.length) {
    hints.push(`外协工单 ${outsourceWorkOrderCodes.join('、')}`)
  }
  if (maintenanceWorkOrderCodes.length) {
    hints.push(`维修工单 ${maintenanceWorkOrderCodes.join('、')}`)
  }
  if (industrialLabelHint) hints.push(industrialLabelHint)

  const message = hints.length
    ? `订单「${order.orderNo}」审核通过，${hints.join('；')}`
    : `订单「${order.orderNo}」审核通过`

  return {
    ok: true,
    message,
    purchaseReqNo,
    planOrderNo,
    designTaskCount,
    stockHints,
    outsourceWorkOrderCodes,
    maintenanceWorkOrderCodes,
  }
}

/** 审核拒绝 → 已拒绝 */
export function rejectSalesOrder(id, opinion = '') {
  const order = salesOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '订单不存在' }
  if (!canApproveSalesOrder(order)) {
    return { ok: false, message: `订单「${order.orderNo}」不可审核` }
  }
  order.progressStatus = SALES_ORDER_STATUS.REJECTED
  order.approver = 'admin1'
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  touchOrder(order)
  pushApprovalRecord(order, { result: '已驳回', opinion })
  return { ok: true, message: `订单「${order.orderNo}」已拒绝` }
}

/**
 * 反审销售订单；未下达工单/采购申请/外协订单才可反审
 * @returns {{ ok: boolean, message: string, blocked?: boolean }}
 */
export function revokeSalesOrderApproval(id) {
  const order = salesOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '订单不存在' }
  if (!canRevokeSalesOrderApproval(order)) {
    return { ok: false, message: `订单「${order.orderNo}」当前状态不可反审` }
  }

  if (hasSalesOrderRevokeBlockers(order)) {
    return {
      ok: false,
      blocked: true,
      message: SALES_ORDER_REVOKE_BLOCKED_MESSAGE,
    }
  }

  if (salesOrderHasBoundLabels(order.orderNo)) {
    return {
      ok: false,
      blocked: true,
      message: '存在已装牌或已出库的工业标识，禁止反审',
    }
  }

  const voidRes = voidLabelsBySalesOrder(order.orderNo)
  if (!voidRes.ok) {
    return {
      ok: false,
      blocked: Boolean(voidRes.blocked),
      message: voidRes.message || '工业标识作废失败，无法反审',
    }
  }

  ;(order.lineItems || []).forEach((line) => {
    line.industrialLabelStatus = '—'
    line.industrialLabelSuccessCount = 0
    line.industrialLabelFailCount = 0
    line.industrialLabelRequestNo = ''
  })

  order.progressStatus = SALES_ORDER_STATUS.PENDING
  order.approver = ''
  order.approvedAt = ''
  releaseOrderAllocations(order.id)
  order.inventoryStatus = buildOrderInventoryStatus(order)
  touchOrder(order)
  pushApprovalRecord(order, { result: '已反审', opinion: '' })

  const voidHint = voidRes.voidedCount ? `，已作废工业标识 ${voidRes.voidedCount} 个` : ''
  return {
    ok: true,
    message: `订单「${order.orderNo}」已反审，状态已变更为待审核${voidHint}`,
  }
}

export { isSalesOrderApproved, SALES_ORDER_STATUS }
