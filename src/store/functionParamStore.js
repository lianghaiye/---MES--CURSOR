import { reactive, watch } from 'vue'

const STORAGE_KEY = 'i_doms_function_params'

export const SALARY_PUSH_MODES = {
  ON_REPORT: 'on_report',
  ON_AUDIT: 'on_audit',
  MANUAL: 'manual',
}

export const SALARY_PUSH_OPTIONS = [
  { value: SALARY_PUSH_MODES.ON_REPORT, label: '报工即推送' },
  { value: SALARY_PUSH_MODES.ON_AUDIT, label: '审核后推送' },
  { value: SALARY_PUSH_MODES.MANUAL, label: '手动推送' },
]

export const SALARY_PUSH_DESCRIPTION =
  '报工即推送：报工即展示在工时工资列表中，工人可查看。审核后推送：审核通过后展示在工时工资列表中，工人可查看。手动推送：手动操作推送后，工人在工时工资列表中可查看。'

export const FUNCTION_PARAM_ROWS = [
  {
    key: 'salaryPushMode',
    scenario: '工资推送',
    description: SALARY_PUSH_DESCRIPTION,
  },
]

function normalizeSalaryPushMode(mode) {
  if (mode === 'auto') return SALARY_PUSH_MODES.ON_REPORT
  if (SALARY_PUSH_OPTIONS.some((item) => item.value === mode)) return mode
  return SALARY_PUSH_MODES.MANUAL
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return {
          ...parsed,
          salaryPushMode: normalizeSalaryPushMode(parsed.salaryPushMode),
        }
      }
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
    salaryPushMode: SALARY_PUSH_MODES.MANUAL,
  },
})

watch(
  () => functionParamState.params,
  () => persist(),
  { deep: true },
)

export function getSalaryPushMode() {
  return normalizeSalaryPushMode(functionParamState.params.salaryPushMode)
}

export function setSalaryPushMode(mode) {
  const normalized = normalizeSalaryPushMode(mode)
  const hit = SALARY_PUSH_OPTIONS.find((item) => item.value === normalized)
  if (!hit) return { ok: false, message: '无效的推送方式' }
  functionParamState.params.salaryPushMode = normalized
  return { ok: true }
}

export function isReportSalaryPush() {
  return getSalaryPushMode() === SALARY_PUSH_MODES.ON_REPORT
}

export function isAuditSalaryPush() {
  return getSalaryPushMode() === SALARY_PUSH_MODES.ON_AUDIT
}

export function isManualSalaryPush() {
  return getSalaryPushMode() === SALARY_PUSH_MODES.MANUAL
}

/** @deprecated 使用 isReportSalaryPush */
export function isAutoSalaryPush() {
  return isReportSalaryPush()
}
