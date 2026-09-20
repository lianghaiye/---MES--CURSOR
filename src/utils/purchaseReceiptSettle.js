/**
 * 采购收货单 ↔ 质检/入库结清：
 * - 释放未入库（含质检不可入）的收货占用
 * - 入库确认后按结果回写收货单状态，满足条件则自动「已完成」
 */
import { QC_TASK_RESULT, QC_TASK_STATUS, listQcTasks } from '@/store/qcTaskStore'
import {
  getPurchaseReceiptById,
  updatePurchaseReceipt,
  hasUnfinishedReceiptQc,
  hasUnfinishedReceiptInbound,
} from '@/store/purchaseReceiptStore'

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function lineKey(line) {
  return String(line?.poLineId || line?.id || line?.itemCode || '').trim()
}

function matchReceiptLine(receiptLine, inboundLine) {
  const a = lineKey(receiptLine)
  const b = String(inboundLine?.poLineId || '').trim()
  if (a && b && a === b) return true
  const codeA = String(receiptLine?.itemCode || receiptLine?.productCode || '').trim()
  const codeB = String(inboundLine?.itemCode || inboundLine?.productCode || '').trim()
  return Boolean(codeA && codeB && codeA === codeB)
}

function isConfirmedInboundOrder(order) {
  return order?.status === '已完成' || order?.status === '已入库' || order?.status === '已确认'
}

function isActiveInboundOrder(order) {
  if (!order) return false
  const status = order.status || ''
  return status !== '已作废' && status !== '已取消' && status !== '已拒绝'
}

function getInboundOrdersLazy() {
  // eslint-disable-next-line global-require
  const { inboundOrderState } = require('@/store/inboundOrderStore')
  return inboundOrderState?.orders || []
}

/** 收货单关联的入库单 */
export function listInboundOrdersForReceipt(receipt) {
  if (!receipt) return []
  const idSet = new Set((receipt.inboundOrderIds || []).filter(Boolean))
  const nos = String(receipt.inboundOrderNo || '')
    .split(/[、,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return getInboundOrdersLazy().filter((o) => {
    if (!isActiveInboundOrder(o)) return false
    if (o.purchaseReceiptId && o.purchaseReceiptId === receipt.id) return true
    if (idSet.has(o.id)) return true
    if (nos.length && nos.includes(String(o.docNo || '').trim())) return true
    return false
  })
}

/** 某收货行已确认入库数量 */
export function calcReceiptLineConfirmedInboundQty(receipt, receiptLine) {
  let total = 0
  listInboundOrdersForReceipt(receipt).forEach((order) => {
    if (!isConfirmedInboundOrder(order)) return
    ;(order.lineItems || []).forEach((li) => {
      if (!matchReceiptLine(receiptLine, li)) return
      if ((li.lineStatus || '') === '已拒绝') return
      total += Number(li.qty) || 0
    })
  })
  return round4(total)
}

/** 收货单关联的有效质检任务（非终止） */
export function findActiveQcTasksForReceipt(receipt) {
  if (!receipt?.id && !receipt?.receiptNo) return []
  let list = listQcTasks({
    ...(receipt.id ? { sourceDocId: receipt.id } : {}),
    bizScope: '来料质检',
  }).filter((t) => t.qcStatus !== QC_TASK_STATUS.CANCELLED)

  if (!list.length && receipt.receiptNo) {
    const no = String(receipt.receiptNo).trim()
    list = listQcTasks({ bizScope: '来料质检' })
      .filter((t) => t.qcStatus !== QC_TASK_STATUS.CANCELLED)
      .filter((t) => String(t.sourceDocNo || '').trim() === no)
  }
  return list
}

function findQcLineForReceiptLine(task, receiptLine) {
  if (!task) return null
  const code = String(receiptLine?.itemCode || receiptLine?.productCode || '').trim()
  const poLineId = String(receiptLine?.poLineId || '').trim()
  return (
    (task.lineItems || []).find((ql) => {
      if (poLineId && String(ql.poLineId || '').trim() === poLineId) return true
      const qcCode = String(ql.itemCode || ql.productCode || '').trim()
      return Boolean(code && qcCode && code === qcCode)
    }) || null
  )
}

/**
 * 该收货行「可入库上限」：
 * - 无有效质检 / 质检终止：= 收货数量
 * - 质检通过：= 收货数量
 * - 质检不通过：= 0
 * - 部分通过：= 合格入库数（无则 0）
 */
export function calcReceiptLineInboundableQty(receipt, receiptLine, qcTasks) {
  const receiptQty = round4(Number(receiptLine?.receiptQty) || 0)
  const tasks = qcTasks || findActiveQcTasksForReceipt(receipt)
  if (!tasks.length) return receiptQty

  const completed = tasks.filter((t) => t.qcStatus === QC_TASK_STATUS.COMPLETED)
  if (!completed.length) {
    // 质检未完成：暂不释放，占用仍为收货数量
    return receiptQty
  }

  // 多张已完成时取最新
  const task = [...completed].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )[0]

  if (task.qcResult === QC_TASK_RESULT.FAIL) return 0
  if (task.qcResult === QC_TASK_RESULT.PASS) return receiptQty
  if (task.qcResult === QC_TASK_RESULT.PARTIAL) {
    const ql = findQcLineForReceiptLine(task, receiptLine)
    if (!ql || ql.acceptInboundQty == null || ql.acceptInboundQty === '') return 0
    const accept = round4(Number(ql.acceptInboundQty) || 0)
    return Math.max(0, Math.min(receiptQty, accept))
  }
  return receiptQty
}

/** 某收货行已挂在「未确认」入库单上的数量（避免与 openOccupy 双计） */
export function calcReceiptLinePendingInboundQty(receipt, receiptLine) {
  let total = 0
  listInboundOrdersForReceipt(receipt).forEach((order) => {
    if (isConfirmedInboundOrder(order)) return
    if (!isActiveInboundOrder(order)) return
    ;(order.lineItems || []).forEach((li) => {
      if (!matchReceiptLine(receiptLine, li)) return
      const st = li.lineStatus || '待入库'
      if (st === '已入库' || st === '已拒绝') return
      total += Number(li.qty) || 0
    })
  })
  return round4(total)
}

/** 收货行当前对采购池的占用（已入库、已释放、已挂未确认入库单的部分不占） */
export function calcReceiptLineOpenOccupyQty(receipt, receiptLine) {
  if (!receipt || !receiptLine) return 0
  if (receipt.receiptStatus === '已完成' || receipt.receiptStatus === '作废') return 0
  const receiptQty = round4(Number(receiptLine.receiptQty) || 0)
  const released = round4(Number(receiptLine.releasedQty) || 0)
  const inbounded = calcReceiptLineConfirmedInboundQty(receipt, receiptLine)
  const pending = calcReceiptLinePendingInboundQty(receipt, receiptLine)
  return Math.max(0, round4(receiptQty - released - inbounded - pending))
}

/**
 * 按质检结果释放「不可入库」数量（不通过 / 部分通过超出合格入库的部分）
 * 若无可入库量且无未完成入库，则自动结清为「已完成」
 */
export function releaseReceiptQtyByQcResult(receiptId, task) {
  const receipt = getPurchaseReceiptById(receiptId)
  if (!receipt || receipt.receiptStatus === '作废') return null
  if (!task || task.qcStatus !== QC_TASK_STATUS.COMPLETED) return null

  const lineItems = (receipt.lineItems || []).map((li) => {
    const receiptQty = round4(Number(li.receiptQty) || 0)
    const inboundable = calcReceiptLineInboundableQty(receipt, li, [task])
    const mustRelease = Math.max(0, round4(receiptQty - inboundable))
    const releasedQty = Math.max(round4(Number(li.releasedQty) || 0), mustRelease)
    return { ...li, releasedQty }
  })

  const totalInboundable = lineItems.reduce(
    (sum, li) => sum + calcReceiptLineInboundableQty(receipt, li, [task]),
    0,
  )

  const patch = { lineItems }
  // 全部不可入库：无需入库，直接结清
  if (totalInboundable <= 1e-9 && !hasUnfinishedReceiptInbound({ ...receipt, lineItems })) {
    patch.inboundStatus = '已入库'
    patch.receiptStatus = '已完成'
    patch.lineItems = lineItems.map((li) => {
      const receiptQty = round4(Number(li.receiptQty) || 0)
      return {
        ...li,
        releasedQty: Math.max(round4(Number(li.releasedQty) || 0), receiptQty),
      }
    })
  }

  return updatePurchaseReceipt(receiptId, patch)
}

/**
 * 入库确认后：回写收货入库进度、释放剩余、满足条件则自动完成
 */
export function syncPurchaseReceiptAfterInboundConfirm(inboundOrder) {
  if (!inboundOrder) return null
  const receiptId = inboundOrder.purchaseReceiptId || findReceiptIdByInboundOrder(inboundOrder)
  if (!receiptId) return null

  const receipt = getPurchaseReceiptById(receiptId)
  if (!receipt || receipt.receiptStatus === '作废') return null

  const qcTasks = findActiveQcTasksForReceipt(receipt)
  const lineItems = (receipt.lineItems || []).map((li) => {
    const receiptQty = round4(Number(li.receiptQty) || 0)
    const inbounded = calcReceiptLineConfirmedInboundQty(receipt, li)
    const inboundable = calcReceiptLineInboundableQty(receipt, li, qcTasks)
    // 不可入库部分必须释放；已入库部分不再占用（通过 occupy 公式扣减）
    const mustRelease = Math.max(0, round4(receiptQty - inboundable))
    const releasedQty = Math.max(round4(Number(li.releasedQty) || 0), mustRelease)
    return { ...li, releasedQty, inboundedQty: inbounded }
  })

  const totals = lineItems.reduce(
    (acc, li) => {
      const receiptQty = round4(Number(li.receiptQty) || 0)
      const inboundable = calcReceiptLineInboundableQty({ ...receipt, lineItems }, li, qcTasks)
      const inbounded = round4(Number(li.inboundedQty) || 0)
      acc.receiptQty += receiptQty
      acc.inboundable += inboundable
      acc.inbounded += inbounded
      return acc
    },
    { receiptQty: 0, inboundable: 0, inbounded: 0 },
  )

  let inboundStatus = '待入库'
  if (totals.inboundable <= 1e-9) {
    // 全部不可入库（质检不通过）
    inboundStatus = '已入库'
  } else if (totals.inbounded <= 1e-9) {
    inboundStatus =
      receipt.inboundOrderIds?.length || inboundOrder.id
        ? '入库中'
        : receipt.inboundStatus || '待入库'
    if (inboundStatus === '已入库') inboundStatus = '入库中'
  } else if (totals.inbounded + 1e-9 >= totals.inboundable) {
    inboundStatus = '已入库'
  } else {
    inboundStatus = '部分入库'
  }

  const patch = {
    lineItems,
    inboundStatus,
  }

  // 关联入库单 id
  const ids = new Set(receipt.inboundOrderIds || [])
  if (inboundOrder.id) ids.add(inboundOrder.id)
  patch.inboundOrderIds = [...ids]
  if (inboundOrder.docNo) {
    const prevNos = String(receipt.inboundOrderNo || '')
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    patch.inboundOrderNo = [...new Set([...prevNos, inboundOrder.docNo])].join('、')
  }

  const nextReceipt = { ...receipt, ...patch }
  const qcDone = !hasUnfinishedReceiptQc(nextReceipt)
  // 重新判断未完成入库：若本单已全部确认且 inboundStatus 已入库，则不算未完成
  const inboundDone =
    inboundStatus === '已入库' || !hasUnfinishedReceiptInbound({ ...nextReceipt, inboundStatus })

  const allInboundableDone =
    totals.inboundable <= 1e-9 || totals.inbounded + 1e-9 >= totals.inboundable

  if (qcDone && inboundDone && allInboundableDone) {
    // 结清：释放一切剩余占用
    patch.lineItems = lineItems.map((li) => {
      const receiptQty = round4(Number(li.receiptQty) || 0)
      const inbounded = round4(Number(li.inboundedQty) || 0)
      return {
        ...li,
        releasedQty: Math.max(round4(Number(li.releasedQty) || 0), round4(receiptQty - inbounded)),
      }
    })
    patch.inboundStatus = '已入库'
    patch.receiptStatus = '已完成'
  }

  return updatePurchaseReceipt(receiptId, patch)
}

function findReceiptIdByInboundOrder(order) {
  if (!order) return ''
  // eslint-disable-next-line global-require
  const { purchaseReceiptState } = require('@/store/purchaseReceiptStore')
  const hit = (purchaseReceiptState.receipts || []).find((r) => {
    if ((r.inboundOrderIds || []).includes(order.id)) return true
    const nos = String(r.inboundOrderNo || '')
      .split(/[、,，]/)
      .map((s) => s.trim())
    return nos.includes(String(order.docNo || '').trim())
  })
  return hit?.id || ''
}
