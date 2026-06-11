import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createDefectItemSeed } from '@/mock/defectItemSeed'

const STORAGE_KEY = 'i_doms_defect_items'
const SEED_VERSION_KEY = 'i_doms_defect_items_seed_v'
const CURRENT_SEED_VERSION = '1'

let codeSeq = 8

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.items)) return parsed.items
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: defectItemState.items }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

export const defectItemState = reactive({
  items: shouldReseed() ? createDefectItemSeed() : loadFromStorage() || createDefectItemSeed(),
})

watch(
  () => defectItemState.items,
  () => persist(),
  { deep: true },
)

export function generateDefectItemCode() {
  const code = `BL${dayjs().format('YYYYMMDD')}${String(codeSeq++).padStart(3, '0')}`
  return code
}

export function getDefectItemById(id) {
  return defectItemState.items.find((i) => i.id === id) || null
}

export function getDefectItemOptions() {
  return defectItemState.items.map((i) => ({
    label: i.name,
    value: i.id,
    code: i.code,
  }))
}

export function filterDefectItems(list, filters = {}) {
  return list.filter((i) => {
    if (filters.code && !i.code?.includes(filters.code)) return false
    if (filters.name && !i.name?.includes(filters.name)) return false
    return true
  })
}

export function addDefectItem(payload) {
  if (!payload.name?.trim()) return { ok: false, message: '请输入不良品项名称' }
  const code = payload.code?.trim() || generateDefectItemCode()
  if (defectItemState.items.some((i) => i.code === code)) {
    return { ok: false, message: '不良品项编号已存在' }
  }
  const row = {
    id: `di-${Date.now()}`,
    code,
    name: payload.name.trim(),
    createdAt: dayjs().format('YYYY-MM-DD'),
  }
  defectItemState.items.unshift(row)
  return { ok: true, item: row }
}

export function updateDefectItem(id, payload) {
  const row = defectItemState.items.find((i) => i.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (!payload.name?.trim()) return { ok: false, message: '请输入不良品项名称' }
  const code = payload.code?.trim() || row.code
  if (defectItemState.items.some((i) => i.code === code && i.id !== id)) {
    return { ok: false, message: '不良品项编号已存在' }
  }
  row.code = code
  row.name = payload.name.trim()
  return { ok: true, item: row }
}

export function deleteDefectItem(id) {
  const idx = defectItemState.items.findIndex((i) => i.id === id)
  if (idx === -1) return { ok: false, message: '记录不存在' }
  defectItemState.items.splice(idx, 1)
  return { ok: true }
}

export function resolveDefectItemsByIds(ids = []) {
  return ids.map((id) => getDefectItemById(id)).filter(Boolean)
}
