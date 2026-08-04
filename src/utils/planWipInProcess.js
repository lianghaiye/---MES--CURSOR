/**
 * 生产计划「在制」：待下发 / 执行中（库存单位）
 * 按「产出物料」汇总已开立、未完工入库的生产/外协/总装工单数量。
 * 不参与缺口计算（缺口仍 = 需求 − 可用库存）。
 */

import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { resolveInventoryUnit } from '@/utils/purchaseUomConvert'

const PENDING_STATUSES = new Set(['待下发'])
const EXECUTING_STATUSES = new Set(['已下发', '执行中', '暂停'])

function getWorkOrderState() {
  return require('@/store/workOrderStore').workOrderState
}

function getAssemblyWorkOrderState() {
  return require('@/store/assemblyWorkOrderStore').assemblyWorkOrderState
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

function lookupMaster(code) {
  if (!code) return null
  return (
    materialInfoState.materials.find((m) => m.code === code) ||
    productInfoState.products.find((p) => p.code === code) ||
    null
  )
}

function resolveProductCode(productId) {
  if (!productId) return ''
  const p = productInfoState.products.find((x) => x.id === productId)
  return p?.code || ''
}

/** 工单产出物料编码 */
function resolveProducedMaterialCode(wo) {
  if (!wo) return ''
  return wo.materialCode || wo.productCode || wo.itemCode || resolveProductCode(wo.productId) || ''
}

function woQty(wo) {
  return Number(wo.scheduleQty ?? wo.planQty) || 0
}

function collectOpenProduceOrders() {
  const list = []
  ;(getWorkOrderState().orders || []).forEach((wo) => {
    if (!wo || wo.skipEbom) return
    const st = wo.status || ''
    if (PENDING_STATUSES.has(st) || EXECUTING_STATUSES.has(st)) list.push(wo)
  })
  ;(getAssemblyWorkOrderState().orders || []).forEach((wo) => {
    if (!wo) return
    const st = wo.status || ''
    if (PENDING_STATUSES.has(st) || EXECUTING_STATUSES.has(st)) list.push(wo)
  })
  return list
}

/**
 * @returns {Map<string, { pendingQty: number, executingQty: number, inventoryUnit: string, wipStockQty: number, wipText: string }>}
 */
export function buildWipInProcessMap() {
  const map = new Map()

  const ensure = (code) => {
    if (!map.has(code)) {
      const master = lookupMaster(code)
      map.set(code, {
        pendingQty: 0,
        executingQty: 0,
        inventoryUnit: resolveInventoryUnit(master || { inventoryUnit: '件' }),
        master,
      })
    }
    return map.get(code)
  }

  collectOpenProduceOrders().forEach((wo) => {
    const code = resolveProducedMaterialCode(wo)
    if (!code) return
    const qty = woQty(wo)
    if (qty <= 0) return
    const row = ensure(code)
    if (PENDING_STATUSES.has(wo.status)) {
      row.pendingQty += qty
    } else if (EXECUTING_STATUSES.has(wo.status)) {
      row.executingQty += qty
    }
  })

  map.forEach((row) => {
    row.pendingQty = round3(row.pendingQty)
    row.executingQty = round3(row.executingQty)
    row.wipStockQty = round3(row.pendingQty + row.executingQty)
    row.wipText = formatWipText(row)
  })

  return map
}

export function formatWipText(row) {
  if (!row) return '—'
  const unit = row.inventoryUnit || ''
  const pending = Number(row.pendingQty) || 0
  const executing = Number(row.executingQty) || 0
  return `${pending}${unit}/${executing}${unit}`
}

export function getWipForMaterialCode(code, wipMap) {
  if (!code) {
    return {
      pendingQty: 0,
      executingQty: 0,
      wipStockQty: 0,
      wipText: '—',
      inventoryUnit: '',
    }
  }
  const map = wipMap || buildWipInProcessMap()
  return (
    map.get(code) || {
      pendingQty: 0,
      executingQty: 0,
      wipStockQty: 0,
      wipText: formatWipText({
        pendingQty: 0,
        executingQty: 0,
        inventoryUnit: resolveInventoryUnit(lookupMaster(code) || { inventoryUnit: '件' }),
      }),
      inventoryUnit: resolveInventoryUnit(lookupMaster(code) || { inventoryUnit: '件' }),
    }
  )
}

/** 自制 / 组装 / 外协 展示在制；外购展示采购在途 */
export function usesWipInProcessDisplay(supplyType) {
  return (
    supplyType === '自制件' ||
    supplyType === '自制' ||
    supplyType === '组装' ||
    supplyType === '外协件'
  )
}
