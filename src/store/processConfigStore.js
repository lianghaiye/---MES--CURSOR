import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createProcessConfigSeed,
  PROCESS_OPERATION_DEFS,
  RESOURCE_TYPES,
  MOCK_POSITIONS,
} from '@/mock/processConfigSeed'
import { getActiveCategoryNames } from '@/store/processCategoryStore'

const STORAGE_KEY = 'i_doms_process_config'
const SEED_VERSION_KEY = 'i_doms_process_config_seed_v'
const CURRENT_SEED_VERSION = '3'

export { PROCESS_OPERATION_DEFS, RESOURCE_TYPES, MOCK_POSITIONS }

export const PROCESS_STATUS = ['使用中', '已停用']

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.processes)) return parsed.processes
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ processes: processConfigState.processes }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function normalizeOperations(ops = {}) {
  const base = Object.fromEntries(PROCESS_OPERATION_DEFS.map((d) => [d.key, false]))
  return { ...base, ...ops }
}

function normalizeProcessList(list) {
  return (list || []).map((p) => ({
    ...p,
    defaultExecutors: Array.isArray(p.defaultExecutors) ? [...p.defaultExecutors] : [],
  }))
}

export const processConfigState = reactive({
  processes: normalizeProcessList(
    shouldReseed() ? createProcessConfigSeed() : loadFromStorage() || createProcessConfigSeed(),
  ),
})

watch(
  () => processConfigState.processes,
  () => persist(),
  { deep: true },
)

export function generateProcessCode(existingCodes = []) {
  const max = existingCodes.reduce((m, code) => {
    const match = String(code).match(/^GX(\d+)$/i)
    const n = match ? Number(match[1]) : 0
    return Math.max(m, n)
  }, 0)
  return `GX${String(max + 1).padStart(8, '0')}`
}

export function getProcessById(id) {
  return processConfigState.processes.find((p) => p.id === id) || null
}

export function getProcessByCode(code) {
  return processConfigState.processes.find((p) => p.code === code) || null
}

export function getProcessByName(name) {
  return processConfigState.processes.find((p) => p.name === name) || null
}

/** 读取工序默认执行人/工组（复制数组，避免引用污染） */
export function resolveDefaultExecutors(process) {
  if (!process) return []
  const list = process.defaultExecutors
  return Array.isArray(list) && list.length ? [...list] : []
}

export function countProcessesByCategory(categoryName) {
  return processConfigState.processes.filter((p) => p.category === categoryName).length
}

export function renameProcessCategory(oldName, newName) {
  processConfigState.processes.forEach((p) => {
    if (p.category === oldName) p.category = newName
  })
}

/** 工艺路线编辑器：使用中分类 + 使用中工序 */
export function getProcessesByCategory(category) {
  const activeCats = getActiveCategoryNames()
  if (!activeCats.includes(category)) return []
  return processConfigState.processes.filter(
    (p) => p.category === category && p.status === '使用中',
  )
}

export function getActiveProcessCategories() {
  const activeCats = getActiveCategoryNames()
  return activeCats.filter((cat) =>
    processConfigState.processes.some((p) => p.category === cat && p.status === '使用中'),
  )
}

function isProcessUsedInRoutes(processId) {
  try {
    const raw = localStorage.getItem('i_doms_process_routes')
    if (!raw) return false
    const routes = JSON.parse(raw).routes || []
    return routes.some((route) =>
      (route.grid || []).some((step) => (step || []).some((cell) => cell?.processId === processId)),
    )
  } catch {
    return false
  }
}

export function filterProcessConfig(list, filters = {}) {
  return list.filter((p) => {
    if (filters.name && !p.name.includes(filters.name)) return false
    if (filters.code && !p.code.includes(filters.code)) return false
    if (filters.category && p.category !== filters.category) return false
    if (filters.resourceType && p.resourceType !== filters.resourceType) return false
    if (filters.status && p.status !== filters.status) return false
    return true
  })
}

function validateProcessForm(payload, editingId) {
  if (!payload.name?.trim()) return { ok: false, message: '请输入工序名称' }
  if (!payload.category) return { ok: false, message: '请选择工序分类' }
  if (!payload.position) return { ok: false, message: '请选择岗位' }
  if (!payload.resourceType) return { ok: false, message: '请选择资源类型' }

  const code = payload.code?.trim()
  if (code) {
    const dup = processConfigState.processes.find((p) => p.code === code && p.id !== editingId)
    if (dup) return { ok: false, message: '工序编码已存在' }
  }

  const activeCats = getActiveCategoryNames()
  if (!activeCats.includes(payload.category)) {
    return { ok: false, message: '所选工序分类不可用' }
  }
  return { ok: true }
}

export function addProcessConfig(payload) {
  const check = validateProcessForm(payload)
  if (!check.ok) return check

  const codes = processConfigState.processes.map((p) => p.code)
  const row = {
    id: `proc-${Date.now()}`,
    code: payload.code?.trim() || generateProcessCode(codes),
    name: payload.name.trim(),
    category: payload.category,
    resourceType: payload.resourceType,
    position: payload.position,
    image: payload.image || '',
    remark: payload.remark?.trim() || '',
    status: '使用中',
    operations: normalizeOperations(payload.operations),
    defaultExecutors: Array.isArray(payload.defaultExecutors) ? [...payload.defaultExecutors] : [],
    createdAt: dayjs().format('YYYY-MM-DD'),
    updatedAt: dayjs().format('YYYY-MM-DD'),
  }
  processConfigState.processes.unshift(row)
  return { ok: true, process: row }
}

export function updateProcessConfig(id, payload) {
  const idx = processConfigState.processes.findIndex((p) => p.id === id)
  if (idx === -1) return { ok: false, message: '工序不存在' }

  const check = validateProcessForm(payload, id)
  if (!check.ok) return check

  const row = processConfigState.processes[idx]
  Object.assign(row, {
    code: payload.code?.trim() || row.code,
    name: payload.name.trim(),
    category: payload.category,
    resourceType: payload.resourceType,
    position: payload.position,
    image: payload.image ?? row.image,
    remark: payload.remark?.trim() ?? row.remark,
    operations: normalizeOperations(payload.operations),
    defaultExecutors: Array.isArray(payload.defaultExecutors) ? [...payload.defaultExecutors] : [],
    updatedAt: dayjs().format('YYYY-MM-DD'),
  })
  return { ok: true, process: row }
}

export function deleteProcessConfig(id) {
  const idx = processConfigState.processes.findIndex((p) => p.id === id)
  if (idx === -1) return { ok: false, message: '工序不存在' }
  if (isProcessUsedInRoutes(id)) {
    return { ok: false, message: '该工序已被工艺路线引用，无法删除' }
  }
  processConfigState.processes.splice(idx, 1)
  return { ok: true }
}

export function getOperationLabels(process) {
  if (!process?.operations) return []
  return PROCESS_OPERATION_DEFS.filter((d) => process.operations[d.key]).map((d) => d.label)
}
