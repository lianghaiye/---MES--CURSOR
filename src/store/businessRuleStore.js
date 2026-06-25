import { reactive, watch } from 'vue'

const STORAGE_KEY = 'i_doms_business_rules'

export const PRODUCTION_MODE_OPTIONS = [
  { value: 'standard', label: '标准模式' },
  { value: 'minimal', label: '极简报工' },
  { value: 'minimal_salary', label: '下发即报工' },
]

/** 极简报工下的报工方式（互斥） */
export const MINIMAL_REPORT_TYPE_OPTIONS = [
  { value: 'quick', label: '快速报工' },
  { value: 'task', label: '任务报工' },
]

export const PRODUCTION_MODE_DESCRIPTIONS = {
  standard:
    '完整生产流程：工单下发 → 任务领取 → 时序报工 → 审核 → 工时核算 → 工资推送。适用于需严格管控进度与审核的常规生产。',
  minimal:
    '简化报工确认环节，保留现场报工数据采集。选择下方报工方式后，小程序与 Web 工序报工仅启用对应入口。',
  minimal_salary: '工单下发后自动视为已报工，跳过现场报工与确认环节。',
}

export const MINIMAL_REPORT_TYPE_DESCRIPTIONS = {
  quick:
    '适用于无固定工单或临时加工场景。工人无需领取工单任务，直接选择产品与工序即可提交报工，流程最短，适合小批量、零散生产。',
  task:
    '适用于按工单有序生产的场景。工人须先领取工单下发的工序任务，再按任务报工，报工数据与工单进度、工序计划自动关联，便于追溯与统计。',
}

export const BUSINESS_RULE_ROWS = [
  {
    key: 'productionMode',
    scenario: '生产模式',
    description: '',
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
    minimalReportType: 'task',
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
  if (mode === 'minimal' && !businessRuleState.rules.minimalReportType) {
    businessRuleState.rules.minimalReportType = 'task'
  }
  return { ok: true }
}

export function getMinimalReportType() {
  return businessRuleState.rules.minimalReportType || 'task'
}

export function setMinimalReportType(type) {
  const hit = MINIMAL_REPORT_TYPE_OPTIONS.find((item) => item.value === type)
  if (!hit) return { ok: false, message: '无效的报工方式' }
  businessRuleState.rules.minimalReportType = type
  return { ok: true }
}

export function isMinimalReportMode() {
  return getProductionMode() === 'minimal'
}

export function isQuickReportEnabled() {
  if (getProductionMode() === 'standard') return true
  if (getProductionMode() === 'minimal') return getMinimalReportType() === 'quick'
  return false
}

export function isTaskReportEnabled() {
  if (getProductionMode() === 'standard') return true
  if (getProductionMode() === 'minimal') return getMinimalReportType() === 'task'
  return false
}

export function isMinimalSalaryMode() {
  return getProductionMode() === 'minimal_salary'
}

export function getProductionModeLabel(mode = getProductionMode()) {
  return PRODUCTION_MODE_OPTIONS.find((item) => item.value === mode)?.label || '标准模式'
}
