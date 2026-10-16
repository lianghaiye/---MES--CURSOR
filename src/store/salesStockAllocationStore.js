/**
 * 销售库存软占用台账：占用 / 释放 / 跨单调拨 / 偿还 / 他单占用查询
 * 不扣账实库存，仅记录「未发货前挂在哪张销售行上」
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { stockState } from '@/store/stockStore'
import { persistJson } from '@/utils/safeStorage'

/** 延迟取主数据，避免与 productInfo/materialInfo → demo seed → 本 store 循环初始化 */
function getProductInfoState() {
  return require('@/store/productInfoStore').productInfoState
}

function getMaterialInfoState() {
  return require('@/store/materialInfoStore').materialInfoState
}

const STORAGE_KEY = 'i_doms_sales_stock_allocations'
const DATA_VERSION = 3

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.version === DATA_VERSION && Array.isArray(parsed.allocations)) {
      return {
        allocations: parsed.allocations,
        transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
        debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  persistJson(STORAGE_KEY, {
    version: DATA_VERSION,
    allocations: salesStockAllocationState.allocations,
    transfers: salesStockAllocationState.transfers,
    debts: salesStockAllocationState.debts,
  })
}

const stored = loadFromStorage()

export const salesStockAllocationState = reactive({
  allocations: stored?.allocations || [],
  transfers: stored?.transfers || [],
  debts: stored?.debts || [],
})

watch(
  () => [
    salesStockAllocationState.allocations,
    salesStockAllocationState.transfers,
    salesStockAllocationState.debts,
  ],
  () => persist(),
  { deep: true },
)

/** 全仓现存量；无台账时回退主数据 stockQty */
export function getOnHandQtyByItemCode(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return 0
  const fromLedger = (stockState.records || [])
    .filter((r) => r.itemCode === code)
    .reduce((s, r) => s + (Number(r.qty) || 0), 0)
  if (fromLedger > 0) return fromLedger
  const product = getProductInfoState().products.find((p) => p.code === code)
  if (product) {
    const q = Number(product.stockQty ?? product.inventoryQty)
    if (Number.isFinite(q)) return q
  }
  const material = getMaterialInfoState().materials.find((m) => m.code === code)
  if (material) {
    const q = Number(material.stockQty ?? material.inventoryQty)
    if (Number.isFinite(q)) return q
  }
  return 0
}

export function getSoftAllocatedQtyByItemCode(itemCode, { excludeLineId } = {}) {
  const code = String(itemCode || '').trim()
  return (salesStockAllocationState.allocations || [])
    .filter(
      (a) =>
        a.itemCode === code &&
        a.status === 'active' &&
        (Number(a.qty) || 0) > 0 &&
        (!excludeLineId || a.salesLineId !== excludeLineId),
    )
    .reduce((s, a) => s + (Number(a.qty) || 0), 0)
}

/** 某物料全部有效软占用明细（按更新时间倒序） */
export function listSoftAllocationsByItemCode(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return []
  return (salesStockAllocationState.allocations || [])
    .filter((a) => a.itemCode === code && a.status === 'active' && (Number(a.qty) || 0) > 0)
    .map((a) => ({ ...a }))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

export function getFreeQtyByItemCode(itemCode, options = {}) {
  const onHand = getOnHandQtyByItemCode(itemCode)
  const allocated = getSoftAllocatedQtyByItemCode(itemCode, options)
  return Math.max(0, onHand - allocated)
}

export function getAllocationForLine(salesOrderId, salesLineId) {
  return (
    salesStockAllocationState.allocations.find(
      (a) =>
        a.salesOrderId === salesOrderId && a.salesLineId === salesLineId && a.status === 'active',
    ) || null
  )
}

export function getLineAllocatedQty(salesOrderId, salesLineId) {
  const row = getAllocationForLine(salesOrderId, salesLineId)
  return Number(row?.qty) || 0
}

/** 他单占用明细（不含本行） */
export function listOtherOrderAllocations(itemCode, { excludeSalesOrderId, excludeLineId } = {}) {
  const code = String(itemCode || '').trim()
  return (salesStockAllocationState.allocations || [])
    .filter(
      (a) =>
        a.itemCode === code &&
        a.status === 'active' &&
        (Number(a.qty) || 0) > 0 &&
        a.salesOrderId !== excludeSalesOrderId &&
        a.salesLineId !== excludeLineId,
    )
    .map((a) => ({ ...a }))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

function upsertAllocation({
  salesOrderId,
  salesOrderNo,
  salesLineId,
  itemCode,
  itemName,
  qty,
  urgency,
  deliveryDate,
}) {
  const code = String(itemCode || '').trim()
  if (!salesOrderId || !salesLineId || !code) return null
  const nextQty = Math.max(0, Number(qty) || 0)
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  let row = salesStockAllocationState.allocations.find(
    (a) => a.salesOrderId === salesOrderId && a.salesLineId === salesLineId && a.itemCode === code,
  )
  if (!row) {
    if (nextQty <= 0) return null
    row = {
      id: `ssa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      salesOrderId,
      salesOrderNo: salesOrderNo || '',
      salesLineId,
      itemCode: code,
      itemName: itemName || '',
      qty: nextQty,
      status: 'active',
      urgency: urgency || '普通',
      deliveryDate: deliveryDate || '',
      createdAt: now,
      updatedAt: now,
    }
    salesStockAllocationState.allocations.unshift(row)
    return row
  }
  row.qty = nextQty
  row.status = nextQty > 0 ? 'active' : 'released'
  row.salesOrderNo = salesOrderNo || row.salesOrderNo
  row.itemName = itemName || row.itemName
  row.urgency = urgency || row.urgency
  row.deliveryDate = deliveryDate || row.deliveryDate
  row.updatedAt = now
  return row
}

/** 将占用设为指定数量（覆盖） */
export function setLineAllocation(payload) {
  return upsertAllocation(payload)
}

/** 增加占用（不超过剩余需求由调用方控制） */
export function increaseLineAllocation(payload) {
  const cur = getLineAllocatedQty(payload.salesOrderId, payload.salesLineId)
  return upsertAllocation({ ...payload, qty: cur + (Number(payload.qty) || 0) })
}

/** 减少占用 */
export function decreaseLineAllocation(salesOrderId, salesLineId, qty) {
  const row = getAllocationForLine(salesOrderId, salesLineId)
  if (!row) return null
  const next = Math.max(0, (Number(row.qty) || 0) - (Number(qty) || 0))
  row.qty = next
  if (next <= 0) row.status = 'released'
  row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  return row
}

/** 释放整单占用 */
export function releaseOrderAllocations(salesOrderId) {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  salesStockAllocationState.allocations.forEach((a) => {
    if (a.salesOrderId !== salesOrderId) return
    a.qty = 0
    a.status = 'released'
    a.updatedAt = now
  })
}

/**
 * 审核通过时：按行写入软占用
 * @param {object} salesOrder
 * @param {object[]} lines
 * @param {{ takeByLineId?: Record<string, number> }} [options] 指定每行占用数量；未指定则 min(需求, 自由备货)
 */
export function allocateStockOnSalesApprove(salesOrder, lines = [], options = {}) {
  const takeByLineId = options.takeByLineId || null
  const results = []
  for (const line of lines) {
    const code = String(line.productCode || '').trim()
    if (!code) continue
    const need = Number(line.salesQty ?? line.qty) || 0
    if (need <= 0) continue
    const free = getFreeQtyByItemCode(code)
    const take = takeByLineId
      ? Math.max(0, Number(takeByLineId[line.id]) || 0)
      : Math.min(need, free)
    if (take <= 0) continue
    const row = upsertAllocation({
      salesOrderId: salesOrder.id,
      salesOrderNo: salesOrder.orderNo,
      salesLineId: line.id,
      itemCode: code,
      itemName: line.productName || '',
      qty: take,
      urgency: salesOrder.urgency || line.urgency || '普通',
      deliveryDate: line.deliveryDate || salesOrder.deliveryDate || '',
    })
    results.push(row)
  }
  return results
}

/**
 * 入库补占用：优先偿还债务，再补给来源销售行未满足占用
 * @returns {{ repaid: number, allocated: number }}
 */
export function applyInboundToSalesAllocation({
  itemCode,
  qty,
  sourceSalesOrderId,
  sourceSalesOrderNo,
  sourceSalesLineId,
  itemName,
}) {
  let remain = Number(qty) || 0
  if (remain <= 0 || !itemCode) return { repaid: 0, allocated: 0 }

  let repaid = 0
  // 1) 优先偿还：任何对该编码的欠量（尤其调出方）
  const openDebts = (salesStockAllocationState.debts || [])
    .filter((d) => d.itemCode === itemCode && d.status === 'open' && (Number(d.owedQty) || 0) > 0)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))

  for (const debt of openDebts) {
    if (remain <= 0) break
    const owe = Number(debt.owedQty) || 0
    const pay = Math.min(owe, remain)
    if (pay <= 0) continue
    increaseLineAllocation({
      salesOrderId: debt.creditorOrderId,
      salesOrderNo: debt.creditorOrderNo,
      salesLineId: debt.creditorLineId,
      itemCode,
      itemName: itemName || debt.itemName,
      qty: pay,
      urgency: debt.urgency,
      deliveryDate: debt.deliveryDate,
    })
    debt.owedQty = owe - pay
    debt.repaidQty = (Number(debt.repaidQty) || 0) + pay
    if (debt.owedQty <= 0) {
      debt.owedQty = 0
      debt.status = 'closed'
    }
    debt.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
    remain -= pay
    repaid += pay
  }

  let allocated = 0
  // 2) 补给来源销售行（若仍有未满足需求，调用方应传入目标占用上限；此处直接增加）
  if (remain > 0 && sourceSalesOrderId && sourceSalesLineId) {
    increaseLineAllocation({
      salesOrderId: sourceSalesOrderId,
      salesOrderNo: sourceSalesOrderNo,
      salesLineId: sourceSalesLineId,
      itemCode,
      itemName,
      qty: remain,
    })
    allocated = remain
    remain = 0
  }

  return { repaid, allocated }
}

/**
 * 跨单调拨确认
 * @param {{ fromOrderId, fromOrderNo, fromLineId, toOrderId, toOrderNo, toLineId, itemCode, itemName, qty, requireRepay, urgency, deliveryDate }}
 */
export function confirmStockTransfer(payload) {
  const qty = Number(payload.qty) || 0
  if (qty <= 0) return { ok: false, message: '调拨数量须大于 0' }
  const fromQty = getLineAllocatedQty(payload.fromOrderId, payload.fromLineId)
  if (fromQty < qty) {
    return { ok: false, message: `调出订单占用不足（当前占用 ${fromQty}）` }
  }

  decreaseLineAllocation(payload.fromOrderId, payload.fromLineId, qty)
  increaseLineAllocation({
    salesOrderId: payload.toOrderId,
    salesOrderNo: payload.toOrderNo,
    salesLineId: payload.toLineId,
    itemCode: payload.itemCode,
    itemName: payload.itemName,
    qty,
    urgency: payload.urgency,
    deliveryDate: payload.deliveryDate,
  })

  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const transfer = {
    id: `sst-${Date.now()}`,
    ...payload,
    qty,
    requireRepay: payload.requireRepay !== false,
    status: 'confirmed',
    createdAt: now,
  }
  salesStockAllocationState.transfers.unshift(transfer)

  if (transfer.requireRepay) {
    salesStockAllocationState.debts.unshift({
      id: `ssd-${Date.now()}`,
      transferId: transfer.id,
      itemCode: payload.itemCode,
      itemName: payload.itemName || '',
      creditorOrderId: payload.fromOrderId,
      creditorOrderNo: payload.fromOrderNo,
      creditorLineId: payload.fromLineId,
      debtorOrderId: payload.toOrderId,
      debtorOrderNo: payload.toOrderNo,
      debtorLineId: payload.toLineId,
      owedQty: qty,
      repaidQty: 0,
      status: 'open',
      urgency: payload.urgency || '普通',
      deliveryDate: payload.deliveryDate || '',
      createdAt: now,
      updatedAt: now,
    })
  }

  // 物理批次所有权随软占用一并转移（不能只改数量）
  // 函数内引用，避免与 stockBatchStore 静态互引导致打包/lint 绑定异常
  const { listDedicatedBatches, transferBatchOwnership } = require('@/store/stockBatchStore')
  const fromBatches = listDedicatedBatches({
    salesOrderId: payload.fromOrderId,
    salesLineId: payload.fromLineId,
    itemCode: payload.itemCode,
  })
  const batchRes = transferBatchOwnership({
    batchIds: fromBatches.map((b) => b.id),
    toSalesOrderId: payload.toOrderId,
    toSalesOrderNo: payload.toOrderNo,
    toSalesLineId: payload.toLineId,
    qty,
  })
  if (!batchRes.ok) {
    return { ok: false, message: batchRes.message || '批次归属转移失败' }
  }

  return { ok: true, transfer, batches: batchRes.batches }
}

/**
 * 库存明细：按单批次转自由 / 转他单。
 * 只改批次挂在哪张销售单上，占用数量跟着这批货走。不记欠账，不自动偿还。
 * @param {{
 *   mode: 'free'|'order',
 *   batchIds: string[],
 *   qty: number,
 *   toOrderId?: string,
 *   toOrderNo?: string,
 *   toLineId?: string,
 *   itemCode?: string,
 *   itemName?: string,
 *   remark?: string,
 * }} payload
 */
export function confirmBatchOwnershipTransfer(payload = {}) {
  const mode = payload.mode === 'order' ? 'order' : 'free'
  const qty = Number(payload.qty) || 0
  if (!(qty > 0)) return { ok: false, message: '转移数量须大于 0' }
  const batchIds = Array.isArray(payload.batchIds) ? payload.batchIds.filter(Boolean) : []
  if (!batchIds.length) return { ok: false, message: '请选择要转移的批次' }

  const { getBatchById, transferBatchOwnership } = require('@/store/stockBatchStore')
  const batches = batchIds.map((id) => getBatchById(id)).filter(Boolean)
  if (!batches.length) return { ok: false, message: '批次不存在' }

  const notDedicated = batches.find((b) => !b.salesOrderId && !b.salesOrderNo)
  if (notDedicated) {
    return { ok: false, message: `批次 ${notDedicated.batchNo} 已是自由备货，无需再转` }
  }
  const fromOrderId = batches[0].salesOrderId || ''
  const fromOrderNo = batches[0].salesOrderNo || ''
  const fromLineId = batches[0].salesLineId || ''
  const mixed = batches.some(
    (b) =>
      (b.salesOrderId || '') !== fromOrderId ||
      (b.salesOrderNo || '') !== fromOrderNo ||
      (b.salesLineId || '') !== fromLineId,
  )
  if (mixed) {
    return { ok: false, message: '请选择同一销售单（及同一销售行）的按单批次再转移' }
  }

  if (mode === 'order') {
    if (!payload.toOrderId || !payload.toOrderNo) {
      return { ok: false, message: '请选择目标销售订单' }
    }
    if (!payload.toLineId) {
      return { ok: false, message: '请选择目标销售明细行' }
    }
    const { salesOrderState } = require('@/store/salesOrderStore')
    const targetOrder = salesOrderState.orders.find((o) => o.id === payload.toOrderId)
    const targetLine = (targetOrder?.lineItems || []).find((l) => l.id === payload.toLineId)
    const targetCode = String(
      targetLine?.productCode || targetLine?.itemCode || targetLine?.materialCode || '',
    ).trim()
    const sourceCode = String(payload.itemCode || batches[0]?.itemCode || '').trim()
    if (!targetLine || !sourceCode || targetCode !== sourceCode) {
      return {
        ok: false,
        message: `目标销售单没有编码 ${sourceCode || '—'} 的明细，不能转他单`,
      }
    }
    if (payload.toOrderId === fromOrderId && payload.toLineId === fromLineId) {
      return { ok: false, message: '目标与源销售行相同，无需转移' }
    }
  }

  const batchRes = transferBatchOwnership({
    batchIds,
    toSalesOrderId: mode === 'order' ? payload.toOrderId : '',
    toSalesOrderNo: mode === 'order' ? payload.toOrderNo : '',
    toSalesLineId: mode === 'order' ? payload.toLineId : '',
    qty,
  })
  if (!batchRes.ok) return { ok: false, message: batchRes.message }

  let softMoved = 0
  if (fromOrderId && fromLineId) {
    const fromAlloc = getLineAllocatedQty(fromOrderId, fromLineId)
    softMoved = Math.min(qty, fromAlloc)
    if (softMoved > 0) {
      decreaseLineAllocation(fromOrderId, fromLineId, softMoved)
      if (mode === 'order') {
        increaseLineAllocation({
          salesOrderId: payload.toOrderId,
          salesOrderNo: payload.toOrderNo,
          salesLineId: payload.toLineId,
          itemCode: payload.itemCode || batches[0].itemCode,
          itemName: payload.itemName || batches[0].itemName,
          qty: softMoved,
        })
      }
    }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const transfer = {
    id: `bot-${Date.now()}`,
    type: mode === 'free' ? 'to_free' : 'to_order',
    fromOrderId,
    fromOrderNo,
    fromLineId,
    toOrderId: mode === 'order' ? payload.toOrderId : '',
    toOrderNo: mode === 'order' ? payload.toOrderNo : '',
    toLineId: mode === 'order' ? payload.toLineId : '',
    itemCode: payload.itemCode || batches[0].itemCode,
    itemName: payload.itemName || batches[0].itemName,
    qty: batchRes.qty || qty,
    softMoved,
    batchNos: (batchRes.batches || []).map((b) => b.batchNo).filter(Boolean),
    remark: payload.remark || '',
    requireRepay: mode === 'order' && payload.requireRepay === true,
    status: 'confirmed',
    createdAt: now,
    source: 'inventory_batch',
  }
  salesStockAllocationState.transfers.unshift(transfer)

  if (transfer.requireRepay) {
    const owedQty = Number(batchRes.qty) || qty
    salesStockAllocationState.debts.unshift({
      id: `ssd-${Date.now()}`,
      transferId: transfer.id,
      itemCode: transfer.itemCode,
      itemName: transfer.itemName || '',
      creditorOrderId: fromOrderId,
      creditorOrderNo: fromOrderNo,
      creditorLineId: fromLineId,
      debtorOrderId: payload.toOrderId,
      debtorOrderNo: payload.toOrderNo,
      debtorLineId: payload.toLineId,
      owedQty,
      repaidQty: 0,
      status: 'open',
      urgency: '普通',
      deliveryDate: '',
      createdAt: now,
      updatedAt: now,
    })
  }

  return { ok: true, transfer, batches: batchRes.batches, softMoved }
}

/**
 * 借方生产入库：按未还欠量把件数先挂回被借方，并补上被借方软占用。
 * @returns {{ segments: Array, restPieceValues: number[] }}
 */
export function takeRepayInboundSegments({
  debtorOrderId,
  itemCode,
  pieceValues = [],
  itemName = '',
} = {}) {
  const queue = (pieceValues || []).map(Number).filter((v) => v > 0)
  const code = String(itemCode || '').trim()
  if (!debtorOrderId || !code || !queue.length) {
    return { segments: [], restPieceValues: queue }
  }
  const openDebts = (salesStockAllocationState.debts || [])
    .filter(
      (d) =>
        d.status === 'open' &&
        d.debtorOrderId === debtorOrderId &&
        d.itemCode === code &&
        (Number(d.owedQty) || 0) > 0,
    )
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))

  const { takePieceValuesUpTo } = require('@/utils/salesOrderDedicatedStock')
  const segments = []
  for (const debt of openDebts) {
    if (!queue.length) break
    const taken = takePieceValuesUpTo(queue, Number(debt.owedQty) || 0)
    const pay = taken.reduce((s, n) => s + (Number(n) || 0), 0)
    if (!(pay > 0)) continue
    increaseLineAllocation({
      salesOrderId: debt.creditorOrderId,
      salesOrderNo: debt.creditorOrderNo,
      salesLineId: debt.creditorLineId,
      itemCode: code,
      itemName: itemName || debt.itemName,
      qty: pay,
    })
    debt.owedQty = Math.max(0, (Number(debt.owedQty) || 0) - pay)
    debt.repaidQty = (Number(debt.repaidQty) || 0) + pay
    if (debt.owedQty <= 1e-9) {
      debt.owedQty = 0
      debt.status = 'closed'
    }
    debt.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
    segments.push({
      salesOrderId: debt.creditorOrderId,
      salesOrderNo: debt.creditorOrderNo,
      salesLineId: debt.creditorLineId,
      pieceValues: taken,
      dedicatedQty: pay,
    })
  }
  return { segments, restPieceValues: queue }
}

/** 发货出库后释放本行占用 */
export function releaseAllocationOnShip(salesOrderId, salesLineId, shipQty) {
  return decreaseLineAllocation(salesOrderId, salesLineId, shipQty)
}

/**
 * 计算订单/行库存提醒摘要
 */
export function buildLineStockReminder(line, salesOrder) {
  const code = String(line?.productCode || '').trim()
  const need = Number(line?.salesQty ?? line?.qty) || 0
  const onHand = getOnHandQtyByItemCode(code)
  const myAlloc = salesOrder?.id ? getLineAllocatedQty(salesOrder.id, line.id) : 0
  const others = listOtherOrderAllocations(code, {
    excludeSalesOrderId: salesOrder?.id,
    excludeLineId: line?.id,
  })
  const otherQty = others.reduce((s, a) => s + (Number(a.qty) || 0), 0)
  const freeQty = getFreeQtyByItemCode(code)
  const covered = myAlloc + Math.min(Math.max(0, need - myAlloc), freeQty)
  let status = '充足'
  if (covered <= 0 && need > 0) status = '缺货'
  else if (covered < need) status = '部分缺货'

  const product = getProductInfoState().products.find((p) => p.code === code)
  const planStrategy = product?.production?.planStrategy || 'mto'

  return {
    itemCode: code,
    need,
    onHand,
    myAlloc,
    freeQty,
    otherQty,
    others,
    status,
    planStrategy,
    covered,
  }
}

export function buildOrderInventoryStatus(salesOrder) {
  const lines = salesOrder?.lineItems || []
  if (!lines.length) return '充足'
  const statuses = lines.map((line) => buildLineStockReminder(line, salesOrder).status)
  if (statuses.every((s) => s === '充足')) return '充足'
  if (statuses.every((s) => s === '缺货')) return '缺货'
  if (statuses.some((s) => s === '缺货' || s === '部分缺货')) return '部分缺货'
  return '充足'
}

export function getOpenDebtQty(itemCode, creditorOrderId, creditorLineId) {
  return (salesStockAllocationState.debts || [])
    .filter(
      (d) =>
        d.status === 'open' &&
        d.itemCode === itemCode &&
        d.creditorOrderId === creditorOrderId &&
        d.creditorLineId === creditorLineId,
    )
    .reduce((s, d) => s + (Number(d.owedQty) || 0), 0)
}

/** 本单相关的跨单调拨记录（调入 + 调出） */
export function listOrderStockTransfers(salesOrderId) {
  if (!salesOrderId) return []
  return (salesStockAllocationState.transfers || [])
    .filter((t) => t.toOrderId === salesOrderId || t.fromOrderId === salesOrderId)
    .map((t) => ({
      ...t,
      direction: t.toOrderId === salesOrderId ? 'in' : 'out',
    }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

/** 本单相关的借调债务（作为借入方或借出方） */
export function listOrderStockDebts(salesOrderId) {
  if (!salesOrderId) return []
  return (salesStockAllocationState.debts || [])
    .filter((d) => d.debtorOrderId === salesOrderId || d.creditorOrderId === salesOrderId)
    .map((d) => ({
      ...d,
      role: d.debtorOrderId === salesOrderId ? 'borrower' : 'lender',
      remainQty: Math.max(0, (Number(d.owedQty) || 0) - (Number(d.repaidQty) || 0)),
    }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

/**
 * 跨单调拨演示：同一编码注入多张他单占用，便于库存提醒出现「更多」。
 */
const DEMO_OTHER_ORDERS = [
  {
    salesOrderId: 'so-seed-1',
    salesOrderNo: '1-20260512-005',
    customerName: '山东化工泵业集团',
  },
  {
    salesOrderId: 'so-seed-2',
    salesOrderNo: '1-20260520-008',
    customerName: '华东机械制造有限公司',
  },
  {
    salesOrderId: 'so-seed-3',
    salesOrderNo: '1-20260525-011',
    customerName: '东营油田物资',
  },
]

const DEMO_DONOR_ALLOCATIONS = [
  { itemCode: 'CP2610001', itemName: '清水离心泵 ISG50-160', qty: 1 },
  { itemCode: 'CP2610003', itemName: '单级单吸离心泵 ISW80-65-200', qty: 1 },
  { itemCode: 'CP2610010', itemName: '磁力驱动泵 CQ32-25', qty: 1 },
  { itemCode: 'WL-PIPE-Q235-50', itemName: '无缝钢管 Q235 φ50×3', qty: 5 },
  { itemCode: 'WL-BAR-45-20', itemName: '圆钢 45# φ20', qty: 2 },
  { itemCode: 'WL-PLATE-Q235-10', itemName: '钢板 Q235 10mm', qty: 3 },
]

function ensureDemoOnHand(itemCode, minQty) {
  if (getOnHandQtyByItemCode(itemCode) >= minQty) return
  const product = getProductInfoState().products.find((p) => p.code === itemCode)
  if (product) {
    product.stockQty = Math.max(Number(product.stockQty) || 0, minQty)
  }
}

function upsertDemoDonorAllocation({
  id,
  itemCode,
  itemName,
  qty,
  salesOrderId,
  salesOrderNo,
  customerName,
}) {
  const occupy = Math.max(1, Number(qty) || 1)
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const existing = salesStockAllocationState.allocations.find((a) => a.id === id)
  if (existing) {
    if (!existing.customerName && customerName) existing.customerName = customerName
    if (existing.status === 'active' && Number(existing.qty) > 0) return false
    existing.qty = occupy
    existing.status = 'active'
    existing.updatedAt = now
    return true
  }
  salesStockAllocationState.allocations.unshift({
    id,
    salesOrderId: salesOrderId || 'so-seed-stock-donor',
    salesOrderNo: salesOrderNo || '1-20260601-088',
    customerName: customerName || '',
    salesLineId: `line-donor-${itemCode}-${salesOrderId || 'default'}`,
    itemCode,
    itemName: itemName || itemCode,
    qty: occupy,
    status: 'active',
    urgency: '正常',
    deliveryDate: '2026-06-20',
    createdAt: now,
    updatedAt: now,
    demoSeed: true,
  })
  return true
}

function seedDemoDonorsForItem(itemCode, itemName, qtyEach = 1) {
  let changed = false
  ensureDemoOnHand(itemCode, qtyEach * DEMO_OTHER_ORDERS.length + 1)
  DEMO_OTHER_ORDERS.forEach((donor, idx) => {
    if (
      upsertDemoDonorAllocation({
        id: `ssa-demo-donor-${itemCode}-${idx + 1}`,
        itemCode,
        itemName,
        qty: qtyEach,
        ...donor,
      })
    ) {
      changed = true
    }
  })
  return changed
}

export function ensureStockTransferDemoMocks() {
  let changed = false
  for (const demo of DEMO_DONOR_ALLOCATIONS) {
    if (seedDemoDonorsForItem(demo.itemCode, demo.itemName, demo.qty)) changed = true
  }
  if (changed) persist()
}

/** 按当前订单明细补齐他单占用演示数据（同一编码至少 3 张他单，出现「更多」） */
export function ensureStockTransferDemoMocksForOrder(order) {
  ensureStockTransferDemoMocks()
  const status = String(order?.progressStatus || '')
  if (status === '已完成' || status === '已作废') return
  let changed = false
  for (const line of order?.lineItems || []) {
    const itemCode = String(line.productCode || '').trim()
    if (!itemCode) continue
    if (seedDemoDonorsForItem(itemCode, line.productName || itemCode, 1)) changed = true
  }
  if (changed) persist()
}

/** 已完成/已作废订单：不再展示实时库存提醒 */
export function shouldShowLiveStockRemind(order) {
  const status = String(order?.progressStatus || '')
  return status !== '已完成' && status !== '已作废'
}

/** 模块加载完成后再灌演示数据，避免循环依赖 TDZ */
queueMicrotask(() => {
  try {
    ensureStockTransferDemoMocks()
  } catch {
    /* ignore seed failures during boot */
  }
})
