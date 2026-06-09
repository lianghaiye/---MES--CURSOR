import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { warehouseState } from '@/store/warehouseStore'

function findProduct({ id, code, name } = {}) {
  const list = productInfoState.products || []
  if (id) return list.find((p) => p.id === id) || null
  if (code) return list.find((p) => p.code === code) || null
  if (name) return list.find((p) => p.name === name) || null
  return null
}

function findMaterial({ id, code, name } = {}) {
  const list = materialInfoState.materials || []
  if (id) return list.find((m) => m.id === id) || null
  if (code) return list.find((m) => m.code === code) || null
  if (name) return list.find((m) => m.name === name) || null
  return null
}

/** 仓库存放管理：按物品查所属仓库名称 */
export function findWarehouseNameByStoredItem(itemType, itemId, excludeWarehouseId) {
  for (const wh of warehouseState.warehouses) {
    if (excludeWarehouseId && wh.id === excludeWarehouseId) continue
    const hit = (wh.storedItems || []).some(
      (it) => it.itemType === itemType && it.itemId === itemId,
    )
    if (hit) return wh.name
  }
  return ''
}

/** 查找物品已被哪个仓库存放（用于禁止多仓） */
export function findWarehouseStoringItem(itemType, itemId, excludeWarehouseId) {
  for (const wh of warehouseState.warehouses) {
    if (excludeWarehouseId && wh.id === excludeWarehouseId) continue
    const hit = (wh.storedItems || []).find(
      (it) => it.itemType === itemType && it.itemId === itemId,
    )
    if (hit) return { warehouse: wh, item: hit }
  }
  return null
}

/**
 * 默认存放仓库优先级：
 * 1. 产品/物料信息 production.defaultWarehouse
 * 2. 仓库列表存放管理
 */
export function resolveDefaultWarehouse(ctx = {}) {
  const { itemType, itemId, itemCode, itemName } = ctx

  const tryProduct = () => {
    const p = findProduct({ id: itemId, code: itemCode, name: itemName })
    if (!p) return ''
    const master = p.production?.defaultWarehouse?.trim()
    if (master) return master
    return findWarehouseNameByStoredItem('产品', p.id) || ''
  }

  const tryMaterial = () => {
    const m = findMaterial({ id: itemId, code: itemCode, name: itemName })
    if (!m) return ''
    const master = m.production?.defaultWarehouse?.trim()
    if (master) return master
    return findWarehouseNameByStoredItem('物料', m.id) || ''
  }

  if (itemType === '产品') return tryProduct()
  if (itemType === '物料') return tryMaterial()

  return tryProduct() || tryMaterial()
}

export function resolveDefaultWarehouseByProductName(productName) {
  if (!productName?.trim()) return ''
  return (
    resolveDefaultWarehouse({ itemName: productName.trim(), itemType: '产品' }) ||
    resolveDefaultWarehouse({ itemName: productName.trim(), itemType: '物料' })
  )
}

export function resolveDefaultWarehouseByMaterialCode(materialCode) {
  if (!materialCode?.trim()) return ''
  return (
    resolveDefaultWarehouse({ itemCode: materialCode.trim(), itemType: '物料' }) ||
    resolveDefaultWarehouse({ itemCode: materialCode.trim(), itemType: '产品' })
  )
}

export function resolveDefaultWarehouseByItemCode(itemCode) {
  if (!itemCode?.trim()) return ''
  return (
    resolveDefaultWarehouse({ itemCode: itemCode.trim(), itemType: '物料' }) ||
    resolveDefaultWarehouse({ itemCode: itemCode.trim(), itemType: '产品' })
  )
}
