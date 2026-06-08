import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createProcessCategorySeed } from '@/mock/processCategorySeed'

const STORAGE_KEY = 'i_doms_process_categories'
const SEED_VERSION_KEY = 'i_doms_process_categories_seed_v'
const CURRENT_SEED_VERSION = '1'

export const CATEGORY_STATUS = ['新建', '使用中', '已归档']

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

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: processCategoryState.categories }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

export const processCategoryState = reactive({
  categories: shouldReseed()
    ? createProcessCategorySeed()
    : loadFromStorage() || createProcessCategorySeed(),
})

watch(
  () => processCategoryState.categories,
  () => persist(),
  { deep: true },
)

export function getCategoryById(id) {
  return processCategoryState.categories.find((c) => c.id === id) || null
}

export function getCategoryByName(name) {
  return processCategoryState.categories.find((c) => c.name === name) || null
}

/** 工序配置/工艺路线下拉：仅使用中分类 */
export function getActiveCategoryNames() {
  return processCategoryState.categories.filter((c) => c.status === '使用中').map((c) => c.name)
}

export function getActiveCategoryOptions() {
  return getActiveCategoryNames().map((name) => ({ label: name, value: name }))
}

export function filterProcessCategories(list, filters = {}) {
  return list.filter((c) => {
    if (filters.name && !c.name.includes(filters.name)) return false
    if (filters.status && c.status !== filters.status) return false
    return true
  })
}

export function addProcessCategory(payload) {
  const name = payload.name?.trim()
  if (!name) return { ok: false, message: '请输入工序分类名称' }
  if (getCategoryByName(name)) return { ok: false, message: '工序分类名称已存在' }

  const row = {
    id: `pcat-${Date.now()}`,
    name,
    status: '使用中',
    remark: payload.remark?.trim() || '',
    createdAt: dayjs().format('YYYY-MM-DD'),
    updatedAt: dayjs().format('YYYY-MM-DD'),
  }
  processCategoryState.categories.unshift(row)
  return { ok: true, category: row }
}

export function updateProcessCategory(id, payload) {
  const row = getCategoryById(id)
  if (!row) return { ok: false, message: '工序分类不存在' }

  const name = payload.name?.trim()
  if (!name) return { ok: false, message: '请输入工序分类名称' }
  const dup = processCategoryState.categories.find((c) => c.name === name && c.id !== id)
  if (dup) return { ok: false, message: '工序分类名称已存在' }

  const oldName = row.name
  row.name = name
  row.remark = payload.remark?.trim() ?? row.remark
  row.updatedAt = dayjs().format('YYYY-MM-DD')
  return { ok: true, category: row, renamedFrom: oldName !== name ? oldName : null }
}

export function archiveProcessCategory(id) {
  const row = getCategoryById(id)
  if (!row) return { ok: false, message: '工序分类不存在' }
  if (row.status !== '使用中') return { ok: false, message: '仅使用中的分类可归档' }
  row.status = '已归档'
  row.updatedAt = dayjs().format('YYYY-MM-DD')
  return { ok: true }
}

export function unarchiveProcessCategory(id) {
  const row = getCategoryById(id)
  if (!row) return { ok: false, message: '工序分类不存在' }
  if (row.status !== '已归档') return { ok: false, message: '仅已归档的分类可取消归档' }
  row.status = '使用中'
  row.updatedAt = dayjs().format('YYYY-MM-DD')
  return { ok: true }
}
