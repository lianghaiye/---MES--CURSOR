import { reactive, watch } from 'vue'

const STORAGE_KEY = 'i_doms_business_rules'

export const PRODUCTION_MODE_OPTIONS = [
  { value: 'standard', label: '标准生产' },
  { value: 'minimal', label: '极简生产' },
  { value: 'minimal_salary', label: '极简工资核算' },
]

export const BUSINESS_RULE_ROWS = [
  {
    key: 'productionMode',
    scenario: '生产模式',
    description: '极简工资核算模式下，工单下发仅可指定一人/一组',
  },
]

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(businessRuleState.rules))
}

export const businessRuleState = reactive({
  rules: loadFromStorage() || {
    productionMode: 'standard',
  },
})

watch(
  () => businessRuleState.rules,
  () => persist(),
  { deep: true },
)

export function getProductionMode() {
  return businessRuleState.rules.productionMode || 'standard'
}

export function setProductionMode(mode) {
  const hit = PRODUCTION_MODE_OPTIONS.find((item) => item.value === mode)
  if (!hit) return { ok: false, message: '无效的生产模式' }
  businessRuleState.rules.productionMode = mode
  return { ok: true }
}

export function isMinimalSalaryMode() {
  return getProductionMode() === 'minimal_salary'
}

export function getProductionModeLabel(mode = getProductionMode()) {
  return PRODUCTION_MODE_OPTIONS.find((item) => item.value === mode)?.label || '标准生产'
}
