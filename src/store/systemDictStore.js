import { reactive, watch } from 'vue'

const STORAGE_KEY = 'i_doms_system_dict'

const DEFAULT_DICTS = {
  scrap_reason: ['尺寸超差', '外观不良', '性能不达标', '材料缺陷', '装配不良', '其他'],
  replenish_method: ['库存补料', '采购补料'],
  process_method: ['退库', '报废', '拆解'],
  process_result: ['财物变现', '直接弃用'],
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(systemDictState.dicts))
}

export const systemDictState = reactive({
  dicts: loadFromStorage() || { ...DEFAULT_DICTS },
})

watch(
  () => systemDictState.dicts,
  () => persist(),
  { deep: true },
)

export const DICT_TYPES = [
  { key: 'scrap_reason', label: '报废原因' },
  { key: 'replenish_method', label: '补料方式' },
  { key: 'process_method', label: '处理方式' },
  { key: 'process_result', label: '处理结果' },
]

export function getDictOptions(type) {
  return (systemDictState.dicts[type] || []).map((v) => ({ label: v, value: v }))
}

export function getDictValues(type) {
  return [...(systemDictState.dicts[type] || [])]
}

export function addDictItem(type, value) {
  const text = String(value || '').trim()
  if (!text) return { ok: false, message: '请输入字典值' }
  const list = systemDictState.dicts[type] || []
  if (list.includes(text)) return { ok: false, message: '该值已存在' }
  list.push(text)
  systemDictState.dicts[type] = list
  return { ok: true }
}

export function updateDictItem(type, oldValue, newValue) {
  const text = String(newValue || '').trim()
  if (!text) return { ok: false, message: '请输入字典值' }
  const list = systemDictState.dicts[type] || []
  const idx = list.indexOf(oldValue)
  if (idx === -1) return { ok: false, message: '记录不存在' }
  if (text !== oldValue && list.includes(text)) return { ok: false, message: '该值已存在' }
  list[idx] = text
  return { ok: true }
}

export function deleteDictItem(type, value) {
  const list = systemDictState.dicts[type] || []
  const idx = list.indexOf(value)
  if (idx === -1) return false
  list.splice(idx, 1)
  return true
}
