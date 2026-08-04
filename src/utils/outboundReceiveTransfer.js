/**
 * 领料/发料出库确认后：发料仓 A 已扣减，再调入领入仓 B（线边仓）
 * 避免料只从 A 消失却不进 B，导致线边无账、扣减无处下手。
 */

import { adjustStockQty } from '@/store/stockStore'
import { createBatch, getBatchById } from '@/store/stockBatchStore'
import { getLineBatchAllocations } from '@/utils/outboundBatchAllocate'

const TRANSFER_TYPES = new Set(['领料出库', '发料出库'])

/**
 * @param {object} order 已完成批次/汇总扣减的出库单
 * @param {{ lineIds?: string[] }} [options]
 * @returns {{ ok: boolean, message?: string, transferred?: boolean }}
 */
export function transferOutboundToReceiveWarehouse(order, { lineIds } = {}) {
  if (!order) return { ok: false, message: '出库单不存在' }
  if (!TRANSFER_TYPES.has(order.outboundType)) {
    return { ok: true, transferred: false }
  }
  const receiveWh = String(order.receiveWarehouse || '').trim()
  if (!receiveWh) {
    return { ok: true, transferred: false }
  }

  for (const line of order.lineItems || []) {
    if (lineIds?.length && !lineIds.includes(line.id)) continue
    if (line.stockTransferredToReceive) continue
    const shipWh = String(line.shipWarehouse || order.warehouse || '').trim()
    if (!shipWh || shipWh === receiveWh) continue
    const qty = Number(line.shipQty) || 0
    if (!(qty > 0)) continue

    const allocs = getLineBatchAllocations(line)
    const useBatches =
      Boolean(line.isVariableLength) || allocs.length > 0 || Boolean(line.pickedBatchId)

    if (useBatches) {
      const list = allocs.length
        ? allocs
        : [
            {
              qty,
              batchId: line.pickedBatchId,
              batchNo: line.pickedBatchNo || line.issuedBatchNo,
              unit: line.unit,
            },
          ]
      const receiveBatchIds = []
      for (const a of list) {
        const take = Number(a.qty) || 0
        if (!(take > 0)) continue
        const source = a.batchId ? getBatchById(a.batchId) : null
        const created = createBatch({
          warehouse: receiveWh,
          itemCode: line.itemCode,
          itemName: line.itemName,
          currentLength: take,
          unit: a.unit || line.unit || source?.unit || '米',
          sourceType: '领料转入',
          sourceDocNo: order.docNo,
          parentBatchId: a.batchId || '',
          attrs: {
            ...(source?.attrs || {}),
            barcodeType: source?.attrs?.barcodeType || line.barcodeType,
            transferFrom: shipWh,
            transferFromBatchNo: a.batchNo || source?.batchNo || '',
          },
        })
        receiveBatchIds.push(created.id)
      }
      line.receiveWarehouse = receiveWh
      line.receiveBatchIds = receiveBatchIds
    } else {
      adjustStockQty({
        warehouse: receiveWh,
        itemCode: line.itemCode,
        itemName: line.itemName || '',
        unit: line.unit || '件',
        delta: qty,
      })
      line.receiveWarehouse = receiveWh
    }
    line.stockTransferredToReceive = true
  }

  const pendingTransfer = (order.lineItems || []).some((line) => {
    if (line.lineStatus === '已出库' && !line.stockTransferredToReceive) {
      const shipWh = String(line.shipWarehouse || order.warehouse || '').trim()
      return shipWh && shipWh !== receiveWh && Number(line.shipQty) > 0
    }
    return false
  })
  if (!pendingTransfer) {
    order.stockTransferredToReceive = true
  }
  return { ok: true, transferred: true }
}
