import { getSystemDictEnabledItems, systemDictState } from '@/store/systemDictStore'
import { getBusinessDictEnabledItems, businessDictState } from '@/store/businessDictStore'

/**
 * 业务字典 > 系统字典。
 * 有启用业务配置时用业务项；否则用系统字典启用项。
 */
export function getEffectiveDictItems(code) {
  void businessDictState.dicts
  void systemDictState.dicts
  const bizItems = getBusinessDictEnabledItems(code)
  if (bizItems) return bizItems
  return getSystemDictEnabledItems(code)
}

export function getEffectiveDictOptions(code) {
  return getEffectiveDictItems(code).map((it) => ({
    label: it.label || it.value,
    value: it.value,
  }))
}

export function getEffectiveDictValues(code) {
  return getEffectiveDictItems(code).map((it) => it.value)
}
