/**
 * 采购/外协订单关联的入库质检记录（演示：由收货单派生）
 */
import { purchaseReceiptState } from '@/store/purchaseReceiptStore'
import { outsourcingReceiptState } from '@/store/outsourcingReceiptStore'
import { listQcTasks, QC_TASK_STATUS } from '@/store/qcTaskStore'
import { formatTreatmentPlanDisplay } from '@/utils/qcTreatmentPlan'

function mapQcRow(r) {
  return {
    id: r.qcId || `iqc-${r.id}`,
    qcNo: r.qcNo || '',
    qcStatus: r.qcStatus || '未质检',
    qcResult: r.qcResult || '',
    inspector: r.inspector || '',
    inspectedAt: r.inspectedAt || r.qcTime || '',
    receiptId: r.id,
    receiptNo: r.receiptNo || '',
  }
}

function isRelatedPurchaseReceipt(receipt, po) {
  if (!po || !receipt) return false
  return (
    (po.id && receipt.purchaseOrderId === po.id) ||
    (po.orderNo && receipt.purchaseOrderNo === po.orderNo)
  )
}

function isRelatedOutsourcingReceipt(receipt, order) {
  if (!order || !receipt) return false
  return (
    (order.id &&
      (receipt.outsourcingOrderId === order.id || receipt.purchaseOrderId === order.id)) ||
    (order.orderNo &&
      (receipt.outsourcingOrderNo === order.orderNo || receipt.purchaseOrderNo === order.orderNo))
  )
}

export function listInboundQcForPurchaseOrder(po) {
  if (!po) return []
  void purchaseReceiptState.receipts
  return (purchaseReceiptState.receipts || [])
    .filter((r) => isRelatedPurchaseReceipt(r, po))
    .map(mapQcRow)
    .filter((row) => row.qcNo || row.qcStatus)
}

export function listInboundQcForOutsourcingOrder(order) {
  if (!order) return []
  void outsourcingReceiptState.receipts
  return (outsourcingReceiptState.receipts || [])
    .filter((r) => isRelatedOutsourcingReceipt(r, order))
    .map(mapQcRow)
    .filter((row) => row.qcNo || row.qcStatus)
}

function formatAcceptInboundText(line = {}) {
  const a = Number(line.acceptInboundQty)
  const c = Number(line.concessionQty)
  const parts = []
  const fmt = (n) => {
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
    return String(Math.round(n * 10000) / 10000)
  }
  if (Number.isFinite(a) && a > 0) parts.push(`合格 ${fmt(a)}`)
  if (Number.isFinite(c) && c > 0) parts.push(`让步 ${fmt(c)}`)
  if (parts.length) return parts.join(' / ')
  if (line.acceptInboundQty != null && line.acceptInboundQty !== '')
    return String(line.acceptInboundQty)
  return '—'
}

function collectQcTasksForReceipt(receipt, bizScope = '来料质检') {
  if (!receipt) return []
  const byId = listQcTasks({ sourceDocId: receipt.id, bizScope })
  const no = String(receipt.receiptNo || '').trim()
  const byNo = no
    ? listQcTasks({ bizScope }).filter((t) => String(t.sourceDocNo || '').trim() === no)
    : []
  const map = new Map()
  ;[...byId, ...byNo].forEach((t) => {
    if (!t?.id || t.qcStatus === QC_TASK_STATUS.CANCELLED) return
    map.set(t.id, t)
  })
  return [...map.values()]
}

function formatQcProductInfo(line = {}, task = {}) {
  const parts = [
    line?.itemCode || line?.productCode || task.itemCode,
    line?.itemName || line?.productName || task.itemName,
    line?.specModel || task.specModel,
    line?.material || task.material,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join('/') : '—'
}

function mapTaskLineToQcResultRow(task, line, idx, meta = {}) {
  const bizScope = meta.bizScope || task?.bizScope || '来料质检'
  const treatmentPlan = line
    ? formatTreatmentPlanDisplay(bizScope, line) || '—'
    : String(task.treatmentPlan || '').trim() || '—'
  return {
    id: `${task.id}__${line?.id || idx}`,
    taskId: task.id || '',
    purchaseOrderNo: meta.purchaseOrderNo || '',
    receiptNo: meta.receiptNo || '',
    receiptId: meta.receiptId || '',
    qcNo: task.qcNo || '',
    qcStatus: task.qcStatus || '',
    qcResult: line?.lineQcResult || task.qcResult || '',
    itemName: line?.itemName || line?.productName || task.itemName || '—',
    itemCode: line?.itemCode || line?.productCode || task.itemCode || '',
    specModel: line?.specModel || task.specModel || '',
    material: line?.material || task.material || '',
    productInfo: formatQcProductInfo(line, task),
    inspectMethod: line?.inspectMethod || task.inspectMethod || '—',
    inspectQty: line?.inspectQty ?? line?.receiptQty ?? task.inspectQty ?? '',
    treatmentPlan,
    /** @deprecated 保留字段兼容；展示已并入 treatmentPlan */
    acceptInboundQty: line ? formatAcceptInboundText(line) : '—',
    inspector: task.inspector || '',
    inspectedAt: task.inspectedAt || '',
  }
}

function appendQcResultRowsForReceipt(rows, receipt, purchaseOrderNo = '', bizScope = '来料质检') {
  if (!receipt) return
  const meta = {
    purchaseOrderNo: purchaseOrderNo || receipt.purchaseOrderNo || receipt.outsourcingOrderNo || '',
    receiptNo: receipt.receiptNo || '',
    receiptId: receipt.id || '',
    bizScope,
  }
  collectQcTasksForReceipt(receipt, bizScope).forEach((task) => {
    const lines = Array.isArray(task.lineItems) && task.lineItems.length ? task.lineItems : [null]
    lines.forEach((line, idx) => {
      rows.push(mapTaskLineToQcResultRow(task, line, idx, meta))
    })
  })
}

/**
 * 收货单 / 来料质检生成入库：质检结果明细（一个产品一行）
 * @param {object} receipt
 */
export function listQcProductResultLinesForReceipt(receipt) {
  if (!receipt) return []
  void purchaseReceiptState.receipts
  const rows = []
  appendQcResultRowsForReceipt(rows, receipt, receipt.purchaseOrderNo || '', '来料质检')
  return rows
}

/**
 * 外协收货 / 外协回货检生成入库：质检结果明细（一个产品一行）
 * @param {object} receipt
 */
export function listQcProductResultLinesForOutsourcingReceipt(receipt) {
  if (!receipt) return []
  void outsourcingReceiptState.receipts
  const rows = []
  appendQcResultRowsForReceipt(
    rows,
    receipt,
    receipt.outsourcingOrderNo || receipt.purchaseOrderNo || '',
    '外协回货检',
  )
  return rows
}

/**
 * 采购订单生成入库：质检结果明细（一个产品一行）
 * @param {object|object[]} purchaseOrders
 */
export function listQcProductResultLinesForPurchaseOrders(purchaseOrders) {
  const orders = (Array.isArray(purchaseOrders) ? purchaseOrders : [purchaseOrders]).filter(Boolean)
  if (!orders.length) return []
  void purchaseReceiptState.receipts

  const rows = []
  orders.forEach((po) => {
    const receipts = (purchaseReceiptState.receipts || []).filter((r) =>
      isRelatedPurchaseReceipt(r, po),
    )
    receipts.forEach((receipt) => {
      appendQcResultRowsForReceipt(rows, receipt, po.orderNo || '', '来料质检')
    })
  })
  return rows
}

function resolveReceiptLinePoLineId(receipt, sourceLineId) {
  if (!receipt || !sourceLineId) return ''
  const hit = (receipt.lineItems || []).find((li) => String(li.id) === String(sourceLineId))
  return hit?.wxLineId || hit?.poLineId || hit?.id || ''
}

function qcLineMatchesPoLine(qcLine, poLine, receipt) {
  if (!qcLine || !poLine) return false
  const lineId = poLine.id
  const code = String(poLine.productCode || poLine.itemCode || '').trim()
  if (qcLine.wxLineId && lineId && qcLine.wxLineId === lineId) return true
  if (qcLine.poLineId && lineId && qcLine.poLineId === lineId) return true
  const sourcePoLineId = resolveReceiptLinePoLineId(receipt, qcLine.sourceLineId)
  if (sourcePoLineId && lineId && sourcePoLineId === lineId) return true
  const qcCode = String(qcLine.itemCode || qcLine.productCode || '').trim()
  if (code && qcCode && code === qcCode) return true
  return false
}

/**
 * 采购行关联的来料质检明细（含源收货单上下文）
 */
export function listQcLinesForPurchaseOrderLine(po, line) {
  if (!po || !line) return []
  void purchaseReceiptState.receipts
  const rows = []
  const receipts = (purchaseReceiptState.receipts || []).filter((r) =>
    isRelatedPurchaseReceipt(r, po),
  )
  receipts.forEach((receipt) => {
    collectQcTasksForReceipt(receipt).forEach((task) => {
      const lines = Array.isArray(task.lineItems) && task.lineItems.length ? task.lineItems : []
      lines.forEach((qcLine, idx) => {
        if (!qcLineMatchesPoLine(qcLine, line, receipt)) return
        rows.push({
          task,
          qcLine,
          receipt,
          inspectedAt: task.inspectedAt || '',
          createdAt: task.createdAt || '',
          idx,
        })
      })
    })
  })
  return rows
}

/** 最近一次质检结果（按质检时间 / 创建时间倒序） */
export function getPoLineLatestQcResult(po, line) {
  const rows = listQcLinesForPurchaseOrderLine(po, line)
  if (!rows.length) return ''
  rows.sort((a, b) =>
    String(b.inspectedAt || b.createdAt || '').localeCompare(
      String(a.inspectedAt || a.createdAt || ''),
    ),
  )
  const top = rows[0]
  return String(top.qcLine?.lineQcResult || top.task?.qcResult || '').trim()
}

/**
 * 处理方案合计文案：合格入库：n/退货：n/换货：n（多次质检数量相加；全 0 返回空）
 */
export function formatPoLineQcTreatmentSummary(po, line) {
  const rows = listQcLinesForPurchaseOrderLine(po, line)
  if (!rows.length) return ''
  let accept = 0
  let concession = 0
  let ret = 0
  let exchange = 0
  rows.forEach(({ qcLine }) => {
    accept += Number(qcLine?.acceptInboundQty) || 0
    concession += Number(qcLine?.concessionQty) || 0
    ret += Number(qcLine?.returnQty) || 0
    exchange += Number(qcLine?.exchangeQty) || 0
  })
  if (accept <= 1e-9 && concession <= 1e-9 && ret <= 1e-9 && exchange <= 1e-9) return ''
  const fmt = (n) => {
    const v = Number(n) || 0
    return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)))
  }
  const parts = [`合格入库：${fmt(accept)}`]
  if (concession > 1e-9) parts.push(`让步入库：${fmt(concession)}`)
  parts.push(`退货：${fmt(ret)}`, `换货：${fmt(exchange)}`)
  return parts.join('/')
}

/** 质检单中该采购行的退货数量合计 */
export function calcPoLineQcReturnQty(po, line) {
  return listQcLinesForPurchaseOrderLine(po, line).reduce(
    (s, { qcLine }) => s + (Number(qcLine?.returnQty) || 0),
    0,
  )
}

/**
 * 外协行关联的外协回货检明细（含源收货单上下文）
 */
export function listQcLinesForOutsourcingOrderLine(order, line) {
  if (!order || !line) return []
  void outsourcingReceiptState.receipts
  const rows = []
  const receipts = (outsourcingReceiptState.receipts || []).filter((r) =>
    isRelatedOutsourcingReceipt(r, order),
  )
  receipts.forEach((receipt) => {
    collectQcTasksForReceipt(receipt, '外协回货检').forEach((task) => {
      const lines = Array.isArray(task.lineItems) && task.lineItems.length ? task.lineItems : []
      lines.forEach((qcLine, idx) => {
        if (!qcLineMatchesPoLine(qcLine, line, receipt)) return
        rows.push({
          task,
          qcLine,
          receipt,
          inspectedAt: task.inspectedAt || '',
          createdAt: task.createdAt || '',
          idx,
        })
      })
    })
  })
  return rows
}

/** 外协行最近一次质检结果 */
export function getWxLineLatestQcResult(order, line) {
  const rows = listQcLinesForOutsourcingOrderLine(order, line)
  if (!rows.length) return ''
  rows.sort((a, b) =>
    String(b.inspectedAt || b.createdAt || '').localeCompare(
      String(a.inspectedAt || a.createdAt || ''),
    ),
  )
  const top = rows[0]
  return String(top.qcLine?.lineQcResult || top.task?.qcResult || '').trim()
}

/**
 * 外协处理方案合计：合格入库：n/让步接收：n/返工：n/报废：n（多次质检相加；全 0 返回空）
 */
export function formatWxLineQcTreatmentSummary(order, line) {
  const rows = listQcLinesForOutsourcingOrderLine(order, line)
  if (!rows.length) return ''
  let accept = 0
  let concession = 0
  let rework = 0
  let scrap = 0
  rows.forEach(({ qcLine }) => {
    accept += Number(qcLine?.acceptInboundQty) || 0
    concession += Number(qcLine?.concessionQty) || 0
    rework += Number(qcLine?.returnQty) || 0
    scrap += Number(qcLine?.exchangeQty) || 0
  })
  if (accept <= 1e-9 && concession <= 1e-9 && rework <= 1e-9 && scrap <= 1e-9) return ''
  const fmt = (n) => {
    const v = Number(n) || 0
    return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)))
  }
  return [
    `合格入库：${fmt(accept)}`,
    `让步接收：${fmt(concession)}`,
    `返工：${fmt(rework)}`,
    `报废：${fmt(scrap)}`,
  ].join('/')
}
