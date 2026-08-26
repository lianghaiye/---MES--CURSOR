import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  clonePurchaseRequisitions,
  recalcRequisitionTotals,
  createLineItem,
  stampRequisitionLineSalesOrderNos,
} from '@/mock/purchaseRequisitions'
import { round2 } from '@/utils/purchaseMerge'
import {
  createPurchaseOrdersFromMergedLines,
  discardGeneratePurchaseOrderDraft,
  registerPurchaseRequisitionDraftBind,
  reconcilePurchaseRequisitionDraftStatuses,
} from '@/store/purchaseOrderStore'
import { writeDefaultSuppliersFromMergedLines } from '@/utils/defaultSupplierWriteback'
import {
  ensureProductionPlanOrderTreeDemoRequisitions,
  createProductionPlanOrderTreeDemoRequisitions,
} from '@/mock/productionPlanOrderTreeSeed'
import { ensureCrossDemoPurchaseRequisitions } from '@/mock/crossModuleDemoSeed'
import { ensureSettleUnitDemoPurchaseRequisitions } from '@/mock/settleUnitPurchaseDemoSeed'
import { ensurePackageConvertDemoPurchaseRequisitions } from '@/mock/packageConvertPurchaseDemoSeed'
import { materialInfoState } from '@/store/materialInfoStore'
import { convertStockDemandToPurchase } from '@/utils/purchaseUomConvert'

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
const SEED_VERSION_KEY = 'i_doms_purchase_requisitions_seed_v'
/** v9：包装换算演示申请单 CGSQ-PKG-CONVERT-001（105个→2盒） */
const CURRENT_SEED_VERSION = '9'
let reqSeq = 20

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

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ requisitions: purchaseRequisitionState.requisitions }),
  )
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function normalizeRequisitionLinePoStatus(requisitions) {
  ;(requisitions || []).forEach((req) => {
    ;(req.lineItems || []).forEach((line) => {
      if (!line.poGenStatus) {
        const hasPo = String(line.purchaseOrderNos || '').trim()
        line.poGenStatus = req.docStatus === '处理完成' || hasPo ? '已生成采购' : '未生成采购'
      }
      if (line.purchaseOrderNos == null) line.purchaseOrderNos = ''
    })
  })
}

function initRequisitions() {
  const base = shouldReseed()
    ? clonePurchaseRequisitions()
    : loadFromStorage() || clonePurchaseRequisitions()
  const list = ensurePackageConvertDemoPurchaseRequisitions(
    ensureSettleUnitDemoPurchaseRequisitions(
      ensureCrossDemoPurchaseRequisitions(ensureProductionPlanOrderTreeDemoRequisitions(base)),
    ),
  )
  list.forEach((req) => stampRequisitionLineSalesOrderNos(req))
  normalizeRequisitionLinePoStatus(list)
  return ensureCgsq2026060001InList(list)
}

/** 保证演示单 CGSQ2026060001 始终在列表中（按单号/id 去重后置顶） */
function buildCgsq2026060001Demo() {
  try {
    const demos = createProductionPlanOrderTreeDemoRequisitions()
    if (demos?.[0]) return demos[0]
  } catch {
    /* ignore */
  }
  // 硬编码兜底，避免生产计划 store 未就绪时演示单丢失
  return {
    id: 'pr-pp-tree-demo-1',
    reqNo: 'CGSQ2026060001',
    salesOrderNo: '1-20260512-005',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    purchaseOrderNo: '',
    urgency: '正常',
    plannedQty: 2,
    amountWan: 0,
    deliveryDate: '2026-08-17',
    estimatedArrivalDate: '2026-08-17',
    orderDate: '2026-06-06',
    source: '生产计划',
    receivingWarehouse: '原材料仓',
    operator: 'admin1',
    creator: 'admin1',
    createdAt: '2026-08-07 19:32:30',
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    remark: '生产计划演示：外购件采购申请',
    lineItems: [
      {
        id: 'pr-pp-tree-demo-line-1',
        inventoryName: '立式多级离心泵',
        inventoryCode: 'CP2610002',
        productName: '立式多级离心泵',
        productCode: 'CP2610002',
        specModel: 'ISG50-160',
        materialType: '零部件',
        supplyType: '外购件',
        unit: '台',
        purchaseUnit: '台',
        inventoryUnit: '台',
        stockQty: 0,
        demandQty: 2,
        planPurchaseQty: 2,
        supplierName: '',
        deliveryDate: '2026-08-17',
        expectedArrivalDate: '2026-08-17',
        receivingWarehouse: '原材料仓',
        salesOrderNo: '1-20260512-005',
        poGenStatus: '未生成采购',
        purchaseOrderNos: '',
      },
    ],
  }
}

function ensureCgsq2026060001InList(list) {
  const rows = Array.isArray(list) ? [...list] : []
  const idx = rows.findIndex((r) => r.id === 'pr-pp-tree-demo-1' || r.reqNo === 'CGSQ2026060001')
  const demo = buildCgsq2026060001Demo()
  if (idx >= 0) {
    const existing = rows[idx]
    rows[idx] = {
      ...demo,
      ...existing,
      id: 'pr-pp-tree-demo-1',
      reqNo: 'CGSQ2026060001',
      lineItems: existing.lineItems?.length > 0 ? existing.lineItems : demo.lineItems,
    }
    return rows
  }
  rows.unshift(demo)
  return rows
}

/** 运行时补齐：列表页挂载时可调用 */
export function ensureDemoPurchaseRequisitionCgsq2026060001() {
  if (!purchaseRequisitionState?.requisitions) return null
  const next = ensureCgsq2026060001InList(purchaseRequisitionState.requisitions)
  const missing = !purchaseRequisitionState.requisitions.some((r) => r.reqNo === 'CGSQ2026060001')
  if (missing || next.length !== purchaseRequisitionState.requisitions.length) {
    purchaseRequisitionState.requisitions.splice(
      0,
      purchaseRequisitionState.requisitions.length,
      ...next,
    )
    persist()
  }
  return purchaseRequisitionState.requisitions.find((r) => r.reqNo === 'CGSQ2026060001') || null
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
  requisitions: initRequisitions(),
})

watch(
  () => purchaseRequisitionState.requisitions,
  () => persist(),
  { deep: true },
)

export function addPurchaseRequisition(requisition) {
  stampRequisitionLineSalesOrderNos(requisition)
  recalcRequisitionTotals(requisition)
  purchaseRequisitionState.requisitions.unshift(requisition)
  return requisition
}

export function updatePurchaseRequisition(id, patch) {
  const idx = purchaseRequisitionState.requisitions.findIndex((r) => r.id === id)
  if (idx === -1) return null
  Object.assign(purchaseRequisitionState.requisitions[idx], patch)
  stampRequisitionLineSalesOrderNos(purchaseRequisitionState.requisitions[idx])
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
  const req = getPurchaseRequisitionById(id)
  if (!req) return null
  if (req.generatePoDraftId) return null
  if (req.docStatus === '已作废' || req.docStatus === '处理完成') return null
  return updatePurchaseRequisition(id, { docStatus: '已作废' })
}

/** 手动完成采购申请（待处理/处理中 → 处理完成） */
export function completePurchaseRequisition(id) {
  const req = getPurchaseRequisitionById(id)
  if (!req) return null
  if (req.generatePoDraftId) return null
  if (req.docStatus === '已作废' || req.docStatus === '处理完成') return null
  return updatePurchaseRequisition(id, { docStatus: '处理完成' })
}

export function canCompletePurchaseRequisition(record) {
  return Boolean(
    record &&
    !record.isGeneratePoDraft &&
    ['待处理', '处理中'].includes(record.docStatus) &&
    !record.generatePoDraftId,
  )
}

/** 申请单是否因「生成采购订单草稿」而锁定（来源单，非草稿行本身） */
export function isPurchaseRequisitionDraftLocked(record) {
  return Boolean(record && !record.isGeneratePoDraft && record.generatePoDraftId)
}

/**
 * 保存生成采购草稿后：来源申请单状态 → 处理中，并挂上草稿 id
 * （草稿本身是独立列表行，不再把申请单改成「草稿」）
 */
export function bindRequisitionsToGenerateDraft(reqIds, draftId) {
  const ids = [...new Set((reqIds || []).filter(Boolean))]
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  ids.forEach((id) => {
    const req = getPurchaseRequisitionById(id)
    if (!req || req.docStatus === '已作废') return
    // 误标成「草稿」的历史数据纠正回申请单
    if (req.docStatus === '草稿') {
      req.docStatus = '处理中'
    }
    req.generatePoDraftId = draftId
    if (req.docStatus !== '处理完成') {
      req.docStatus = '处理中'
    }
    req.updatedAt = now
  })
  persist()
}

/** 按申请单号绑定草稿状态 */
export function bindRequisitionsToGenerateDraftByReqNos(reqNos, draftId) {
  const nos = [...new Set((reqNos || []).map((s) => String(s || '').trim()).filter(Boolean))]
  if (!nos.length || !draftId) return
  const ids = purchaseRequisitionState.requisitions
    .filter((r) => nos.includes(r.reqNo))
    .map((r) => r.id)
  bindRequisitionsToGenerateDraft(ids, draftId)
}

/**
 * 解除申请与生成草稿的绑定，并按明细回写单据状态
 * @param {string[]} reqIds
 * @param {string} [draftId] 仅清除仍指向该草稿的绑定
 */
export function unbindRequisitionsFromGenerateDraft(reqIds, draftId) {
  const ids = [...new Set((reqIds || []).filter(Boolean))]
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  ids.forEach((id) => {
    const req = getPurchaseRequisitionById(id)
    if (!req) return
    if (draftId && req.generatePoDraftId && req.generatePoDraftId !== draftId) return
    req.generatePoDraftId = ''
    if (req.docStatus !== '已作废') {
      syncRequisitionDocStatus(req)
    }
    req.updatedAt = now
  })
  persist()
}

export function getRequisitionsByIds(ids) {
  return purchaseRequisitionState.requisitions.filter((r) => ids.includes(r.id))
}

export function getPurchaseRequisitionById(id) {
  return purchaseRequisitionState.requisitions.find((r) => r.id === id) || null
}

export function findPurchaseRequisitionByReqNo(reqNo) {
  const normalized = String(reqNo || '').trim()
  if (!normalized) return null
  return purchaseRequisitionState.requisitions.find((r) => r.reqNo === normalized) || null
}

function mapPlanMaterialToLineItem(
  m,
  deliveryDate,
  estimatedArrivalDate,
  receivingWarehouse,
  salesOrderNo = '',
) {
  const demandQty = m.demandQty ?? m.gapQty ?? m.planQty ?? 0
  const master = materialInfoState.materials.find((row) => row.code === m.code) || m
  const gapQty = Number(m.gapQty)
  const stockBase =
    Number.isFinite(gapQty) && gapQty >= 0 ? gapQty : Number(m.planQty ?? demandQty) || 0
  const converted = convertStockDemandToPurchase(stockBase, master)
  return createLineItem({
    inventoryName: m.name,
    inventoryCode: m.code,
    specModel: m.spec,
    specAttr: m.specAttr || '',
    material: m.material || '',
    materialType: m.type || '零部件',
    supplyType: m.supplyType,
    unit: converted.purchaseUnit,
    inventoryUnit: converted.inventoryUnit,
    purchaseUnit: converted.purchaseUnit,
    packageContent: converted.packageContent,
    purchaseConvertRate: converted.purchaseConvertRate,
    convertHint: converted.convertHint,
    stockQty: m.stockQty ?? 0,
    availableStock: m.availableStock ?? 0,
    inTransitQty: m.inTransitQty ?? 0,
    demandQty,
    planPurchaseQty: converted.planPurchaseQty,
    supplierName: m.supplier || '',
    designatedSupplier: Boolean(m.designateSupplier || m.supplier),
    expectedArrivalDate: estimatedArrivalDate,
    deliveryDate,
    receivingWarehouse,
    salesOrderNo: salesOrderNo || '',
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
  const estimatedArrivalDate = form.estimatedArrivalDate || deliveryDate
  const receivingWarehouse = form.receivingWarehouse || ''
  const salesOrderNo = sourceOrder.orderNo || ''
  const urgency = form.urgency
    ? mapSalesUrgency(form.urgency)
    : mapSalesUrgency(sourceOrder.urgency)
  const lineItems = rows.map((row) => {
    const master = materialInfoState.materials.find((m) => m.code === row.code) || null
    const stockDemand = Number(row.demandQty ?? row.planQty ?? row.gapQty) || 0
    const converted = convertStockDemandToPurchase(stockDemand || 1, master || row)
    return createLineItem({
      inventoryName: row.productName,
      inventoryCode: row.code,
      specModel: row.spec,
      specAttr: row.specAttr || '',
      material: row.material || '',
      materialType: row.materialType || '零部件',
      supplyType: '外购件',
      unit: converted.purchaseUnit || row.purchaseUnit || row.unit || '件',
      inventoryUnit: converted.inventoryUnit || row.inventoryUnit || row.unit || '件',
      purchaseUnit: converted.purchaseUnit || row.purchaseUnit || row.unit || '件',
      packageContent: converted.purchaseConvertRate,
      purchaseConvertRate: converted.purchaseConvertRate,
      convertHint: converted.convertHint || row.convertHint || '',
      blankSizeText: row.blankSizeText || '',
      blankSize: row.blankSize || null,
      blankSizeMode: row.blankSizeMode || '',
      orderSizeText: row.orderSizeText || row.blankSizeText || '',
      orderSize: row.orderSize ?? row.blankSize ?? null,
      orderSizeMode: row.orderSizeMode || row.blankSizeMode || '',
      // 生产计划带尺寸 → 下游采购单只读
      orderSizeFromPlan: Boolean(String(row.orderSizeText || row.blankSizeText || '').trim()),
      orderSizeLocked: Boolean(String(row.orderSizeText || row.blankSizeText || '').trim()),
      stockQty: row.stockQty ?? 0,
      availableStock: row.availableStock ?? 0,
      inTransitQty: row.inTransitQty ?? 0,
      demandQty: stockDemand || Number(row.demandQty) || 0,
      gapQty: row.gapQty ?? 0,
      planPurchaseQty: converted.needsConvert
        ? converted.planPurchaseQty
        : Number(row.planQty) > 0
          ? Number(row.planQty)
          : converted.planPurchaseQty,
      designatedSupplier: Boolean(row.designatedSupplier),
      supplierName: row.supplier || '',
      expectedArrivalDate: estimatedArrivalDate,
      deliveryDate,
      receivingWarehouse,
      salesOrderNo,
      remark: row.remark || '',
    })
  })

  return {
    id: `pr-${Date.now()}`,
    reqNo: form.reqNo?.trim() || generatePlanReqNo(),
    salesOrderNo,
    docStatus: '待处理',
    overdueStatus: '未逾期',
    urgency,
    orderDate: now.format('YYYY-MM-DD'),
    deliveryDate,
    estimatedArrivalDate,
    receivingWarehouse,
    source: '生产计划',
    operator: '管理员',
    creator: '管理员',
    salesperson: form.salesperson || 'admin1',
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
  const salesOrderNo = sourceOrder.orderNo || ''
  const lineItems = (form.lineItems || materials).map((m) =>
    m.inventoryCode
      ? {
          ...m,
          receivingWarehouse: m.receivingWarehouse || receivingWarehouse,
          salesOrderNo: m.salesOrderNo || salesOrderNo,
        }
      : mapPlanMaterialToLineItem(
          m,
          deliveryDate,
          estimatedArrivalDate,
          receivingWarehouse,
          salesOrderNo,
        ),
  )

  return {
    id: `pr-${Date.now()}`,
    reqNo: form.reqNo?.trim() || generatePlanReqNo(),
    salesOrderNo,
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
  const salesOrderNo = salesOrder.orderNo || ''

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
      salesOrderNo,
    })
  })

  return {
    id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reqNo: generateReqNo(),
    salesOrderNo,
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

function syncRequisitionDocStatus(req) {
  if (!req) return
  // 仍挂着生成采购草稿时，来源申请保持「处理中」
  if (req.generatePoDraftId) {
    if (req.docStatus !== '已作废' && req.docStatus !== '处理完成') {
      req.docStatus = '处理中'
    }
    return
  }
  // 历史误标：真实申请单不应为「草稿」
  if (req.docStatus === '草稿' && !req.isGeneratePoDraft) {
    req.docStatus = '待处理'
  }
  const lines = req.lineItems || []
  if (!lines.length) {
    req.docStatus = '待处理'
    return
  }
  const generated = lines.filter((l) => l.poGenStatus === '已生成采购').length
  if (generated === 0) req.docStatus = req.docStatus === '已作废' ? '已作废' : '待处理'
  else if (generated >= lines.length) req.docStatus = '处理完成'
  else req.docStatus = '处理中'
}

/** 供草稿解绑后回写状态 */
export function syncRequisitionDocStatusAfterDraftChange(req) {
  syncRequisitionDocStatus(req)
}

/**
 * 确认生成采购单：按供应商拆单，回填申请明细行状态（支持多次生成）
 * @returns {{ poCount: number, poNos: string[], writtenSuppliers: number }}
 */
export function confirmGeneratePurchaseOrders(mergedLines, options = {}) {
  const created = createPurchaseOrdersFromMergedLines(mergedLines)
  const poNos = created.map((o) => o.orderNo)
  const touchedReqIds = new Set()

  created.forEach((order) => {
    const relatedLines = mergedLines.filter(
      (l) => (l.supplierName || '未指定供应商') === order.supplier,
    )
    relatedLines.forEach((mergedLine) => {
      ;(mergedLine.sourceLineIds || []).forEach((lineId) => {
        purchaseRequisitionState.requisitions.forEach((req) => {
          const line = (req.lineItems || []).find((l) => l.id === lineId)
          if (!line) return
          line.poGenStatus = '已生成采购'
          const nos = String(line.purchaseOrderNos || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          if (!nos.includes(order.orderNo)) nos.push(order.orderNo)
          line.purchaseOrderNos = nos.join(',')
          touchedReqIds.add(req.id)
        })
      })
      ;(mergedLine.sourceReqIds || []).forEach((reqId) => touchedReqIds.add(reqId))
    })
  })

  const written = writeDefaultSuppliersFromMergedLines(mergedLines)
  // 先丢弃草稿并解绑，再回写单据状态（避免仍被草稿锁为「草稿」）
  if (options.draftId) {
    discardGeneratePurchaseOrderDraft(options.draftId)
  }

  touchedReqIds.forEach((reqId) => {
    const req = purchaseRequisitionState.requisitions.find((r) => r.id === reqId)
    if (!req) return
    const existing = req.purchaseOrderNo
      ? req.purchaseOrderNo
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
    req.purchaseOrderNo = [...new Set([...existing, ...poNos])].join(',')
    syncRequisitionDocStatus(req)
    req.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  })

  persist()
  return { poCount: poNos.length, poNos, writtenSuppliers: written.length }
}

/** 拆单新建采购单后，把单号追加到关联采购申请 */
export function appendPurchaseOrderNos(reqNoCsv, poNos) {
  const reqNos = String(reqNoCsv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const addNos = (Array.isArray(poNos) ? poNos : [poNos])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (!reqNos.length || !addNos.length) return

  purchaseRequisitionState.requisitions.forEach((req) => {
    if (!reqNos.includes(req.reqNo)) return
    const existing = req.purchaseOrderNo
      ? req.purchaseOrderNo
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
    req.purchaseOrderNo = [...new Set([...existing, ...addNos])].join(',')
    req.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  })
  persist()
}

export function canGeneratePO(record) {
  if (!record || record.isGeneratePoDraft) return false
  if (record.docStatus === '已作废') return false
  if (record.generatePoDraftId) return false
  if (record.docStatus === '处理完成') return false
  return (record.lineItems || []).some((l) => (l.poGenStatus || '未生成采购') !== '已生成采购')
}

export { normalizeRequisitionLinePoStatus }

registerPurchaseRequisitionDraftBind({
  bind: bindRequisitionsToGenerateDraft,
  unbind: unbindRequisitionsFromGenerateDraft,
  bindByReqNos: bindRequisitionsToGenerateDraftByReqNos,
})

// 延后到微任务：避免与 purchaseOrderStore 循环依赖时 state 尚未就绪
queueMicrotask(() => {
  try {
    reconcilePurchaseRequisitionDraftStatuses()
  } catch (e) {
    console.warn('[purchaseRequisitionStore] reconcile draft statuses failed', e)
  }
})
