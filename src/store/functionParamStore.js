import { reactive, watch } from 'vue'

const STORAGE_KEY = 'i_doms_function_params'

export const SALARY_PUSH_OPTIONS = [
  { value: 'auto', label: '自动推送' },
  { value: 'manual', label: '手动推送' },
]

export const SALARY_PUSH_DESCRIPTION =
  '自动推送：报工即展示在工时工资列表中，工人可查看。手动推送：手动操作推送后，工人在工时工资列表中可查看。'

export const FUNCTION_PARAM_ROWS = [
  {
    key: 'salaryPushMode',
    scenario: '工资推送',
    description: SALARY_PUSH_DESCRIPTION,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(functionParamState.params))
}

export const functionParamState = reactive({
  params: loadFromStorage() || {
    salaryPushMode: 'manual',
  },
})

watch(
  () => functionParamState.params,
  () => persist(),
  { deep: true },
)

export function getSalaryPushMode() {
  return functionParamState.params.salaryPushMode || 'manual'
}

export function setSalaryPushMode(mode) {
  const hit = SALARY_PUSH_OPTIONS.find((item) => item.value === mode)
  if (!hit) return { ok: false, message: '无效的推送方式' }
  functionParamState.params.salaryPushMode = mode
  return { ok: true }
}

export function isAutoSalaryPush() {
  return getSalaryPushMode() === 'auto'
}

export function isManualSalaryPush() {
  return getSalaryPushMode() === 'manual'
}
