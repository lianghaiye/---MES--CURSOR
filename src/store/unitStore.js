import { reactive, watch } from 'vue'
import dayjs from 'dayjs'

const STORAGE_KEY = 'i_doms_measure_units'

/** 适用类型 */
export const UNIT_SCOPE = {
  INVENTORY: 'inventory',
  PURCHASE: 'purchase',
}

export const UNIT_SCOPE_OPTIONS = [
  { label: '库存单位', value: UNIT_SCOPE.INVENTORY },
  { label: '采购单位', value: UNIT_SCOPE.PURCHASE },
]

export const UNIT_STATUS = {
  ENABLED: '启用',
  DISABLED: '停用',
}

function seedUnits() {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const rows = [
    { code: 'UNIT001', name: '个', scopes: ['inventory', 'purchase'], sort: 10 },
    { code: 'UNIT002', name: '件', scopes: ['inventory', 'purchase'], sort: 20 },
    { code: 'UNIT003', name: '套', scopes: ['inventory', 'purchase'], sort: 30 },
    { code: 'UNIT004', name: '台', scopes: ['inventory', 'purchase'], sort: 40 },
    { code: 'UNIT005', name: 'kg', scopes: ['inventory', 'purchase'], sort: 50 },
    { code: 'UNIT006', name: 'm', scopes: ['inventory', 'purchase'], sort: 60 },
    { code: 'UNIT007', name: '米', scopes: ['inventory', 'purchase'], sort: 70 },
    { code: 'UNIT008', name: '根', scopes: ['inventory', 'purchase'], sort: 80 },
    { code: 'UNIT009', name: '支', scopes: ['purchase'], sort: 90 },
    { code: 'UNIT010', name: '条', scopes: ['purchase'], sort: 100 },
    { code: 'UNIT011', name: '张', scopes: ['inventory', 'purchase'], sort: 110 },
    { code: 'UNIT012', name: '㎡', scopes: ['inventory', 'purchase'], sort: 120 },
  ]
  return rows.map((r, i) => ({
    id: `unit-${i + 1}`,
    code: r.code,
    name: r.name,
    scopes: [...r.scopes],
    status: UNIT_STATUS.ENABLED,
    remark: '',
    sort: r.sort,
    creator: 'admin',
    createdAt: now,
    updatedAt: now,
  }))
}

/** 确保板材相关单位存在（兼容旧 localStorage） */
function ensurePlateUnits(units) {
  const list = Array.isArray(units) ? [...units] : []
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const extras = [
    { code: 'UNIT011', name: '张', scopes: ['inventory', 'purchase'], sort: 110 },
    { code: 'UNIT012', name: '㎡', scopes: ['inventory', 'purchase'], sort: 120 },
  ]
  extras.forEach((extra, i) => {
    if (list.some((u) => u.name === extra.name || u.code === extra.code)) return
    list.push(
      normalizeUnit({
        id: `unit-plate-${i + 1}`,
        ...extra,
        status: UNIT_STATUS.ENABLED,
        creator: 'admin',
        createdAt: now,
        updatedAt: now,
      }),
    )
  })
  return list
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.units) && parsed.units.length) {
        return ensurePlateUnits(parsed.units.map(normalizeUnit))
      }
    }
  } catch {
    /* ignore */
  }
  return seedUnits()
}

function normalizeUnit(row) {
  const scopes = Array.isArray(row.scopes)
    ? row.scopes.filter((s) => s === UNIT_SCOPE.INVENTORY || s === UNIT_SCOPE.PURCHASE)
    : []
  // 兼容旧字段
  if (!scopes.length) {
    if (row.forInventory !== false) scopes.push(UNIT_SCOPE.INVENTORY)
    if (row.forPurchase) scopes.push(UNIT_SCOPE.PURCHASE)
    if (!scopes.length) scopes.push(UNIT_SCOPE.INVENTORY)
  }
  return {
    id: row.id,
    code: String(row.code || '').trim(),
    name: String(row.name || '').trim(),
    scopes: [...new Set(scopes)],
    status: row.status === UNIT_STATUS.DISABLED ? UNIT_STATUS.DISABLED : UNIT_STATUS.ENABLED,
    remark: row.remark || '',
    sort: Number.isFinite(Number(row.sort)) ? Number(row.sort) : 0,
    creator: row.creator || 'admin',
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
    lastModifier: row.lastModifier || '',
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ units: unitState.units }))
}

export const unitState = reactive({
  units: loadFromStorage(),
})

watch(
  () => unitState.units,
  () => persist(),
  { deep: true },
)

function sortedUnits(list) {
  return [...list].sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.code.localeCompare(b.code))
}

export function getUnitById(id) {
  return unitState.units.find((u) => u.id === id) || null
}

export function formatUnitScopes(scopes = []) {
  const labels = []
  if (scopes.includes(UNIT_SCOPE.INVENTORY)) labels.push('库存单位')
  if (scopes.includes(UNIT_SCOPE.PURCHASE)) labels.push('采购单位')
  return labels.join('、') || '—'
}

/** 库存单位下拉（启用） */
export function getInventoryUnitOptions() {
  void unitState.units
  return sortedUnits(unitState.units)
    .filter((u) => u.status === UNIT_STATUS.ENABLED && u.scopes.includes(UNIT_SCOPE.INVENTORY))
    .map((u) => ({ label: u.name, value: u.name, code: u.code }))
}

/** 采购单位下拉（启用） */
export function getPurchaseUnitOptions() {
  void unitState.units
  return sortedUnits(unitState.units)
    .filter((u) => u.status === UNIT_STATUS.ENABLED && u.scopes.includes(UNIT_SCOPE.PURCHASE))
    .map((u) => ({ label: u.name, value: u.name, code: u.code }))
}

/** 全部启用单位（BOM/工单等通用计量） */
export function getAllEnabledUnitOptions() {
  void unitState.units
  return sortedUnits(unitState.units)
    .filter((u) => u.status === UNIT_STATUS.ENABLED)
    .map((u) => ({ label: u.name, value: u.name, code: u.code }))
}

/** 兼容旧 mock：返回名称数组 */
export function getInventoryUnitNames() {
  return getInventoryUnitOptions().map((o) => o.value)
}

export function getPurchaseUnitNames() {
  return getPurchaseUnitOptions().map((o) => o.value)
}

function nextUnitCode() {
  const nums = unitState.units
    .map((u) => {
      const m = String(u.code || '').match(/^UNIT(\d+)$/i)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return `UNIT${String(max + 1).padStart(3, '0')}`
}

export function addUnit(payload, operator = 'admin') {
  const name = payload.name?.trim()
  const code = (payload.code?.trim() || nextUnitCode()).toUpperCase()
  const scopes = Array.isArray(payload.scopes) ? [...new Set(payload.scopes)] : []
  if (!name) return { ok: false, message: '请输入单位名称' }
  if (!scopes.length) return { ok: false, message: '请至少选择一种适用类型（库存/采购）' }
  if (unitState.units.some((u) => u.code === code)) {
    return { ok: false, message: '单位编码已存在' }
  }
  if (unitState.units.some((u) => u.name === name)) {
    return { ok: false, message: '单位名称已存在' }
  }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const row = normalizeUnit({
    id: `unit-${Date.now()}`,
    code,
    name,
    scopes,
    status: payload.status || UNIT_STATUS.ENABLED,
    remark: payload.remark || '',
    sort: payload.sort ?? (unitState.units.length + 1) * 10,
    creator: operator,
    createdAt: now,
    updatedAt: now,
  })
  unitState.units.unshift(row)
  return { ok: true, data: row }
}

export function updateUnit(id, patch, operator = 'admin') {
  const idx = unitState.units.findIndex((u) => u.id === id)
  if (idx < 0) return { ok: false, message: '单位不存在' }
  const name = patch.name?.trim()
  const code = patch.code?.trim()?.toUpperCase()
  const scopes = Array.isArray(patch.scopes) ? [...new Set(patch.scopes)] : null
  if (name === '') return { ok: false, message: '请输入单位名称' }
  if (scopes && !scopes.length) return { ok: false, message: '请至少选择一种适用类型（库存/采购）' }
  if (code && unitState.units.some((u) => u.code === code && u.id !== id)) {
    return { ok: false, message: '单位编码已存在' }
  }
  if (name && unitState.units.some((u) => u.name === name && u.id !== id)) {
    return { ok: false, message: '单位名称已存在' }
  }
  const current = unitState.units[idx]
  Object.assign(
    current,
    normalizeUnit({
      ...current,
      ...patch,
      code: code || current.code,
      name: name || current.name,
      scopes: scopes || current.scopes,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      lastModifier: operator,
    }),
  )
  return { ok: true, data: current }
}

export function deleteUnit(id) {
  const idx = unitState.units.findIndex((u) => u.id === id)
  if (idx < 0) return { ok: false, message: '单位不存在' }
  unitState.units.splice(idx, 1)
  return { ok: true }
}

export function setUnitStatus(id, status, operator = 'admin') {
  return updateUnit(id, { status }, operator)
}
