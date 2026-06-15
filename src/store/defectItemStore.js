import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createDefectItemSeed, normalizeDefectItem } from '@/mock/defectItemSeed'

const STORAGE_KEY = 'i_doms_defect_items'
const SEED_VERSION_KEY = 'i_doms_defect_items_seed_v'
const CURRENT_SEED_VERSION = '3'
const COMPANY_WAGE_SETTINGS_KEY = 'i_doms_defect_company_wage_settings'

const DEFAULT_COMPANY_WAGE_SETTINGS = {
  enabled: true,
  rules: [
    {
      id: 'rule-1',
      responsibility: '非工人责任',
      wageCalculationMethod: '打折计工资',
      defaultDiscountRate: 50,
    },
  ],
}

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

function loadInitialItems() {
  if (shouldReseed()) return createDefectItemSeed()
  const stored = loadFromStorage()
  if (stored?.length) return stored.map(normalizeDefectItem)
  return createDefectItemSeed()
}

export function normalizeCompanyWageRule(rule = {}, index = 0) {
  const wageCalculationMethod =
    rule.wageCalculationMethod || DEFAULT_COMPANY_WAGE_SETTINGS.rules[0].wageCalculationMethod
  const rate = Number(rule.defaultDiscountRate)
  return {
    id: rule.id || `rule-${index + 1}`,
    responsibility: rule.responsibility || '',
    wageCalculationMethod,
    defaultDiscountRate:
      wageCalculationMethod === '打折计工资' && Number.isFinite(rate)
        ? Math.min(100, Math.max(0, Math.round(rate)))
        : null,
  }
}

export function normalizeCompanyWageSettings(settings = {}) {
  let rules = []
  if (Array.isArray(settings.rules) && settings.rules.length) {
    rules = settings.rules.map((rule, index) => normalizeCompanyWageRule(rule, index))
  } else if (settings.responsibility || settings.wageCalculationMethod) {
    rules = [
      normalizeCompanyWageRule(
        {
          id: 'rule-1',
          responsibility: settings.responsibility,
          wageCalculationMethod: settings.wageCalculationMethod,
          defaultDiscountRate: settings.defaultDiscountRate,
        },
        0,
      ),
    ]
  } else {
    rules = DEFAULT_COMPANY_WAGE_SETTINGS.rules.map((rule, index) =>
      normalizeCompanyWageRule(rule, index),
    )
  }
  return {
    enabled:
      settings.enabled === undefined
        ? DEFAULT_COMPANY_WAGE_SETTINGS.enabled
        : Boolean(settings.enabled),
    rules,
  }
}

function loadCompanyWageSettings() {
  try {
    const raw = localStorage.getItem(COMPANY_WAGE_SETTINGS_KEY)
    if (raw) return normalizeCompanyWageSettings(JSON.parse(raw))
  } catch {
    /* ignore */
  }
  return normalizeCompanyWageSettings(DEFAULT_COMPANY_WAGE_SETTINGS)
}

function persistCompanyWageSettings() {
  localStorage.setItem(
    COMPANY_WAGE_SETTINGS_KEY,
    JSON.stringify(normalizeCompanyWageSettings(defectItemState.companyWageSettings)),
  )
}

export const defectItemState = reactive({
  items: loadInitialItems(),
  companyWageSettings: loadCompanyWageSettings(),
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
  const row = normalizeDefectItem({
    id: `di-${Date.now()}`,
    code,
    name: payload.name.trim(),
    affectWageDiscount: payload.affectWageDiscount,
    responsibility: payload.responsibility,
    wageCalculationMethod: payload.wageCalculationMethod,
    wageDiscountRate: payload.wageDiscountRate,
    description: payload.description,
    createdAt: dayjs().format('YYYY-MM-DD'),
  })
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
  Object.assign(
    row,
    normalizeDefectItem({
      ...row,
      code,
      name: payload.name.trim(),
      affectWageDiscount: payload.affectWageDiscount,
      responsibility: payload.responsibility,
      wageCalculationMethod: payload.wageCalculationMethod,
      wageDiscountRate: payload.wageDiscountRate,
      description: payload.description,
    }),
  )
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

export function updateCompanyWageSettings(payload = {}) {
  const next = normalizeCompanyWageSettings({
    ...defectItemState.companyWageSettings,
    ...payload,
  })
  Object.assign(defectItemState.companyWageSettings, next)
  persistCompanyWageSettings()
  return { ok: true, settings: next }
}
