import { reactive, watch } from 'vue'
import dayjs from 'dayjs'

const STORAGE_KEY = 'i_doms_supplier_categories'

function seedCategories() {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  return [
    {
      id: 'scat-1',
      code: 'SC001',
      name: '综合供应商',
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'scat-2',
      code: 'SC002',
      name: '标准件供应商',
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'scat-3',
      code: 'SC003',
      name: '外协供应商',
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'scat-4',
      code: 'SC004',
      name: '代理商',
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

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
  return seedCategories()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ categories: supplierCategoryState.categories }),
  )
}

export const supplierCategoryState = reactive({
  categories: loadFromStorage(),
})

watch(
  () => supplierCategoryState.categories,
  () => persist(),
  { deep: true },
)

export function getSupplierCategoryById(id) {
  return supplierCategoryState.categories.find((item) => item.id === id) || null
}

export function getSupplierCategoryOptions() {
  return supplierCategoryState.categories.map((item) => ({
    label: item.name,
    value: item.id,
    code: item.code,
  }))
}

export function addSupplierCategory(payload, operator = 'admin') {
  const code = payload.code?.trim()
  const name = payload.name?.trim()
  if (!code) return { ok: false, message: '请输入分类编码' }
  if (!name) return { ok: false, message: '请输入分类名称' }
  if (supplierCategoryState.categories.some((item) => item.code === code)) {
    return { ok: false, message: '分类编码已存在' }
  }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const row = {
    id: `scat-${Date.now()}`,
    code,
    name,
    creator: operator,
    createdAt: now,
    updatedAt: now,
  }
  supplierCategoryState.categories.unshift(row)
  return { ok: true, data: row }
}

export function updateSupplierCategory(id, patch, operator = 'admin') {
  const idx = supplierCategoryState.categories.findIndex((item) => item.id === id)
  if (idx < 0) return { ok: false, message: '供应商分类不存在' }
  const code = patch.code?.trim()
  const name = patch.name?.trim()
  if (
    code &&
    supplierCategoryState.categories.some((item) => item.code === code && item.id !== id)
  ) {
    return { ok: false, message: '分类编码已存在' }
  }
  Object.assign(supplierCategoryState.categories[idx], {
    ...patch,
    code: code || supplierCategoryState.categories[idx].code,
    name: name || supplierCategoryState.categories[idx].name,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    lastModifier: operator,
  })
  return { ok: true, data: supplierCategoryState.categories[idx] }
}
