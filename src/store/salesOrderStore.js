import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildMockSalesOrders } from '@/mock/salesOrderSeed'
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
import { ensureEcnDemoBootstrap } from '@/mock/ecnDemoBootstrap'
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
import { isCustomProductAttribute } from '@/constants/designTask'
import { productInfoState } from '@/store/productInfoStore'
import { validateSalesLinesSkuResolved } from '@/utils/spuLineResolve'
import {
  hasSalesOrderRevokeBlockers,
  SALES_ORDER_REVOKE_BLOCKED_MESSAGE,
} from '@/utils/salesOrderRevokeApproval'
import {
  isSalesOrderApproved,
  normalizeSalesOrderProgressStatus,
  SALES_ORDER_STATUS,
} from '@/utils/salesOrderStatus'

const STORAGE_KEY = 'i_doms_sales_orders'
const DATA_VERSION = 9
let orderSeq = 20
let deliverySeq = 113

function migrateSalesOrderStatuses(orders) {
  return (orders || []).map((order) => {
    const progressStatus = normalizeSalesOrderProgressStatus(order.progressStatus)
    return {
      ...order,
      progressStatus,
      approvalRecords: Array.isArray(order.approvalRecords) ? order.approvalRecords : [],
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
        (parsed.version === DATA_VERSION || parsed.version === 8)
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
  return hydrateApprovedSelfProdOrders(orders)
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
      const salesQty = Number(line.salesQty ?? line.qty) || 1
      line.ebomSnapshot = buildEbomSnapshotFromBom(bom, salesQty)
      if (!line.lineAccessoryKits?.length) {
        line.lineAccessoryKits = buildLineAccessoryKits(line)
      }
    }

    for (const line of customLines) {
      line.deliveryMode = normalizeDeliveryMode(line, order)
      const task = createDesignTaskFromSalesLine(order, line)
      designTasksByLineId.set(line.id, task)
      designTaskCount += 1
    }

    const planLines = [...standardLines, ...customLines]
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
  touchOrder(order)
  pushApprovalRecord(order, { result: '已通过', opinion })

  const hints = []
  if (purchaseReqNo) hints.push(`已自动生成采购申请 ${purchaseReqNo}`)
  if (planOrderNo) {
    let planHint = `已自动生成生产计划 ${planOrderNo}`
    if (designTaskCount > 0) {
      planHint += `，已生成 ${designTaskCount} 条设计任务（明细状态：设计中）`
    }
    hints.push(planHint)
  }
  if (outsourceWorkOrderCodes.length) {
    hints.push(`外协工单 ${outsourceWorkOrderCodes.join('、')}`)
  }
  if (maintenanceWorkOrderCodes.length) {
    hints.push(`维修工单 ${maintenanceWorkOrderCodes.join('、')}`)
  }

  const message = hints.length
    ? `订单「${order.orderNo}」审核通过，${hints.join('，')}`
    : `订单「${order.orderNo}」审核通过`

  return {
    ok: true,
    message,
    purchaseReqNo,
    planOrderNo,
    designTaskCount,
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

  order.progressStatus = SALES_ORDER_STATUS.PENDING
  order.approver = ''
  order.approvedAt = ''
  touchOrder(order)
  pushApprovalRecord(order, { result: '已反审', opinion: '' })

  return { ok: true, message: `订单「${order.orderNo}」已反审，状态已变更为待审核` }
}

export { isSalesOrderApproved, SALES_ORDER_STATUS }
