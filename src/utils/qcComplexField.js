/**
 * 复合检测项 / 多点（曲线）网格：结构、取值、判定
 */

import {
  QC_FIELD_JUDGE_RULE,
  buildStandardText,
  evaluateFieldAgainstStandard,
  formatFieldValueWithUnit,
  isManualJudgeField,
  parseManualFieldValue,
  pickFieldStandardProps,
  validateManualOptionItems,
} from '@/utils/qcFieldStandard'

export const QC_COMPLEX_FIELD_TYPE = {
  COMPOSITE: 'composite',
  MATRIX: 'matrix',
}

export function isCompositeField(field = {}) {
  return field?.type === QC_COMPLEX_FIELD_TYPE.COMPOSITE
}

export function isMatrixField(field = {}) {
  return field?.type === QC_COMPLEX_FIELD_TYPE.MATRIX
}

export function isComplexField(field = {}) {
  return isCompositeField(field) || isMatrixField(field)
}

export function createEmptyChildField(partial = {}) {
  const type = partial.type || 'number'
  const unit = String(partial.unit || '').trim()
  const standard = pickFieldStandardProps({
    type,
    ...partial,
    withUnit: Boolean(partial.withUnit) || Boolean(unit),
    unit,
  })
  const options = Array.isArray(partial.options) ? [...partial.options] : []
  let optionRows = Array.isArray(partial.optionRows)
    ? partial.optionRows.map((o) => ({
        value: String(o?.value ?? o ?? ''),
        isDefault: Boolean(o?.isDefault),
      }))
    : []
  if (!optionRows.length && options.length) {
    optionRows = options.map((v) => ({
      value: String(v),
      isDefault: String(v) === String(partial.defaultValue || ''),
    }))
  }
  const row = {
    code: String(partial.code || '').trim(),
    name: String(partial.name || '').trim(),
    type,
    required: partial.required !== false,
    allowDecimal: partial.allowDecimal !== false,
    options,
    optionRows,
    placeholder: partial.placeholder || '',
    defaultValue: partial.defaultValue ?? '',
    format:
      partial.format ||
      (type === 'date' ? 'yyyy-MM-dd' : type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : ''),
    charLimit: partial.charLimit ?? null,
    ...standard,
    unit,
    withUnit: Boolean(unit),
    unitPosition: partial.unitPosition === 'prefix' ? 'prefix' : 'suffix',
  }
  if (!row.standardText) row.standardText = buildStandardText(row)
  return row
}

/** 子项可用类型（与基础字段类型一致，不可再嵌套复合） */
export const QC_CHILD_FIELD_TYPE_OPTIONS = [
  { value: 'text', label: '文本框' },
  { value: 'textarea', label: '文本域' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'radio', label: '单选' },
  { value: 'checkbox', label: '多选' },
]

/** 保存前为子项补齐编码（界面不展示） */
export function ensureChildFieldCodes(children = []) {
  const used = new Set()
  return (children || []).map((raw, index) => {
    const child = createEmptyChildField(raw)
    let code = String(child.code || '').trim()
    if (!code) code = `sub_${index + 1}`
    let base = code
    let n = 2
    while (used.has(code)) {
      code = `${base}_${n}`
      n += 1
    }
    used.add(code)
    const isChoice = child.type === 'radio' || child.type === 'checkbox'
    const options = isChoice
      ? (child.optionRows || []).map((o) => String(o.value || '').trim()).filter(Boolean)
      : child.options || []
    const defaultValue = isChoice
      ? String(child.optionRows?.find((o) => o.isDefault)?.value || child.defaultValue || '').trim()
      : child.defaultValue
    return {
      ...child,
      code,
      options,
      defaultValue,
      withUnit: Boolean(String(child.unit || '').trim()),
      standardText:
        String(child.standardText || '').trim() || buildStandardText({ ...child, options }),
    }
  })
}

export function createEmptyMatrixColumn(partial = {}) {
  const valueType = partial.valueType === 'text' ? 'text' : 'number'
  const standard = pickFieldStandardProps({
    type: valueType === 'number' ? 'number' : 'text',
    withUnit: partial.withUnit,
    unit: partial.unit,
    unitPosition: partial.unitPosition,
    judgeRule: partial.judgeRule,
    standardMin: partial.standardMin,
    standardMax: partial.standardMax,
    standardValue: partial.standardValue,
    passOptions: partial.passOptions,
    standardText: partial.standardText,
  })
  return {
    code: String(partial.code || '').trim(),
    name: String(partial.name || '').trim(),
    valueType,
    unit: String(partial.unit || '').trim(),
    withUnit: Boolean(partial.withUnit) || Boolean(partial.unit),
    unitPosition: partial.unitPosition === 'prefix' ? 'prefix' : 'suffix',
    allowDecimal: partial.allowDecimal !== false,
    options: Array.isArray(partial.options) ? [...partial.options] : [],
    ...standard,
  }
}

export function createEmptyMatrixRowMeta(partial = {}, index = 0) {
  return {
    key: String(partial.key || `r${index + 1}`),
    label: String(partial.label || String(index + 1)),
    isRated: Boolean(partial.isRated),
  }
}

export function cloneChildren(children = []) {
  return (children || []).map((c) => createEmptyChildField(c))
}

export function cloneMatrixColumns(cols = []) {
  return (cols || []).map((c) => createEmptyMatrixColumn(c))
}

export function cloneMatrixRowMetas(rows = []) {
  return (rows || []).map((r, i) => createEmptyMatrixRowMeta(r, i))
}

/** 规范化复合/矩阵结构到字段上 */
export function pickComplexFieldProps(partial = {}) {
  if (partial.type === QC_COMPLEX_FIELD_TYPE.COMPOSITE) {
    const children = ensureChildFieldCodes(partial.children)
    const standard = pickFieldStandardProps(partial)
    return {
      children,
      matrixColumns: [],
      matrixRows: [],
      matrixAllowAddRow: false,
      withUnit: false,
      unit: '',
      ...standard,
      standardText:
        String(partial.standardText || '').trim() || standard.standardText || '含子项分别判定',
    }
  }
  if (partial.type === QC_COMPLEX_FIELD_TYPE.MATRIX) {
    const matrixRows = cloneMatrixRowMetas(
      partial.matrixRows?.length
        ? partial.matrixRows
        : [
            { key: 'r1', label: '1' },
            { key: 'r2', label: '2' },
            { key: 'r3', label: '3', isRated: true },
            { key: 'r4', label: '4' },
            { key: 'r5', label: '5' },
          ],
    )
    return {
      children: [],
      matrixColumns: cloneMatrixColumns(partial.matrixColumns),
      matrixRows,
      matrixAllowAddRow: partial.matrixAllowAddRow !== false,
      withUnit: false,
      unit: '',
      judgeRule: QC_FIELD_JUDGE_RULE.NONE,
      standardMin: '',
      standardMax: '',
      standardValue: '',
      passOptions: [],
      standardText: partial.standardText || '多点网格录入',
    }
  }
  return {
    children: [],
    matrixColumns: [],
    matrixRows: [],
    matrixAllowAddRow: false,
  }
}

export function emptyCompositeValue(field = {}) {
  const children = {}
  ;(field.children || []).forEach((c) => {
    if (!c.code) return
    children[c.code] =
      c.defaultValue !== undefined && c.defaultValue !== '' ? c.defaultValue : undefined
  })
  return { kind: 'composite', children }
}

export function emptyMatrixValue(field = {}) {
  const rows = (field.matrixRows || []).map((meta) => {
    const row = { _key: meta.key, _label: meta.label, _isRated: Boolean(meta.isRated) }
    ;(field.matrixColumns || []).forEach((col) => {
      if (col.code) row[col.code] = undefined
    })
    return row
  })
  return { kind: 'matrix', rows }
}

export function normalizeComplexValue(field = {}, raw) {
  if (isCompositeField(field)) {
    const base = emptyCompositeValue(field)
    const src =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw.children && typeof raw.children === 'object'
          ? raw.children
          : raw
        : {}
    ;(field.children || []).forEach((c) => {
      if (!c.code) return
      if (src[c.code] !== undefined) base.children[c.code] = src[c.code]
    })
    return base
  }
  if (isMatrixField(field)) {
    const base = emptyMatrixValue(field)
    const srcRows = Array.isArray(raw?.rows) ? raw.rows : Array.isArray(raw) ? raw : []
    if (!srcRows.length) return base
    const cols = field.matrixColumns || []
    base.rows = srcRows.map((r, i) => {
      const meta = field.matrixRows?.[i] || {}
      const row = {
        _key: r._key || meta.key || `r${i + 1}`,
        _label: r._label || meta.label || String(i + 1),
        _isRated: Boolean(r._isRated ?? meta.isRated),
      }
      cols.forEach((col) => {
        if (col.code) row[col.code] = r[col.code]
      })
      return row
    })
    return base
  }
  return raw
}

/** 复合项：逐子项判定；任一 fail → fail；可自动判定的子项全部 pass → pass */
export function evaluateCompositeField(field = {}, rawValue) {
  const value = normalizeComplexValue(field, rawValue)
  const children = field.children || []
  if (!children.length) return ''
  const autoChildren = children.filter((c) => {
    const rule = normalizeJudgeRuleOf(c)
    return rule !== QC_FIELD_JUDGE_RULE.NONE && rule !== QC_FIELD_JUDGE_RULE.MANUAL
  })
  if (!autoChildren.length) return ''
  let hasEmpty = false
  for (const child of autoChildren) {
    const v = value.children?.[child.code]
    if (v === undefined || v === null || String(v).trim() === '') {
      hasEmpty = true
      continue
    }
    const j = evaluateFieldAgainstStandard(child, v)
    if (j === 'fail') return 'fail'
  }
  if (hasEmpty) return ''
  const allPass = autoChildren.every(
    (c) => evaluateFieldAgainstStandard(c, value.children?.[c.code]) === 'pass',
  )
  return allPass ? 'pass' : ''
}

function normalizeJudgeRuleOf(child) {
  const r = String(child.judgeRule || '').trim()
  if (
    r === QC_FIELD_JUDGE_RULE.NONE ||
    r === QC_FIELD_JUDGE_RULE.MANUAL ||
    r === QC_FIELD_JUDGE_RULE.RANGE ||
    r === QC_FIELD_JUDGE_RULE.OPTION_PASS ||
    r === QC_FIELD_JUDGE_RULE.EQUALS
  ) {
    return r
  }
  return QC_FIELD_JUDGE_RULE.NONE
}

/** 矩阵：按列标准逐格判定；有标准的列任一 fail → fail；否则填完视为 pass */
export function evaluateMatrixField(field = {}, rawValue) {
  const value = normalizeComplexValue(field, rawValue)
  const cols = field.matrixColumns || []
  if (!cols.length || !value.rows?.length) return ''
  let emptyRequired = false
  let filled = 0
  let hasFail = false
  let hasAutoPass = false
  let hasAutoPending = false
  value.rows.forEach((row) => {
    cols.forEach((col) => {
      const v = row[col.code]
      const empty = v === undefined || v === null || String(v).trim() === ''
      if (!empty) filled += 1
      else if (field.required !== false) emptyRequired = true
      const colAsField = {
        type: col.valueType === 'text' ? 'text' : 'number',
        judgeRule: col.judgeRule,
        standardMin: col.standardMin,
        standardMax: col.standardMax,
        standardValue: col.standardValue,
        passOptions: col.passOptions,
        withUnit: col.withUnit,
        unit: col.unit,
      }
      if (!empty) {
        const j = evaluateFieldAgainstStandard(colAsField, v)
        if (j === 'fail') hasFail = true
        else if (j === 'pass') hasAutoPass = true
        else if (normalizeJudgeRuleOf(colAsField) !== QC_FIELD_JUDGE_RULE.NONE) {
          /* manual/none */
        }
      } else if (
        normalizeJudgeRuleOf(colAsField) !== QC_FIELD_JUDGE_RULE.NONE &&
        normalizeJudgeRuleOf(colAsField) !== QC_FIELD_JUDGE_RULE.MANUAL
      ) {
        hasAutoPending = true
      }
    })
  })
  if (hasFail) return 'fail'
  if (!filled) return ''
  if (emptyRequired || hasAutoPending) return ''
  if (hasAutoPass) return 'pass'
  return emptyRequired ? '' : 'pass'
}

export function evaluateComplexOrSimpleField(field = {}, rawValue) {
  if (isCompositeField(field)) return evaluateCompositeField(field, rawValue)
  if (isMatrixField(field)) return evaluateMatrixField(field, rawValue)
  return evaluateFieldAgainstStandard(field, rawValue)
}

export function isComplexValueEmpty(field = {}, rawValue) {
  if (isCompositeField(field)) {
    const value = normalizeComplexValue(field, rawValue)
    const children = field.children || []
    if (!children.length) return true
    return children.some((c) => {
      if (c.required === false && !isManualJudgeField(c)) return false
      const v = value.children?.[c.code]
      if (isManualJudgeField(c)) {
        const { measured, judgment } = parseManualFieldValue(v)
        if (c.required !== false) {
          if (measured === undefined || measured === null || String(measured).trim() === '') {
            return true
          }
        }
        return !judgment
      }
      return v === undefined || v === null || String(v).trim() === ''
    })
  }
  if (isMatrixField(field)) {
    const value = normalizeComplexValue(field, rawValue)
    const cols = field.matrixColumns || []
    if (!cols.length || !(value.rows || []).length) return true
    return !(value.rows || []).every((row) =>
      cols.every((col) => {
        const v = row[col.code]
        return v !== undefined && v !== null && String(v).trim() !== ''
      }),
    )
  }
  return rawValue === undefined || rawValue === null || String(rawValue).trim() === ''
}

export function formatComplexValueSummary(field = {}, rawValue) {
  if (isCompositeField(field)) {
    const value = normalizeComplexValue(field, rawValue)
    const parts = (field.children || [])
      .map((c) => {
        const v = value.children?.[c.code]
        if (v === undefined || v === null || String(v).trim() === '') return null
        return `${c.name} ${formatFieldValueWithUnit(c, v)}`
      })
      .filter(Boolean)
    return parts.length ? parts.join('；') : '—'
  }
  if (isMatrixField(field)) {
    const value = normalizeComplexValue(field, rawValue)
    const n = (value.rows || []).length
    const cols = (field.matrixColumns || []).map((c) => c.name || c.code).join('/')
    return n ? `${n} 个测点（${cols || '未配置列'}）` : '—'
  }
  return formatFieldValueWithUnit(field, rawValue)
}

export function collectComplexFailHints(field = {}, rawValue, itemLabel = '') {
  const prefix = itemLabel ? `${itemLabel} · ` : ''
  if (isCompositeField(field)) {
    const value = normalizeComplexValue(field, rawValue)
    const hints = []
    ;(field.children || []).forEach((child) => {
      if (evaluateFieldAgainstStandard(child, value.children?.[child.code]) === 'fail') {
        hints.push(`${prefix}${field.name || field.code} / ${child.name || child.code}`)
      }
    })
    return hints
  }
  if (isMatrixField(field)) {
    if (evaluateMatrixField(field, rawValue) === 'fail') {
      return [`${prefix}${field.name || field.code}`]
    }
  }
  return []
}

export function validateComplexFieldConfig(field = {}) {
  if (isCompositeField(field)) {
    const children = ensureChildFieldCodes(field.children)
    if (!children.length) return { ok: false, message: '复合项请至少添加一个子项' }
    for (const c of children) {
      if (!String(c.name || '').trim()) return { ok: false, message: '子项名称不能为空' }
      if ((c.type === 'radio' || c.type === 'checkbox') && !(c.options || []).length) {
        return { ok: false, message: `子项「${c.name}」请至少添加一个选项` }
      }
      if (c.judgeRule === QC_FIELD_JUDGE_RULE.RANGE) {
        const hasMin = c.standardMin !== '' && c.standardMin != null
        const hasMax = c.standardMax !== '' && c.standardMax != null
        if (!hasMin && !hasMax) {
          return { ok: false, message: `子项「${c.name}」请至少填写合格区间的下限或上限` }
        }
      }
      if (c.judgeRule === QC_FIELD_JUDGE_RULE.OPTION_PASS && !(c.passOptions || []).length) {
        return { ok: false, message: `子项「${c.name}」请选择至少一个合格选项` }
      }
      if (c.judgeRule === QC_FIELD_JUDGE_RULE.EQUALS && !String(c.standardValue || '').trim()) {
        return { ok: false, message: `子项「${c.name}」请填写标准值` }
      }
      if (c.judgeRule === QC_FIELD_JUDGE_RULE.MANUAL) {
        const check = validateManualOptionItems(c.manualOptionItems)
        if (!check.ok) {
          return { ok: false, message: `子项「${c.name}」${check.message}` }
        }
      }
    }
    return { ok: true, children }
  }
  if (isMatrixField(field)) {
    return { ok: false, message: '多点项暂未开放，请改用基础类型或复合类型' }
  }
  return { ok: true }
}

/**
 * 提交轻提示：含普通项 + 复合子项未达标
 */
export function collectAllFailingStandardHints(lines = [], resolveFields) {
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
    const item = line.itemName || line.itemCode || '明细'
    fields.forEach((field) => {
      if (!field?.code) return
      const raw = valueMap[field.code]
      if (isComplexField(field)) {
        const nested = collectComplexFailHints(field, raw, item)
        if (nested.length) hints.push(...nested)
        else if (evaluateComplexOrSimpleField(field, raw) === 'fail') {
          hints.push(`${item} · ${field.name || field.code}`)
        }
        return
      }
      if (evaluateFieldAgainstStandard(field, raw) === 'fail') {
        hints.push(`${item} · ${field.name || field.code}`)
      }
    })
  })
  return hints
}
