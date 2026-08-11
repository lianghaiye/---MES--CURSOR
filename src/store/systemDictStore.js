import { reactive, watch } from 'vue'
import { topModules } from '@/config/menus'

const STORAGE_KEY = 'i_doms_system_dict_v3'
const LEGACY_STORAGE_KEYS = ['i_doms_system_dict_v2', 'i_doms_system_dict']

export const DICT_STATUS = {
  ENABLED: '启用',
  DISABLED: '停用',
}

/** 所属模块选项（与顶栏业务模块对齐） */
export const DICT_MODULE_OPTIONS = topModules
  .filter((m) => m.key !== 'home')
  .map((m) => ({ label: m.label, value: m.label }))

const BUILTIN_SEED = [
  {
    code: 'scrap_reason',
    name: '报废原因',
    module: '质量管理',
    values: ['尺寸超差', '外观不良', '性能不达标', '材料缺陷', '装配不良', '其他'],
  },
  {
    code: 'replenish_method',
    name: '补料方式',
    module: '库存管理',
    values: ['库存补料', '采购补料'],
  },
  {
    code: 'process_method',
    name: '处理方式',
    module: '质量管理',
    values: ['退库', '报废', '拆解'],
  },
  {
    code: 'process_result',
    name: '处理结果',
    module: '质量管理',
    values: ['财物变现', '直接弃用'],
  },
  {
    code: 'purchase_return_type',
    name: '退货类型',
    module: '采购管理',
    values: ['换货', '退货'],
  },
]

let itemSeq = 0
let dictSeq = 0

export function createDictItem(partial = {}) {
  itemSeq += 1
  const label = String(partial.label ?? partial.value ?? '').trim()
  const value = String(partial.value ?? label).trim()
  return {
    id: partial.id || `dict-item-${Date.now()}-${itemSeq}`,
    label,
    value,
    sort: typeof partial.sort === 'number' ? partial.sort : 0,
    status: partial.status === DICT_STATUS.DISABLED ? DICT_STATUS.DISABLED : DICT_STATUS.ENABLED,
    /** 系统预置项：业务字典编辑时不可删除 */
    preset: Boolean(partial.preset),
  }
}

function createDict(partial = {}) {
  dictSeq += 1
  const items = (partial.items || []).map((it, idx) =>
    createDictItem({
      ...it,
      sort: typeof it.sort === 'number' ? it.sort : idx,
      preset: it.preset != null ? Boolean(it.preset) : Boolean(partial.builtin),
    }),
  )
  return {
    id: partial.id || `sys-dict-${Date.now()}-${dictSeq}`,
    code: String(partial.code || '').trim(),
    name: String(partial.name || '').trim(),
    module: String(partial.module || '').trim(),
    status: partial.status === DICT_STATUS.DISABLED ? DICT_STATUS.DISABLED : DICT_STATUS.ENABLED,
    builtin: Boolean(partial.builtin),
    items,
  }
}

function buildSeedDicts() {
  return BUILTIN_SEED.map((seed) =>
    createDict({
      id: `sys-dict-${seed.code}`,
      code: seed.code,
      name: seed.name,
      module: seed.module || '',
      builtin: true,
      status: DICT_STATUS.ENABLED,
      items: seed.values.map((v, idx) =>
        createDictItem({ label: v, value: v, sort: idx, preset: true }),
      ),
    }),
  )
}

/** 兼容旧版 { scrap_reason: ['a','b'] } */
function migrateLegacyDicts(legacy) {
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return null
  if (Array.isArray(legacy.dicts)) return null
  const codes = Object.keys(legacy)
  if (!codes.length) return null
  const looksLegacy = codes.every((k) => Array.isArray(legacy[k]))
  if (!looksLegacy) return null

  const seedByCode = Object.fromEntries(buildSeedDicts().map((d) => [d.code, d]))
  const result = []
  codes.forEach((code) => {
    const values = legacy[code] || []
    const seed = seedByCode[code]
    result.push(
      createDict({
        id: seed?.id || `sys-dict-${code}`,
        code,
        name: seed?.name || code,
        module: seed?.module || '',
        builtin: Boolean(seed),
        status: DICT_STATUS.ENABLED,
        items: values.map((v, idx) =>
          createDictItem({ label: v, value: v, sort: idx, preset: Boolean(seed) }),
        ),
      }),
    )
    delete seedByCode[code]
  })
  Object.values(seedByCode).forEach((d) => result.push(d))
  return result
}

function normalizeStored(parsed) {
  if (!parsed) return null
  if (Array.isArray(parsed.dicts)) {
    return parsed.dicts.map((d) => createDict(d))
  }
  if (Array.isArray(parsed)) {
    return parsed.map((d) => createDict(d))
  }
  return migrateLegacyDicts(parsed)
}

function ensureDictModules(dicts = []) {
  const seedByCode = Object.fromEntries(buildSeedDicts().map((d) => [d.code, d]))
  const normalized = dicts.map((d) => {
    const seed = seedByCode[d.code]
    const items = (d.items || []).map((it) =>
      createDictItem({
        ...it,
        preset: it.preset != null ? Boolean(it.preset) : Boolean(d.builtin),
      }),
    )
    return createDict({
      ...d,
      module: d.module || seed?.module || '',
      items,
    })
  })
  const existing = new Set(normalized.map((d) => d.code))
  buildSeedDicts().forEach((seed) => {
    if (!existing.has(seed.code)) normalized.push(seed)
  })
  return normalized
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const list = normalizeStored(JSON.parse(raw))
      if (list?.length) return ensureDictModules(list)
    }
  } catch {
    /* ignore */
  }
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const legacyRaw = localStorage.getItem(key)
      if (legacyRaw) {
        const list = normalizeStored(JSON.parse(legacyRaw))
        if (list?.length) return ensureDictModules(list)
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, dicts: systemDictState.dicts }))
}

export const systemDictState = reactive({
  dicts: loadFromStorage() || buildSeedDicts(),
})

watch(
  () => systemDictState.dicts,
  () => persist(),
  { deep: true },
)

/** @deprecated 保留旧导出，便于兼容；列表请用 systemDictState.dicts */
export const DICT_TYPES = BUILTIN_SEED.map((s) => ({ key: s.code, label: s.name }))

export function listSystemDicts({ keyword = '', status, module } = {}) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  const moduleKw = String(module || '').trim()
  return systemDictState.dicts.filter((d) => {
    if (status && d.status !== status) return false
    if (moduleKw && (d.module || '') !== moduleKw) return false
    if (!kw) return true
    return (
      (d.code || '').toLowerCase().includes(kw) ||
      (d.name || '').toLowerCase().includes(kw) ||
      (d.module || '').toLowerCase().includes(kw)
    )
  })
}

export function findSystemDictByCode(code) {
  return systemDictState.dicts.find((d) => d.code === String(code || '').trim()) || null
}

export function findSystemDictById(id) {
  return systemDictState.dicts.find((d) => d.id === id) || null
}

export function getSystemDictEnabledItems(code) {
  const dict = findSystemDictByCode(code)
  if (!dict || dict.status !== DICT_STATUS.ENABLED) return []
  return [...(dict.items || [])]
    .filter((it) => it.status === DICT_STATUS.ENABLED)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
}

export function getDictOptions(type) {
  return getSystemDictEnabledItems(type).map((it) => ({
    label: it.label || it.value,
    value: it.value,
  }))
}

export function getDictValues(type) {
  return getSystemDictEnabledItems(type).map((it) => it.value)
}

export function addSystemDict(payload = {}) {
  const code = String(payload.code || '').trim()
  const name = String(payload.name || '').trim()
  if (!code) return { ok: false, message: '请输入字典编号' }
  if (!name) return { ok: false, message: '请输入字典名称' }
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(code)) {
    return { ok: false, message: '字典编号需以字母开头，仅含字母/数字/下划线' }
  }
  if (findSystemDictByCode(code)) return { ok: false, message: '字典编号已存在' }
  const row = createDict({
    code,
    name,
    module: payload.module || '',
    status: payload.status || DICT_STATUS.ENABLED,
    builtin: false,
    items: payload.items || [],
  })
  systemDictState.dicts.unshift(row)
  return { ok: true, dict: row }
}

export function updateSystemDict(id, patch = {}) {
  const idx = systemDictState.dicts.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, message: '字典不存在' }
  const prev = systemDictState.dicts[idx]
  const nextCode = patch.code != null ? String(patch.code).trim() : prev.code
  const nextName = patch.name != null ? String(patch.name).trim() : prev.name
  const nextModule = patch.module != null ? String(patch.module).trim() : prev.module
  if (!nextCode) return { ok: false, message: '请输入字典编号' }
  if (!nextName) return { ok: false, message: '请输入字典名称' }
  if (prev.builtin && nextCode !== prev.code) {
    return { ok: false, message: '内置字典编号不可修改' }
  }
  if (nextCode !== prev.code && findSystemDictByCode(nextCode)) {
    return { ok: false, message: '字典编号已存在' }
  }
  systemDictState.dicts[idx] = {
    ...prev,
    code: nextCode,
    name: nextName,
    module: nextModule,
    status: patch.status === DICT_STATUS.DISABLED ? DICT_STATUS.DISABLED : DICT_STATUS.ENABLED,
  }
  return { ok: true, dict: systemDictState.dicts[idx] }
}

export function deleteSystemDict(id) {
  const idx = systemDictState.dicts.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, message: '字典不存在' }
  if (systemDictState.dicts[idx].builtin) {
    return { ok: false, message: '内置字典不可删除' }
  }
  systemDictState.dicts.splice(idx, 1)
  return { ok: true }
}

export function setSystemDictItems(id, items = []) {
  const dict = findSystemDictById(id)
  if (!dict) return { ok: false, message: '字典不存在' }
  dict.items = items.map((it, idx) =>
    createDictItem({ ...it, sort: typeof it.sort === 'number' ? it.sort : idx }),
  )
  return { ok: true, dict }
}

/** 兼容旧 API：按 type 增删改字典项值（字符串） */
export function addDictItem(type, value) {
  const dict = findSystemDictByCode(type)
  if (!dict) return { ok: false, message: '字典不存在' }
  const text = String(value || '').trim()
  if (!text) return { ok: false, message: '请输入字典值' }
  if (dict.items.some((it) => it.value === text)) return { ok: false, message: '该值已存在' }
  dict.items.push(createDictItem({ label: text, value: text, sort: dict.items.length }))
  return { ok: true }
}

export function updateDictItem(type, oldValue, newValue) {
  const dict = findSystemDictByCode(type)
  if (!dict) return { ok: false, message: '字典不存在' }
  const text = String(newValue || '').trim()
  if (!text) return { ok: false, message: '请输入字典值' }
  const item = dict.items.find((it) => it.value === oldValue)
  if (!item) return { ok: false, message: '记录不存在' }
  if (text !== oldValue && dict.items.some((it) => it.value === text)) {
    return { ok: false, message: '该值已存在' }
  }
  item.label = text
  item.value = text
  return { ok: true }
}

export function deleteDictItem(type, value) {
  const dict = findSystemDictByCode(type)
  if (!dict) return false
  const idx = dict.items.findIndex((it) => it.value === value)
  if (idx === -1) return false
  dict.items.splice(idx, 1)
  return true
}
