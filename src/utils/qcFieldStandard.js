/**
 * 检验项/模板字段共用：单位位置、合格判定标准
 */
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'

export const QC_UNIT_POSITION = {
  PREFIX: 'prefix',
  SUFFIX: 'suffix',
}

export const QC_UNIT_POSITION_OPTIONS = [
  { value: QC_UNIT_POSITION.SUFFIX, label: '后缀（如 12 mm）' },
  { value: QC_UNIT_POSITION.PREFIX, label: '前缀（如 ¥ 12）' },
]

/** 单项合格判定方式 */
export const QC_FIELD_JUDGE_RULE = {
  NONE: 'none',
  MANUAL: 'manual',
  RANGE: 'range',
  OPTION_PASS: 'optionPass',
  EQUALS: 'equals',
}

export const QC_FIELD_JUDGE_RULE_OPTIONS = [
  { value: QC_FIELD_JUDGE_RULE.NONE, label: '不设标准（仅记录）' },
  { value: QC_FIELD_JUDGE_RULE.MANUAL, label: '人工判定' },
  { value: QC_FIELD_JUDGE_RULE.RANGE, label: '数值区间（合格范围）' },
  { value: QC_FIELD_JUDGE_RULE.OPTION_PASS, label: '选项合格集' },
  { value: QC_FIELD_JUDGE_RULE.EQUALS, label: '等于指定值' },
]

/** 人工判定本项结论（默认三项，可扩展；映射质检通过/不通过） */
export const QC_MANUAL_JUDGMENT = {
  PASS: '合格',
  FAIL: '不合格',
  CONCESSION: '让步合格',
}

/** @deprecated 请用 listManualJudgmentSelectOptions(field) */
export const QC_MANUAL_JUDGMENT_OPTIONS = [
  { value: QC_MANUAL_JUDGMENT.PASS, label: '合格' },
  { value: QC_MANUAL_JUDGMENT.FAIL, label: '不合格' },
  { value: QC_MANUAL_JUDGMENT.CONCESSION, label: '让步合格' },
]

export function isManualJudgeField(field = {}) {
  return normalizeJudgeRule(field.judgeRule, field.type) === QC_FIELD_JUDGE_RULE.MANUAL
}

export function isManualJudgmentOption(v, field = null) {
  const s = String(v ?? '').trim()
  if (!s) return false
  if (field) {
    return normalizeManualOptionItems(field).some((o) => o.value === s)
  }
  return (
    s === QC_MANUAL_JUDGMENT.PASS ||
    s === QC_MANUAL_JUDGMENT.FAIL ||
    s === QC_MANUAL_JUDGMENT.CONCESSION
  )
}

/** 默认人工判定选项（与质检结果预设一致） */
export function createDefaultManualOptionItems() {
  return [
    {
      value: QC_MANUAL_JUDGMENT.PASS,
      result: QC_TASK_RESULT.PASS,
      locked: true,
      isDefault: false,
    },
    {
      value: QC_MANUAL_JUDGMENT.FAIL,
      result: QC_TASK_RESULT.FAIL,
      locked: true,
      isDefault: false,
    },
    {
      value: QC_MANUAL_JUDGMENT.CONCESSION,
      result: QC_TASK_RESULT.PASS,
      locked: true,
      isDefault: false,
    },
  ]
}

/**
 * 规范化人工判定选项：
 * - 默认三项可改文案、不可删除（locked）
 * - 可追加自定义项
 * - 不强制把文案重置为「合格/不合格/让步合格」
 */
export function normalizeManualOptionItems(field = {}) {
  const rawItems = Array.isArray(field.manualOptionItems)
    ? field.manualOptionItems
    : Array.isArray(field.optionItems)
      ? field.optionItems
      : []
  if (!rawItems.length) return createDefaultManualOptionItems()

  const defaultSet = new Set()
  rawItems.forEach((o) => {
    if (o?.isDefault && String(o.value || '').trim()) {
      defaultSet.add(String(o.value).trim())
    }
  })
  const defVal = String(field.manualDefaultValue || field.defaultJudgment || '').trim()
  if (defVal) defaultSet.add(defVal)

  return rawItems.map((o) => {
    const value = String(o?.value ?? '').trim()
    const result = o?.result === QC_TASK_RESULT.FAIL ? QC_TASK_RESULT.FAIL : QC_TASK_RESULT.PASS
    return {
      value,
      result,
      locked: Boolean(o?.locked),
      isDefault: Boolean(value && defaultSet.has(value)),
    }
  })
}

export function listManualJudgmentSelectOptions(field = {}) {
  return normalizeManualOptionItems(field)
    .filter((o) => o.value)
    .map((o) => ({
      label: o.value,
      value: o.value,
    }))
}

/** locked = 不可删除；文案仍可改 */
export function isLockedManualOption(item = {}) {
  return item?.locked === true
}

/** 人工判定选项校验：须有文案、不重复，且至少各有一个通过/不通过映射 */
export function validateManualOptionItems(optionItems = []) {
  const items = (optionItems || [])
    .map((o) => ({
      value: String(o?.value ?? '').trim(),
      result: o?.result === QC_TASK_RESULT.FAIL ? QC_TASK_RESULT.FAIL : QC_TASK_RESULT.PASS,
      locked: Boolean(o?.locked),
      isDefault: Boolean(o?.isDefault),
    }))
    .filter((o) => o.value)

  if (items.length < 2) {
    return { ok: false, message: '请至少配置两个结论选项' }
  }
  const names = new Set()
  for (const item of items) {
    if (names.has(item.value)) {
      return { ok: false, message: `结论选项「${item.value}」重复` }
    }
    names.add(item.value)
  }
  const hasPass = items.some((o) => o.result === QC_TASK_RESULT.PASS)
  const hasFail = items.some((o) => o.result === QC_TASK_RESULT.FAIL)
  if (!hasPass || !hasFail) {
    return { ok: false, message: '结论选项中需至少各有一个「质检通过」与「质检不通过」' }
  }
  return { ok: true, items }
}

/** 根据选项映射判定达标：质检不通过→fail，其余映射→pass */
export function mapManualJudgmentToPassFail(field = {}, judgment) {
  const v = String(judgment ?? '').trim()
  if (!v) return ''
  const items = normalizeManualOptionItems(field)
  const hit = items.find((o) => o.value === v)
  if (hit) {
    return hit.result === QC_TASK_RESULT.FAIL ? 'fail' : 'pass'
  }
  if (v === QC_MANUAL_JUDGMENT.FAIL) return 'fail'
  if (v === QC_MANUAL_JUDGMENT.PASS || v === QC_MANUAL_JUDGMENT.CONCESSION) return 'pass'
  return ''
}

/**
 * 解析人工判定字段取值：{ measured, judgment }
 * 兼容历史纯标量（仅实测）及纯结论文案。
 */
export function parseManualFieldValue(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const judgmentRaw = raw.judgment ?? raw.passResult ?? raw.manualJudgment
    const measured =
      raw.value !== undefined ? raw.value : raw.measured !== undefined ? raw.measured : ''
    const judgment =
      judgmentRaw != null && String(judgmentRaw).trim() !== '' ? String(judgmentRaw).trim() : ''
    return { measured, judgment }
  }
  if (isManualJudgmentOption(raw)) {
    return { measured: '', judgment: String(raw).trim() }
  }
  return {
    measured: raw === undefined || raw === null ? '' : raw,
    judgment: '',
  }
}

export function wrapManualFieldValue(measured, judgment) {
  return {
    __manual: true,
    value: measured === undefined ? '' : measured,
    judgment: judgment ? String(judgment).trim() : '',
  }
}

export function isManualJudgmentMissing(raw) {
  return !parseManualFieldValue(raw).judgment
}

function isMeasuredEmpty(measured) {
  if (measured === undefined || measured === null) return true
  if (Array.isArray(measured)) return !measured.length
  return String(measured).trim() === ''
}

export function normalizeUnitPosition(pos) {
  return pos === QC_UNIT_POSITION.PREFIX ? QC_UNIT_POSITION.PREFIX : QC_UNIT_POSITION.SUFFIX
}

export function normalizeJudgeRule(rule, fieldType) {
  const r = String(rule || '').trim()
  if (
    r === QC_FIELD_JUDGE_RULE.NONE ||
    r === QC_FIELD_JUDGE_RULE.MANUAL ||
    r === QC_FIELD_JUDGE_RULE.RANGE ||
    r === QC_FIELD_JUDGE_RULE.OPTION_PASS ||
    r === QC_FIELD_JUDGE_RULE.EQUALS
  ) {
    return r
  }
  // 未配置时默认不设标准，避免历史字段被强行套区间
  if (!r) return QC_FIELD_JUDGE_RULE.NONE
  if (fieldType === 'number') return QC_FIELD_JUDGE_RULE.RANGE
  if (fieldType === 'radio' || fieldType === 'checkbox') return QC_FIELD_JUDGE_RULE.OPTION_PASS
  return QC_FIELD_JUDGE_RULE.MANUAL
}

export function buildStandardText(field = {}) {
  if (field.standardText) return String(field.standardText).trim()
  const rule = normalizeJudgeRule(field.judgeRule, field.type)
  if (rule === QC_FIELD_JUDGE_RULE.RANGE) {
    const min = field.standardMin
    const max = field.standardMax
    const unit = field.withUnit ? String(field.unit || '').trim() : ''
    const pos = normalizeUnitPosition(field.unitPosition)
    const fmt = (n) => {
      if (n == null || n === '') return ''
      const s = String(n)
      if (!unit) return s
      return pos === QC_UNIT_POSITION.PREFIX ? `${unit}${s}` : `${s}${unit}`
    }
    if (min !== '' && min != null && max !== '' && max != null) return `${fmt(min)} ~ ${fmt(max)}`
    if (min !== '' && min != null) return `≥ ${fmt(min)}`
    if (max !== '' && max != null) return `≤ ${fmt(max)}`
    return ''
  }
  if (rule === QC_FIELD_JUDGE_RULE.OPTION_PASS) {
    const opts = Array.isArray(field.passOptions) ? field.passOptions.filter(Boolean) : []
    return opts.length ? `合格选项：${opts.join('、')}` : ''
  }
  if (rule === QC_FIELD_JUDGE_RULE.EQUALS) {
    const v = field.standardValue
    return v != null && String(v).trim() !== '' ? `标准值：${v}` : ''
  }
  if (rule === QC_FIELD_JUDGE_RULE.MANUAL) {
    const labels = normalizeManualOptionItems(field)
      .map((o) => o.value)
      .filter(Boolean)
    return labels.length
      ? `人工判定：${labels.join(' / ')}`
      : '人工判定（合格 / 不合格 / 让步合格）'
  }
  return ''
}

/**
 * 根据录入值与标准粗判单项是否合格。
 * @returns {'pass'|'fail'|''} 空表示无法自动判定
 */
export function evaluateFieldAgainstStandard(field = {}, rawValue) {
  const rule = normalizeJudgeRule(field.judgeRule, field.type)
  if (rule === QC_FIELD_JUDGE_RULE.NONE) return ''

  if (rule === QC_FIELD_JUDGE_RULE.MANUAL) {
    const { judgment } = parseManualFieldValue(rawValue)
    return mapManualJudgmentToPassFail(field, judgment)
  }

  const measured = rawValue

  if (rule === QC_FIELD_JUDGE_RULE.RANGE) {
    if (isMeasuredEmpty(measured)) return ''
    const num = Number(measured)
    if (!Number.isFinite(num)) return ''
    const hasMin = field.standardMin !== '' && field.standardMin != null
    const hasMax = field.standardMax !== '' && field.standardMax != null
    if (!hasMin && !hasMax) return ''
    if (hasMin && num < Number(field.standardMin)) return 'fail'
    if (hasMax && num > Number(field.standardMax)) return 'fail'
    return 'pass'
  }

  if (rule === QC_FIELD_JUDGE_RULE.OPTION_PASS) {
    const passSet = new Set((field.passOptions || []).map((o) => String(o).trim()).filter(Boolean))
    if (!passSet.size) return ''
    if (Array.isArray(measured)) {
      if (!measured.length) return ''
      return measured.every((v) => passSet.has(String(v).trim())) ? 'pass' : 'fail'
    }
    const v = String(measured ?? '').trim()
    if (!v) return ''
    return passSet.has(v) ? 'pass' : 'fail'
  }

  if (rule === QC_FIELD_JUDGE_RULE.EQUALS) {
    const expect = String(field.standardValue ?? '').trim()
    if (!expect) return ''
    const v = String(measured ?? '').trim()
    if (!v) return ''
    return v === expect ? 'pass' : 'fail'
  }

  return ''
}

/** 按单位前后缀格式化展示值 */
export function formatFieldValueWithUnit(field = {}, rawValue) {
  const raw = isManualJudgeField(field) ? parseManualFieldValue(rawValue) : null
  const measured = raw ? raw.measured : rawValue
  const judgment = raw ? raw.judgment : ''

  if (isMeasuredEmpty(measured) && !judgment) return '—'

  let text = '—'
  if (!isMeasuredEmpty(measured)) {
    text = Array.isArray(measured)
      ? measured
          .map((v) => String(v).trim())
          .filter(Boolean)
          .join('、')
      : String(measured).trim()
    const unit = field.withUnit || field.unit ? String(field.unit || '').trim() : ''
    if (unit && text) {
      text =
        normalizeUnitPosition(field.unitPosition) === QC_UNIT_POSITION.PREFIX
          ? `${unit} ${text}`
          : `${text} ${unit}`
    }
  }

  if (judgment) {
    return text === '—' ? judgment : `${text}（${judgment}）`
  }
  return text || '—'
}

/**
 * 收集未达单项标准的提示文案（用于提交轻提示）
 * @returns {string[]}
 */
export function collectFailingStandardHints(lines = [], resolveFields) {
  const hints = []
  ;(lines || []).forEach((line) => {
    const fields = typeof resolveFields === 'function' ? resolveFields(line) || [] : []
    const valueMap = {}
    if (line?.fieldMap && typeof line.fieldMap === 'object') {
      Object.assign(valueMap, line.fieldMap)
    }
    ;(line?.fieldValues || []).forEach((v) => {
      const code = v.fieldCode || v.code
      if (code) valueMap[code] = v.value ?? v.fieldValue
    })
    fields.forEach((field) => {
      if (!field?.code) return
      const judge = evaluateFieldAgainstStandard(field, valueMap[field.code])
      if (judge !== 'fail') return
      const item = line.itemName || line.itemCode || '明细'
      hints.push(`${item} · ${field.name || field.code}`)
    })
  })
  return hints
}

/** 从库/模板字段规范化标准相关属性 */
export function pickFieldStandardProps(partial = {}) {
  const type = partial.type || 'text'
  const withUnit = Boolean(partial.withUnit) || Boolean(partial.unit)
  const judgeRule = normalizeJudgeRule(partial.judgeRule, type)
  const base = {
    withUnit,
    unit: withUnit ? String(partial.unit || '').trim() : '',
    unitPosition: withUnit ? normalizeUnitPosition(partial.unitPosition) : QC_UNIT_POSITION.SUFFIX,
    judgeRule,
    standardMin: partial.standardMin ?? '',
    standardMax: partial.standardMax ?? '',
    standardValue: partial.standardValue ?? '',
    passOptions: Array.isArray(partial.passOptions) ? [...partial.passOptions] : [],
    standardText: partial.standardText || '',
  }
  if (judgeRule === QC_FIELD_JUDGE_RULE.MANUAL) {
    base.manualOptionItems = normalizeManualOptionItems(partial)
  }
  return base
}
