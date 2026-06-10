import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  clonePurchaseOrders,
  recalcPurchaseOrderTotals,
  createPoLineItem,
} from '@/mock/purchaseOrders'
import { round2 } from '@/utils/purchaseMerge'

const STORAGE_KEY = 'i_doms_purchase_orders'
let poSeq = 3

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: purchaseOrderState.orders }))
}

export function generatePurchaseOrderNo() {
  poSeq += 1
  return `CG${dayjs().format('YYYYMMDD')}${String(poSeq).padStart(3, '0')}`
}

export const purchaseOrderState = reactive({
  orders: loadFromStorage() || clonePurchaseOrders(),
})

watch(
  () => purchaseOrderState.orders,
  () => persist(),
  { deep: true },
)

export function addPurchaseOrder(order) {
  recalcPurchaseOrderTotals(order)
  purchaseOrderState.orders.unshift(order)
  return order
}

export function updatePurchaseOrder(id, patch) {
  const idx = purchaseOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(purchaseOrderState.orders[idx], patch)
  recalcPurchaseOrderTotals(purchaseOrderState.orders[idx])
  return purchaseOrderState.orders[idx]
}

export function deletePurchaseOrder(id) {
  const idx = purchaseOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  purchaseOrderState.orders.splice(idx, 1)
  return true
}

export function getPurchaseOrdersByIds(ids) {
  return purchaseOrderState.orders.filter((o) => ids.includes(o.id))
}

export function canEditPurchaseOrder(order) {
  return order?.status === '待审批'
}

export function canApprovePurchaseOrder(order) {
  return order?.status === '待审批'
}

export function canGenerateReceipt(order) {
  return order?.status === '进行中' && order?.inboundStatus !== '已入库'
}

export function canGenerateInbound(order) {
  return canGenerateReceipt(order)
}

export function canCompletePurchaseOrder(order) {
  return order?.status === '进行中'
}

/** 审批采购单 */
export function approvePurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (order.status !== '待审批') {
    return { ok: false, message: `采购单「${order.orderNo}」不可审批` }
  }
  order.status = '进行中'
  order.approvalResult = '审批通过'
  order.approverName = 'admin1'
  return { ok: true, message: `采购单「${order.orderNo}」审批通过` }
}

/** 完成采购单 */
export function completePurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (order.status !== '进行中') {
    return { ok: false, message: `采购单「${order.orderNo}」不可完成` }
  }
  order.status = '已完成'
  return { ok: true, message: `采购单「${order.orderNo}」已完成` }
}

/** 从采购申请合并行按供应商创建采购单 */
export function createPurchaseOrdersFromMergedLines(mergedLines) {
  const supplierGroups = new Map()
  mergedLines.forEach((line) => {
    const supplier = line.supplierName || '未指定供应商'
    if (!supplierGroups.has(supplier)) supplierGroups.set(supplier, [])
    supplierGroups.get(supplier).push(line)
  })

  const created = []
  supplierGroups.forEach((lines, supplier) => {
    const first = lines[0]
    const reqNos = [...new Set(lines.flatMap((l) => l.sourceReqNos || []))]
    const salesNos = [...new Set(lines.flatMap((l) => l.sourceSalesOrderNos || []))]
    const deliveryDates = lines
      .map((l) => l.deliveryDate)
      .filter(Boolean)
      .sort()

    const lineItems = lines.map((line) =>
      createPoLineItem({
        itemCode: line.materialCode,
        itemName: line.materialName,
        itemType: line.materialType || '物料',
        specModel: line.specModel,
        material: line.material,
        purchaseQty: line.planPurchaseQty,
        unit: line.unit || '个',
        unitPriceExTax: line.unitPriceExTax,
        taxRate: line.taxRate,
        unitPriceInTax: line.unitPriceInTax,
        totalPriceExTax: line.totalPriceExTax,
        totalPriceInTax: line.totalPriceInTax,
        receivingMode: line.receivingMode || '正常收货',
        receivingWarehouse: line.receivingWarehouse || '',
      }),
    )

    const orderSource = salesNos.length ? '外购销售' : '采购申请'
    const order = {
      id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderNo: generatePurchaseOrderNo(),
      supplier,
      reqNo: reqNos.join(','),
      salesOrderNo: salesNos.join(','),
      settlementType: first.settlementType || '先款后货',
      deliveryDate: deliveryDates[0] || dayjs().format('YYYY-MM-DD'),
      leadTimeDays: first.leadTimeDays ?? 12,
      deliveryMethod: '定时交货',
      remark: first.remark || '',
      orderSource,
      applyType: '日常采购申请',
      status: '待审批',
      approvalResult: '待审批',
      inboundStatus: '未入库',
      documentDate: dayjs().format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      lineItems,
    }
    addPurchaseOrder(order)
    created.push(order)
  })

  return created
}

/** 提交收货单 */
export function submitReceipt(orderId, receiptLines) {
  const order = purchaseOrderState.orders.find((o) => o.id === orderId)
  if (!order) return { ok: false, message: '采购单不存在' }

  receiptLines.forEach((rl) => {
    const line = order.lineItems.find((l) => l.id === rl.id)
    if (!line) return
    line.receivedQty = (Number(line.receivedQty) || 0) + (Number(rl.receiptQty) || 0)
    line.receivingWarehouse = rl.receivingWarehouse || line.receivingWarehouse
    line.receivingMode = rl.receivingMode || line.receivingMode
    line.productionDate = rl.productionDate || ''
    line.expiryDate = rl.expiryDate || ''
    line.remark = rl.remark || line.remark
  })

  const totalPurchase = order.lineItems.reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0)
  const totalReceived = order.lineItems.reduce((s, l) => s + (Number(l.receivedQty) || 0), 0)

  if (totalReceived >= totalPurchase) {
    order.inboundStatus = '已入库'
  } else if (totalReceived > 0) {
    order.inboundStatus = '部分入库'
  }

  order.shippingDate = dayjs().format('YYYY-MM-DD')
  return { ok: true, message: `采购单「${order.orderNo}」收货成功` }
}

export function recalcPoLine(line) {
  const qty = Number(line.purchaseQty) || 0
  const ex = Number(line.unitPriceExTax) || 0
  const rate = Number(line.taxRate) || 0
  line.unitPriceInTax = round2(ex * (1 + rate / 100))
  line.totalPriceExTax = round2(qty * ex)
  line.totalPriceInTax = round2(qty * line.unitPriceInTax)
  return line
}
