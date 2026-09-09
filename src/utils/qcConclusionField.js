import { QC_TASK_RESULT } from '@/constants/qcTaskResult'

/** 默认结论选项文案 */
export const QC_CONCLUSION_PASS_OPTION = '合格'
export const QC_CONCLUSION_FAIL_OPTION = '不合格'
export const QC_CONCLUSION_CONCESSION_OPTION = '让步合格'
export const QC_CONCLUSION_PARTIAL_OPTION = '部分合格'

export const QC_CONCLUSION_FIELD_CODE = 'QC_CONCLUSION'
export const QC_INSPECT_METHOD_FIELD_CODE = 'QC_INSPECT_METHOD'
export const QC_INSPECT_QTY_FIELD_CODE = 'QC_INSPECT_QTY'
export const QC_INSPECT_REMARK_FIELD_CODE = 'QC_INSPECT_REMARK'

/** 结论选项可映射的任务结果 */
export const QC_CONCLUSION_RESULT_OPTIONS = [
  { label: '质检通过', value: QC_TASK_RESULT.PASS },
  { label: '质检不通过', value: QC_TASK_RESULT.FAIL },
  { label: '部分通过', value: QC_TASK_RESULT.PARTIAL },
]

const CONCLUSION_MAP_RESULTS = new Set([
  QC_TASK_RESULT.PASS,
  QC_TASK_RESULT.FAIL,
  QC_TASK_RESULT.PARTIAL,
])

/** 默认结论选项（合格/不合格不可删；让步合格、部分合格可删） */
export const DEFAULT_CONCLUSION_OPTION_ITEMS = [
  { value: QC_CONCLUSION_PASS_OPTION, result: QC_TASK_RESULT.PASS, locked: true },
  { value: QC_CONCLUSION_FAIL_OPTION, result: QC_TASK_RESULT.FAIL, locked: true },
  { value: QC_CONCLUSION_CONCESSION_OPTION, result: QC_TASK_RESULT.PASS, locked: false },
  { value: QC_CONCLUSION_PARTIAL_OPTION, result: QC_TASK_RESULT.PARTIAL, locked: false },
]

/** 不可删除的结论文案（仅合格/不合格） */
export const LOCKED_CONCLUSION_OPTION_VALUES = new Set([
  QC_CONCLUSION_PASS_OPTION,
  QC_CONCLUSION_FAIL_OPTION,
])

export const PRESET_CONCLUSION_OPTION_VALUES = new Set(
  DEFAULT_CONCLUSION_OPTION_ITEMS.map((o) => o.value),
)

/** locked = 不可删除；文案仍可改。让步合格可删。 */
export function isLockedConclusionOption(item = {}) {
  if (item?.locked === true) return true
  const v = String(item?.value || '').trim()
  return LOCKED_CONCLUSION_OPTION_VALUES.has(v)
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
const PARTIAL_VALUES = new Set([
  QC_CONCLUSION_PARTIAL_OPTION,
  '部分通过',
  QC_TASK_RESULT.PARTIAL,
  'PARTIAL',
  'partial',
])

function guessResultForLabel(label) {
  const v = String(label || '').trim()
  if (!v) return QC_TASK_RESULT.PASS
  if (PARTIAL_VALUES.has(v) || v.includes('部分合格') || v.includes('部分通过')) {
    return QC_TASK_RESULT.PARTIAL
  }
  if (FAIL_VALUES.has(v)) return QC_TASK_RESULT.FAIL
  if (PASS_VALUES.has(v)) return QC_TASK_RESULT.PASS
  return QC_TASK_RESULT.PASS
}

function coerceConclusionResult(result, label = '') {
  if (CONCLUSION_MAP_RESULTS.has(result)) return result
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

/** 判定是否为系统默认「检验备注」 */
export function isQcInspectRemarkField(field = {}) {
  if (field.isPresetInspectRemark === true) return true
  const code = String(field.code || '')
    .trim()
    .toUpperCase()
  if (code === QC_INSPECT_REMARK_FIELD_CODE || code === 'QC_FIELD_REMARK') return true
  return String(field.name || '').trim() === '检验备注'
}

/** 检验项库中的系统预置项（方式/数量/备注等） */
export function isQcSystemLibraryField(field = {}) {
  if (field?.isSystem === true || field?.isSystemLibrary === true) return true
  return (
    isQcInspectMethodField(field) || isQcInspectQtyField(field) || isQcInspectRemarkField(field)
  )
}

/** 系统固定项（历史兼容）：结论仍可识别；模板侧不再强制不可删 */
export function isQcSystemFixedField(field = {}) {
  return (
    isQcInspectMethodField(field) ||
    isQcInspectQtyField(field) ||
    isQcInspectRemarkField(field) ||
    isQcConclusionField(field)
  )
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
 * 规范化结论选项（与检验项「人工判定」一致）：
 * - 文案可改；合格/不合格不可删除；让步合格可删
 * - 不强制把已删的让步合格补回
 */
export function normalizeConclusionOptionItems(field = {}) {
  const parsed = parseRawOptionItems(field)
  if (!parsed.length) {
    return DEFAULT_CONCLUSION_OPTION_ITEMS.map((def) => ({ ...def }))
  }

  const defaultSet = new Set()
  parsed.forEach((o) => {
    if (o?.isDefault && String(o.value || '').trim()) {
      defaultSet.add(String(o.value).trim())
    }
  })
  const defVal = String(field.defaultValue || '').trim()
  if (defVal) defaultSet.add(defVal)

  return parsed.map((o) => {
    const value = String(o?.value ?? '').trim()
    const result = coerceConclusionResult(o?.result, value)
    const locked =
      value === QC_CONCLUSION_CONCESSION_OPTION || value === QC_CONCLUSION_PARTIAL_OPTION
        ? false
        : Boolean(o?.locked) || LOCKED_CONCLUSION_OPTION_VALUES.has(value)
    return {
      value,
      result,
      locked,
      isDefault: Boolean(value && defaultSet.has(value)),
    }
  })
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
  const defaultValue =
    String(partial.defaultValue || '').trim() || safeItems.find((o) => o.isDefault)?.value || ''

  return {
    name: partial.name || '质检结果',
    enabled: partial.enabled !== false,
    placeholder: partial.placeholder || '请选择质检结果',
    defaultValue,
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

/** 规范化模板级整单结论选项（与检验项人工判定一致） */
export function normalizeSheetConclusionOptionItems(items) {
  return normalizeConclusionOptionItems({ optionItems: items })
}

/**
 * 将模板级结论选项同步进字段列表（写入/覆盖 QC_CONCLUSION）。
 * 整单「人工判定」不再依赖检验项库「质检结果」，由模板配置驱动。
 */
export function upsertSheetConclusionField(fields = [], sheetConclusionOptionItems) {
  const list = Array.isArray(fields) ? fields.filter((f) => !isQcConclusionField(f)) : []
  const existing = findQcConclusionField(fields)
  const sourceItems = Array.isArray(sheetConclusionOptionItems)
    ? sheetConclusionOptionItems
    : existing?.optionItems
  const conclusion = createPresetConclusionField({
    name: existing?.name || '质检结果',
    enabled: existing?.enabled !== false,
    placeholder: existing?.placeholder || '请选择质检结果',
    defaultValue: existing?.defaultValue || '',
    optionItems: sourceItems,
    sortOrder: existing?.sortOrder != null ? existing.sortOrder : 9999,
  })
  return [...list, conclusion]
}

/** 从模板字段中提取结论选项，供表单回填 */
export function extractSheetConclusionOptionItems(fields = [], fallbackItems) {
  const conclusion = findQcConclusionField(fields)
  if (conclusion) return normalizeConclusionOptionItems(conclusion)
  if (Array.isArray(fallbackItems) && fallbackItems.length) {
    return normalizeSheetConclusionOptionItems(fallbackItems)
  }
  return DEFAULT_CONCLUSION_OPTION_ITEMS.map((o) => ({ ...o }))
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
    judgeRule: partial.judgeRule || 'none',
    format: '',
    charLimit: null,
    description: partial.description || '',
    isSystem: true,
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
    judgeRule: partial.judgeRule || 'none',
    format: '',
    charLimit: null,
    description: partial.description || '',
    isSystem: true,
  }
}

/** 系统默认：检验备注 */
export function createPresetInspectRemarkField(partial = {}) {
  return {
    code: QC_INSPECT_REMARK_FIELD_CODE,
    name: '检验备注',
    type: 'textarea',
    required: false,
    enabled: partial.enabled !== false,
    options: [],
    defaultValue: partial.defaultValue ?? '',
    placeholder: partial.placeholder || '请输入检验备注',
    sortOrder: partial.sortOrder != null ? partial.sortOrder : 3,
    isPresetField: true,
    isPresetInspectRemark: true,
    isSystemFixed: false,
    isConclusion: false,
    isPresetConclusion: false,
    category: partial.category || '其他',
    unit: '',
    judgeRule: 'none',
    format: '',
    charLimit: partial.charLimit ?? null,
    description: partial.description || '',
    isSystem: true,
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
 * 规范化模板字段。
 * 默认不自动补齐系统项（由用户从检验项库选用）；传 inject:true 可兼容旧行为补齐方式/数量/结果。
 * @param {object[]} fields
 * @param {{ layout?: 'preserve' | 'default', inject?: boolean }} [options]
 */
export function ensureFieldsWithSystemFixedItems(fields = [], options = {}) {
  const layout = options.layout === 'default' ? 'default' : 'preserve'
  const inject = options.inject === true
  const list = Array.isArray(fields) ? fields.map(cloneFieldShallow) : []

  let methodSrc = null
  let qtySrc = null
  let remarkSrc = null
  let conclusionSrc = null
  const others = []
  list.forEach((f) => {
    if (!methodSrc && isQcInspectMethodField(f)) methodSrc = f
    else if (!qtySrc && isQcInspectQtyField(f)) qtySrc = f
    else if (!remarkSrc && isQcInspectRemarkField(f)) remarkSrc = f
    else if (!conclusionSrc && isQcConclusionField(f)) conclusionSrc = f
    else {
      others.push({
        ...f,
        isConclusion: false,
        isPresetConclusion: false,
        isPresetInspectMethod: false,
        isPresetInspectQty: false,
        isPresetInspectRemark: false,
        isSystemFixed: false,
      })
    }
  })

  const method = methodSrc ? createPresetInspectMethodField(methodSrc) : null
  const qty = qtySrc ? createPresetInspectQtyField(qtySrc) : null
  const remark = remarkSrc ? createPresetInspectRemarkField(remarkSrc) : null
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
    : null

  if (inject) {
    const m = method || createPresetInspectMethodField()
    const q = qty || createPresetInspectQtyField()
    const c = conclusion || createPresetConclusionField()
    if (layout === 'default') {
      return [m, q, ...(remark ? [remark] : []), ...others, c]
    }
  }

  if (layout === 'default') {
    return [
      ...(method ? [method] : []),
      ...(qty ? [qty] : []),
      ...(remark ? [remark] : []),
      ...others,
      ...(conclusion ? [conclusion] : []),
    ]
  }

  // preserve：按原顺序回写规范化后的系统项，跳过重复；默认不补缺失项
  const used = { method: false, qty: false, remark: false, conclusion: false }
  const result = []
  list.forEach((f) => {
    if (isQcInspectMethodField(f)) {
      if (used.method) return
      used.method = true
      if (method) result.push(method)
      return
    }
    if (isQcInspectQtyField(f)) {
      if (used.qty) return
      used.qty = true
      if (qty) result.push(qty)
      return
    }
    if (isQcInspectRemarkField(f)) {
      if (used.remark) return
      used.remark = true
      if (remark) result.push(remark)
      return
    }
    if (isQcConclusionField(f)) {
      if (used.conclusion) return
      used.conclusion = true
      if (conclusion) result.push(conclusion)
      return
    }
    result.push({
      ...f,
      isConclusion: false,
      isPresetConclusion: false,
      isPresetInspectMethod: false,
      isPresetInspectQty: false,
      isPresetInspectRemark: false,
      isSystemFixed: false,
    })
  })

  if (inject) {
    if (!used.method) result.unshift(method || createPresetInspectMethodField())
    if (!used.qty) {
      const methodIdx = result.findIndex((f) => isQcInspectMethodField(f))
      result.splice(methodIdx >= 0 ? methodIdx + 1 : 0, 0, qty || createPresetInspectQtyField())
    }
    if (!used.conclusion) result.push(conclusion || createPresetConclusionField())
  }

  return result
}

/**
 * @deprecated 使用 ensureFieldsWithSystemFixedItems
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
 * 新增普通字段：插到结论前；无结论则追加末尾。不再强制补齐系统项。
 */
export function insertFieldBeforeConclusion(fields, field) {
  const list = ensureFieldsWithSystemFixedItems(fields, { layout: 'preserve' })
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

  if (PARTIAL_VALUES.has(v) || v.includes('部分合格') || v.includes('部分通过')) {
    return QC_TASK_RESULT.PARTIAL
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

/** 校验结论选项配置（与检验项人工判定一致：须有通过/不通过映射；让步合格可无） */
export function validateConclusionOptionItems(optionItems = []) {
  const items = (optionItems || [])
    .map((o) => ({
      value: String(o?.value ?? '').trim(),
      result: coerceConclusionResult(o?.result, o?.value),
      locked:
        Boolean(o?.locked) || LOCKED_CONCLUSION_OPTION_VALUES.has(String(o?.value ?? '').trim()),
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
    if (!CONCLUSION_MAP_RESULTS.has(item.result)) {
      return { ok: false, message: `请为「${item.value}」选择质检通过、质检不通过或部分通过` }
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
