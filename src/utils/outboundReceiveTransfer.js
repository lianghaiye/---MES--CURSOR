/**
 * 领料出库确认后：在领入仓生成「领料入库」单（头状态已入库），并入账。
 * 发料出库（外协发到厂外）不走此链路。
 */

import dayjs from 'dayjs'
import { addInboundOrder } from '@/store/inboundOrderStore'
import { adjustStockQty } from '@/store/stockStore'
import { createBatch, getBatchById } from '@/store/stockBatchStore'
import { getLineBatchAllocations } from '@/utils/outboundBatchAllocate'
import { createInboundLine } from '@/mock/inboundOrders'

const MATERIAL_REQ_OUTBOUND_TYPE = '领料出库'

/**
 * @param {object} order 已完成发料仓扣减的出库单
 * @param {{ lineIds?: string[], operator?: string }} [options]
 * @returns {{ ok: boolean, message?: string, transferred?: boolean, inboundOrder?: object }}
 */
export function transferOutboundToReceiveWarehouse(order, { lineIds, operator = 'admin1' } = {}) {
  if (!order) return { ok: false, message: '出库单不存在' }
  if (order.outboundType !== MATERIAL_REQ_OUTBOUND_TYPE) {
    return { ok: true, transferred: false }
  }
  const receiveWh = String(order.receiveWarehouse || '').trim()
  if (!receiveWh) {
    return { ok: true, transferred: false }
  }

  const targetLines = (order.lineItems || []).filter((line) => {
    if (lineIds?.length && !lineIds.includes(line.id)) return false
    if (line.stockTransferredToReceive) return false
    if ((line.lineStatus || '待出库') === '已拒绝') return false
    const shipWh = String(line.shipWarehouse || order.warehouse || '').trim()
    if (!shipWh || shipWh === receiveWh) return false
    const qty = Number(line.shipQty) || 0
    return qty > 0
  })

  if (!targetLines.length) {
    return { ok: true, transferred: false }
  }

  const inboundLines = []
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  for (const line of targetLines) {
    const qty = Number(line.shipQty) || 0
    const allocs = getLineBatchAllocations(line)
    const useBatches =
      Boolean(line.isVariableLength) || allocs.length > 0 || Boolean(line.pickedBatchId)

    const inboundLine = createInboundLine({
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: line.itemType || order.itemType || '物料',
      specAttr: line.specAttr,
      specModel: line.specModel,
      material: line.material,
      drawingNo: line.drawingNo,
      qty,
      unit: line.unit || '件',
      warehouse: receiveWh,
      sourceDocNo: order.docNo,
      lineSource: '生产',
      lineStatus: '已入库',
      isVariableLength: Boolean(line.isVariableLength),
      outboundLineId: line.id,
    })

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
      const batchNos = []
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
          sourceType: '领料入库',
          sourceDocNo: order.docNo,
          parentBatchId: a.batchId || '',
          attrs: {
            ...(source?.attrs || {}),
            barcodeType: source?.attrs?.barcodeType || line.barcodeType,
            transferFrom: String(line.shipWarehouse || order.warehouse || '').trim(),
            transferFromBatchNo: a.batchNo || source?.batchNo || '',
          },
        })
        receiveBatchIds.push(created.id)
        if (created.batchNo) batchNos.push(created.batchNo)
      }
      inboundLine.batchNos = batchNos
      inboundLine.isVariableLength = true
      line.receiveBatchIds = receiveBatchIds
    } else {
      adjustStockQty({
        warehouse: receiveWh,
        itemCode: line.itemCode,
        itemName: line.itemName || '',
        unit: line.unit || '件',
        delta: qty,
      })
    }

    line.receiveWarehouse = receiveWh
    line.stockTransferredToReceive = true
    line.materialInboundLineId = inboundLine.id
    inboundLines.push(inboundLine)
  }

  const inboundOrder = addInboundOrder({
    inboundType: '领料入库',
    status: '已入库',
    warehouse: receiveWh,
    itemType: order.itemType || '物料',
    sourceOrderNo: order.docNo,
    sourceType: '领料出库',
    sourceWorkshop: order.workshop || order.requisitionDept || '',
    handler: operator,
    creator: operator,
    confirmer: operator,
    confirmedAt: now,
    inboundDate: dayjs().format('YYYY-MM-DD'),
    remark: `由出库单 ${order.docNo} 确认出库自动生成`,
    outboundOrderId: order.id,
    outboundDocNo: order.docNo,
    lineItems: inboundLines,
  })

  // 强制头状态为「已入库」（addInboundOrder 可能按默认态覆盖）
  inboundOrder.status = '已入库'
  inboundOrder.confirmer = operator
  inboundOrder.confirmedAt = now
  ;(inboundOrder.lineItems || []).forEach((l) => {
    l.lineStatus = '已入库'
  })

  if (!Array.isArray(order.linkedInboundOrders)) order.linkedInboundOrders = []
  order.linkedInboundOrders.push({
    id: inboundOrder.id,
    docNo: inboundOrder.docNo,
    createdAt: now,
  })

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

  return { ok: true, transferred: true, inboundOrder }
}
