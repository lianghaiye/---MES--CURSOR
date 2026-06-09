import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createWarehouseSeed } from '@/mock/warehouseSeed'
import { getWarehouseCategoryById } from '@/store/warehouseCategoryStore'

const STORAGE_KEY = 'i_doms_warehouses'
const SEED_VERSION_KEY = 'i_doms_warehouses_seed_v'
const CURRENT_SEED_VERSION = '2'

export const WAREHOUSE_WORK_CENTERS = [
  '默认工厂',
  '机械中心',
  '机泵',
  '组装中心',
  '机加车间',
  '装配车间',
  '总装车间',
]

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.warehouses)) return parsed.warehouses
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ warehouses: warehouseState.warehouses }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function normalizeWarehouseList(list) {
  return (list || []).map((w) => ({
    ...w,
    storedItems: Array.isArray(w.storedItems) ? [...w.storedItems] : [],
  }))
}

export const warehouseState = reactive({
  warehouses: normalizeWarehouseList(
    shouldReseed() ? createWarehouseSeed() : loadFromStorage() || createWarehouseSeed(),
  ),
})

watch(
  () => warehouseState.warehouses,
  () => persist(),
  { deep: true },
)

export function generateWarehouseCode(existingCodes = []) {
  const yyyymm = dayjs().format('YYYYMM')
  const prefix = `CK${yyyymm}`
  const max = existingCodes.reduce((m, code) => {
    const str = String(code)
    if (!str.startsWith(prefix)) return m
    const seq = Number(str.slice(prefix.length)) || 0
    return Math.max(m, seq)
  }, 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export function getWarehouseById(id) {
  return warehouseState.warehouses.find((w) => w.id === id) || null
}

export function getWarehouseByCode(code) {
  return warehouseState.warehouses.find((w) => w.code === code) || null
}

export function getEnabledWarehouseNames() {
  return warehouseState.warehouses.filter((w) => w.enabled).map((w) => w.name)
}

export function getWarehouseSelectOptions() {
  return warehouseState.warehouses
    .filter((w) => w.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((w) => ({ label: w.name, value: w.name }))
}

export function countWarehousesByCategoryId(categoryId) {
  return warehouseState.warehouses.filter((w) => w.categoryId === categoryId).length
}

export function syncWarehouseCategoryName(oldName, newName, category) {
  warehouseState.warehouses.forEach((w) => {
    if (w.categoryId === category.id) {
      w.categoryName = category.name
      w.categoryCode = category.code
    } else if (w.categoryName === oldName) {
      w.categoryName = newName
    }
  })
}

export function filterWarehouses(list, filters = {}) {
  return list.filter((w) => {
    if (filters.code && !w.code.includes(filters.code)) return false
    if (filters.name && !w.name.includes(filters.name)) return false
    if (filters.categoryId && w.categoryId !== filters.categoryId) return false
    return true
  })
}

function resolveCategory(categoryId) {
  const cat = getWarehouseCategoryById(categoryId)
  if (!cat) return { ok: false, message: '请选择仓库类型' }
  return { ok: true, category: cat }
}

function validateWarehouseForm(payload, editingId) {
  if (!payload.name?.trim()) return { ok: false, message: '请输入仓库名称' }
  if (!payload.categoryId) return { ok: false, message: '请选择仓库类型' }
  if (!payload.managerName) return { ok: false, message: '请选择管理员' }
  if (payload.sortOrder == null || payload.sortOrder === '') {
    return { ok: false, message: '请输入仓库排序' }
  }

  const code = payload.code?.trim()
  if (code) {
    const dup = warehouseState.warehouses.find((w) => w.code === code && w.id !== editingId)
    if (dup) return { ok: false, message: '仓库编号已存在' }
  }

  const catCheck = resolveCategory(payload.categoryId)
  if (!catCheck.ok) return catCheck
  return { ok: true, category: catCheck.category }
}

export function addWarehouse(payload) {
  const check = validateWarehouseForm(payload)
  if (!check.ok) return check

  const codes = warehouseState.warehouses.map((w) => w.code)
  const row = {
    id: `wh-${Date.now()}`,
    code: payload.code?.trim() || generateWarehouseCode(codes),
    name: payload.name.trim(),
    categoryId: check.category.id,
    categoryCode: check.category.code,
    categoryName: check.category.name,
    managerName: payload.managerName,
    workCenter: payload.workCenter || '',
    enabled: true,
    sortOrder: Number(payload.sortOrder) || 1,
    allowNegativeInventory: Boolean(payload.allowNegativeInventory),
    address: payload.address?.trim() || '',
    remark: payload.remark?.trim() || '',
    storedItems: [],
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  warehouseState.warehouses.unshift(row)
  return { ok: true, warehouse: row }
}

export function updateWarehouse(id, payload) {
  const idx = warehouseState.warehouses.findIndex((w) => w.id === id)
  if (idx === -1) return { ok: false, message: '仓库不存在' }

  const check = validateWarehouseForm(payload, id)
  if (!check.ok) return check

  const row = warehouseState.warehouses[idx]
  Object.assign(row, {
    code: payload.code?.trim() || row.code,
    name: payload.name.trim(),
    categoryId: check.category.id,
    categoryCode: check.category.code,
    categoryName: check.category.name,
    managerName: payload.managerName,
    workCenter: payload.workCenter || '',
    sortOrder: Number(payload.sortOrder) || 1,
    allowNegativeInventory: Boolean(payload.allowNegativeInventory),
    address: payload.address?.trim() ?? row.address,
    remark: payload.remark?.trim() ?? row.remark,
    createdAt: row.createdAt,
  })
  return { ok: true, warehouse: row }
}

export function deleteWarehouse(id) {
  const idx = warehouseState.warehouses.findIndex((w) => w.id === id)
  if (idx === -1) return { ok: false, message: '仓库不存在' }
  warehouseState.warehouses.splice(idx, 1)
  return { ok: true }
}

/** 更新仓库存放物品清单（禁止同一物品存于多仓） */
export function updateWarehouseStoredItems(warehouseId, items = []) {
  const wh = getWarehouseById(warehouseId)
  if (!wh) return { ok: false, message: '仓库不存在' }

  const normalized = items.map((it) => ({
    itemType: it.itemType,
    itemId: it.itemId,
    code: it.code,
    name: it.name,
    specModel: it.specModel || '',
    categoryName: it.categoryName || '',
    material: it.material || '',
    inventoryUnit: it.inventoryUnit || '',
    unitPrice: it.unitPrice ?? '',
    barcodeType: it.barcodeType || '',
  }))

  for (const it of normalized) {
    const conflict = warehouseState.warehouses.find(
      (w) =>
        w.id !== warehouseId &&
        (w.storedItems || []).some((s) => s.itemType === it.itemType && s.itemId === it.itemId),
    )
    if (conflict) {
      return {
        ok: false,
        message: `「${it.name}」已配置在仓库「${conflict.name}」，不可重复存放`,
      }
    }
  }

  wh.storedItems = normalized
  return { ok: true, warehouse: wh }
}
