/**
 * 按单库存：未满足数量、入库切开、发货预分配
 */
import {
  listDedicatedBatches,
  listFreeBatches,
  sumDedicatedQty,
  BATCH_STATUS,
} from '@/store/stockBatchStore'
import {
  STOCK_FULFILLMENT_MODE,
  normalizeStockFulfillmentMode,
} from '@/utils/salesStockFulfillment'
import { salesOrderState } from '@/store/salesOrderStore'

function roundQty(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

export function findSalesOrderByNoOrId({ salesOrderId, salesOrderNo } = {}) {
  const list = salesOrderState.orders || []
  if (salesOrderId) {
    const byId = list.find((o) => o.id === salesOrderId)
    if (byId) return byId
  }
  const no = String(salesOrderNo || '').trim()
  if (!no) return null
  return list.find((o) => o.orderNo === no) || null
}

/** 本行已按单入库累计（在库挂本行 + 已出库挂本行的历史量用「订货−在库」近似：用 dedicated 在库 + 发货已扣） */
export function getLineDedicatedFulfilledQty(salesOrder, salesLine) {
  if (!salesOrder || !salesLine) return 0
  const lineId = salesLine.id
  const code = String(salesLine.productCode || '').trim()
  const inStock = sumDedicatedQty({
    salesOrderId: salesOrder.id,
    salesLineId: lineId,
    itemCode: code || undefined,
    inStockOnly: true,
  })
  // 已发给本单：从发货申请累计（与软占用释放口径接近）
  let shipped = 0
  ;(salesOrder.deliveryApplications || []).forEach((app) => {
    ;(app.lineItems || []).forEach((li) => {
      if (li.salesLineId === lineId || (li.productCode === code && !li.salesLineId)) {
        shipped += Number(li.shipQty || li.actualShipQty || 0) || 0
      }
    })
  })
  // 避免重复：在库部分不应再加进 shipped；fulfilled = 在库 + 已发出
  return roundQty(inStock + shipped)
}

export function getLineUnmetDedicatedQty(salesOrder, salesLine) {
  const need = Math.max(0, Number(salesLine?.salesQty ?? salesLine?.qty) || 0)
  const done = getLineDedicatedFulfilledQty(salesOrder, salesLine)
  return Math.max(0, roundQty(need - done))
}

/**
 * 按物料编码匹配销售行，同编码多行按顺序占未满足数量，切开本次入库 pieceValues
 * @returns {{ segments: Array<{ salesLineId, salesOrderId, salesOrderNo, pieceValues, dedicatedQty }>, freePieceValues: number[], dedicatedTotal: number, freeTotal: number }}
 */
export function splitInboundPieceValuesForSalesOrder({
  salesOrder,
  itemCode,
  pieceValues = [],
  preferredSalesLineId = '',
} = {}) {
  const values = (pieceValues || []).map(Number).filter((v) => v > 0)
  const empty = {
    segments: [],
    freePieceValues: values,
    dedicatedTotal: 0,
    freeTotal: roundQty(values.reduce((s, v) => s + v, 0)),
  }
  if (!salesOrder || !values.length) return empty

  const code = String(itemCode || '').trim()
  let lines = (salesOrder.lineItems || []).filter(
    (l) => String(l.productCode || '').trim() === code,
  )
  if (!lines.length) {
    lines = (salesOrder.lineItems || []).slice()
  }
  if (preferredSalesLineId) {
    const pref = lines.find((l) => l.id === preferredSalesLineId)
    if (pref) lines = [pref, ...lines.filter((l) => l.id !== preferredSalesLineId)]
  }

  const queue = values.slice()
  const segments = []
  let dedicatedTotal = 0

  for (const line of lines) {
    if (!queue.length) break
    let unmet = getLineUnmetDedicatedQty(salesOrder, line)
    if (!(unmet > 0)) continue
    const takeValues = []
    while (queue.length && unmet > 1e-9) {
      const next = queue[0]
      if (next <= unmet + 1e-9) {
        takeValues.push(queue.shift())
        unmet = roundQty(unmet - next)
      } else {
        // 拆开单件数量：一部分打单、一部分自由
        takeValues.push(unmet)
        queue[0] = roundQty(next - unmet)
        unmet = 0
      }
    }
    if (!takeValues.length) continue
    const dedicatedQty = roundQty(takeValues.reduce((s, v) => s + v, 0))
    dedicatedTotal = roundQty(dedicatedTotal + dedicatedQty)
    segments.push({
      salesLineId: line.id,
      salesOrderId: salesOrder.id,
      salesOrderNo: salesOrder.orderNo,
      pieceValues: takeValues,
      dedicatedQty,
    })
  }

  const freePieceValues = queue
  const freeTotal = roundQty(freePieceValues.reduce((s, v) => s + v, 0))
  return { segments, freePieceValues, dedicatedTotal, freeTotal }
}

export function previewInboundDedicatedSplit({
  salesOrderId,
  salesOrderNo,
  itemCode,
  pieceValues,
  preferredSalesLineId,
} = {}) {
  const salesOrder = findSalesOrderByNoOrId({ salesOrderId, salesOrderNo })
  return splitInboundPieceValuesForSalesOrder({
    salesOrder,
    itemCode,
    pieceValues,
    preferredSalesLineId,
  })
}

function sortBatchesFifo(batches) {
  return (batches || []).slice().sort((a, b) => {
    const na = String(a.batchNo || '')
    const nb = String(b.batchNo || '')
    return na.localeCompare(nb, 'zh-CN')
  })
}

/** 从候选批次按 FIFO 凑数量 */
export function allocateFromBatches(batches, demandQty) {
  const need = roundQty(demandQty)
  if (!(need > 0)) return { ok: false, message: '数量须大于 0', allocations: [], available: 0 }
  const list = sortBatchesFifo(batches).filter(
    (b) => b.status === BATCH_STATUS.IN_STOCK && Number(b.currentLength) > 0,
  )
  const available = roundQty(list.reduce((s, b) => s + (Number(b.currentLength) || 0), 0))
  if (available < need) {
    return {
      ok: false,
      message: `可用库存不足（需 ${need}，可用 ${available}）`,
      allocations: [],
      available,
    }
  }
  let left = need
  const allocations = []
  for (const b of list) {
    if (!(left > 0)) break
    const avail = roundQty(Number(b.currentLength) || 0)
    const take = roundQty(Math.min(avail, left))
    if (!(take > 0)) continue
    allocations.push({
      batchId: b.id,
      batchNo: b.batchNo,
      qty: take,
      unit: b.unit || '',
      salesOrderId: b.salesOrderId || '',
      salesOrderNo: b.salesOrderNo || '',
      salesLineId: b.salesLineId || '',
    })
    left = roundQty(left - take)
  }
  return { ok: true, allocations, available }
}

/**
 * 销售发货预分配
 * force_mto：仅本单按单批；prefer_stock：先本单再自由；stock_only：仅自由
 */
export function preallocateDeliveryBatches({
  salesOrder,
  salesLine,
  itemCode,
  warehouse,
  shipQty,
  stockFulfillmentMode,
} = {}) {
  const need = roundQty(shipQty)
  if (!(need > 0)) return { ok: false, message: '发货数量须大于 0', allocations: [] }
  const mode = normalizeStockFulfillmentMode(
    stockFulfillmentMode || salesLine?.stockFulfillmentMode,
  )
  const code = String(itemCode || salesLine?.productCode || '').trim()
  const dedicated = listDedicatedBatches({
    salesOrderId: salesOrder?.id,
    salesOrderNo: salesOrder?.orderNo,
    salesLineId: salesLine?.id,
    itemCode: code,
    warehouse: warehouse || undefined,
  })
  const free = listFreeBatches({
    warehouse: warehouse || undefined,
    itemCode: code,
  })

  if (mode === STOCK_FULFILLMENT_MODE.FORCE_MTO) {
    const res = allocateFromBatches(dedicated, need)
    if (!res.ok) {
      return {
        ok: false,
        message: `强制按单：本单按单库存不足（需 ${need}，可用 ${res.available}）`,
        allocations: [],
        available: res.available,
      }
    }
    return { ...res, mode }
  }

  if (mode === STOCK_FULFILLMENT_MODE.STOCK_ONLY) {
    const res = allocateFromBatches(free, need)
    if (!res.ok) {
      return {
        ok: false,
        message: `仅现货：自由备货不足（需 ${need}，可用 ${res.available}）`,
        allocations: [],
        available: res.available,
      }
    }
    return { ...res, mode }
  }

  // prefer_stock：先本单，再自由
  const dedQty = roundQty(dedicated.reduce((s, b) => s + (Number(b.currentLength) || 0), 0))
  const takeDed = Math.min(need, dedQty)
  const allocations = []
  if (takeDed > 0) {
    const r1 = allocateFromBatches(dedicated, takeDed)
    if (!r1.ok) return { ...r1, mode }
    allocations.push(...r1.allocations)
  }
  const remain = roundQty(need - takeDed)
  if (remain > 0) {
    const r2 = allocateFromBatches(free, remain)
    if (!r2.ok) {
      return {
        ok: false,
        message: `优先现货：本单 ${takeDed} + 自由备货不足（还需 ${remain}，自由可用 ${r2.available}）`,
        allocations: [],
        available: roundQty(takeDed + r2.available),
      }
    }
    allocations.push(...r2.allocations)
  }
  return {
    ok: true,
    allocations,
    available: roundQty(dedQty + free.reduce((s, b) => s + (Number(b.currentLength) || 0), 0)),
    mode,
  }
}

export function formatAllocationsBarcode(allocations = []) {
  return [...new Set((allocations || []).map((a) => a.batchNo).filter(Boolean))].join('、')
}

export function resolveWorkOrderNoFromInbound(order) {
  const wos = order?.workOrders || []
  const first = wos[0]
  return String(first?.code || first?.orderNo || first?.workOrderNo || '').trim()
}
