import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildMockSalesOrders } from '@/mock/salesOrderSeed'
import {
  addPurchaseRequisition,
  buildRequisitionFromSalesOrder,
} from '@/store/purchaseRequisitionStore'
import { getActiveBomForItem } from '@/store/productBomStore'
import { createProductionPlanFromSalesOrder } from '@/store/productionPlanStore'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { buildLineAccessoryKits, buildOrderAccessoryKits } from '@/mock/accessoryPacks'
import { normalizeDeliveryMode } from '@/utils/salesDeliveryMode'
import { ensureEcnDemoBootstrap } from '@/mock/ecnDemoBootstrap'
import { hydrateApprovedSelfProdOrders } from '@/utils/hydrateSalesLines'
import { validateChangeDeliveryRows, applyDeliveryModeChanges } from '@/utils/changeDeliveryMode'
import { syncProductionPlanDeliveryMode } from '@/store/productionPlanStore'
import {
  deriveOrderBusinessType,
  isOutsourcingBusinessType,
  isPurchasedBusinessType,
  isCustomSalesBusinessType,
  isSelfMadeBusinessType,
  normalizeSalesLineBusiness,
  resolveLineBusinessType,
} from '@/utils/salesOrderBusiness'
import { createOutsourcingWorkOrdersFromSalesOrder } from '@/utils/salesOrderOutsourceWorkOrder'
import { createDesignTaskFromSalesLine } from '@/store/designTaskStore'
import { isCustomProductAttribute } from '@/constants/designTask'
import { productInfoState } from '@/store/productInfoStore'

const STORAGE_KEY = 'i_doms_sales_orders'
const DATA_VERSION = 7
let orderSeq = 20
let deliverySeq = 113

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.orders)) {
        return parsed.orders
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
  const orders = loadFromStorage() || buildMockSalesOrders(mockProducts)
  return hydrateApprovedSelfProdOrders(orders)
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
  const lineItems = order.lineItems || []
  order.totalQty = lineItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)
  order.amountExTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0)
  order.amountInTax = lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0)
  order.orderAmount = order.amountInTax
}

export function canEditSalesOrder(order) {
  return order?.progressStatus === '未审'
}

export function canChangeDeliveryMode(order) {
  if (order?.progressStatus !== '已审') return false
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

/**
 * 审核销售订单；外购销售审核通过时自动生成采购申请
 * @returns {{ ok: boolean, message: string, purchaseReqNo?: string }}
 */
export function approveSalesOrder(id) {
  const order = salesOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '订单不存在' }
  if (order.progressStatus !== '未审') {
    return { ok: false, message: `订单「${order.orderNo}」已审核，不可重复操作` }
  }
  if (!order.lineItems?.length) {
    return { ok: false, message: `订单「${order.orderNo}」请先添加销售明细后再审核` }
  }

  order.lineItems = (order.lineItems || []).map((line) => normalizeSalesLineBusiness(line, order))

  const selfMadeLines = order.lineItems.filter((line) =>
    isSelfMadeBusinessType(resolveLineBusinessType(line, order)),
  )
  const purchaseLines = order.lineItems.filter((line) =>
    isPurchasedBusinessType(resolveLineBusinessType(line, order)),
  )
  const outsourcingLines = order.lineItems.filter((line) =>
    isOutsourcingBusinessType(resolveLineBusinessType(line, order)),
  )

  let purchaseReqNo
  let planOrderNo
  let outsourceWorkOrderCodes = []
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
      const product = line.productId
        ? productInfoState.products.find((p) => p.id === line.productId)
        : null
      const productAttr = line.productAttr || product?.productAttribute || ''
      if (isCustomSalesBusinessType(lineBusinessType) || isCustomProductAttribute(productAttr)) {
        line.productAttr = '定制产品'
        line.bomId = ''
        line.bomName = ''
        line.bomVersion = ''
        customLines.push(line)
        continue
      }
      standardLines.push(line)
    }

    for (const line of standardLines) {
      const bom = getActiveBomForItem('product', line.productId)
      if (!bom) {
        return {
          ok: false,
          message: `产品「${line.productName}」无使用中的 BOM，请先在产品 BOM 中维护并启用`,
        }
      }
      if (!line.bomId) {
        line.bomId = bom.id
        line.bomName = bom.bomName
        line.bomVersion = bom.version
      }
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

  order.businessType = deriveOrderBusinessType(order.lineItems, order.businessType)
  order.progressStatus = '已审'
  order.approver = order.approver || 'admin1'
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')

  if (purchaseReqNo) {
    return {
      ok: true,
      message: `订单「${order.orderNo}」审核通过，已自动生成采购申请 ${purchaseReqNo}`,
      purchaseReqNo,
    }
  }
  if (planOrderNo && outsourceWorkOrderCodes.length) {
    return {
      ok: true,
      message: `订单「${order.orderNo}」审核通过，已生成生产计划 ${planOrderNo}，外协工单 ${outsourceWorkOrderCodes.join('、')}`,
      planOrderNo,
      outsourceWorkOrderCodes,
    }
  }
  if (planOrderNo) {
    const designHint =
      designTaskCount > 0 ? `，已生成 ${designTaskCount} 条设计任务（明细状态：设计中）` : ''
    return {
      ok: true,
      message: `订单「${order.orderNo}」审核通过，已自动生成生产计划任务${designHint}`,
      planOrderNo,
      designTaskCount,
    }
  }
  if (outsourceWorkOrderCodes.length) {
    return {
      ok: true,
      message: `订单「${order.orderNo}」审核通过，已自动生成外协工单 ${outsourceWorkOrderCodes.join('、')}`,
      outsourceWorkOrderCodes,
    }
  }
  return { ok: true, message: `订单「${order.orderNo}」审核通过` }
}
