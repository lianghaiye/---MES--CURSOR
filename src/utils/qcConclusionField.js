import { QC_TASK_RESULT } from '@/constants/qcTaskResult'

/** 默认结论选项文案 */
export const QC_CONCLUSION_PASS_OPTION = '合格'
export const QC_CONCLUSION_FAIL_OPTION = '不合格'
export const QC_CONCLUSION_CONCESSION_OPTION = '让步合格'

export const QC_CONCLUSION_FIELD_CODE = 'QC_CONCLUSION'
export const QC_INSPECT_METHOD_FIELD_CODE = 'QC_INSPECT_METHOD'
export const QC_INSPECT_QTY_FIELD_CODE = 'QC_INSPECT_QTY'

/** 结论选项可映射的任务结果（仅通过 / 不通过） */
export const QC_CONCLUSION_RESULT_OPTIONS = [
  { label: '质检通过', value: QC_TASK_RESULT.PASS },
  { label: '质检不通过', value: QC_TASK_RESULT.FAIL },
]

const CONCLUSION_MAP_RESULTS = new Set([QC_TASK_RESULT.PASS, QC_TASK_RESULT.FAIL])

/** 系统预设三项，不可删除 */
export const DEFAULT_CONCLUSION_OPTION_ITEMS = [
  { value: QC_CONCLUSION_PASS_OPTION, result: QC_TASK_RESULT.PASS, locked: true },
  { value: QC_CONCLUSION_FAIL_OPTION, result: QC_TASK_RESULT.FAIL, locked: true },
  { value: QC_CONCLUSION_CONCESSION_OPTION, result: QC_TASK_RESULT.PASS, locked: true },
]

export const PRESET_CONCLUSION_OPTION_VALUES = new Set(
  DEFAULT_CONCLUSION_OPTION_ITEMS.map((o) => o.value),
)

export function isLockedConclusionOption(item = {}) {
  if (item.locked === true) return true
  return PRESET_CONCLUSION_OPTION_VALUES.has(String(item.value || '').trim())
}

const PASS_VALUES = new Set([
  QC_CONCLUSION_PASS_OPTION,
  QC_CONCLUSION_CONCESSION_OPTION,
  '通过',
  '质检通过',
  'OK',
  'PASS',
  'pass',
  'ok',
])
const FAIL_VALUES = new Set([
  QC_CONCLUSION_FAIL_OPTION,
  '不通过',
  '质检不通过',
  'NG',
  'FAIL',
  'fail',
  'ng',
])

function guessResultForLabel(label) {
  const v = String(label || '').trim()
  if (!v) return QC_TASK_RESULT.PASS
  if (FAIL_VALUES.has(v)) return QC_TASK_RESULT.FAIL
  if (PASS_VALUES.has(v)) return QC_TASK_RESULT.PASS
  return QC_TASK_RESULT.PASS
}

function coerceConclusionResult(result, label = '') {
  if (CONCLUSION_MAP_RESULTS.has(result)) return result
  // 历史「部分通过」等统一收敛到通过
  if (result === QC_TASK_RESULT.PARTIAL) return QC_TASK_RESULT.PASS
  return guessResultForLabel(label)
}

/** 判定是否为结论字段 */
export function isQcConclusionField(field = {}) {
  if (field.isConclusion === true || field.role === 'conclusion' || field.isPresetConclusion) {
    return true
  }
  const code = String(field.code || '')
    .trim()
    .toUpperCase()
  if (code === QC_CONCLUSION_FIELD_CODE) return true
  const name = String(field.name || '').trim()
  if (name === '检验结论' || name === '质检结论' || name === '质检结果') return true
  return /(_RESULT|_CONCLUSION)$/.test(code) || code === 'RESULT' || code === 'CONCLUSION'
}

/** 判定是否为系统固定「质检方式」 */
export function isQcInspectMethodField(field = {}) {
  if (field.isPresetInspectMethod === true) return true
  const code = String(field.code || '')
    .trim()
    .toUpperCase()
  if (code === QC_INSPECT_METHOD_FIELD_CODE) return true
  return String(field.name || '').trim() === '质检方式'
}

/** 判定是否为系统固定「质检数量」 */
export function isQcInspectQtyField(field = {}) {
  if (field.isPresetInspectQty === true) return true
  const code = String(field.code || '')
    .trim()
    .toUpperCase()
  if (code === QC_INSPECT_QTY_FIELD_CODE) return true
  return String(field.name || '').trim() === '质检数量'
}

/** 系统固定项：质检方式 / 质检数量 / 质检结果（不可删除） */
export function isQcSystemFixedField(field = {}) {
  return isQcInspectMethodField(field) || isQcInspectQtyField(field) || isQcConclusionField(field)
}

function parseRawOptionItems(field = {}) {
  if (Array.isArray(field.optionItems) && field.optionItems.length) {
    return field.optionItems
      .map((item) => {
        if (typeof item === 'string') {
          const value = String(item).trim()
          if (!value) return null
          return { value, result: guessResultForLabel(value) }
        }
        const value = String(item?.value ?? item?.label ?? '').trim()
        if (!value) return null
        return {
          value,
          result: coerceConclusionResult(item?.result, value),
        }
      })
      .filter(Boolean)
  }

  const optionResults =
    field.optionResults && typeof field.optionResults === 'object' ? field.optionResults : {}
  const options = Array.isArray(field.options) ? field.options : []
  if (options.length) {
    return options
      .map((o) => {
        const value = String(o || '').trim()
        if (!value) return null
        return {
          value,
          result: coerceConclusionResult(optionResults[value], value),
        }
      })
      .filter(Boolean)
  }

  return []
}

/**
 * 规范化结论选项：保证三项系统预设在前且 locked，其后为自定义项。
 * 兼容历史：options: string[] / optionResults / optionItems
 */
export function normalizeConclusionOptionItems(field = {}) {
  const parsed = parseRawOptionItems(field)
  const byValue = new Map(parsed.map((o) => [o.value, o]))

  const presets = DEFAULT_CONCLUSION_OPTION_ITEMS.map((def) => {
    const existing = byValue.get(def.value)
    return {
      value: def.value,
      result: existing ? coerceConclusionResult(existing.result, def.value) : def.result,
      locked: true,
    }
  })

  const customs = parsed
    .filter((o) => !PRESET_CONCLUSION_OPTION_VALUES.has(o.value))
    .map((o) => ({
      value: o.value,
      result: coerceConclusionResult(o.result, o.value),
      locked: false,
    }))

  return [...presets, ...customs]
}

export function optionItemsToOptions(optionItems = []) {
  return (optionItems || []).map((o) => o.value).filter(Boolean)
}

export function optionItemsToResultMap(optionItems = []) {
  const map = {}
  ;(optionItems || []).forEach((o) => {
    if (o?.value) map[o.value] = o.result
  })
  return map
}

/** 预设结论字段（默认启用、固定末位；选项可扩展并配置结果映射） */
export function createPresetConclusionField(partial = {}) {
  const safeItems = normalizeConclusionOptionItems(partial)

  return {
    name: partial.name || '质检结果',
    enabled: partial.enabled !== false,
    placeholder: partial.placeholder || '请选择质检结果',
    defaultValue: partial.defaultValue || '',
    format: partial.format || '',
    charLimit: partial.charLimit ?? null,
    category: partial.category || '',
    unit: partial.unit || '',
    judgeRule: partial.judgeRule || '',
    sortOrder: partial.sortOrder != null ? partial.sortOrder : 9999,
    code: QC_CONCLUSION_FIELD_CODE,
    type: 'radio',
    required: true,
    isConclusion: true,
    isPresetConclusion: true,
    isPresetField: true,
    isSystemFixed: true,
    optionItems: safeItems,
    options: optionItemsToOptions(safeItems),
    optionResults: optionItemsToResultMap(safeItems),
    passOption: safeItems.find((o) => o.result === QC_TASK_RESULT.PASS)?.value || '',
    failOption: safeItems.find((o) => o.result === QC_TASK_RESULT.FAIL)?.value || '',
  }
}

/** 系统固定：质检方式 */
export function createPresetInspectMethodField(partial = {}) {
  const opts =
    Array.isArray(partial.options) && partial.options.length
      ? partial.options.map((o) => String(o)).filter(Boolean)
      : ['抽检', '全检']
  const def =
    partial.defaultValue === '全检' || partial.defaultValue === '抽检'
      ? partial.defaultValue
      : '抽检'
  return {
    code: QC_INSPECT_METHOD_FIELD_CODE,
    name: '质检方式',
    type: 'radio',
    required: true,
    enabled: partial.enabled !== false,
    options: opts,
    defaultValue: def,
    placeholder: partial.placeholder || '请选择质检方式',
    sortOrder: 1,
    isPresetField: true,
    isPresetInspectMethod: true,
    isSystemFixed: true,
    isConclusion: false,
    isPresetConclusion: false,
    category: '',
    unit: '',
    judgeRule: 'manual',
    format: '',
    charLimit: null,
    description: partial.description || '',
  }
}

/** 系统固定：质检数量 */
export function createPresetInspectQtyField(partial = {}) {
  return {
    code: QC_INSPECT_QTY_FIELD_CODE,
    name: '质检数量',
    type: 'number',
    required: true,
    enabled: partial.enabled !== false,
    allowDecimal: partial.allowDecimal !== false,
    options: [],
    defaultValue: partial.defaultValue ?? '',
    placeholder: partial.placeholder || '请输入质检数量',
    sortOrder: 2,
    isPresetField: true,
    isPresetInspectQty: true,
    isSystemFixed: true,
    isConclusion: false,
    isPresetConclusion: false,
    category: '',
    unit: partial.unit || '',
    judgeRule: 'manual',
    format: '',
    charLimit: null,
    description: partial.description || '',
  }
}

function cloneFieldShallow(f = {}) {
  return {
    ...f,
    options: f.options ? [...f.options] : [],
    optionItems: f.optionItems
      ? f.optionItems.map((o) => (typeof o === 'string' ? o : { ...o }))
      : undefined,
    optionResults: f.optionResults ? { ...f.optionResults } : undefined,
  }
}

/**
 * 规范模板字段：保证方式 / 数量 / 结果三项存在且标记正确。
 * @param {object[]} fields
 * @param {{ layout?: 'preserve' | 'default' }} [options]
 * - preserve（默认）：保留现有顺序（含用户拖拽）；缺失项按默认位置补齐
 * - default：强制 方式 → 数量 → 自定义 → 结果（新建 / 添加字段时用）
 */
export function ensureFieldsWithSystemFixedItems(fields = [], options = {}) {
  const layout = options.layout === 'default' ? 'default' : 'preserve'
  const list = Array.isArray(fields) ? fields.map(cloneFieldShallow) : []

  let methodSrc = null
  let qtySrc = null
  let conclusionSrc = null
  const customs = []
  list.forEach((f) => {
    if (!methodSrc && isQcInspectMethodField(f)) methodSrc = f
    else if (!qtySrc && isQcInspectQtyField(f)) qtySrc = f
    else if (!conclusionSrc && isQcConclusionField(f)) conclusionSrc = f
    else if (!isQcSystemFixedField(f)) {
      customs.push({
        ...f,
        isConclusion: false,
        isPresetConclusion: false,
        isPresetInspectMethod: false,
        isPresetInspectQty: false,
        isSystemFixed: false,
        isPresetField: false,
      })
    }
  })

  const method = createPresetInspectMethodField(methodSrc || {})
  const qty = createPresetInspectQtyField(qtySrc || {})
  const conclusion = conclusionSrc
    ? createPresetConclusionField({
        name: conclusionSrc.name === '检验结论' ? '质检结果' : conclusionSrc.name || '质检结果',
        enabled: conclusionSrc.enabled !== false,
        placeholder:
          conclusionSrc.placeholder === '请选择检验结论'
            ? '请选择质检结果'
            : conclusionSrc.placeholder || '请选择质检结果',
        defaultValue: conclusionSrc.defaultValue || '',
        optionItems: conclusionSrc.optionItems,
        options: conclusionSrc.options,
        optionResults: conclusionSrc.optionResults,
      })
    : createPresetConclusionField()

  if (layout === 'default') {
    return [method, qty, ...customs, conclusion]
  }

  // preserve：按原顺序回写规范化后的系统项，跳过重复
  const used = { method: false, qty: false, conclusion: false }
  const result = []
  list.forEach((f) => {
    if (isQcInspectMethodField(f)) {
      if (used.method) return
      used.method = true
      result.push(method)
      return
    }
    if (isQcInspectQtyField(f)) {
      if (used.qty) return
      used.qty = true
      result.push(qty)
      return
    }
    if (isQcConclusionField(f)) {
      if (used.conclusion) return
      used.conclusion = true
      result.push(conclusion)
      return
    }
    if (!isQcSystemFixedField(f)) {
      result.push({
        ...f,
        isConclusion: false,
        isPresetConclusion: false,
        isPresetInspectMethod: false,
        isPresetInspectQty: false,
        isSystemFixed: false,
        isPresetField: false,
      })
    }
  })

  if (!used.method) result.unshift(method)
  if (!used.qty) {
    const methodIdx = result.findIndex((f) => isQcInspectMethodField(f))
    result.splice(methodIdx >= 0 ? methodIdx + 1 : 0, 0, qty)
  }
  if (!used.conclusion) result.push(conclusion)
  return result
}

/**
 * @deprecated 使用 ensureFieldsWithSystemFixedItems（已包含方式/数量/结果三项固定）
 */
export function ensureFieldsWithPresetConclusion(fields = []) {
  return ensureFieldsWithSystemFixedItems(fields, { layout: 'preserve' })
}

export function findQcConclusionField(fields = []) {
  const list = Array.isArray(fields) ? fields : []
  return list.find((f) => isQcConclusionField(f) && f.enabled !== false) || null
}

export function getConclusionFieldIndex(fields = []) {
  const list = Array.isArray(fields) ? fields : []
  return list.findIndex((f) => isQcConclusionField(f))
}

/**
 * 新增普通字段：先恢复默认布局（方式/数量置顶、结果置底），再插到结论前。
 */
export function insertFieldBeforeConclusion(fields, field) {
  const list = ensureFieldsWithSystemFixedItems(fields, { layout: 'default' })
  const idx = getConclusionFieldIndex(list)
  if (idx < 0) {
    list.push(field)
    return list
  }
  list.splice(idx, 0, field)
  return list
}

/**
 * 将结论字段原始值映射为任务级 qcResult。
 * 优先读 optionItems / optionResults；无配置时回退文案启发式（让步合格→质检通过）。
 */
export function mapConclusionValueToQcResult(raw, field = null) {
  const v = String(raw ?? '').trim()
  if (!v) return ''

  if (field) {
    const items = normalizeConclusionOptionItems(field)
    const hit = items.find((o) => o.value === v)
    if (hit) return coerceConclusionResult(hit.result, v)

    const mapped = field.optionResults?.[v]
    if (mapped != null) return coerceConclusionResult(mapped, v)

    if (field.passOption && v === field.passOption) return QC_TASK_RESULT.PASS
    if (field.failOption && v === field.failOption) return QC_TASK_RESULT.FAIL
  }

  if (PASS_VALUES.has(v)) return QC_TASK_RESULT.PASS
  if (FAIL_VALUES.has(v)) return QC_TASK_RESULT.FAIL
  return ''
}

export function resolveQcResultFromFieldValues(fields = [], fieldValues = []) {
  const conclusionField = findQcConclusionField(fields)
  if (!conclusionField) return ''

  const values = Array.isArray(fieldValues) ? fieldValues : []
  const hit =
    values.find((v) => v.fieldCode === conclusionField.code || v.code === conclusionField.code) ||
    values.find((v) => v.fieldName === conclusionField.name || v.name === conclusionField.name)

  return mapConclusionValueToQcResult(hit?.value ?? hit?.fieldValue, conclusionField)
}

export function aggregateLineConclusions(lineResults = []) {
  const list = (lineResults || []).filter(Boolean)
  if (!list.length) return ''
  const allPass = list.every((r) => r === QC_TASK_RESULT.PASS)
  if (allPass) return QC_TASK_RESULT.PASS
  const allFail = list.every((r) => r === QC_TASK_RESULT.FAIL)
  if (allFail) return QC_TASK_RESULT.FAIL
  return QC_TASK_RESULT.PARTIAL
}

/** 校验结论选项配置 */
export function validateConclusionOptionItems(optionItems = []) {
  const items = (optionItems || [])
    .map((o) => ({
      value: String(o?.value ?? '').trim(),
      result: coerceConclusionResult(o?.result, o?.value),
      locked:
        Boolean(o?.locked) || PRESET_CONCLUSION_OPTION_VALUES.has(String(o?.value ?? '').trim()),
    }))
    .filter((o) => o.value)

  for (const preset of DEFAULT_CONCLUSION_OPTION_ITEMS) {
    if (!items.some((o) => o.value === preset.value)) {
      return { ok: false, message: `系统预设选项「${preset.value}」不可删除` }
    }
  }

  const names = new Set()
  for (const item of items) {
    if (names.has(item.value)) {
      return { ok: false, message: `结论选项「${item.value}」重复` }
    }
    names.add(item.value)
    if (!CONCLUSION_MAP_RESULTS.has(item.result)) {
      return { ok: false, message: `请为「${item.value}」选择质检通过或质检不通过` }
    }
  }
  const hasPass = items.some((o) => o.result === QC_TASK_RESULT.PASS)
  const hasFail = items.some((o) => o.result === QC_TASK_RESULT.FAIL)
  if (!hasPass || !hasFail) {
    return { ok: false, message: '结论选项中需至少各有一个「质检通过」与「质检不通过」' }
  }
  return { ok: true, items }
}

/** @deprecated 使用 createPresetConclusionField */
export function normalizeAsConclusionField(field = {}) {
  return createPresetConclusionField(field)
}
