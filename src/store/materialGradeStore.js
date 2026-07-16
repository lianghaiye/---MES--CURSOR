import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createMaterialGradeSeed, normalizeMaterialGrade } from '@/mock/materialGradeSeed'

const STORAGE_KEY = 'i_doms_material_grades'
const SEED_VERSION_KEY = 'i_doms_material_grades_seed_v'
const CURRENT_SEED_VERSION = '2'

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: materialGradeState.items }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function loadInitialItems() {
  if (shouldReseed()) return createMaterialGradeSeed()
  const stored = loadFromStorage()
  if (stored?.length) return stored.map(normalizeMaterialGrade)
  return createMaterialGradeSeed()
}

export const materialGradeState = reactive({
  items: loadInitialItems(),
})

watch(
  () => materialGradeState.items,
  () => persist(),
  { deep: true },
)

/** 材质短码：M + 3 位流水（例 M001），避免日期长码拉长 SKU */
export function generateMaterialGradeCode() {
  const existing = materialGradeState.items.map((i) => i.code).filter(Boolean)
  let maxSeq = 0
  existing.forEach((code) => {
    const m = /^M(\d{1,4})$/i.exec(String(code).trim())
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]))
  })
  return `M${String(maxSeq + 1).padStart(3, '0')}`
}

export function getMaterialGradeById(id) {
  return materialGradeState.items.find((i) => i.id === id) || null
}

export function getMaterialGradeOptions() {
  return materialGradeState.items.map((i) => ({
    label: i.name,
    value: i.name,
    code: i.code,
    id: i.id,
  }))
}

export function filterMaterialGrades(list, filters = {}) {
  return list.filter((i) => {
    if (filters.code && !i.code?.includes(filters.code)) return false
    if (filters.name && !i.name?.includes(filters.name)) return false
    return true
  })
}

export function addMaterialGrade(payload) {
  if (!payload.name?.trim()) return { ok: false, message: '请输入材质名称' }
  const code = payload.code?.trim() || generateMaterialGradeCode()
  if (materialGradeState.items.some((i) => i.code === code)) {
    return { ok: false, message: '材质编号已存在' }
  }
  if (materialGradeState.items.some((i) => i.name === payload.name.trim())) {
    return { ok: false, message: '材质名称已存在' }
  }
  const row = normalizeMaterialGrade({
    id: `mg-${Date.now()}`,
    code,
    name: payload.name.trim(),
    description: payload.description || '',
    createdAt: dayjs().format('YYYY-MM-DD'),
  })
  materialGradeState.items.unshift(row)
  return { ok: true, item: row }
}

export function updateMaterialGrade(id, payload) {
  const row = materialGradeState.items.find((i) => i.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (!payload.name?.trim()) return { ok: false, message: '请输入材质名称' }
  const code = payload.code?.trim() || row.code
  if (materialGradeState.items.some((i) => i.code === code && i.id !== id)) {
    return { ok: false, message: '材质编号已存在' }
  }
  if (materialGradeState.items.some((i) => i.name === payload.name.trim() && i.id !== id)) {
    return { ok: false, message: '材质名称已存在' }
  }
  Object.assign(
    row,
    normalizeMaterialGrade({
      ...row,
      code,
      name: payload.name.trim(),
      description: payload.description || '',
    }),
  )
  return { ok: true, item: row }
}

export function deleteMaterialGrade(id) {
  const idx = materialGradeState.items.findIndex((i) => i.id === id)
  if (idx === -1) return { ok: false, message: '记录不存在' }
  materialGradeState.items.splice(idx, 1)
  return { ok: true }
}
