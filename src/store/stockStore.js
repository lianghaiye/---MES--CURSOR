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

/** 入库确认后增加库存 */
export function applyInboundToStock(order) {
  const lines = order.lineItems || []
  if (!lines.length) return { ok: false, message: '入库单无明细行' }

  const hasWarehouse = lines.some((line) => line.warehouse || order.warehouse)
  if (!hasWarehouse) return { ok: false, message: '缺少入库仓库' }

  lines.forEach((line) => {
    const warehouse = line.warehouse || order.warehouse
    if (!warehouse) return

    const code = line.itemCode?.trim()
    if (!code) return
    const qty = Number(line.qty) || 0
    if (qty <= 0) return

    const key = stockKey(warehouse, code)
    let row = stockState.records.find((r) => r.key === key)
    if (!row) {
      row = {
        id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        key,
        warehouse,
        itemCode: code,
        itemName: line.itemName || '',
        itemType: order.itemType || line.itemType || '',
        unit: line.unit || '件',
        qty: 0,
      }
      stockState.records.push(row)
    }
    row.qty = (Number(row.qty) || 0) + qty
    row.itemName = line.itemName || row.itemName
    row.unit = line.unit || row.unit
  })

  return { ok: true }
}
