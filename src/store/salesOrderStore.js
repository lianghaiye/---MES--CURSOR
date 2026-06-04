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
import { hydrateApprovedSelfProdOrders } from '@/utils/hydrateSalesLines'

const STORAGE_KEY = 'i_doms_sales_orders'
const DATA_VERSION = 3
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

  let purchaseReqNo
  let planOrderNo

  if (order.businessType === '自产销售') {
    for (const line of order.lineItems) {
      if (!line.productId) {
        return {
          ok: false,
          message: `订单「${order.orderNo}」明细「${line.productName || '未命名'}」未关联产品，请重新选择产品`,
        }
      }
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
    if (!order.orderAccessoryKits?.length) {
      order.orderAccessoryKits = buildOrderAccessoryKits(order)
    }
    const plan = createProductionPlanFromSalesOrder(order)
    planOrderNo = plan.orderNo
  }

  if (order.businessType === '外购销售') {
    if (order.purchaseRequisitionNo) {
      return { ok: false, message: `订单「${order.orderNo}」已关联采购申请` }
    }
    const requisition = buildRequisitionFromSalesOrder(order)
    addPurchaseRequisition(requisition)
    order.purchaseRequisitionNo = requisition.reqNo
    order.purchaseRequisitionId = requisition.id
    purchaseReqNo = requisition.reqNo
  }

  order.progressStatus = '已审'

  if (purchaseReqNo) {
    return {
      ok: true,
      message: `订单「${order.orderNo}」审核通过，已自动生成采购申请 ${purchaseReqNo}`,
      purchaseReqNo,
    }
  }
  if (planOrderNo) {
    return {
      ok: true,
      message: `订单「${order.orderNo}」审核通过，已自动生成生产计划任务（待下达）`,
      planOrderNo,
    }
  }
  return { ok: true, message: `订单「${order.orderNo}」审核通过` }
}
