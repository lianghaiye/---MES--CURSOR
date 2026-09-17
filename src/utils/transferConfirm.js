/**
 * 调拨确认编排：生成调拨出库 + 调拨入库并入账；不改软占用。
 */

import dayjs from 'dayjs'
import { OUTBOUND_SOURCE } from '@/mock/outboundOptions'
import { INBOUND_SOURCE } from '@/mock/inboundOptions'
import { addOutboundOrder, confirmOutbound } from '@/store/outboundStore'
import { addInboundOrder } from '@/store/inboundOrderStore'
import { adjustStockQty } from '@/store/stockStore'
import { createBatch, getBatchById } from '@/store/stockBatchStore'
import { getLineBatchAllocations } from '@/utils/outboundBatchAllocate'
import { createOutboundLine } from '@/mock/outboundOrders'
import { createInboundLine } from '@/mock/inboundOrders'

function genDocNo(prefix) {
  return `${prefix}${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

/**
 * @param {object} transferOrder
 * @param {object[]} lines 待确认明细
 * @param {{ operator?: string }} [options]
 */
export function postTransferLines(transferOrder, lines, { operator = 'admin1' } = {}) {
  if (!transferOrder) return { ok: false, message: '调拨单不存在' }
  const fromWh = String(transferOrder.fromWarehouse || '').trim()
  const toWh = String(transferOrder.toWarehouse || '').trim()
  if (!fromWh || !toWh) return { ok: false, message: '请填写调出/调入仓库' }
  if (fromWh === toWh) return { ok: false, message: '调出仓库与调入仓库不能相同' }
  const pending = (lines || []).filter((l) => {
    const st = l.lineStatus || '待确认'
    return st !== '已确认' && st !== '已拒绝' && Number(l.qty) > 0
  })
  if (!pending.length) return { ok: false, message: '没有可确认的明细' }

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
      lineStatus: '待出库',
      sourceDocNo: transferOrder.docNo,
      salesOrderId: line.salesOrderId || '',
      salesOrderNo: line.salesOrderNo || '',
      salesLineId: line.salesLineId || '',
      transferLineId: line.id,
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
    status: '待出库',
    warehouse: fromWh,
    receiveWarehouse: toWh,
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: transferOrder.docNo,
    sourceType: '库存调拨',
    handler: operator,
    creator: operator,
    remark: `由调拨单 ${transferOrder.docNo} 确认生成`,
    transferOrderId: transferOrder.id,
    transferDocNo: transferOrder.docNo,
    lineItems: outboundLines,
  })
  if (!obRes.ok) return { ok: false, message: obRes.message || '生成调拨出库单失败' }

  const confirmRes = confirmOutbound([obRes.order.id], { operator })
  if (confirmRes.blocked?.length) {
    return {
      ok: false,
      message: confirmRes.blocked.map((b) => b.message).join('；') || '调拨出库确认失败',
    }
  }

  const outbound = obRes.order
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const inboundLines = []

  for (const obLine of outbound.lineItems || []) {
    const qty = Number(obLine.shipQty) || 0
    if (!(qty > 0) || (obLine.lineStatus || '') !== '已出库') continue

    const transferLineId = obLine.transferLineId
    const srcLine = pending.find((l) => l.id === transferLineId)
    const inboundLine = createInboundLine({
      itemCode: obLine.itemCode,
      itemName: obLine.itemName,
      itemType: obLine.itemType || '物料',
      specModel: obLine.specModel,
      material: obLine.material,
      qty,
      unit: obLine.unit || '件',
      warehouse: toWh,
      sourceDocNo: outbound.docNo,
      lineSource: '调拨',
      lineStatus: '已入库',
      salesOrderId: srcLine?.salesOrderId || obLine.salesOrderId || '',
      salesOrderNo: srcLine?.salesOrderNo || obLine.salesOrderNo || '',
      salesLineId: srcLine?.salesLineId || obLine.salesLineId || '',
      transferLineId,
    })

    const allocs = getLineBatchAllocations(obLine)
    const useBatches = Boolean(srcLine?.batchId) || allocs.length > 0
    if (useBatches) {
      const list = allocs.length
        ? allocs
        : [
            {
              qty,
              batchId: srcLine?.batchId,
              batchNo: srcLine?.batchNo,
              unit: srcLine?.unit || obLine.unit,
            },
          ]
      const batchNos = []
      for (const a of list) {
        const take = Number(a.qty) || 0
        if (!(take > 0)) continue
        const source = a.batchId ? getBatchById(a.batchId) : null
        const created = createBatch({
          warehouse: toWh,
          itemCode: obLine.itemCode,
          itemName: obLine.itemName,
          currentLength: take,
          unit: a.unit || obLine.unit || source?.unit || '件',
          sourceType: '调拨入库',
          sourceDocNo: outbound.docNo,
          parentBatchId: a.batchId || '',
          salesOrderId: srcLine?.salesOrderId || source?.salesOrderId || '',
          salesOrderNo: srcLine?.salesOrderNo || source?.salesOrderNo || '',
          salesLineId: srcLine?.salesLineId || source?.salesLineId || '',
          workOrderNo: source?.workOrderNo || '',
          attrs: {
            ...(source?.attrs || {}),
            transferFrom: fromWh,
            transferFromBatchNo: a.batchNo || source?.batchNo || '',
            transferDocNo: transferOrder.docNo,
          },
        })
        if (created.batchNo) batchNos.push(created.batchNo)
      }
      inboundLine.batchNos = batchNos
      if (batchNos.length) inboundLine.isVariableLength = true
    } else {
      adjustStockQty({
        warehouse: toWh,
        itemCode: obLine.itemCode,
        itemName: obLine.itemName || '',
        unit: obLine.unit || '件',
        delta: qty,
      })
    }

    inboundLines.push(inboundLine)
  }

  if (!inboundLines.length) {
    return { ok: false, message: '调拨出库已扣账，但无可入账明细' }
  }

  const inboundOrder = addInboundOrder({
    inboundType: '调拨入库',
    status: '已入库',
    warehouse: toWh,
    itemType: outbound.itemType || '物料',
    sourceChannel: INBOUND_SOURCE.BUSINESS,
    sourceOrderNo: transferOrder.docNo,
    sourceType: '库存调拨',
    handler: operator,
    creator: operator,
    confirmer: operator,
    confirmedAt: now,
    inboundDate: dayjs().format('YYYY-MM-DD'),
    remark: `由调拨单 ${transferOrder.docNo} 确认生成`,
    transferOrderId: transferOrder.id,
    transferDocNo: transferOrder.docNo,
    outboundOrderId: outbound.id,
    outboundDocNo: outbound.docNo,
    lineItems: inboundLines,
  })
  inboundOrder.status = '已入库'
  inboundOrder.confirmer = operator
  inboundOrder.confirmedAt = now
  ;(inboundOrder.lineItems || []).forEach((l) => {
    l.lineStatus = '已入库'
  })

  return {
    ok: true,
    outbound,
    inboundOrder,
    confirmedLineIds: pending.map((l) => l.id),
  }
}
