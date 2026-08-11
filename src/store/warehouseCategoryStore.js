import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createWarehouseCategorySeed } from '@/mock/warehouseCategorySeed'

const STORAGE_KEY = 'i_doms_warehouse_categories'
const SEED_VERSION_KEY = 'i_doms_warehouse_categories_seed_v'
const CURRENT_SEED_VERSION = '2'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.categories)) return parsed.categories
    }
  } catch {
    /* ignore */
  }
  return null
}

function ensureSemiFinishedCategory(list) {
  const rows = Array.isArray(list) ? [...list] : []
  if (rows.some((c) => c.id === 'wcat-004' || c.name === '半成品仓')) return rows
  rows.push({
    id: 'wcat-004',
    code: '4',
    name: '半成品仓',
    creator: 'admin',
    createdDept: '生产部',
    createdAt: '2026-08-11 13:40:00',
  })
  return rows
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ categories: warehouseCategoryState.categories }),
  )
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

export const warehouseCategoryState = reactive({
  categories: ensureSemiFinishedCategory(loadFromStorage() || createWarehouseCategorySeed()),
})

watch(
  () => warehouseCategoryState.categories,
  () => persist(),
  { deep: true },
)

export function getWarehouseCategoryById(id) {
  return warehouseCategoryState.categories.find((c) => c.id === id) || null
}

export function getWarehouseCategoryByCode(code) {
  return warehouseCategoryState.categories.find((c) => c.code === code) || null
}

export function getWarehouseCategoryOptions() {
  return warehouseCategoryState.categories.map((c) => ({
    label: c.name,
    value: c.id,
    code: c.code,
    name: c.name,
  }))
}

export function filterWarehouseCategories(list, filters = {}) {
  return list.filter((c) => {
    if (filters.code && !c.code.includes(filters.code)) return false
    if (filters.name && !c.name.includes(filters.name)) return false
    return true
  })
}

export function addWarehouseCategory(payload) {
  const code = payload.code?.trim()
  const name = payload.name?.trim()
  if (!code) return { ok: false, message: '请输入分类编码' }
  if (!name) return { ok: false, message: '请输入分类名称' }
  if (getWarehouseCategoryByCode(code)) return { ok: false, message: '分类编码已存在' }
  if (warehouseCategoryState.categories.some((c) => c.name === name)) {
    return { ok: false, message: '分类名称已存在' }
  }

  const row = {
    id: `wcat-${Date.now()}`,
    code,
    name,
    creator: payload.creator || 'admin',
    createdDept: payload.createdDept || '机泵',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  warehouseCategoryState.categories.unshift(row)
  return { ok: true, category: row }
}

export function updateWarehouseCategory(id, payload) {
  const row = getWarehouseCategoryById(id)
  if (!row) return { ok: false, message: '仓库分类不存在' }

  const code = payload.code?.trim()
  const name = payload.name?.trim()
  if (!code) return { ok: false, message: '请输入分类编码' }
  if (!name) return { ok: false, message: '请输入分类名称' }
  const dupCode = warehouseCategoryState.categories.find((c) => c.code === code && c.id !== id)
  if (dupCode) return { ok: false, message: '分类编码已存在' }
  const dupName = warehouseCategoryState.categories.find((c) => c.name === name && c.id !== id)
  if (dupName) return { ok: false, message: '分类名称已存在' }

  const oldName = row.name
  row.code = code
  row.name = name
  return { ok: true, category: row, renamedFrom: oldName !== name ? oldName : null }
}

export function deleteWarehouseCategory(id) {
  const idx = warehouseCategoryState.categories.findIndex((c) => c.id === id)
  if (idx === -1) return { ok: false, message: '仓库分类不存在' }
  warehouseCategoryState.categories.splice(idx, 1)
  return { ok: true }
}
