import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  clonePurchaseOrders,
  recalcPurchaseOrderTotals,
  createPoLineItem,
  computePurchaseOrderOverdueStatus,
} from '@/mock/purchaseOrders'
import { ensureCrossDemoPurchaseOrders } from '@/mock/crossModuleDemoSeed'
import { ensureSettleUnitDemoPurchaseOrders } from '@/mock/settleUnitPurchaseDemoSeed'
import { round2 } from '@/utils/purchaseMerge'
import {
  calcPoHeaderInboundStatus,
  calcPoLineInboundStatus,
  calcPoLineRemainInboundQty,
} from '@/utils/purchaseLineInbound'
import { addPurchaseReceipt } from '@/store/purchaseReceiptStore'
import { estimateSettleQty, hasSettleUnit, resolvePricingQty } from '@/utils/settleUnit'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'

/** 由 purchaseRequisitionStore 注册，避免循环依赖导致 bind 未生效 */
let draftBindApi = {
  bind: () => {},
  unbind: () => {},
  bindByReqNos: () => {},
}

export function registerPurchaseRequisitionDraftBind(api = {}) {
  draftBindApi = {
    bind: typeof api.bind === 'function' ? api.bind : () => {},
    unbind: typeof api.unbind === 'function' ? api.unbind : () => {},
    bindByReqNos: typeof api.bindByReqNos === 'function' ? api.bindByReqNos : () => {},
  }
}

const STORAGE_KEY = 'i_doms_purchase_orders'
const SEED_VERSION_KEY = 'i_doms_purchase_orders_seed_v'
/** v7：结算单位演示采购订单（铸件/三口径/无单重） */
const CURRENT_SEED_VERSION = '7'
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
  const orders = ensureSettleUnitDemoPurchaseOrders(ensureCrossDemoPurchaseOrders(base))
  orders.forEach((order) => {
    if (!order || order.status === '草稿') {
      if (order) order.overdueStatus = order.overdueStatus || '未逾期'
      return
    }
    order.overdueStatus = computePurchaseOrderOverdueStatus(order)
  })
  return orders
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
    if (order.status === '草稿') return false
    if (linkedPoNos.includes(order.orderNo)) return true
    const reqNos = (order.reqNo || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return reqNos.includes(reqNo)
  })
}

export function canEditPurchaseOrder(order) {
  return order?.status === '待提交' || order?.status === '已拒绝'
}

/** 待提交 → 提交审核 */
export function canSubmitPurchaseOrder(order) {
  return order?.status === '待提交'
}

/** 待审核 → 撤回 */
export function canWithdrawPurchaseOrder(order) {
  return order?.status === '待审核'
}

/** 已拒绝 → 重新提交 */
export function canResubmitPurchaseOrder(order) {
  return order?.status === '已拒绝'
}

export function canApprovePurchaseOrder(order) {
  return order?.status === '待审核'
}

export function canVoidPurchaseOrder(order) {
  return order?.status === '待提交'
}

export function canReverseApprovePurchaseOrder() {
  return false
}

export function canGenerateReceipt(order) {
  if (order?.status !== '进行中') return false
  return (order.lineItems || []).some((line) => calcPoLineRemainInboundQty(order, line) > 1e-9)
}

export function canGenerateInbound(order) {
  return canGenerateReceipt(order)
}

export function canCompletePurchaseOrder(order) {
  return order?.status === '进行中' && order?.inboundStatus === '已入库'
}

/** 回写整单/明细入库状态与逾期状态 */
export function syncPurchaseOrderInboundStatus(orderOrId) {
  const order =
    typeof orderOrId === 'string'
      ? purchaseOrderState.orders.find((o) => o.id === orderOrId)
      : orderOrId
  if (!order || order.status === '草稿') return order
  ;(order.lineItems || []).forEach((line) => {
    line.inboundStatus = calcPoLineInboundStatus(order, line)
  })
  order.inboundStatus = calcPoHeaderInboundStatus(order)
  order.overdueStatus = computePurchaseOrderOverdueStatus(order)
  return order
}

/** 按交货日期刷新全部采购订单逾期状态 */
export function refreshPurchaseOrderOverdueStatusAll() {
  purchaseOrderState.orders.forEach((order) => {
    if (!order || order.status === '草稿') {
      if (order) order.overdueStatus = '未逾期'
      return
    }
    order.overdueStatus = computePurchaseOrderOverdueStatus(order)
  })
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
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  order.overdueStatus = computePurchaseOrderOverdueStatus(order)
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
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  pushApprovalRecord(order, { result: '已驳回', opinion })
  return { ok: true, message: `采购单「${order.orderNo}」已拒绝` }
}

/** 待提交 → 待审核 */
export function submitPurchaseOrderForApprove(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canSubmitPurchaseOrder(order)) {
    return { ok: false, message: '仅「待提交」状态可提交审核' }
  }
  order.status = '待审核'
  order.approvalResult = '待审核'
  return { ok: true, message: `采购单「${order.orderNo}」已提交审核` }
}

/** 待审核 → 待提交（撤回） */
export function withdrawPurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canWithdrawPurchaseOrder(order)) {
    return { ok: false, message: '仅「待审核」状态可撤回' }
  }
  order.status = '待提交'
  order.approvalResult = '—'
  return { ok: true, message: `采购单「${order.orderNo}」已撤回` }
}

/** 已拒绝 → 待审核（重新提交） */
export function resubmitPurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canResubmitPurchaseOrder(order)) {
    return { ok: false, message: '仅「已拒绝」状态可重新提交' }
  }
  order.status = '待审核'
  order.approvalResult = '待审核'
  return { ok: true, message: `采购单「${order.orderNo}」已重新提交审核` }
}

/** 反审（兼容旧入口，已关闭） */
export function reverseApprovePurchaseOrder() {
  return { ok: false, message: '当前流程不支持反审，请使用撤回' }
}

/** 作废 */
export function voidPurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canVoidPurchaseOrder(order)) {
    return { ok: false, message: '仅「待提交」状态可作废' }
  }
  order.status = '已作废'
  order.approvalResult = order.approvalResult || '—'
  order.overdueStatus = '未逾期'
  return { ok: true, message: `采购单「${order.orderNo}」已作废` }
}

/** 完成采购单 */
export function completePurchaseOrder(id) {
  const order = purchaseOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canCompletePurchaseOrder(order)) {
    return { ok: false, message: `采购单「${order.orderNo}」需入库完成后才可完成` }
  }
  order.status = '已完成'
  order.overdueStatus = '未逾期'
  return { ok: true, message: `采购单「${order.orderNo}」已完成` }
}

/** 从采购申请合并行按供应商创建采购单 */
export function createPurchaseOrdersFromMergedLines(mergedLines, options = {}) {
  const status = options.status || '待提交'
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
        stockQty: line.stockQty,
        purchaseQty: line.planPurchaseQty,
        unit: line.unit || line.purchaseUnit || '个',
        purchaseUnit: line.purchaseUnit || line.unit || '个',
        inventoryUnit: line.inventoryUnit || '',
        settleUnit: line.settleUnit || '',
        settleQty: line.settleQty,
        standardUnitWeight: line.standardUnitWeight,
        blankSizeText: line.blankSizeText || '',
        blankSize: line.blankSize || null,
        blankSizeMode: line.blankSizeMode || '',
        orderSizeText: line.orderSizeText || line.blankSizeText || '',
        orderSize: line.orderSize ?? line.blankSize ?? null,
        orderSizeMode: line.orderSizeMode || line.blankSizeMode || '',
        orderSizeFromPlan: line.orderSizeFromPlan === true,
        orderSizeLocked: line.orderSizeLocked === true || line.orderSizeFromPlan === true,
        variantSummary: line.variantSummary || '',
        unitPriceExTax: line.unitPriceExTax,
        taxRate: line.taxRate,
        unitPriceInTax: line.unitPriceInTax,
        totalPriceExTax: line.totalPriceExTax,
        totalPriceInTax: line.totalPriceInTax,
        receivingMode: line.receivingMode || '正常收货',
        receivingWarehouse: line.receivingWarehouse || '',
        deliveryDate: line.deliveryDate || '',
        urgency: line.urgency || '正常',
        sourceReqNos: line.sourceReqNos || [],
        sourceLineIds: line.sourceLineIds || [],
      }),
    )

    const orderSource = salesNos.length ? '外购销售' : '采购申请'
    const order = {
      id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderNo:
        status === '草稿' ? `DRAFT-${dayjs().format('YYYYMMDDHHmmss')}` : generatePurchaseOrderNo(),
      supplier: status === '草稿' && lines.length > 1 ? '（草稿·多供应商）' : supplier,
      reqNo: reqNos.join(','),
      salesOrderNo: salesNos.join(','),
      settlementType: first.settlementType || '先款后货',
      deliveryDate: deliveryDates[0] || dayjs().format('YYYY-MM-DD'),
      leadTimeDays: first.leadTimeDays ?? 12,
      deliveryMethod: '定时交货',
      remark: first.remark || '',
      orderSource,
      applyType: '日常采购',
      status,
      approvalResult: status === '草稿' ? '—' : '待审核',
      inboundStatus: status === '草稿' ? '—' : '待入库',
      overdueStatus: '未逾期',
      documentDate: dayjs().format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      draftRows: status === '草稿' ? JSON.parse(JSON.stringify(mergedLines)) : undefined,
      sourceReqIds: [...new Set(lines.flatMap((l) => l.sourceReqIds || []))],
      lineItems,
    }
    addPurchaseOrder(order)
    created.push(order)
  })

  return created
}

/** 保存/更新「生成采购订单」草稿（整表一行存草稿，不按供应商拆） */
export function saveGeneratePurchaseOrderDraft({ rows, draftId, sourceReqIds }) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) return { ok: false, message: '没有可保存的明细' }

  const reqNos = [...new Set(list.flatMap((l) => l.sourceReqNos || []))]
  const reqIds = [
    ...new Set([...(sourceReqIds || []), ...list.flatMap((l) => l.sourceReqIds || [])]),
  ]
  const now = dayjs().format('YYYY-MM-DD HH:mm')

  if (draftId) {
    const existing = getPurchaseOrderById(draftId)
    if (existing && existing.status === '草稿') {
      discardOverlappingGenerateDrafts(reqIds, existing.id, reqNos)
      existing.draftRows = JSON.parse(JSON.stringify(list))
      existing.sourceReqIds = reqIds
      existing.reqNo = reqNos.join(',')
      existing.updatedAt = now
      existing.remark = `草稿：已编辑 ${list.length} 行`
      persist()
      draftBindApi.bind(reqIds, existing.id)
      return { ok: true, draft: existing }
    }
  }

  discardOverlappingGenerateDrafts(reqIds, null, reqNos)

  const draft = {
    id: `po-draft-${Date.now()}`,
    orderNo: `DRAFT-${dayjs().format('YYYYMMDDHHmmss')}`,
    supplier: '（草稿）',
    reqNo: reqNos.join(','),
    salesOrderNo: [...new Set(list.flatMap((l) => l.sourceSalesOrderNos || []))].join(','),
    settlementType: list[0]?.settlementType || '先款后货',
    deliveryDate: list[0]?.deliveryDate || dayjs().format('YYYY-MM-DD'),
    leadTimeDays: list[0]?.leadTimeDays ?? 12,
    deliveryMethod: '定时交货',
    remark: `草稿：已编辑 ${list.length} 行`,
    orderSource: '采购申请',
    applyType: '日常采购',
    status: '草稿',
    approvalResult: '—',
    inboundStatus: '—',
    documentDate: dayjs().format('YYYY-MM-DD'),
    createdAt: now,
    updatedAt: now,
    draftRows: JSON.parse(JSON.stringify(list)),
    sourceReqIds: reqIds,
    lineItems: [],
  }
  addPurchaseOrder(draft)
  draftBindApi.bind(reqIds, draft.id)
  return { ok: true, draft }
}

function draftSourceReqIds(draft) {
  return [
    ...new Set([
      ...(draft?.sourceReqIds || []),
      ...(draft?.draftRows || []).flatMap((r) => r.sourceReqIds || []),
    ]),
  ]
}

export function getGeneratePurchaseOrderDraft(draftId) {
  const order = getPurchaseOrderById(draftId)
  if (!order || order.status !== '草稿') return null
  return order
}

/** 所有「生成采购订单」草稿 */
export function listGeneratePurchaseOrderDrafts() {
  // 循环依赖启动期 purchaseOrderState 可能尚未初始化
  const orders = purchaseOrderState?.orders
  if (!Array.isArray(orders)) return []
  return orders.filter((o) => o.status === '草稿')
}

/**
 * 按采购申请 id 查找关联草稿（sourceReqIds / 明细行 sourceReqIds）
 * @returns {object[]}
 */
export function findDraftsBySourceReqIds(reqIds) {
  const idSet = new Set((reqIds || []).filter(Boolean))
  if (!idSet.size) return []
  return listGeneratePurchaseOrderDrafts().filter((draft) => {
    const ids = [
      ...(draft.sourceReqIds || []),
      ...(draft.draftRows || []).flatMap((r) => r.sourceReqIds || []),
    ]
    return ids.some((id) => idSet.has(id))
  })
}

/** 某张采购申请当前关联的草稿（若有多张取最近更新） */
export function getActiveDraftForReqId(reqId) {
  if (!reqId) return null
  const drafts = findDraftsBySourceReqIds([reqId])
  if (!drafts.length) return null
  return [...drafts].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )[0]
}

/** 按申请单对象查找草稿（兼容仅写了 reqNo、未写 sourceReqIds 的旧草稿） */
export function getActiveDraftForRequisition(req) {
  if (!req) return null
  const byId = getActiveDraftForReqId(req.id)
  if (byId) return byId
  if (req.generatePoDraftId) {
    const linked = getGeneratePurchaseOrderDraft(req.generatePoDraftId)
    if (linked) return linked
  }
  const reqNo = String(req.reqNo || '').trim()
  if (!reqNo) return null
  const byNo = listGeneratePurchaseOrderDrafts().filter((draft) =>
    String(draft.reqNo || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(reqNo),
  )
  if (!byNo.length) return null
  return [...byNo].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )[0]
}

/**
 * 将「生成采购订单」草稿映射为采购申请列表行：
 * - 申请单号列展示来源申请单号（多单用顿号分隔）
 * - 草稿号放在 purchaseOrderNo
 */
export function buildGenerateDraftListRows() {
  return listGeneratePurchaseOrderDrafts().map((draft) => {
    const sourceReqNos = String(draft.reqNo || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const rows = draft.draftRows || []
    const plannedQty = rows.reduce((s, r) => s + (Number(r.planPurchaseQty) || 0), 0)
    const amountWan = rows.reduce((s, r) => s + (Number(r.totalPriceInTax) || 0), 0) / 10000
    return {
      id: draft.id,
      isGeneratePoDraft: true,
      generateDraftId: draft.id,
      // 草稿行：申请单号列展示来源申请单号
      reqNo: sourceReqNos.join('、') || '—',
      sourceReqNos: sourceReqNos.join('、'),
      docStatus: '草稿',
      overdueStatus: '',
      purchaseOrderNo: draft.orderNo || '',
      salesOrderNo: draft.salesOrderNo || '',
      urgency: '',
      plannedQty,
      amountWan,
      deliveryDate: draft.deliveryDate || '',
      estimatedArrivalDate: '',
      orderDate: draft.documentDate || '',
      source: '生成采购草稿',
      receivingWarehouse: '',
      operator: '管理员',
      creator: '管理员',
      createdAt: draft.createdAt || '',
      updatedAt: draft.updatedAt || draft.createdAt || '',
      remark: draft.remark || '',
      lineItems: [],
    }
  })
}

/**
 * 同一来源申请只保留最新一份生成草稿，其余废弃
 */
export function dedupeGeneratePurchaseOrderDrafts() {
  const drafts = listGeneratePurchaseOrderDrafts()
  if (drafts.length <= 1) return []

  const sorted = [...drafts].sort((a, b) =>
    String(b.updatedAt || b.createdAt || '').localeCompare(
      String(a.updatedAt || a.createdAt || ''),
    ),
  )
  const claimedReqKeys = new Set()
  const keepIds = new Set()
  const discarded = []

  sorted.forEach((draft) => {
    const ids = draftSourceReqIds(draft)
    const nos = String(draft.reqNo || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const keys = [...ids.map((id) => `id:${id}`), ...nos.map((no) => `no:${no}`)]
    const conflict = keys.some((k) => claimedReqKeys.has(k))
    if (conflict) {
      discarded.push(draft)
      return
    }
    keys.forEach((k) => claimedReqKeys.add(k))
    keepIds.add(draft.id)
  })

  discarded.forEach((d) => {
    // 直接删订单，不解绑（保留的草稿会重新 bind）
    deletePurchaseOrder(d.id)
  })
  return discarded
}

/**
 * 将已有生成草稿的来源申请单统一回写为「处理中」，并去掉重复草稿
 */
export function reconcilePurchaseRequisitionDraftStatuses() {
  dedupeGeneratePurchaseOrderDrafts()
  const drafts = listGeneratePurchaseOrderDrafts()
  drafts.forEach((draft) => {
    const ids = draftSourceReqIds(draft)
    if (ids.length) {
      draftBindApi.bind(ids, draft.id)
      return
    }
    const reqNos = String(draft.reqNo || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!reqNos.length) return
    draftBindApi.bindByReqNos?.(reqNos, draft.id)
  })
}

/**
 * 新建草稿前：废弃与本次申请单有交集的其它草稿（按 id / 单号），避免同一申请挂多份草稿
 */
export function discardOverlappingGenerateDrafts(sourceReqIds, keepDraftId, sourceReqNos = []) {
  const idSet = new Set((sourceReqIds || []).filter(Boolean))
  const noSet = new Set((sourceReqNos || []).map((s) => String(s || '').trim()).filter(Boolean))
  const overlapping = listGeneratePurchaseOrderDrafts().filter((draft) => {
    if (draft.id === keepDraftId) return false
    const ids = draftSourceReqIds(draft)
    if (ids.some((id) => idSet.has(id))) return true
    const nos = String(draft.reqNo || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return nos.some((no) => noSet.has(no))
  })
  overlapping.forEach((d) => discardGeneratePurchaseOrderDraft(d.id))
  return overlapping
}

export function discardGeneratePurchaseOrderDraft(draftId) {
  const order = getPurchaseOrderById(draftId)
  if (!order || order.status !== '草稿') return false
  const reqIds = draftSourceReqIds(order)
  const ok = deletePurchaseOrder(draftId)
  if (ok) draftBindApi.unbind(reqIds, draftId)
  return ok
}

/** 提交收货单 → 生成采购收货单据（占用采购数量，与入库单共用额度） */
export function submitReceipt(orderId, receiptLines, extra = {}) {
  const order = purchaseOrderState.orders.find((o) => o.id === orderId)
  if (!order) return { ok: false, message: '采购单不存在' }
  if (!canGenerateReceipt(order)) {
    return { ok: false, message: '仅进行中且仍有可收货数量的采购单可生成收货单' }
  }
  if (!receiptLines?.length) return { ok: false, message: '没有可收货的明细' }

  for (const rl of receiptLines) {
    const line = order.lineItems.find((l) => l.id === rl.id)
    if (!line) return { ok: false, message: '存在无效的采购明细行' }
    const qty = Number(rl.receiptQty) || 0
    if (qty <= 0) {
      return {
        ok: false,
        message: `请填写「${line.productName || line.itemName || '明细'}」的收货数量`,
      }
    }
    if (!rl.receivingWarehouse) {
      return {
        ok: false,
        message: `请填写「${line.productName || line.itemName || '明细'}」的收货仓库`,
      }
    }
    const remain = calcPoLineRemainInboundQty(order, line)
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `物料「${line.productName || line.itemName || line.productCode}」可收货数量不足（剩余 ${remain}）`,
      }
    }
  }

  const lineItems = receiptLines.map((rl) => {
    const line = order.lineItems.find((l) => l.id === rl.id)
    return {
      id: rl.id,
      poLineId: rl.id,
      itemName: rl.itemName || line?.itemName || line?.productName || '',
      itemCode: rl.itemCode || line?.itemCode || line?.productCode || '',
      itemType: rl.itemType || line?.itemType || '',
      specModel: rl.specModel || line?.specModel || '',
      specAttr: rl.specAttr || line?.specAttr || '',
      material: rl.material || line?.material || '',
      variantSummary: rl.variantSummary || line?.variantSummary || '',
      drawingNo: rl.drawingNo || line?.drawingNo || '',
      purchaseQty: Number(rl.purchaseQty ?? line?.purchaseQty) || 0,
      unit: rl.unit || line?.unit || '',
      receivingMode: rl.receivingMode || '正常收货',
      receivingWarehouse: rl.receivingWarehouse || '',
      receiptQty: Number(rl.receiptQty) || 0,
      remark: rl.remark || '',
    }
  })

  const receipt = addPurchaseReceipt({
    receiptNo: String(extra.receiptNo || '').trim() || undefined,
    purchaseOrderNo: order.orderNo,
    purchaseOrderId: order.id,
    supplier: order.supplier,
    purchaser: order.purchaser,
    qcStatus: '未质检',
    receiptStatus: '新建',
    inboundStatus: '待入库',
    remark: extra.remark || '',
    lineItems,
    creator: 'admin1',
  })

  order.shippingDate = dayjs().format('YYYY-MM-DD')
  return {
    ok: true,
    message: `已生成收货单「${receipt.receiptNo}」`,
    receipt,
  }
}

export function recalcPoLine(line) {
  const purchaseQty = Number(line.purchaseQty) || 0
  if (hasSettleUnit(line)) {
    const estimated = estimateSettleQty(line, purchaseQty)
    if (estimated != null && !(Number(line.settleQty) > 0)) {
      line.settleQty = estimated
    }
  }
  const qty = resolvePricingQty(line)
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
      status: '待提交',
      approvalResult: '',
      inboundStatus: '待入库',
      overdueStatus: '未逾期',
      documentDate: dayjs().format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      purchaser: order.purchaser || 'admin1',
      contactPerson: order.contactPerson || '',
      contactPhone: order.contactPhone || '',
      contractNo: order.contractNo || '',
      shippingAddress: order.shippingAddress || '',
      receivingWarehouse: order.receivingWarehouse || '',
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

/** 批量提交审核（含待提交 / 已拒绝重新提交） */
export function batchSubmitPurchaseOrders(ids = []) {
  let ok = 0
  const errors = []
  for (const id of ids) {
    const order = getPurchaseOrderById(id)
    if (!order) {
      errors.push('存在无效采购单')
      continue
    }
    let result
    if (canSubmitPurchaseOrder(order)) {
      result = submitPurchaseOrderForApprove(id)
    } else if (canResubmitPurchaseOrder(order)) {
      result = resubmitPurchaseOrder(id)
    } else {
      errors.push(`「${order.orderNo}」不可提交（仅待提交/已拒绝）`)
      continue
    }
    if (result.ok) ok += 1
    else errors.push(result.message || `「${order.orderNo}」提交失败`)
  }
  return { ok, fail: errors.length, errors }
}

/** 按剩余可收货量构造默认收货明细（批量一键用） */
export function buildDefaultPurchaseReceiptLines(order) {
  if (!order) return []
  return (order.lineItems || [])
    .filter((line) => (Number(line.purchaseQty) || 0) > 0)
    .map((line) => {
      const remainingQty = calcPoLineRemainInboundQty(order, line)
      if (remainingQty <= 1e-9) return null
      const warehouse =
        line.receivingWarehouse ||
        resolveDefaultWarehouseByMaterialCode(line.itemCode || line.productCode) ||
        ''
      const settleUnit = String(line.settleUnit || '').trim()
      return {
        id: line.id,
        itemName: line.itemName || line.productName || '',
        itemCode: line.itemCode || line.productCode || '',
        itemType: line.itemType || '',
        specModel: line.specModel || '',
        material: line.material || '',
        variantSummary: line.variantSummary || '',
        drawingNo: line.drawingNo || '',
        purchaseQty: Number(line.purchaseQty) || 0,
        unit: line.unit || '',
        receivingMode: line.receivingMode === '直发现场' ? '直发现场' : '正常收货',
        receivingWarehouse: warehouse,
        receiptQty: remainingQty,
        settleUnit,
        settleQty: settleUnit
          ? Number(line.settleQty) > 0
            ? Number(line.settleQty)
            : estimateSettleQty(line, remainingQty)
          : undefined,
        remark: '',
      }
    })
    .filter(Boolean)
}

/** 批量生成采购收货单：按剩余可收货数量 + 默认仓库一键生成 */
export function batchGeneratePurchaseReceipts(ids = []) {
  let ok = 0
  const errors = []
  const receipts = []
  for (const id of ids) {
    const order = getPurchaseOrderById(id)
    if (!order) {
      errors.push('存在无效采购单')
      continue
    }
    if (!canGenerateReceipt(order)) {
      errors.push(`「${order.orderNo}」不可生成收货单`)
      continue
    }
    const lines = buildDefaultPurchaseReceiptLines(order)
    if (!lines.length) {
      errors.push(`「${order.orderNo}」没有可收货明细`)
      continue
    }
    const missingWh = lines.find((l) => !String(l.receivingWarehouse || '').trim())
    if (missingWh) {
      errors.push(
        `「${order.orderNo}」明细「${missingWh.itemName || missingWh.itemCode}」缺少收货仓库`,
      )
      continue
    }
    const result = submitReceipt(order.id, lines, {
      remark: `批量生成（采购单 ${order.orderNo}）`,
    })
    if (result.ok) {
      ok += 1
      if (result.receipt) receipts.push(result.receipt)
    } else {
      errors.push(result.message || `「${order.orderNo}」生成收货单失败`)
    }
  }
  return { ok, fail: errors.length, errors, receipts }
}
