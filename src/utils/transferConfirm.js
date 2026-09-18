/**
 * 调拨两段编排：
 * 1) 出库方确认：软锁调出仓 + 调拨出库凭证 + 调拨入库（待入库或自动完结）
 * 2) 入库签收：同批次迁仓；拒绝：解锁 + 红冲出库
 * 不改销售归属 / 软占用；批次号复用。
 */

import dayjs from 'dayjs'
import { OUTBOUND_SOURCE } from '@/mock/outboundOptions'
import { INBOUND_SOURCE } from '@/mock/inboundOptions'
import { addOutboundOrder, outboundState } from '@/store/outboundStore'
import { addInboundOrder, inboundOrderState } from '@/store/inboundOrderStore'
import { getBatchById, syncAggregateStockFromBatches } from '@/store/stockBatchStore'
import { createOutboundLine } from '@/mock/outboundOrders'
import { createInboundLine } from '@/mock/inboundOrders'
import { isTransferRequireInboundConfirm } from '@/store/transferSettingsStore'
import {
  addTransferSoftLock,
  releaseTransferSoftLocksByLineIds,
} from '@/store/transferSoftLockStore'
import { TRANSFER_LINE_STATUS, TRANSFER_STATUS } from '@/mock/transferOptions'

function genDocNo(prefix) {
  return `${prefix}${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

/** 批次迁至调入仓（复用批次号，保留销售归属） */
export function moveTransferBatchToWarehouse(batchId, toWarehouse) {
  const batch = getBatchById(batchId)
  if (!batch) return { ok: false, message: '批次不存在' }
  const fromWh = batch.warehouse
  const toWh = String(toWarehouse || '').trim()
  if (!toWh) return { ok: false, message: '调入仓库无效' }
  if (fromWh === toWh) return { ok: true, batch }
  batch.warehouse = toWh
  batch.attrs = {
    ...(batch.attrs || {}),
    transferFrom: fromWh,
    transferMovedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  syncAggregateStockFromBatches(fromWh, batch.itemCode, batch.itemName, batch.unit)
  syncAggregateStockFromBatches(toWh, batch.itemCode, batch.itemName, batch.unit)
  return { ok: true, batch }
}

/**
 * 出库方确认（整单待确认行）
 * @returns {{ ok: boolean, message?: string, outbound?: object, inboundOrder?: object, confirmedLineIds?: string[], autoCompleted?: boolean }}
 */
export function postTransferOutboundConfirm(transferOrder, lines, { operator = 'admin1' } = {}) {
  if (!transferOrder) return { ok: false, message: '调拨单不存在' }
  const fromWh = String(transferOrder.fromWarehouse || '').trim()
  const toWh = String(transferOrder.toWarehouse || '').trim()
  if (!fromWh || !toWh) return { ok: false, message: '请填写调出/调入仓库' }
  if (fromWh === toWh) return { ok: false, message: '调出仓库与调入仓库不能相同' }

  const pending = (lines || []).filter((l) => {
    const st = l.lineStatus || TRANSFER_LINE_STATUS.PENDING
    return st === TRANSFER_LINE_STATUS.PENDING && Number(l.qty) > 0
  })
  if (!pending.length) return { ok: false, message: '没有可确认的明细' }

  const needInbound = isTransferRequireInboundConfirm()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  const outboundLines = pending.map((line) => {
    const obLine = createOutboundLine({
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: line.itemType || '物料',
      specModel: line.specModel,
      material: line.material,
      unit: line.unit || '件',
      shipQty: Number(line.qty) || 0,
      shipWarehouse: fromWh,
      locationNo: line.locationNo || '',
      lineStatus: '已出库',
      sourceDocNo: transferOrder.docNo,
      salesOrderId: line.salesOrderId || '',
      salesOrderNo: line.salesOrderNo || '',
      salesLineId: line.salesLineId || '',
      transferLineId: line.id,
      transferSoftLock: true,
    })
    if (line.batchId) {
      obLine.manualBatchPick = true
      obLine.outboundIssueRule = 'manual'
      obLine.batchAllocations = [
        {
          batchId: line.batchId,
          batchNo: line.batchNo || '',
          qty: Number(line.qty) || 0,
          unit: line.unit || '件',
        },
      ]
      obLine.manualPickBatchIds = [line.batchId]
    }
    return obLine
  })

  const obRes = addOutboundOrder({
    docNo: genDocNo('DBCK'),
    outboundType: '调拨出库',
    status: '已出库',
    warehouse: fromWh,
    receiveWarehouse: toWh,
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: transferOrder.docNo,
    sourceType: '库存调拨',
    handler: operator,
    creator: operator,
    auditor: operator,
    auditDate: now,
    remark: `由调拨单 ${transferOrder.docNo} 出库确认生成（软锁定，待签收）`,
    transferOrderId: transferOrder.id,
    transferDocNo: transferOrder.docNo,
    transferSoftLockMode: true,
    lineItems: outboundLines,
  })
  if (!obRes.ok) return { ok: false, message: obRes.message || '生成调拨出库单失败' }

  const outbound = obRes.order
  outbound.status = '已出库'
  ;(outbound.lineItems || []).forEach((l) => {
    l.lineStatus = '已出库'
  })

  pending.forEach((line) => {
    addTransferSoftLock({
      transferOrderId: transferOrder.id,
      transferLineId: line.id,
      warehouse: fromWh,
      itemCode: line.itemCode,
      itemName: line.itemName,
      batchId: line.batchId || '',
      batchNo: line.batchNo || '',
      qty: Number(line.qty) || 0,
      unit: line.unit || '件',
    })
    line.lineStatus = TRANSFER_LINE_STATUS.AWAIT_INBOUND
    line.linkedOutboundId = outbound.id
    line.linkedOutboundDocNo = outbound.docNo
  })

  const inboundLines = pending.map((line) => {
    const obLine = (outbound.lineItems || []).find((l) => l.transferLineId === line.id)
    return createInboundLine({
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: line.itemType || '物料',
      specModel: line.specModel,
      material: line.material,
      qty: Number(line.qty) || 0,
      unit: line.unit || '件',
      warehouse: toWh,
      sourceDocNo: outbound.docNo,
      lineSource: '调拨',
      lineStatus: needInbound ? '待入库' : '已入库',
      salesOrderId: line.salesOrderId || '',
      salesOrderNo: line.salesOrderNo || '',
      salesLineId: line.salesLineId || '',
      transferLineId: line.id,
      transferBatchId: line.batchId || '',
      transferBatchNo: line.batchNo || '',
      transferSoftReceive: true,
      linkedOutboundLineId: obLine?.id || '',
    })
  })

  const inboundOrder = addInboundOrder({
    inboundType: '调拨入库',
    status: needInbound ? '待入库' : '已入库',
    warehouse: toWh,
    itemType: '物料',
    sourceChannel: INBOUND_SOURCE.BUSINESS,
    sourceOrderNo: transferOrder.docNo,
    sourceType: '库存调拨',
    handler: operator,
    creator: operator,
    confirmer: needInbound ? '' : operator,
    confirmedAt: needInbound ? '' : now,
    inboundDate: dayjs().format('YYYY-MM-DD'),
    remark: `由调拨单 ${transferOrder.docNo} 生成`,
    transferOrderId: transferOrder.id,
    transferDocNo: transferOrder.docNo,
    outboundOrderId: outbound.id,
    outboundDocNo: outbound.docNo,
    transferSoftReceive: true,
    lineItems: inboundLines,
  })
  if (!inboundOrder?.id) return { ok: false, message: '生成调拨入库单失败' }
  if (!needInbound) {
    inboundOrder.status = '已入库'
    inboundOrder.confirmer = operator
    inboundOrder.confirmedAt = now
    const receiveRes = applyTransferInboundReceive(transferOrder, inboundOrder, inboundLines, {
      operator,
    })
    if (!receiveRes.ok) return receiveRes
    return {
      ok: true,
      outbound,
      inboundOrder,
      confirmedLineIds: pending.map((l) => l.id),
      autoCompleted: true,
    }
  }

  pending.forEach((line) => {
    line.linkedInboundId = inboundOrder.id
    line.linkedInboundDocNo = inboundOrder.docNo
  })

  return {
    ok: true,
    outbound,
    inboundOrder,
    confirmedLineIds: pending.map((l) => l.id),
    autoCompleted: false,
  }
}

/**
 * 调拨入库签收：迁仓 + 解锁（不新建批次）
 */
export function applyTransferInboundReceive(
  transferOrder,
  inboundOrder,
  lines,
  { operator = 'admin1' } = {},
) {
  const toWh = String(inboundOrder?.warehouse || transferOrder?.toWarehouse || '').trim()
  const list = lines || []
  for (const line of list) {
    const batchId = line.transferBatchId || ''
    if (batchId) {
      const moved = moveTransferBatchToWarehouse(batchId, toWh)
      if (!moved.ok) return moved
      line.batchNos = [moved.batch?.batchNo || line.transferBatchNo].filter(Boolean)
    }
    line.lineStatus = '已入库'
    const tfLine = (transferOrder?.lineItems || []).find((l) => l.id === line.transferLineId)
    if (tfLine) {
      tfLine.lineStatus = TRANSFER_LINE_STATUS.DONE
      tfLine.linkedInboundId = inboundOrder.id
      tfLine.linkedInboundDocNo = inboundOrder.docNo
    }
  }
  releaseTransferSoftLocksByLineIds(list.map((l) => l.transferLineId).filter(Boolean))
  void operator
  return { ok: true }
}

/**
 * 调拨入库拒绝：解锁 + 红冲关联出库明细
 */
export function applyTransferInboundRefuse(
  transferOrder,
  inboundOrder,
  lines,
  { reason = '' } = {},
) {
  const list = lines || []
  const outboundId = inboundOrder?.outboundOrderId || transferOrder?.linkedOutboundIds?.[0]
  const outbound = outboundId
    ? outboundState.orders.find((o) => o.id === outboundId)
    : outboundState.orders.find((o) => o.transferOrderId === transferOrder?.id)

  list.forEach((line) => {
    line.lineStatus = '已拒绝'
    line.refuseReason = reason
    const tfLine = (transferOrder?.lineItems || []).find((l) => l.id === line.transferLineId)
    if (tfLine) {
      tfLine.lineStatus = TRANSFER_LINE_STATUS.REFUSED
      tfLine.refuseReason = reason
    }
    if (outbound && line.linkedOutboundLineId) {
      const obLine = (outbound.lineItems || []).find((l) => l.id === line.linkedOutboundLineId)
      if (obLine) {
        obLine.lineStatus = '已拒绝'
        obLine.refuseReason = reason || '调拨入库拒绝红冲'
      }
    } else if (outbound && line.transferLineId) {
      const obLine = (outbound.lineItems || []).find(
        (l) => l.transferLineId === line.transferLineId,
      )
      if (obLine) {
        obLine.lineStatus = '已拒绝'
        obLine.refuseReason = reason || '调拨入库拒绝红冲'
      }
    }
  })

  releaseTransferSoftLocksByLineIds(list.map((l) => l.transferLineId).filter(Boolean))

  if (outbound) {
    const linesAll = outbound.lineItems || []
    const active = linesAll.filter((l) => (l.lineStatus || '') === '已出库')
    const refused = linesAll.filter((l) => (l.lineStatus || '') === '已拒绝')
    if (!active.length && refused.length === linesAll.length) {
      outbound.status = '作废'
      outbound.refuseReason = reason || '调拨入库全部拒绝，出库红冲作废'
      outbound.voidedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    } else if (refused.length && active.length) {
      outbound.status = '部分出库'
    }
  }

  return { ok: true, outbound }
}

/** 根据调拨行重算头状态 */
export function recomputeTransferStatusFromLines(order, operator = 'admin1') {
  if (!order) return
  const lines = order.lineItems || []
  if (!lines.length) {
    if (order.status !== TRANSFER_STATUS.VOIDED) order.status = TRANSFER_STATUS.PENDING
    return
  }
  if (order.status === TRANSFER_STATUS.VOIDED) return

  const done = lines.filter((l) => (l.lineStatus || '') === TRANSFER_LINE_STATUS.DONE).length
  const refused = lines.filter((l) => (l.lineStatus || '') === TRANSFER_LINE_STATUS.REFUSED).length
  const awaitIn = lines.filter(
    (l) => (l.lineStatus || '') === TRANSFER_LINE_STATUS.AWAIT_INBOUND,
  ).length
  const pending = lines.filter((l) => (l.lineStatus || '') === TRANSFER_LINE_STATUS.PENDING).length

  if (pending === lines.length) {
    order.status = TRANSFER_STATUS.PENDING
    return
  }
  if (awaitIn === lines.length) {
    order.status = TRANSFER_STATUS.AWAIT_INBOUND
    return
  }
  if (done + refused === lines.length) {
    if (done === 0) {
      order.status = TRANSFER_STATUS.REFUSED
    } else {
      order.status = TRANSFER_STATUS.DONE
      order.confirmer = order.confirmer || operator
      order.confirmedAt = order.confirmedAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
    }
    return
  }
  if (awaitIn > 0 && (done > 0 || refused > 0)) {
    order.status = TRANSFER_STATUS.PARTIAL
    return
  }
  if (awaitIn > 0) {
    order.status = TRANSFER_STATUS.AWAIT_INBOUND
    return
  }
  order.status = TRANSFER_STATUS.PARTIAL
}

/** 入库单变更后同步调拨单 */
export function syncTransferOrderFromInbound(inboundOrder, { operator = 'admin1' } = {}) {
  if (!inboundOrder?.transferOrderId) return null
  // lazy require to avoid cycle at module init
  const { getTransferOrderById } = require('@/store/transferOrderStore')
  const order = getTransferOrderById(inboundOrder.transferOrderId)
  if (!order) return null
  ;(inboundOrder.lineItems || []).forEach((il) => {
    if (!il.transferLineId) return
    const tfLine = (order.lineItems || []).find((l) => l.id === il.transferLineId)
    if (!tfLine) return
    const st = il.lineStatus || '待入库'
    if (st === '已入库') tfLine.lineStatus = TRANSFER_LINE_STATUS.DONE
    else if (st === '已拒绝') tfLine.lineStatus = TRANSFER_LINE_STATUS.REFUSED
    else if (st === '待入库') tfLine.lineStatus = TRANSFER_LINE_STATUS.AWAIT_INBOUND
    tfLine.linkedInboundId = inboundOrder.id
    tfLine.linkedInboundDocNo = inboundOrder.docNo
  })

  if (inboundOrder.id && !order.linkedInboundIds.includes(inboundOrder.id)) {
    order.linkedInboundIds.push(inboundOrder.id)
  }
  if (inboundOrder.docNo && !order.linkedInboundDocNos.includes(inboundOrder.docNo)) {
    order.linkedInboundDocNos.push(inboundOrder.docNo)
  }

  recomputeTransferStatusFromLines(order, operator)
  return order
}

export function getInboundOrderById(id) {
  return inboundOrderState.orders.find((o) => o.id === id) || null
}

/** @deprecated 旧一确认双侧入账；保留别名指向出库确认 */
export function postTransferLines(transferOrder, lines, options) {
  return postTransferOutboundConfirm(transferOrder, lines, options)
}
