import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  clonePurchaseRequisitions,
  recalcRequisitionTotals,
  createLineItem,
} from '@/mock/purchaseRequisitions'
import { round2 } from '@/utils/purchaseMerge'
import { createPurchaseOrdersFromMergedLines } from '@/store/purchaseOrderStore'

function mapSalesUrgency(urgency) {
  if (urgency === '紧急') return '紧急'
  if (urgency === '加急') return '特急'
  return '正常'
}

function resolveEarliestDeliveryDate(lineItems, fallback) {
  const dates = (lineItems || [])
    .map((l) => l.deliveryDate)
    .filter(Boolean)
    .sort()
  return dates[0] || fallback || dayjs().format('YYYY-MM-DD')
}

const STORAGE_KEY = 'i_doms_purchase_requisitions'
let reqSeq = 5

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.requisitions)) return parsed.requisitions
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ requisitions: purchaseRequisitionState.requisitions }),
  )
}

export function generateReqNo() {
  reqSeq += 1
  return `CGSQ-${dayjs().format('YYYYMMDD')}-${String(reqSeq).padStart(4, '0')}`
}

/** 生产计划生成：CGSQ + 6位年月 + 流水 */
export function generatePlanReqNo() {
  const prefix = `CGSQ${dayjs().format('YYYYMM')}`
  const seqs = purchaseRequisitionState.requisitions
    .map((r) => r.reqNo)
    .filter((no) => no?.startsWith(prefix))
    .map((no) => parseInt(no.slice(prefix.length), 10) || 0)
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

export function isReqNoTaken(reqNo, excludeId) {
  const normalized = (reqNo || '').trim()
  if (!normalized) return false
  return purchaseRequisitionState.requisitions.some(
    (r) => r.reqNo === normalized && r.id !== excludeId,
  )
}

export { generatePurchaseOrderNo } from '@/store/purchaseOrderStore'

export const purchaseRequisitionState = reactive({
  requisitions: loadFromStorage() || clonePurchaseRequisitions(),
})

watch(
  () => purchaseRequisitionState.requisitions,
  () => persist(),
  { deep: true },
)

export function addPurchaseRequisition(requisition) {
  recalcRequisitionTotals(requisition)
  purchaseRequisitionState.requisitions.unshift(requisition)
  return requisition
}

export function updatePurchaseRequisition(id, patch) {
  const idx = purchaseRequisitionState.requisitions.findIndex((r) => r.id === id)
  if (idx === -1) return null
  Object.assign(purchaseRequisitionState.requisitions[idx], patch)
  recalcRequisitionTotals(purchaseRequisitionState.requisitions[idx])
  purchaseRequisitionState.requisitions[idx].updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  return purchaseRequisitionState.requisitions[idx]
}

export function deletePurchaseRequisition(id) {
  const idx = purchaseRequisitionState.requisitions.findIndex((r) => r.id === id)
  if (idx === -1) return false
  purchaseRequisitionState.requisitions.splice(idx, 1)
  return true
}

export function invalidatePurchaseRequisition(id) {
  return updatePurchaseRequisition(id, { docStatus: '已作废' })
}

export function getRequisitionsByIds(ids) {
  return purchaseRequisitionState.requisitions.filter((r) => ids.includes(r.id))
}

export function getPurchaseRequisitionById(id) {
  return purchaseRequisitionState.requisitions.find((r) => r.id === id) || null
}

function mapPlanMaterialToLineItem(m, deliveryDate, estimatedArrivalDate, receivingWarehouse) {
  const demandQty = m.demandQty ?? m.gapQty ?? m.planQty ?? 0
  return createLineItem({
    inventoryName: m.name,
    inventoryCode: m.code,
    specModel: m.spec,
    specAttr: m.specAttr || '',
    material: m.material || '',
    materialType: m.type || '零部件',
    supplyType: m.supplyType,
    unit: m.unit || '件',
    stockQty: m.stockQty ?? 0,
    availableStock: m.availableStock ?? 0,
    inTransitQty: m.inTransitQty ?? 0,
    demandQty,
    planPurchaseQty: demandQty,
    supplierName: m.supplier || '',
    designatedSupplier: Boolean(m.designateSupplier || m.supplier),
    expectedArrivalDate: estimatedArrivalDate,
    deliveryDate,
    receivingWarehouse,
  })
}

/** 从生产计划弹窗行生成一张采购申请（多明细合一单） */
export function buildRequisitionFromPlanRows(rows, sourceOrder, form = {}) {
  const now = dayjs()
  const deliveryDate =
    form.deliveryDate ||
    sourceOrder.planAssemblyDate ||
    sourceOrder.deliveryDate ||
    now.format('YYYY-MM-DD')
  const lineItems = rows.map((row) =>
    createLineItem({
      inventoryName: row.productName,
      inventoryCode: row.code,
      specModel: row.spec,
      specAttr: row.specAttr || '',
      material: row.material || '',
      materialType: row.materialType || '零部件',
      supplyType: '外购件',
      unit: row.unit || '件',
      stockQty: row.stockQty ?? 0,
      availableStock: row.availableStock ?? 0,
      inTransitQty: row.inTransitQty ?? 0,
      demandQty: row.demandQty ?? 0,
      gapQty: row.gapQty ?? 0,
      planPurchaseQty: row.planQty,
      designatedSupplier: Boolean(row.designatedSupplier),
      supplierName: row.supplier || '',
      expectedArrivalDate: row.expectedArrivalDate || deliveryDate,
      deliveryDate,
      receivingWarehouse: row.warehouse || form.receivingWarehouse || '',
      remark: row.remark || '',
    }),
  )
  const estimatedArrivalDate =
    form.estimatedArrivalDate ||
    lineItems
      .map((l) => l.expectedArrivalDate)
      .filter(Boolean)
      .sort()[0] ||
    deliveryDate
  const receivingWarehouse =
    form.receivingWarehouse || lineItems.find((l) => l.receivingWarehouse)?.receivingWarehouse || ''

  return {
    id: `pr-${Date.now()}`,
    reqNo: form.reqNo?.trim() || generatePlanReqNo(),
    salesOrderNo: sourceOrder.orderNo || '',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    urgency:
      sourceOrder.urgency === '紧急' ? '紧急' : sourceOrder.urgency === '加急' ? '特急' : '正常',
    orderDate: now.format('YYYY-MM-DD'),
    deliveryDate,
    estimatedArrivalDate,
    receivingWarehouse,
    source: '生产计划',
    operator: '管理员',
    creator: '管理员',
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    updatedAt: now.format('YYYY-MM-DD HH:mm'),
    remark: form.remark ?? sourceOrder.remark ?? '',
    purchaseOrderNo: '',
    lineItems,
  }
}

/** 从生产计划物料生成采购申请 */
export function buildRequisitionFromMaterials(materials, sourceOrder, form = {}) {
  const now = dayjs()
  const deliveryDate =
    form.deliveryDate ||
    sourceOrder.planAssemblyDate ||
    sourceOrder.deliveryDate ||
    now.format('YYYY-MM-DD')
  const estimatedArrivalDate = form.estimatedArrivalDate || deliveryDate
  const receivingWarehouse = form.receivingWarehouse || ''
  const lineItems = (form.lineItems || materials).map((m) =>
    m.inventoryCode
      ? { ...m, receivingWarehouse: m.receivingWarehouse || receivingWarehouse }
      : mapPlanMaterialToLineItem(m, deliveryDate, estimatedArrivalDate, receivingWarehouse),
  )

  return {
    id: `pr-${Date.now()}`,
    reqNo: form.reqNo?.trim() || generatePlanReqNo(),
    salesOrderNo: sourceOrder.orderNo || '',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    urgency:
      sourceOrder.urgency === '紧急' ? '紧急' : sourceOrder.urgency === '加急' ? '特急' : '正常',
    orderDate: now.format('YYYY-MM-DD'),
    deliveryDate,
    estimatedArrivalDate,
    receivingWarehouse,
    source: '生产计划',
    operator: '管理员',
    creator: '管理员',
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    updatedAt: now.format('YYYY-MM-DD HH:mm'),
    remark: form.remark ?? sourceOrder.remark ?? '',
    purchaseOrderNo: '',
    lineItems,
  }
}

/** 从外购销售订单生成采购申请 */
export function buildRequisitionFromSalesOrder(salesOrder) {
  const now = dayjs()
  const deliveryDate = resolveEarliestDeliveryDate(salesOrder.lineItems, salesOrder.documentDate)

  const lineItems = (salesOrder.lineItems || []).map((line) => {
    const qty = Number(line.salesQty) || Number(line.qty) || 0
    const ex = Number(line.unitPriceExTax) || 0
    const rate = line.taxRate ?? 13
    const inTax = round2(ex * (1 + rate / 100))
    const lineDelivery = line.deliveryDate || deliveryDate
    return createLineItem({
      inventoryName: line.productName,
      inventoryCode: line.productCode,
      specModel: line.specModel,
      material: line.material,
      materialType: line.productAttr || '零部件',
      supplyType: line.productAttr || '外购件',
      unit: line.unit || '件',
      demandQty: qty,
      planPurchaseQty: qty,
      supplierName: '',
      designatedSupplier: false,
      unitPriceExTax: ex,
      taxRate: rate,
      unitPriceInTax: inTax,
      totalPriceExTax: round2(qty * ex),
      totalPriceInTax: round2(qty * inTax),
      deliveryDate: lineDelivery,
      expectedArrivalDate: lineDelivery,
    })
  })

  return {
    id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reqNo: generateReqNo(),
    salesOrderNo: salesOrder.orderNo || '',
    sourceSalesOrderId: salesOrder.id,
    docStatus: '待处理',
    overdueStatus: '未逾期',
    urgency: mapSalesUrgency(salesOrder.urgency),
    orderDate: now.format('YYYY-MM-DD'),
    deliveryDate,
    estimatedArrivalDate: deliveryDate,
    source: '外购销售',
    operator: '管理员',
    creator: '管理员',
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    updatedAt: now.format('YYYY-MM-DD HH:mm'),
    remark: salesOrder.remark || '',
    purchaseOrderNo: '',
    lineItems,
  }
}

/**
 * 确认生成采购单：按供应商拆单，回填申请单号与状态
 * @returns {{ poCount: number, poNos: string[] }}
 */
export function confirmGeneratePurchaseOrders(mergedLines) {
  const created = createPurchaseOrdersFromMergedLines(mergedLines)
  const poNos = created.map((o) => o.orderNo)
  const reqPoMap = new Map()

  created.forEach((order) => {
    mergedLines
      .filter((l) => (l.supplierName || '未指定供应商') === order.supplier)
      .forEach((line) => {
        ;(line.sourceReqIds || []).forEach((reqId) => {
          if (!reqPoMap.has(reqId)) reqPoMap.set(reqId, new Set())
          reqPoMap.get(reqId).add(order.orderNo)
        })
      })
  })

  reqPoMap.forEach((poSet, reqId) => {
    const req = purchaseRequisitionState.requisitions.find((r) => r.id === reqId)
    if (!req) return
    const existing = req.purchaseOrderNo ? req.purchaseOrderNo.split(',').filter(Boolean) : []
    const merged = [...new Set([...existing, ...poSet])]
    req.purchaseOrderNo = merged.join(',')
    req.docStatus = '处理完成'
    req.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  })

  persist()
  return { poCount: poNos.length, poNos }
}

export function canGeneratePO(record) {
  return record.docStatus !== '处理完成' && record.docStatus !== '已作废'
}
