/**
 * 盘点确认编排：按差异生成盘点入库 / 盘点出库并入账；不改软占用。
 */

import dayjs from 'dayjs'
import { OUTBOUND_SOURCE } from '@/mock/outboundOptions'
import { INBOUND_SOURCE } from '@/mock/inboundOptions'
import { addOutboundOrder, confirmOutbound } from '@/store/outboundStore'
import { addInboundOrder, confirmInboundOrders } from '@/store/inboundOrderStore'
import { createOutboundLine } from '@/mock/outboundOrders'
import { createInboundLine } from '@/mock/inboundOrders'
import { getBatchById } from '@/store/stockBatchStore'
import { getWarehouseStockQty } from '@/utils/inboundLineHelpers'

function genDocNo(prefix) {
  return `${prefix}${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

/** 确认前刷新账面（批次优先） */
export function resolveStocktakeBookQty(line, warehouse) {
  if (line?.batchId) {
    const b = getBatchById(line.batchId)
    if (b && b.status === '在库') return Number(b.currentLength) || 0
    return 0
  }
  return getWarehouseStockQty(warehouse, line?.itemCode) || 0
}

/**
 * @param {object} stocktakeOrder
 * @param {object} line
 * @param {{ operator?: string }} [options]
 */
export function postStocktakeLine(stocktakeOrder, line, { operator = 'admin1' } = {}) {
  if (!stocktakeOrder || !line) return { ok: false, message: '盘点明细不存在' }
  const warehouse = String(stocktakeOrder.warehouse || '').trim()
  if (!warehouse) return { ok: false, message: '请填写盘点仓库' }

  const bookQty = resolveStocktakeBookQty(line, warehouse)
  const actualQty = Number(line.actualQty)
  if (!Number.isFinite(actualQty) || actualQty < 0) {
    return { ok: false, message: '请填写有效实盘数量' }
  }
  const diffQty = Math.round((actualQty - bookQty) * 10000) / 10000
  line.bookQty = bookQty
  line.diffQty = diffQty

  if (diffQty === 0) {
    return { ok: true, diffQty: 0, outbound: null, inboundOrder: null }
  }

  if (diffQty > 0) {
    const inbound = addInboundOrder({
      docNo: genDocNo('PDYK'),
      inboundType: '盘点入库',
      status: '待入库',
      warehouse,
      sourceChannel: INBOUND_SOURCE.BUSINESS,
      sourceOrderNo: stocktakeOrder.docNo,
      sourceType: '库存盘点',
      handler: operator,
      creator: operator,
      remark: `由盘点单 ${stocktakeOrder.docNo} 盘盈生成`,
      stocktakeOrderId: stocktakeOrder.id,
      stocktakeDocNo: stocktakeOrder.docNo,
      lineItems: [
        createInboundLine({
          itemCode: line.itemCode,
          itemName: line.itemName,
          itemType: line.itemType || '物料',
          specModel: line.specModel,
          material: line.material,
          qty: diffQty,
          unit: line.unit || '件',
          warehouse,
          lineSource: '盘点',
          lineStatus: '待入库',
          stocktakeLineId: line.id,
        }),
      ],
    })
    const res = confirmInboundOrders([inbound.id], operator)
    if (res.blocked?.length) {
      return { ok: false, message: res.blocked.map((b) => b.message).join('；') || '盘盈入库失败' }
    }
    line.linkedInboundId = inbound.id
    line.linkedInboundDocNo = inbound.docNo
    return { ok: true, diffQty, inboundOrder: inbound, outbound: null }
  }

  // 盘亏
  const lossQty = Math.abs(diffQty)
  const obLine = createOutboundLine({
    itemCode: line.itemCode,
    itemName: line.itemName,
    itemType: line.itemType || '物料',
    specModel: line.specModel,
    material: line.material,
    unit: line.unit || '件',
    shipQty: lossQty,
    shipWarehouse: warehouse,
    lineStatus: '待出库',
    sourceDocNo: stocktakeOrder.docNo,
    stocktakeLineId: line.id,
  })
  if (line.batchId) {
    obLine.manualBatchPick = true
    obLine.outboundIssueRule = 'manual'
    obLine.batchAllocations = [
      {
        batchId: line.batchId,
        batchNo: line.batchNo || '',
        qty: lossQty,
        unit: line.unit || '件',
      },
    ]
    obLine.manualPickBatchIds = [line.batchId]
  }

  const obRes = addOutboundOrder({
    docNo: genDocNo('PDKK'),
    outboundType: '盘点出库',
    status: '待出库',
    warehouse,
    sourceChannel: OUTBOUND_SOURCE.BUSINESS,
    sourceOrderNo: stocktakeOrder.docNo,
    sourceType: '库存盘点',
    handler: operator,
    creator: operator,
    remark: `由盘点单 ${stocktakeOrder.docNo} 盘亏生成`,
    stocktakeOrderId: stocktakeOrder.id,
    stocktakeDocNo: stocktakeOrder.docNo,
    lineItems: [obLine],
  })
  if (!obRes.ok) return { ok: false, message: obRes.message || '生成盘点出库单失败' }

  const confirmRes = confirmOutbound([obRes.order.id], { operator })
  if (confirmRes.blocked?.length) {
    return {
      ok: false,
      message: confirmRes.blocked.map((b) => b.message).join('；') || '盘亏出库确认失败',
    }
  }
  line.linkedOutboundId = obRes.order.id
  line.linkedOutboundDocNo = obRes.order.docNo
  return { ok: true, diffQty, outbound: obRes.order, inboundOrder: null }
}
