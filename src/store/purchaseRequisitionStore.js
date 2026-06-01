import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  clonePurchaseRequisitions,
  recalcRequisitionTotals,
  createLineItem,
} from '@/mock/purchaseRequisitions'
import { groupBySupplier } from '@/utils/purchaseMerge'

const STORAGE_KEY = 'i_doms_purchase_requisitions'
let reqSeq = 5
let poSeq = 2

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

export function generatePurchaseOrderNo() {
  poSeq += 1
  return `CG${dayjs().format('YYYYMMDD')}${String(poSeq).padStart(3, '0')}`
}

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

/** 从生产计划物料生成采购申请 */
export function buildRequisitionFromMaterials(materials, sourceOrder) {
  const now = dayjs()
  const deliveryDate =
    sourceOrder.planAssemblyDate || sourceOrder.deliveryDate || now.format('YYYY-MM-DD')
  const lineItems = materials.map((m) =>
    createLineItem({
      inventoryName: m.name,
      inventoryCode: m.code,
      specModel: m.spec,
      material: m.material,
      materialType: m.type || '零部件',
      supplyType: m.supplyType,
      unit: m.unit || '件',
      stockQty: m.stockQty ?? 0,
      demandQty: m.gapQty ?? m.planQty ?? 0,
      planPurchaseQty: m.gapQty ?? m.planQty ?? 0,
      supplierName: m.supplier || '',
      designatedSupplier: Boolean(m.supplier),
      expectedArrivalDate: deliveryDate,
      deliveryDate,
    }),
  )

  return {
    id: `pr-${Date.now()}`,
    reqNo: generateReqNo(),
    salesOrderNo: sourceOrder.orderNo || '',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    urgency: sourceOrder.urgency === '紧急' ? '紧急' : sourceOrder.urgency === '加急' ? '特急' : '正常',
    orderDate: now.format('YYYY-MM-DD'),
    deliveryDate,
    estimatedArrivalDate: deliveryDate,
    source: '生产计划',
    operator: '管理员',
    creator: '管理员',
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    updatedAt: now.format('YYYY-MM-DD HH:mm'),
    remark: sourceOrder.remark || '',
    purchaseOrderNo: '',
    lineItems,
  }
}

/**
 * 确认生成采购单：按供应商拆单，回填申请单号与状态
 * @returns {{ poCount: number, poNos: string[] }}
 */
export function confirmGeneratePurchaseOrders(mergedLines) {
  const supplierGroups = groupBySupplier(mergedLines)
  const poNos = []
  const reqPoMap = new Map()

  supplierGroups.forEach((lines, supplier) => {
    const poNo = generatePurchaseOrderNo()
    poNos.push(poNo)
    lines.forEach((line) => {
      ;(line.sourceReqIds || []).forEach((reqId) => {
        if (!reqPoMap.has(reqId)) reqPoMap.set(reqId, new Set())
        reqPoMap.get(reqId).add(poNo)
      })
    })
    // Mock: purchase orders stored only as numbers on requisitions
    void supplier
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
