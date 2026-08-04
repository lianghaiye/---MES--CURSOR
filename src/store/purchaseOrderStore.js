import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  clonePurchaseOrders,
  recalcPurchaseOrderTotals,
  createPoLineItem,
} from '@/mock/purchaseOrders'
import { ensureCrossDemoPurchaseOrders } from '@/mock/crossModuleDemoSeed'
import { round2 } from '@/utils/purchaseMerge'

const STORAGE_KEY = 'i_doms_purchase_orders'
const SEED_VERSION_KEY = 'i_doms_purchase_orders_seed_v'
/** v3：状态待审核/已拒绝/已作废；入库待入库；采购类型；丰富 mock */
const CURRENT_SEED_VERSION = '3'
let poSeq = 20

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

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: purchaseOrderState.orders }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function initPurchaseOrders() {
  const base = shouldReseed() ? clonePurchaseOrders() : loadFromStorage() || clonePurchaseOrders()
  return ensureCrossDemoPurchaseOrders(base)
}

export function generatePurchaseOrderNo() {
  poSeq += 1
  return `CG${dayjs().format('YYYYMMDD')}${String(poSeq).padStart(3, '0')}`
}

export const purchaseOrderState = reactive({
  orders: initPurchaseOrders(),
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

export function getPurchaseOrderById(id) {
  return purchaseOrderState.orders.find((o) => o.id === id) || null
}

/** 查询由采购申请单生成的采购订单 */
export function getPurchaseOrdersByRequisition(requisition) {
  if (!requisition) return []
  const reqNo = (requisition.reqNo || '').trim()
  if (!reqNo) return []
  const linkedPoNos = (requisition.purchaseOrderNo || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return purchaseOrderState.orders.filter((order) => {
    if (linkedPoNos.includes(order.orderNo)) return true
    const reqNos = (order.reqNo || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return reqNos.includes(reqNo)
  })
}

export function canEditPurchaseOrder(order) {
  return order?.status === '待审核' || order?.status === '已拒绝'
}

export function canApprovePurchaseOrder(order) {
  return order?.status === '待审核' || order?.status === '已拒绝'
}

export function canVoidPurchaseOrder(order) {
  return order?.status === '待审核' || order?.status === '已拒绝'
}

export function canReverseApprovePurchaseOrder(order) {
  return order?.status === '进行中' && (order?.inboundStatus || '待入库') === '待入库'
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

function pushApprovalRecord(order, { result, opinion }) {
  if (!Array.isArray(order.approvalRecords)) order.approvalRecords = []
  order.approvalRecords.unshift({
    name: 'admin1',
    role: '采购审核',
    result,
    time: dayjs().format('YYYY-MM-DD HH:mm'),
    opinion: String(opinion || '').trim(),
  })
}

/** 审核通过 → 进行中 */
export function approvePurchaseOrder(id, opinion = '') {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canApprovePurchaseOrder(order)) {
    return { ok: false, message: `采购单「${order.orderNo}」不可审核` }
  }
  order.status = '进行中'
  order.approvalResult = '审核通过'
  order.approverName = 'admin1'
  pushApprovalRecord(order, { result: '已通过', opinion })
  return { ok: true, message: `采购单「${order.orderNo}」审核通过` }
}

/** 审核拒绝 → 已拒绝 */
export function rejectPurchaseOrder(id, opinion = '') {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canApprovePurchaseOrder(order)) {
    return { ok: false, message: `采购单「${order.orderNo}」不可审核` }
  }
  order.status = '已拒绝'
  order.approvalResult = '已拒绝'
  order.approverName = 'admin1'
  pushApprovalRecord(order, { result: '已驳回', opinion })
  return { ok: true, message: `采购单「${order.orderNo}」已拒绝` }
}

/** 反审：进行中且待入库 → 待审核 */
export function reverseApprovePurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canReverseApprovePurchaseOrder(order)) {
    return { ok: false, message: '仅「进行中」且入库状态为「待入库」的采购单可反审' }
  }
  order.status = '待审核'
  order.approvalResult = '待审核'
  order.approverName = ''
  return { ok: true, message: `采购单「${order.orderNo}」已反审，状态回退为待审核` }
}

/** 作废 */
export function voidPurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canVoidPurchaseOrder(order)) {
    return { ok: false, message: '仅「待审核 / 已拒绝」状态可作废' }
  }
  order.status = '已作废'
  order.approvalResult = order.approvalResult || '待审核'
  return { ok: true, message: `采购单「${order.orderNo}」已作废` }
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
        unit: line.unit || line.purchaseUnit || '个',
        purchaseUnit: line.purchaseUnit || line.unit || '个',
        inventoryUnit: line.inventoryUnit || '',
        blankSizeText: line.blankSizeText || '',
        blankSize: line.blankSize || null,
        blankSizeMode: line.blankSizeMode || '',
        orderSizeText: line.orderSizeText || line.blankSizeText || '',
        orderSize: line.orderSize ?? line.blankSize ?? null,
        orderSizeMode: line.orderSizeMode || line.blankSizeMode || '',
        unitPriceExTax: line.unitPriceExTax,
        taxRate: line.taxRate,
        unitPriceInTax: line.unitPriceInTax,
        totalPriceExTax: line.totalPriceExTax,
        totalPriceInTax: line.totalPriceInTax,
        receivingMode: line.receivingMode || '正常收货',
        receivingWarehouse: line.receivingWarehouse || '',
        deliveryDate: line.deliveryDate || '',
        sourceReqNos: line.sourceReqNos || [],
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
      applyType: '日常采购',
      status: '待审核',
      approvalResult: '待审核',
      inboundStatus: '待入库',
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

function mergeCsvField(a, b) {
  return [
    ...new Set(
      `${a || ''},${b || ''}`
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].join(',')
}

function lineMaterialCode(line) {
  return (line.productCode || line.itemCode || '').trim()
}

/** 并入目标单：同物料编码合并数量，否则追加 */
function mergeOrPushPoLines(target, lines) {
  if (!Array.isArray(target.lineItems)) target.lineItems = []
  lines.forEach((src) => {
    const code = lineMaterialCode(src)
    const existing =
      code &&
      target.lineItems.find(
        (l) => lineMaterialCode(l) === code && (l.unit || '') === (src.unit || ''),
      )
    if (existing) {
      existing.purchaseQty = round2(
        (Number(existing.purchaseQty) || 0) + (Number(src.purchaseQty) || 0),
      )
      const mergedReqNos = [
        ...new Set(
          [
            ...(existing.sourceReqNos || []),
            ...String(existing.sourceReqNo || '')
              .split(',')
              .map((s) => s.trim()),
            ...(src.sourceReqNos || []),
            ...String(src.sourceReqNo || '')
              .split(',')
              .map((s) => s.trim()),
          ].filter(Boolean),
        ),
      ]
      existing.sourceReqNos = mergedReqNos
      existing.sourceReqNo = mergedReqNos.join(',')
      recalcPoLine(existing)
      return
    }
    const cloned = JSON.parse(JSON.stringify(src))
    cloned.id = `po-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    target.lineItems.push(cloned)
  })
}

/**
 * 将采购单部分明细更换供应商：从原单拆出，并入同供应商待审核单或新建单据。
 * 若勾选全部明细且无目标单，则仅改原单头供应商。
 * @returns {{ ok: boolean, message?: string, sourceDeleted?: boolean, source?: object, target?: object, movedCount?: number, created?: boolean, action?: string }}
 */
export function reassignPoLinesToSupplier(orderId, lineIds, newSupplier) {
  const order = getPurchaseOrderById(orderId)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canEditPurchaseOrder(order)) {
    return { ok: false, message: '仅「待审核 / 已拒绝」状态可更换供应商' }
  }

  const supplier = String(newSupplier || '').trim()
  if (!supplier) return { ok: false, message: '请选择新供应商' }
  if (supplier === String(order.supplier || '').trim()) {
    return { ok: false, message: '新供应商与当前供应商相同' }
  }

  const idSet = new Set(lineIds || [])
  const moving = (order.lineItems || []).filter((l) => idSet.has(l.id))
  if (!moving.length) return { ok: false, message: '请先勾选要更换供应商的明细' }

  const remaining = (order.lineItems || []).filter((l) => !idSet.has(l.id))
  const allMoved = remaining.length === 0

  let target = purchaseOrderState.orders.find(
    (o) =>
      o.id !== orderId &&
      String(o.supplier || '').trim() === supplier &&
      (o.status === '待审核' || o.status === '已拒绝'),
  )
  let created = false

  if (allMoved && !target) {
    order.supplier = supplier
    return {
      ok: true,
      action: 'rename',
      sourceDeleted: false,
      source: order,
      target: order,
      movedCount: moving.length,
      created: false,
      message: `已将采购单「${order.orderNo}」供应商更换为「${supplier}」`,
    }
  }

  if (!target) {
    target = {
      id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderNo: generatePurchaseOrderNo(),
      supplier,
      reqNo: order.reqNo || '',
      salesOrderNo: order.salesOrderNo || '',
      workOrderNo: order.workOrderNo || '',
      settlementType: order.settlementType || '先款后货',
      settlementCycle: order.settlementCycle || '月结',
      settlementMethod: order.settlementMethod || '现金结算',
      deliveryDate: order.deliveryDate || dayjs().format('YYYY-MM-DD'),
      reminderDate: order.reminderDate || '',
      leadTimeDays: order.leadTimeDays ?? 12,
      deliveryMethod: order.deliveryMethod || '定时交货',
      remark: order.remark || '',
      orderSource: order.orderSource || '采购申请',
      applyType: order.applyType || '日常采购',
      status: '待审核',
      approvalResult: '待审核',
      inboundStatus: '待入库',
      documentDate: dayjs().format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      purchaser: order.purchaser || 'admin1',
      contactPerson: order.contactPerson || '',
      contactPhone: order.contactPhone || '',
      contractNo: order.contractNo || '',
      shippingAddress: order.shippingAddress || '',
      receivingWarehouse: order.receivingWarehouse || '',
      logisticsNo: order.logisticsNo || '',
      lineItems: [],
    }
    addPurchaseOrder(target)
    created = true
  } else {
    target.reqNo = mergeCsvField(target.reqNo, order.reqNo)
    target.salesOrderNo = mergeCsvField(target.salesOrderNo, order.salesOrderNo)
  }

  mergeOrPushPoLines(target, moving)
  recalcPurchaseOrderTotals(target)

  if (allMoved) {
    deletePurchaseOrder(orderId)
    return {
      ok: true,
      action: 'merged-all',
      sourceDeleted: true,
      target,
      movedCount: moving.length,
      created,
      message: created
        ? `已拆出全部 ${moving.length} 行，生成采购单「${target.orderNo}」（供应商：${supplier}）`
        : `已将全部 ${moving.length} 行并入采购单「${target.orderNo}」（供应商：${supplier}）`,
    }
  }

  order.lineItems = remaining
  recalcPurchaseOrderTotals(order)
  return {
    ok: true,
    action: 'split',
    sourceDeleted: false,
    source: order,
    target,
    movedCount: moving.length,
    created,
    message: created
      ? `已拆出 ${moving.length} 行，生成采购单「${target.orderNo}」（供应商：${supplier}）`
      : `已拆出 ${moving.length} 行，并入采购单「${target.orderNo}」（供应商：${supplier}）`,
  }
}
