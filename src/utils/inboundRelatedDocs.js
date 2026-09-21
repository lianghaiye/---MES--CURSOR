/**
 * 入库单详情：关联单据 / 质检明细 / 下料结算 解析
 */
import { getOutboundOrderById, getOutboundOrderByDocNo } from '@/store/outboundStore'
import { getPurchaseOrderById } from '@/store/purchaseOrderStore'
import { getPurchaseReceiptById, purchaseReceiptState } from '@/store/purchaseReceiptStore'
import { getStocktakeOrderById, stocktakeOrderState } from '@/store/stocktakeOrderStore'
import { getTransferOrderById, transferOrderState } from '@/store/transferOrderStore'
import { cutSettleState } from '@/store/cutSettleStore'
import { flattenCutSettleLines } from '@/utils/cutSettleLines'
import {
  listQcProductResultLinesForPurchaseOrders,
  listQcProductResultLinesForReceipt,
} from '@/utils/purchaseOrderQc'
import { findRelatedInboundQcTasks } from '@/utils/qcGateEnforceService'
import { listQcTasks, QC_TASK_STATUS } from '@/store/qcTaskStore'

function sumLineQty(lines, keys = ['qty', 'purchaseQty', 'receiptQty', 'planQty']) {
  return (lines || []).reduce((sum, line) => {
    for (const key of keys) {
      const n = Number(line?.[key])
      if (Number.isFinite(n) && n !== 0) return sum + n
    }
    return sum
  }, 0)
}

export function isMaterialReqInbound(order) {
  return order?.inboundType === '领料入库' || order?.sourceType === '领料出库'
}

export function isPurchaseInbound(order) {
  return (
    order?.inboundType === '采购入库' ||
    order?.sourceType === '采购订单' ||
    order?.sourceType === '采购单' ||
    order?.sourceType === '采购收货'
  )
}

export function isFinishedOrSemiInbound(order) {
  const t = order?.inboundType || ''
  return t === '成品入库' || t === '半成品入库'
}

export function isStocktakeInbound(order) {
  return order?.inboundType === '盘点入库' || Boolean(order?.stocktakeOrderId)
}

export function isTransferInbound(order) {
  return (
    order?.inboundType === '调拨入库' ||
    Boolean(order?.transferOrderId) ||
    Boolean(order?.transferSoftReceive)
  )
}

export function isRemnantInbound(order) {
  return order?.inboundType === '余料入库' || order?.sourceType === '下料结算'
}

/** 领料入库 → 关联领料出库单 */
export function listRelatedOutboundsForInbound(inbound) {
  if (!inbound || !isMaterialReqInbound(inbound)) return []
  const byId = new Map()
  const push = (row) => {
    if (row?.id) byId.set(row.id, row)
  }

  if (inbound.outboundOrderId) push(getOutboundOrderById(inbound.outboundOrderId))
  if (inbound.outboundDocNo) push(getOutboundOrderByDocNo(inbound.outboundDocNo))
  if (inbound.sourceOrderNo) push(getOutboundOrderByDocNo(inbound.sourceOrderNo))

  return [...byId.values()]
}

function findPurchaseOrder(inbound) {
  if (!inbound) return null
  if (inbound.purchaseOrderId) {
    const byId = getPurchaseOrderById(inbound.purchaseOrderId)
    if (byId) return byId
  }
  const no = String(inbound.sourceOrderNo || inbound.purchaseOrderNo || '').trim()
  if (!no) return null
  // eslint-disable-next-line global-require
  const { purchaseOrderState } = require('@/store/purchaseOrderStore')
  return (purchaseOrderState.orders || []).find((o) => o.orderNo === no) || null
}

function findPurchaseReceipt(inbound) {
  if (!inbound) return null
  void purchaseReceiptState.receipts
  if (inbound.purchaseReceiptId) {
    const byId = getPurchaseReceiptById(inbound.purchaseReceiptId)
    if (byId) return byId
  }
  const no = String(inbound.purchaseReceiptNo || '').trim()
  if (no) {
    return (purchaseReceiptState.receipts || []).find((r) => r.receiptNo === no) || null
  }
  // 源单号是收货单号时
  const sourceNo = String(inbound.sourceOrderNo || '').trim()
  if (sourceNo && (inbound.sourceType === '采购收货' || sourceNo.startsWith('CGSH'))) {
    return (purchaseReceiptState.receipts || []).find((r) => r.receiptNo === sourceNo) || null
  }
  return null
}

/** 本入库单申请入库数量合计 */
export function calcInboundApplyQty(inbound) {
  return sumLineQty(inbound?.lineItems || [], ['qty', 'stockQty', 'purchaseQty'])
}

/** 采购入库 → 关联采购单 */
export function listRelatedPurchaseOrdersForInbound(inbound) {
  const po = findPurchaseOrder(inbound)
  if (!po) {
    const receipt = findPurchaseReceipt(inbound)
    if (receipt?.purchaseOrderId) {
      const fromReceipt = getPurchaseOrderById(receipt.purchaseOrderId)
      if (fromReceipt) {
        return [
          {
            ...fromReceipt,
            applyInboundQty: calcInboundApplyQty(inbound),
            inboundWarehouse: inbound.warehouse || '',
            receiptDate: receipt.receivedAt || receipt.receiptDate || inbound.inboundDate || '',
          },
        ]
      }
    }
    return []
  }
  const receipt = findPurchaseReceipt(inbound)
  return [
    {
      ...po,
      purchaseQty: po.totalQty ?? sumLineQty(po.lineItems || [], ['purchaseQty']),
      applyInboundQty: calcInboundApplyQty(inbound),
      inboundWarehouse: inbound.warehouse || '',
      receiptDate:
        receipt?.receivedAt || receipt?.receiptDate || inbound.inboundDate || po.documentDate || '',
    },
  ]
}

/** 采购入库 → 关联收货单 */
export function listRelatedPurchaseReceiptsForInbound(inbound) {
  const receipt = findPurchaseReceipt(inbound)
  if (!receipt) return []
  return [
    {
      ...receipt,
      receiptQty: sumLineQty(receipt.lineItems || [], ['receiptQty']),
      applyInboundQty: calcInboundApplyQty(inbound),
      inboundWarehouse: inbound.warehouse || receipt.warehouse || '',
      receiptDate: receipt.receivedAt || receipt.receiptDate || '',
    },
  ]
}

/** 采购入库 → 质检明细行（产品维度） */
export function listPurchaseQcLinesForInbound(inbound) {
  const receipt = findPurchaseReceipt(inbound)
  if (receipt) {
    return listQcProductResultLinesForReceipt(receipt).map((row) => enrichQcRow(row))
  }
  const po = findPurchaseOrder(inbound)
  if (po) {
    return listQcProductResultLinesForPurchaseOrders(po).map((row) => enrichQcRow(row))
  }
  return []
}

function enrichQcRow(row) {
  const task = row.taskId ? listQcTasks({}).find((t) => t.id === row.taskId) : null
  return {
    ...row,
    creator: task?.creator || row.creator || '',
    createdAt: task?.createdAt || row.createdAt || '',
  }
}

/** 成品/半成品入库 → 成品检明细行 */
export function listFinishedQcLinesForInbound(inbound) {
  if (!inbound || !isFinishedOrSemiInbound(inbound)) return []
  const related = findRelatedInboundQcTasks(inbound, ['成品检']).filter(
    (t) => t.qcStatus !== QC_TASK_STATUS.CANCELLED,
  )
  const no = String(inbound.sourceOrderNo || '').trim()
  const byNo = no
    ? listQcTasks({ bizScope: '成品检' }).filter((t) => String(t.qcNo || '').trim() === no)
    : []
  const map = new Map()
  ;[...related, ...byNo].forEach((task) => {
    if (task?.id) map.set(task.id, task)
  })
  const rows = []
  ;[...map.values()].forEach((task) => {
    const lines = Array.isArray(task.lineItems) && task.lineItems.length ? task.lineItems : [null]
    lines.forEach((line, idx) => {
      rows.push({
        id: `${task.id}__${line?.id || idx}`,
        taskId: task.id,
        bizScope: task.bizScope || '成品检',
        qcNo: task.qcNo || '',
        qcStatus: task.qcStatus || '',
        qcResult: line?.lineQcResult || task.qcResult || '',
        inspectQty: line?.inspectQty ?? line?.receiptQty ?? task.inspectQty ?? '',
        inspector: task.inspector || '',
        inspectedAt: task.inspectedAt || '',
      })
    })
  })
  return rows
}

/** 盘点入库 → 关联盘点单 */
export function listRelatedStocktakesForInbound(inbound) {
  if (!inbound || !isStocktakeInbound(inbound)) return []
  void stocktakeOrderState.orders
  const byId = new Map()
  const push = (row) => {
    if (row?.id) byId.set(row.id, row)
  }
  if (inbound.stocktakeOrderId) push(getStocktakeOrderById(inbound.stocktakeOrderId))
  const no = String(inbound.stocktakeDocNo || inbound.sourceOrderNo || '').trim()
  if (no) {
    const hit = (stocktakeOrderState.orders || []).find((o) => o.docNo === no)
    push(hit)
  }
  return [...byId.values()].map((row) => ({
    ...row,
    stocktakeQty: sumLineQty(row.lineItems || [], ['qty', 'countQty', 'bookQty']),
  }))
}

/** 调拨入库 → 关联调拨单 */
export function listRelatedTransfersForInbound(inbound) {
  if (!inbound || !isTransferInbound(inbound)) return []
  void transferOrderState.orders
  const byId = new Map()
  const push = (row) => {
    if (row?.id) byId.set(row.id, row)
  }
  if (inbound.transferOrderId) push(getTransferOrderById(inbound.transferOrderId))
  const no = String(inbound.transferDocNo || inbound.sourceOrderNo || '').trim()
  if (no) {
    const hit = (transferOrderState.orders || []).find((o) => o.docNo === no)
    push(hit)
  }
  return [...byId.values()].map((row) => ({
    ...row,
    transferQty: sumLineQty(row.lineItems || [], ['qty']),
  }))
}

/** 余料入库 → 关联下料结算明细行 */
export function listRelatedCutSettleLinesForInbound(inbound) {
  if (!inbound || !isRemnantInbound(inbound)) return []
  void cutSettleState.records
  const id = inbound.id
  const docNo = inbound.docNo
  const records = (cutSettleState.records || []).filter(
    (r) =>
      (id &&
        (r.remnantInboundId === id || (r.lines || []).some((l) => l.remnantInboundId === id))) ||
      (docNo &&
        (r.remnantInboundDocNo === docNo ||
          (r.lines || []).some((l) => l.remnantInboundDocNo === docNo))),
  )
  return flattenCutSettleLines(records).map((row) => ({
    ...row,
    variantSummary: row.variantSummary || '',
  }))
}
