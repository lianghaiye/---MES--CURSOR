import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { cloneInboundSeedOrders, createInboundLine, createInboundOrder } from '@/mock/inboundOrders'
import { ensureCrossDemoInboundOrders } from '@/mock/crossModuleDemoSeed'
import { purchaseOrderState, syncPurchaseOrderInboundStatus } from '@/store/purchaseOrderStore'
import { calcPoLineRemainInboundQty } from '@/utils/purchaseLineInbound'
import { warehouseState } from '@/store/warehouseStore'
import { applyInboundToStock } from '@/store/stockStore'
import { applyInboundToSalesAllocation } from '@/store/salesStockAllocationStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { applyInboundBatchesFromRoots } from '@/store/stockBatchStore'
import {
  isOneItemOneCodeBarcode,
  validateVariableLengthInboundLine,
  sumPieceValues,
} from '@/utils/variableLengthMaterial'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  findSalesOrderByNoOrId,
  splitInboundPieceValuesForSalesOrder,
  resolveWorkOrderNoFromInbound,
} from '@/utils/salesOrderDedicatedStock'

function isFinishedOrSemiInbound(order) {
  const t = order?.inboundType || ''
  return t === '成品入库' || t === '半成品入库'
}

function resolveInboundSalesOrder(order) {
  return findSalesOrderByNoOrId({
    salesOrderId: order.salesOrderId,
    salesOrderNo: order.salesOrderNo || order.sourceOrderNo,
  })
}

const STORAGE_KEY = 'i_doms_inbound_orders'
const SEED_VERSION_KEY = 'i_doms_inbound_orders_seed_v'
/** v5：跨模块演示采购入库（轴承部分入库） */
const CURRENT_SEED_VERSION = '6'

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: inboundOrderState.orders }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function normalizeLegacyOrder(order) {
  const row = { ...order }
  if (!row.inboundDate)
    row.inboundDate = row.createdAt?.slice(0, 10) || dayjs().format('YYYY-MM-DD')
  if (!row.itemType) row.itemType = '物料'
  if (!row.handler) row.handler = row.creator || 'admin1'
  if (!row.invoiceNo) row.invoiceNo = ''
  if (!row.sourceWorkshop) row.sourceWorkshop = ''
  if (!row.confirmer) row.confirmer = ''
  if (!row.confirmedAt) row.confirmedAt = ''
  if (!row.approver) row.approver = ''
  if (!row.approvedAt) row.approvedAt = ''
  if (!row.miniProgramTaskId) row.miniProgramTaskId = ''
  if (!row.purchaseOrderId) row.purchaseOrderId = ''
  if (!Array.isArray(row.workOrders)) row.workOrders = []
  if (row.inboundType === '生产退库') row.inboundType = '半成品入库'
  if (
    row.status === '待处理' &&
    (row.inboundType === '成品入库' || row.inboundType === '半成品入库') &&
    row.miniProgramTaskId
  ) {
    row.status = '待审批'
  }
  if (!Array.isArray(row.lineItems)) row.lineItems = []
  return row
}

function initOrders() {
  const stored = loadFromStorage()
  const base =
    shouldReseed() || !stored?.length
      ? cloneInboundSeedOrders().map(normalizeLegacyOrder)
      : stored.map(normalizeLegacyOrder)
  return ensureCrossDemoInboundOrders(base)
}

export function generateInboundNo() {
  const ymd = dayjs().format('YYYYMMDD')
  const prefix = `1-${ymd}-`
  const max = inboundOrderState.orders.reduce((m, o) => {
    const str = String(o.docNo || '')
    if (!str.startsWith(prefix)) return m
    const seq = Number(str.slice(prefix.length)) || 0
    return Math.max(m, seq)
  }, 0)
  return `${prefix}${String(max + 1).padStart(5, '0')}`
}

export const inboundOrderState = reactive({
  orders: initOrders(),
})

watch(
  () => inboundOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getInboundOrderById(id) {
  return inboundOrderState.orders.find((o) => o.id === id) || null
}

export function getInboundOrdersBySource(sourceOrderNo) {
  return inboundOrderState.orders.filter((o) => o.sourceOrderNo === sourceOrderNo)
}

/** 查询采购单关联的入库单 */
export function getInboundOrdersByPurchaseOrder(purchaseOrder) {
  if (!purchaseOrder) return []
  const id = purchaseOrder.id
  const orderNo = purchaseOrder.orderNo
  return inboundOrderState.orders.filter((order) => {
    if (id && order.purchaseOrderId === id) return true
    if (!orderNo) return false
    const isPurchaseSource =
      order.sourceType === '采购订单' ||
      order.sourceType === '采购单' ||
      order.inboundType === '采购入库'
    return isPurchaseSource && order.sourceOrderNo === orderNo
  })
}

/** 查询外协订单关联的入库单 */
export function getInboundOrdersByOutsourcingOrder(wxOrder) {
  if (!wxOrder) return []
  const id = wxOrder.id
  const orderNo = wxOrder.orderNo
  return inboundOrderState.orders.filter((order) => {
    if (id && (order.outsourcingOrderId === id || order.purchaseOrderId === id)) return true
    if (!orderNo) return false
    const isWxSource =
      order.sourceType === '外协订单' ||
      order.sourceType === '外协单' ||
      order.inboundType === '外协入库'
    return isWxSource && (order.sourceOrderNo === orderNo || order.outsourcingOrderNo === orderNo)
  })
}

/** 查询收货单关联的入库单 */
export function getInboundOrdersByReceipt(receipt) {
  if (!receipt) return []
  const idSet = new Set((receipt.inboundOrderIds || []).filter(Boolean))
  const noSet = new Set()
  if (receipt.inboundOrderNo) noSet.add(String(receipt.inboundOrderNo).trim())
  if (!idSet.size && !noSet.size) return []
  return inboundOrderState.orders.filter(
    (order) => idSet.has(order.id) || noSet.has(String(order.docNo || '').trim()),
  )
}

function fieldHasOrderNo(field, orderNo) {
  if (!orderNo) return false
  return String(field || '')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(orderNo)
}

/** 查询销售订单关联的入库单（直连销售单号 / 关联采购单 / 关联工单） */
export function getInboundOrdersBySalesOrder(salesOrder, extra = {}) {
  if (!salesOrder) return []
  const id = salesOrder.id
  const orderNo = String(salesOrder.orderNo || '').trim()
  const poIds = new Set((extra.purchaseOrders || []).map((po) => po.id).filter(Boolean))
  const poNos = new Set(
    (extra.purchaseOrders || []).map((po) => String(po.orderNo || '').trim()).filter(Boolean),
  )
  const woNos = new Set(
    [...(extra.workOrders || []), ...(extra.assemblyWorkOrders || [])]
      .flatMap((wo) => [wo.code, wo.orderNo, wo.id])
      .map((v) => String(v || '').trim())
      .filter(Boolean),
  )

  const seen = new Set()
  const result = []
  inboundOrderState.orders.forEach((order) => {
    if (!order?.id || seen.has(order.id)) return
    const hitDirect =
      (id && (order.salesOrderId === id || order.sourceSalesOrderId === id)) ||
      fieldHasOrderNo(order.salesOrderNo, orderNo) ||
      fieldHasOrderNo(order.sourceSalesOrderNo, orderNo) ||
      fieldHasOrderNo(order.sourceOrderNo, orderNo)
    const hitPo =
      (order.purchaseOrderId && poIds.has(order.purchaseOrderId)) ||
      [...poNos].some((no) => fieldHasOrderNo(order.sourceOrderNo, no))
    const srcNo = String(order.sourceOrderNo || '').trim()
    const hitWo =
      (srcNo && woNos.has(srcNo)) ||
      (order.workOrders || []).some((w) =>
        woNos.has(String(w.code || w.orderNo || w.id || '').trim()),
      )
    if (!hitDirect && !hitPo && !hitWo) return
    seen.add(order.id)
    result.push(order)
  })
  return result
}

export function resolveWarehouseKeeper(warehouseName) {
  const wh = warehouseState.warehouses.find((w) => w.name === warehouseName)
  return wh?.managerName || ''
}

function canDeleteInbound(order) {
  return order && order.status !== '已完成'
}

function canEditInbound(order) {
  return order && ['待处理', '待审批', '已拒绝', '部分入库'].includes(order.status)
}

function canConfirmInbound(order) {
  return order?.status === '待处理' || order?.status === '部分入库'
}

function canApproveInbound(order) {
  return (
    order?.status === '待审批' &&
    (order?.inboundType === '成品入库' || order?.inboundType === '半成品入库')
  )
}

export function recomputeInboundOrderStatus(order, operator = 'admin1') {
  if (!order) return
  const lines = order.lineItems || []
  if (!lines.length) {
    if (order.status === '部分入库') order.status = '待处理'
    return
  }
  const done = lines.filter((l) => (l.lineStatus || '待入库') === '已入库').length
  if (done === 0) {
    if (order.status === '部分入库' || order.status === '已完成') order.status = '待处理'
    return
  }
  if (done === lines.length) {
    order.status = '已完成'
    order.confirmer = order.confirmer || operator
    order.confirmedAt = order.confirmedAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
    return
  }
  order.status = '部分入库'
  order.confirmedAt = ''
}

function buildInboundLineItems(payload, headerWarehouse = '') {
  return (payload.lineItems || []).map((line) =>
    createInboundLine({
      ...line,
      warehouse: line.warehouse || headerWarehouse || payload.warehouse || '',
    }),
  )
}

export function addInboundOrder(payload) {
  const docNo = String(payload.docNo || '').trim() || generateInboundNo()
  const lineItems = buildInboundLineItems(payload, payload.warehouse || '')
  const headerWarehouse =
    payload.warehouse || lineItems.find((line) => line.warehouse)?.warehouse || ''
  const whKeeper = resolveWarehouseKeeper(headerWarehouse)
  const row = normalizeLegacyOrder(
    createInboundOrder({
      ...payload,
      id: payload.id || `ib-${Date.now()}`,
      docNo,
      warehouse: headerWarehouse || undefined,
      lineItems,
      warehouseKeeper: payload.warehouseKeeper || whKeeper,
      status:
        payload.status ||
        ((payload.inboundType === '成品入库' || payload.inboundType === '半成品入库') &&
        payload.miniProgramTaskId
          ? '待审批'
          : '待处理'),
      createdAt: payload.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }),
  )
  inboundOrderState.orders.unshift(row)
  return row
}

export function updateInboundOrder(id, patch) {
  const idx = inboundOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return { ok: false, message: '入库单不存在' }
  const row = inboundOrderState.orders[idx]
  if (!canEditInbound(row)) return { ok: false, message: '当前状态不可编辑' }
  const headerWarehouse = patch.warehouse ?? row.warehouse
  if (patch.lineItems) {
    patch.lineItems = buildInboundLineItems(
      { ...patch, warehouse: headerWarehouse },
      headerWarehouse,
    )
  }
  if (patch.warehouse !== undefined) {
    patch.warehouse = headerWarehouse || undefined
    patch.warehouseKeeper = resolveWarehouseKeeper(headerWarehouse)
  }
  if (patch.docNo !== undefined) {
    patch.docNo = String(patch.docNo || '').trim() || row.docNo
  }
  Object.assign(row, patch)
  return { ok: true, order: row }
}

export function deleteInboundOrder(id) {
  const idx = inboundOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  if (!canDeleteInbound(inboundOrderState.orders[idx])) return false
  inboundOrderState.orders.splice(idx, 1)
  return true
}

function prepareAndApplyInboundLine(order, line) {
  const mat = materialInfoState.materials.find((m) => m.code === line.itemCode)
  if (mat?.isVariableLength) {
    line.isVariableLength = true
    line.unit = mat.stockUnit || mat.inventoryUnit || line.unit || '米'
  }
  if (line.isVariableLength) {
    // 兼容旧数据：仅有统一单件数量时展开
    if (
      (!line.pieceValues || !line.pieceValues.length) &&
      (!line.pieceLengths || !line.pieceLengths.length) &&
      (!line.pieceWeights || !line.pieceWeights.length) &&
      Number(line.purchaseQty) > 0 &&
      (Number(line.uniformValue) > 0 ||
        Number(line.uniformLength) > 0 ||
        Number(line.uniformWeight) > 0) &&
      !line.inboundEntryMode
    ) {
      const n = Number(line.purchaseQty)
      const per = Number(line.uniformValue ?? line.uniformLength ?? line.uniformWeight)
      line.pieceValues = Array.from({ length: n }, () => per)
      line.pieceLengths = line.pieceValues
      line.inboundEntryMode = 'uniform'
    }

    if (mat?.purchaseUnit) line.purchaseUnit = mat.purchaseUnit

    const check = validateVariableLengthInboundLine(line, line.unit)
    if (!check.ok) {
      return { ok: false, message: `${line.itemName || line.itemCode}：${check.message}` }
    }
    const pieceValues = line.pieceValues?.length
      ? line.pieceValues
      : line.pieceWeights?.length
        ? line.pieceWeights
        : line.pieceLengths
    line.stockQty = sumPieceValues(pieceValues)
    line.qty = line.stockQty
  }

  const warehouse = line.warehouse || order.warehouse
  const barcodeType = line.barcodeType || mat?.barcodeType || '一批一码'
  line.barcodeType = barcodeType

  let pieceValues
  if (line.isVariableLength) {
    pieceValues = line.pieceValues?.length
      ? line.pieceValues
      : line.pieceWeights?.length
        ? line.pieceWeights
        : line.pieceLengths
  } else {
    const qty = Number(line.qty ?? line.shipQty) || 0
    if (!(qty > 0)) return { ok: true, skipped: true }
    if (isOneItemOneCodeBarcode(barcodeType)) {
      const n = Math.max(1, Math.round(qty))
      pieceValues = Array.from({ length: n }, () => 1)
    } else {
      pieceValues = [qty]
    }
  }
  if (!pieceValues?.length) return { ok: true, skipped: true }

  const basePayload = {
    warehouse,
    itemCode: line.itemCode,
    itemName: line.itemName,
    sourceType: order.inboundType || '采购入库',
    sourceDocNo: order.docNo,
    unit: line.unit || (line.isVariableLength ? '米' : '件'),
    barcodeType,
    workOrderNo: resolveWorkOrderNoFromInbound(order) || line.workOrderNo || '',
    attrs: {
      material: line.material,
      inboundEntryMode: line.inboundEntryMode,
      barcodeType: barcodeType || undefined,
    },
  }

  const allBatches = []
  const allPieces = []
  let manageByPiece = false

  // 成品/半成品：按销售行未满足数量切开打单 vs 自由备货
  if (isFinishedOrSemiInbound(order)) {
    const salesOrder = resolveInboundSalesOrder(order)
    if (!salesOrder) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」成品/半成品入库须关联可解析的销售订单`,
      }
    }
    const split = splitInboundPieceValuesForSalesOrder({
      salesOrder,
      itemCode: line.itemCode,
      pieceValues,
      preferredSalesLineId: line.salesLineId || '',
    })
    line.dedicatedInboundQty = split.dedicatedTotal
    line.freeInboundQty = split.freeTotal
    line.salesOrderNo = salesOrder.orderNo
    line.salesOrderId = salesOrder.id

    for (const seg of split.segments) {
      const res = applyInboundBatchesFromRoots({
        ...basePayload,
        pieceValues: seg.pieceValues,
        pieceLengths: seg.pieceValues,
        salesOrderId: seg.salesOrderId,
        salesOrderNo: seg.salesOrderNo,
        salesLineId: seg.salesLineId,
      })
      if (!res.ok) return { ok: false, message: res.message }
      allBatches.push(...(res.batches || []))
      allPieces.push(...(res.pieces || []))
      if (res.manageByPiece) manageByPiece = true
      if (!line.salesLineId) line.salesLineId = seg.salesLineId
    }
    if (split.freePieceValues.length) {
      const res = applyInboundBatchesFromRoots({
        ...basePayload,
        pieceValues: split.freePieceValues,
        pieceLengths: split.freePieceValues,
        salesOrderId: '',
        salesOrderNo: '',
        salesLineId: '',
      })
      if (!res.ok) return { ok: false, message: res.message }
      allBatches.push(...(res.batches || []))
      allPieces.push(...(res.pieces || []))
      if (res.manageByPiece) manageByPiece = true
    }
  } else {
    const res = applyInboundBatchesFromRoots({
      ...basePayload,
      pieceValues,
      pieceLengths: pieceValues,
      salesOrderId: line.salesOrderId || order.salesOrderId || '',
      salesOrderNo: line.salesOrderNo || order.salesOrderNo || '',
      salesLineId: line.salesLineId || '',
    })
    if (!res.ok) return { ok: false, message: res.message }
    allBatches.push(...(res.batches || []))
    allPieces.push(...(res.pieces || []))
    manageByPiece = Boolean(res.manageByPiece)
  }

  line.batchNos = allBatches.map((b) => b.batchNo)
  line.pieceSerialNos = allPieces.map((p) => p.serialNo)
  if (manageByPiece) line.manageByPiece = true
  return { ok: true }
}

export function confirmInboundOrders(ids, operator = 'admin1') {
  let count = 0
  const blocked = []
  ids.forEach((id) => {
    const order = inboundOrderState.orders.find((o) => o.id === id)
    if (!canConfirmInbound(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '仅待处理/部分入库状态可确认入库' })
      return
    }

    const pendingLines = (order.lineItems || []).filter(
      (l) => (l.lineStatus || '待入库') !== '已入库',
    )
    if (!pendingLines.length) {
      recomputeInboundOrderStatus(order, operator)
      count += 1
      return
    }

    for (const line of pendingLines) {
      const prep = prepareAndApplyInboundLine(order, line)
      if (!prep.ok) {
        blocked.push({ docNo: order.docNo, message: prep.message })
        return
      }
    }

    const stockRes = applyInboundToStock(order, { lineIds: pendingLines.map((l) => l.id) })
    if (!stockRes.ok) {
      blocked.push({ docNo: order.docNo, message: stockRes.message })
      return
    }
    pendingLines.forEach((line) => {
      line.lineStatus = '已入库'
    })
    syncSalesAllocationAfterInbound(order, pendingLines)
    recomputeInboundOrderStatus(order, operator)
    count += 1
  })
  return { count, blocked }
}

/** 按明细确认入库 */
export function confirmInboundLine(orderId, lineId, operator = 'admin1') {
  const order = inboundOrderState.orders.find((o) => o.id === orderId)
  if (!canConfirmInbound(order)) {
    return { ok: false, message: '仅待处理/部分入库状态可确认入库' }
  }
  const line = (order.lineItems || []).find((l) => l.id === lineId)
  if (!line) return { ok: false, message: '明细不存在' }
  if ((line.lineStatus || '待入库') === '已入库') {
    return { ok: false, message: '该明细已入库' }
  }

  const prep = prepareAndApplyInboundLine(order, line)
  if (!prep.ok) return prep

  const stockRes = applyInboundToStock(order, { lineIds: [lineId] })
  if (!stockRes.ok) return stockRes

  line.lineStatus = '已入库'
  syncSalesAllocationAfterInbound(order, [line])
  recomputeInboundOrderStatus(order, operator)
  return { ok: true, order, line }
}

/** 入库后：偿还调拨欠量，并按来源销售单补软占用 */
function syncSalesAllocationAfterInbound(order, lines) {
  const sourceOrderNo = order.sourceOrderNo || order.salesOrderNo || ''
  const salesOrder = sourceOrderNo
    ? salesOrderState.orders.find((o) => o.orderNo === sourceOrderNo)
    : null

  for (const line of lines) {
    const code = String(line.itemCode || line.productCode || '').trim()
    const qty =
      line.dedicatedInboundQty != null
        ? Number(line.dedicatedInboundQty) || 0
        : Number(line.qty) || 0
    if (!code || qty <= 0) continue

    let sourceSalesLineId = line.salesLineId || ''
    if (!sourceSalesLineId && salesOrder?.lineItems?.length) {
      const hit =
        salesOrder.lineItems.find((l) => l.productCode === code) || salesOrder.lineItems[0]
      sourceSalesLineId = hit?.id || ''
    }

    applyInboundToSalesAllocation({
      itemCode: code,
      qty,
      sourceSalesOrderId: salesOrder?.id || '',
      sourceSalesOrderNo: sourceOrderNo,
      sourceSalesLineId,
      itemName: line.itemName || line.productName || '',
    })
  }
}

export function approveInboundOrder(id, operator = 'admin1') {
  const order = inboundOrderState.orders.find((o) => o.id === id)
  if (!canApproveInbound(order)) {
    return { ok: false, message: '仅成品/半成品入库待审批单据可审批' }
  }
  order.status = '待处理'
  order.approver = operator
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, order }
}

export function rejectInboundOrder(id, operator = 'admin1') {
  const order = inboundOrderState.orders.find((o) => o.id === id)
  if (!canApproveInbound(order)) {
    return { ok: false, message: '仅成品/半成品入库待审批单据可拒绝' }
  }
  order.status = '已拒绝'
  order.approver = operator
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  resetMiniProgramInboundTask(order.miniProgramTaskId)
  return { ok: true, order }
}

/** 拒绝后小程序入库任务恢复为待开始（占位，后续对接小程序） */
export function resetMiniProgramInboundTask(taskId) {
  if (!taskId) return
  try {
    const key = 'i_doms_mp_inbound_tasks'
    const raw = localStorage.getItem(key)
    const tasks = raw ? JSON.parse(raw) : []
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx >= 0) {
      tasks[idx].status = '待开始'
      localStorage.setItem(key, JSON.stringify(tasks))
    }
  } catch {
    /* ignore */
  }
}

/** 采购订单生成采购入库单（待处理）——按剩余可申请量校验，支持多次入库 */
export function createInboundFromPurchaseOrder(purchaseOrderId, payload = {}) {
  const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
  if (!po) return { ok: false, message: '采购单不存在' }

  const lines = payload.lineItems || []
  if (!lines.length) return { ok: false, message: '请至少添加一条入库明细' }

  const invalid = lines.find((line) => !line.warehouse || !line.qty || Number(line.qty) <= 0)
  if (invalid) {
    return { ok: false, message: '请完善入库仓库和入库数量' }
  }
  const settleInvalid = lines.find(
    (line) => String(line.settleUnit || '').trim() && !(Number(line.settleQty) > 0),
  )
  if (settleInvalid) {
    return {
      ok: false,
      message: `「${settleInvalid.itemName || settleInvalid.itemCode || '明细'}」已启用结算单位，请填写结算数量`,
    }
  }

  for (const line of lines) {
    const poLine = (po.lineItems || []).find((l) => l.id === line.poLineId)
    if (!poLine) return { ok: false, message: '存在无效的采购明细行' }
    const remain = calcPoLineRemainInboundQty(po, poLine)
    if (Number(line.qty) > remain + 1e-9) {
      return {
        ok: false,
        message: `物料「${poLine.productName || poLine.itemName || poLine.productCode}」可入库数量不足（剩余 ${remain}）`,
      }
    }
  }

  const itemTypes = [...new Set(lines.map((line) => line.itemType).filter(Boolean))]
  const itemType = itemTypes.length === 1 ? itemTypes[0] : '物料'

  const groups = new Map()
  lines.forEach((line) => {
    const wh = String(line.warehouse || '').trim()
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push(line)
  })

  const created = []
  let index = 0
  for (const [warehouse, groupLines] of groups) {
    index += 1
    const lineItems = groupLines.map((line) =>
      createInboundLine({
        poLineId: line.poLineId || '',
        itemCode: line.itemCode,
        itemName: line.itemName,
        itemType: line.itemType || '',
        specModel: line.specModel || '',
        specAttr: line.specAttr || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        locationNo: line.locationNo || '',
        unit: line.unit || '个',
        stockUnit: line.stockUnit,
        purchaseUnit: line.purchaseUnit,
        unitPrice: line.unitPrice ?? null,
        warehouse: line.warehouse,
        qty: Number(line.qty),
        purchaseQty: line.purchaseQty,
        totalValue: line.totalValue,
        inboundEntryMode: line.inboundEntryMode,
        isVariableLength: Boolean(line.isVariableLength),
        settleUnit: line.settleUnit || '',
        settleQty: line.settleQty,
        standardUnitWeight: line.standardUnitWeight,
        settledSettleQty: Number(line.settledSettleQty) || 0,
        totalPrice: line.totalPrice ?? null,
      }),
    )
    const remarkBase = payload.remark || `采购单 ${po.orderNo} 生成`
    const order = addInboundOrder({
      id: `ib-po-${Date.now()}-${index}`,
      inboundType: '采购入库',
      status: '待处理',
      warehouse,
      warehouseKeeper: resolveWarehouseKeeper(warehouse),
      inboundDate: payload.inboundDate || dayjs().format('YYYY-MM-DD'),
      deliveryDate: payload.deliveryDate || dayjs().format('YYYY-MM-DD'),
      itemType,
      supplier: po.supplier,
      sourceOrderNo: po.orderNo,
      sourceType: '采购订单',
      purchaseOrderId: po.id,
      invoiceNo: payload.invoiceNo || '',
      remark: groups.size > 1 ? `${remarkBase}（仓库：${warehouse}）` : remarkBase,
      handler: payload.handler || 'admin1',
      creator: payload.creator || 'admin1',
      lineItems,
    })
    created.push(order)
  }

  syncPurchaseOrderInboundStatus(po)

  return { ok: true, order: created[0] || null, orders: created }
}

export function createInboundFromScrap(scrap, partial = {}) {
  const inboundType =
    partial.inboundType === '生产退库' ? '半成品入库' : partial.inboundType || '报废入库'
  const order = addInboundOrder({
    inboundType,
    status: '待处理',
    warehouse: partial.warehouse || scrap.warehouse || '半成品仓',
    sourceOrderNo: scrap.scrapNo,
    sourceType: '报废单',
    itemType: '物料',
    handler: partial.creator || '管理员',
    creator: partial.creator || '管理员',
    remark: partial.remark || `报废单 ${scrap.scrapNo}`,
    inboundDate: dayjs().format('YYYY-MM-DD'),
    lineItems: [
      {
        id: `ib-line-${Date.now()}`,
        itemName: scrap.itemName,
        itemCode: scrap.itemCode,
        specModel: scrap.specModel,
        material: scrap.material,
        qty: scrap.qty || 1,
        unit: scrap.unit || '件',
      },
    ],
    ...partial,
  })
  return order
}

export { canDeleteInbound, canEditInbound, canConfirmInbound, canApproveInbound }
