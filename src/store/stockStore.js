import { reactive, watch } from 'vue'

const STORAGE_KEY = 'i_doms_inventory_stock'

function stockKey(warehouse, itemCode) {
  return `${warehouse}::${itemCode}`
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.records)) return parsed.records
    }
  } catch {
    /* ignore */
  }
  return []
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: stockState.records }))
}

export const stockState = reactive({
  records: loadFromStorage(),
})

watch(
  () => stockState.records,
  () => persist(),
  { deep: true },
)

export function getStockRecord(warehouse, itemCode) {
  const key = stockKey(warehouse, itemCode)
  return stockState.records.find((r) => r.key === key) || null
}

export function getStockQty(warehouse, itemCode) {
  return getStockRecord(warehouse, itemCode)?.qty ?? 0
}

function ensureStockRow({ warehouse, itemCode, itemName = '', itemType = '', unit = '件' }) {
  const key = stockKey(warehouse, itemCode)
  let row = stockState.records.find((r) => r.key === key)
  if (!row) {
    row = {
      id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key,
      warehouse,
      itemCode,
      itemName,
      itemType,
      unit,
      qty: 0,
    }
    stockState.records.push(row)
  }
  return row
}

/** 增减汇总库存（出库为负） */
export function adjustStockQty({ warehouse, itemCode, itemName, itemType, unit, delta }) {
  if (!warehouse || !itemCode) return { ok: false, message: '缺少仓库或物料编码' }
  const d = Number(delta)
  if (!Number.isFinite(d) || d === 0) return { ok: true }
  const row = ensureStockRow({ warehouse, itemCode, itemName, itemType, unit })
  row.qty = Math.round(((Number(row.qty) || 0) + d) * 1000) / 1000
  if (itemName) row.itemName = itemName
  if (unit) row.unit = unit
  return { ok: true, row }
}

/** 入库确认后增加库存（普通按件；可变长由 stockBatchStore 处理） */
export function applyInboundToStock(order) {
  const lines = order.lineItems || []
  if (!lines.length) return { ok: false, message: '入库单无明细行' }

  const hasWarehouse = lines.some((line) => line.warehouse || order.warehouse)
  if (!hasWarehouse) return { ok: false, message: '缺少入库仓库' }

  for (const line of lines) {
    // 已按条码类型建批的行，库存已在 createBatch 中增减，避免双计
    if (line.isVariableLength || (Array.isArray(line.batchNos) && line.batchNos.length)) {
      continue
    }
    const warehouse = line.warehouse || order.warehouse
    if (!warehouse) continue

    const code = line.itemCode?.trim()
    if (!code) continue
    const qty = Number(line.qty) || 0
    if (qty <= 0) continue

    adjustStockQty({
      warehouse,
      itemCode: code,
      itemName: line.itemName || '',
      itemType: order.itemType || line.itemType || '',
      unit: line.unit || '件',
      delta: qty,
    })
  }

  return { ok: true }
}

/** 出库扣减汇总库存（普通按件行） */
export function applyOutboundToStock(order) {
  const lines = order.lineItems || []
  for (const line of lines) {
    if (line.isVariableLength || line.pickedBatchId) continue
    const warehouse = line.shipWarehouse || line.warehouse || order.warehouse
    const code = line.itemCode?.trim()
    if (!warehouse || !code) continue
    const qty = Number(line.shipQty ?? line.qty) || 0
    if (qty <= 0) continue
    adjustStockQty({
      warehouse,
      itemCode: code,
      itemName: line.itemName || '',
      unit: line.unit || '件',
      delta: -qty,
    })
  }
  return { ok: true }
}
