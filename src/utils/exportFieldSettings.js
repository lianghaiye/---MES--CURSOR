/** 导出字段勾选 / 排序，持久化独立于列显隐 */

export function createDefaultExportFieldSettings(fieldDefinitions) {
  return fieldDefinitions.map((def, i) => ({
    key: def.key,
    title: def.title,
    checked: def.defaultChecked !== false,
    order: i,
  }))
}

export function mergeExportFieldSettings(defaultSettings, saved) {
  if (!Array.isArray(saved) || !saved.length) {
    return JSON.parse(JSON.stringify(defaultSettings))
  }
  const defaultMap = Object.fromEntries(defaultSettings.map((c) => [c.key, c]))
  const merged = saved
    .filter((s) => defaultMap[s.key])
    .map((s, i) => ({
      ...defaultMap[s.key],
      checked: s.checked !== false,
      order: typeof s.order === 'number' ? s.order : i,
    }))
  defaultSettings.forEach((d) => {
    if (!merged.some((m) => m.key === d.key)) {
      merged.push({ ...d, order: merged.length })
    }
  })
  return merged.sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i }))
}

export const EXPORT_FIELD_STORAGE_PREFIX = 'i_doms_export_fields_'

export function loadExportFieldSettings(storageKey, defaultSettings) {
  try {
    const raw = localStorage.getItem(EXPORT_FIELD_STORAGE_PREFIX + storageKey)
    if (raw) {
      return mergeExportFieldSettings(defaultSettings, JSON.parse(raw))
    }
  } catch {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(defaultSettings))
}

export function saveExportFieldSettings(storageKey, settings) {
  localStorage.setItem(EXPORT_FIELD_STORAGE_PREFIX + storageKey, JSON.stringify(settings))
}

/** 将 settings 与 fieldDefinitions 合并为可导出的字段列表 */
export function resolveExportFields(fieldDefinitions, settings) {
  const defMap = Object.fromEntries(fieldDefinitions.map((d) => [d.key, d]))
  return [...settings]
    .filter((s) => s.checked && defMap[s.key])
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      key: s.key,
      title: s.title,
      getValue: defMap[s.key].getValue,
    }))
}
