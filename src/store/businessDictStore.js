import { reactive, watch } from 'vue'
import {
  DICT_STATUS,
  createDictItem,
  findSystemDictByCode,
  getSystemDictEnabledItems,
} from '@/store/systemDictStore'

const STORAGE_KEY = 'i_doms_business_dict_v1'

let bizSeq = 0

function createBusinessDict(partial = {}) {
  bizSeq += 1
  const items = (partial.items || []).map((it, idx) =>
    createDictItem({ ...it, sort: typeof it.sort === 'number' ? it.sort : idx }),
  )
  return {
    id: partial.id || `biz-dict-${Date.now()}-${bizSeq}`,
    systemDictCode: String(partial.systemDictCode || '').trim(),
    name: String(partial.name || '').trim(),
    status: partial.status === DICT_STATUS.DISABLED ? DICT_STATUS.DISABLED : DICT_STATUS.ENABLED,
    items,
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.dicts)) return parsed.dicts.map((d) => createBusinessDict(d))
      if (Array.isArray(parsed)) return parsed.map((d) => createBusinessDict(d))
    }
  } catch {
    /* ignore */
  }
  return []
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, dicts: businessDictState.dicts }))
}

export const businessDictState = reactive({
  dicts: loadFromStorage(),
})

watch(
  () => businessDictState.dicts,
  () => persist(),
  { deep: true },
)

export function findBusinessDictByCode(systemDictCode) {
  const code = String(systemDictCode || '').trim()
  return businessDictState.dicts.find((d) => d.systemDictCode === code) || null
}

export function getBusinessDictEnabledItems(systemDictCode) {
  const dict = findBusinessDictByCode(systemDictCode)
  if (!dict || dict.status !== DICT_STATUS.ENABLED) return null
  return [...(dict.items || [])]
    .filter((it) => it.status === DICT_STATUS.ENABLED)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
}

/** 业务配置状态：none | enabled | disabled */
export function getBusinessDictStatus(systemDictCode) {
  const dict = findBusinessDictByCode(systemDictCode)
  if (!dict) return 'none'
  return dict.status === DICT_STATUS.ENABLED ? 'enabled' : 'disabled'
}

export function createBusinessDictFromSystem(systemDictCode) {
  const sys = findSystemDictByCode(systemDictCode)
  if (!sys) return { ok: false, message: '系统字典不存在' }
  if (findBusinessDictByCode(sys.code)) {
    return { ok: false, message: '该字典已存在业务配置' }
  }
  const row = createBusinessDict({
    systemDictCode: sys.code,
    name: sys.name,
    status: DICT_STATUS.ENABLED,
    items: (sys.items || []).map((it, idx) =>
      createDictItem({
        label: it.label,
        value: it.value,
        sort: typeof it.sort === 'number' ? it.sort : idx,
        status: it.status,
      }),
    ),
  })
  businessDictState.dicts.unshift(row)
  return { ok: true, dict: row }
}

export function updateBusinessDict(id, patch = {}) {
  const idx = businessDictState.dicts.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, message: '业务字典不存在' }
  const prev = businessDictState.dicts[idx]
  businessDictState.dicts[idx] = {
    ...prev,
    name: patch.name != null ? String(patch.name).trim() : prev.name,
    status:
      patch.status === DICT_STATUS.DISABLED
        ? DICT_STATUS.DISABLED
        : patch.status === DICT_STATUS.ENABLED
          ? DICT_STATUS.ENABLED
          : prev.status,
  }
  return { ok: true, dict: businessDictState.dicts[idx] }
}

export function setBusinessDictItems(id, items = []) {
  const idx = businessDictState.dicts.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, message: '业务字典不存在' }
  businessDictState.dicts[idx].items = items.map((it, i) =>
    createDictItem({ ...it, sort: typeof it.sort === 'number' ? it.sort : i }),
  )
  return { ok: true, dict: businessDictState.dicts[idx] }
}

export function deleteBusinessDict(id) {
  const idx = businessDictState.dicts.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, message: '业务字典不存在' }
  businessDictState.dicts.splice(idx, 1)
  return { ok: true }
}

export function resetBusinessDictToSystem(systemDictCode) {
  const dict = findBusinessDictByCode(systemDictCode)
  if (!dict) return { ok: false, message: '未配置业务字典' }
  return deleteBusinessDict(dict.id)
}

export function syncBusinessItemsFromSystem(systemDictCode) {
  const biz = findBusinessDictByCode(systemDictCode)
  if (!biz) return { ok: false, message: '未配置业务字典' }
  const sysItems = getSystemDictEnabledItems(systemDictCode)
  const source = findSystemDictByCode(systemDictCode)
  biz.items = (source?.items || sysItems).map((it, idx) =>
    createDictItem({
      label: it.label,
      value: it.value,
      sort: typeof it.sort === 'number' ? it.sort : idx,
      status: it.status || DICT_STATUS.ENABLED,
    }),
  )
  return { ok: true, dict: biz }
}
