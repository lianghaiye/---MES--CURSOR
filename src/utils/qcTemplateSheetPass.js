import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import {
  isQcConclusionField,
  isQcInspectMethodField,
  isQcInspectQtyField,
  mapConclusionValueToQcResult,
  findQcConclusionField,
} from '@/utils/qcConclusionField'
import { buildStandardText, evaluateFieldAgainstStandard } from '@/utils/qcFieldStandard'
import {
  collectComplexFailHints,
  evaluateComplexOrSimpleField,
  isComplexField,
} from '@/utils/qcComplexField'

/** 模板整单合格规则 */
export const QC_TEMPLATE_SHEET_PASS_RULE = {
  MANUAL: 'manual',
  ALL_PASS: 'allPass',
  KEY_FIELDS: 'keyFields',
}

export const QC_TEMPLATE_SHEET_PASS_RULE_OPTIONS = [
  {
    value: QC_TEMPLATE_SHEET_PASS_RULE.MANUAL,
    label: '人工判定',
    desc: '整单结论由质检员从本模板配置的结论选项中选择（可含特采等）；检验项未达标仅提示，不强制拦截。',
  },
  {
    value: QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS,
    label: '全部达标才通过',
    desc: '系统按检验项自动给出整单结论：凡配置了合格标准的项全部达标则为「合格」，任一未达标则为「不合格」。',
  },
  {
    value: QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS,
    label: '关键项必须达标',
    desc: '系统按关键项自动给出整单结论：勾选的关键项全部达标则为「合格」，任一未达标则为「不合格」。',
  },
]

export function normalizeSheetPassRule(rule) {
  const v = String(rule || '').trim()
  if (
    v === QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS ||
    v === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS ||
    v === QC_TEMPLATE_SHEET_PASS_RULE.MANUAL
  ) {
    return v
  }
  return QC_TEMPLATE_SHEET_PASS_RULE.MANUAL
}

/** 是否由系统自动给出整单结论（非人工选择） */
export function isAutoSheetConclusionRule(rule) {
  const r = normalizeSheetPassRule(rule)
  return r === QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS || r === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS
}

export function sheetPassRuleLabel(rule) {
  const hit = QC_TEMPLATE_SHEET_PASS_RULE_OPTIONS.find(
    (o) => o.value === normalizeSheetPassRule(rule),
  )
  return hit?.label || '人工判定'
}

export function sheetPassRuleDesc(rule) {
  const hit = QC_TEMPLATE_SHEET_PASS_RULE_OPTIONS.find(
    (o) => o.value === normalizeSheetPassRule(rule),
  )
  return hit?.desc || ''
}

/** 参与整单规则判定的检验项（排除方式/数量/备注/结论） */
export function listSheetPassCandidateFields(fields = []) {
  return (fields || []).filter(
    (f) =>
      f &&
      f.code &&
      !isQcInspectMethodField(f) &&
      !isQcInspectQtyField(f) &&
      !isQcConclusionField(f) &&
      String(f.code || '')
        .trim()
        .toUpperCase() !== 'QC_INSPECT_REMARK' &&
      String(f.code || '')
        .trim()
        .toUpperCase() !== 'QC_FIELD_REMARK' &&
      String(f.name || '').trim() !== '检验备注',
  )
}

function hasEvaluableStandard(field = {}) {
  if (isComplexField(field)) {
    const children = field.children || []
    return children.some((c) => hasEvaluableStandard(c))
  }
  const rule = String(field.judgeRule || '').trim()
  if (rule && rule !== 'none') return true
  return Boolean(String(buildStandardText(field) || '').trim())
}

/** 按整单规则筛选需强制达标的字段 */
export function listSheetPassEnforcedFields(fields = [], sheetPassRule) {
  const rule = normalizeSheetPassRule(sheetPassRule)
  const candidates = listSheetPassCandidateFields(fields).filter((f) => hasEvaluableStandard(f))
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.MANUAL) return []
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS) {
    return candidates.filter((f) => f.keyForSheetPass === true)
  }
  return candidates
}

function resolveValueMap(line = {}) {
  const valueMap = {}
  if (line?.fieldMap && typeof line.fieldMap === 'object') {
    Object.assign(valueMap, line.fieldMap)
  }
  ;(line?.fieldValues || []).forEach((v) => {
    const code = v.fieldCode || v.code
    if (code) valueMap[code] = v.value ?? v.fieldValue
  })
  return valueMap
}

function pickAutoConclusionLabels(optionItems = []) {
  const items = Array.isArray(optionItems) ? optionItems : []
  const pass =
    items.find(
      (o) => o?.result === QC_TASK_RESULT.PASS && String(o.value || '').trim() === '合格',
    ) || items.find((o) => o?.result === QC_TASK_RESULT.PASS)
  const fail = items.find((o) => o?.result === QC_TASK_RESULT.FAIL)
  return {
    passLabel: String(pass?.value || '合格').trim() || '合格',
    failLabel: String(fail?.value || '不合格').trim() || '不合格',
  }
}

/**
 * 按「全部达标 / 关键项达标」自动给出整单结论。
 * @returns {{
 *   auto: boolean,
 *   status: 'manual'|'pending'|'pass'|'fail'|'unavailable',
 *   value: string,
 *   mappedResult: string,
 *   reason: string,
 *   failHints: string[],
 * }}
 */
export function resolveAutoSheetConclusion(
  line = {},
  fields = [],
  sheetPassRule,
  optionItems = [],
) {
  const rule = normalizeSheetPassRule(sheetPassRule)
  if (!isAutoSheetConclusionRule(rule)) {
    return {
      auto: false,
      status: 'manual',
      value: '',
      mappedResult: '',
      reason: '',
      failHints: [],
    }
  }

  const { passLabel, failLabel } = pickAutoConclusionLabels(optionItems)
  const enforced = listSheetPassEnforcedFields(fields, rule)

  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS && !enforced.length) {
    return {
      auto: true,
      status: 'unavailable',
      value: '',
      mappedResult: '',
      reason: '模板未勾选关键项，无法自动判定',
      failHints: [],
    }
  }

  if (!enforced.length) {
    return {
      auto: true,
      status: 'pending',
      value: '',
      mappedResult: '',
      reason: '暂无可自动判定的检验项，请先录入带合格标准的项目',
      failHints: [],
    }
  }

  const valueMap = resolveValueMap(line)
  const item = line.itemName || line.itemCode || '明细'
  const failHints = []
  let pending = false

  enforced.forEach((field) => {
    const raw = valueMap[field.code]
    const judge = isComplexField(field)
      ? evaluateComplexOrSimpleField(field, raw)
      : evaluateFieldAgainstStandard(field, raw)
    if (judge === 'fail') {
      failHints.push(`${item} · ${field.name || field.code}`)
      return
    }
    if (judge !== 'pass') pending = true
  })

  if (failHints.length) {
    return {
      auto: true,
      status: 'fail',
      value: failLabel,
      mappedResult: QC_TASK_RESULT.FAIL,
      reason: `存在未达标项，系统判定为「${failLabel}」`,
      failHints,
    }
  }

  if (pending) {
    return {
      auto: true,
      status: 'pending',
      value: '',
      mappedResult: '',
      reason: '检验项尚未全部录入完成，结论待自动判定',
      failHints: [],
    }
  }

  return {
    auto: true,
    status: 'pass',
    value: passLabel,
    mappedResult: QC_TASK_RESULT.PASS,
    reason: `按「${sheetPassRuleLabel(rule)}」，系统判定为「${passLabel}」`,
    failHints: [],
  }
}

/**
 * 收集整单规则下未达标项（用于提示/拦截）
 */
export function collectSheetPassFailHints(line = {}, fields = [], sheetPassRule) {
  const enforced = listSheetPassEnforcedFields(fields, sheetPassRule)
  if (!enforced.length) return []
  const valueMap = resolveValueMap(line)
  const item = line.itemName || line.itemCode || '明细'
  const hints = []
  enforced.forEach((field) => {
    const raw = valueMap[field.code]
    if (isComplexField(field)) {
      const nested = collectComplexFailHints(field, raw, item)
      if (nested.length) {
        hints.push(...nested)
        return
      }
      if (evaluateComplexOrSimpleField(field, raw) === 'fail') {
        hints.push(`${item} · ${field.name || field.code}`)
      }
      return
    }
    if (evaluateFieldAgainstStandard(field, raw) === 'fail') {
      hints.push(`${item} · ${field.name || field.code}`)
    }
  })
  return hints
}

/**
 * 校验：整单规则 vs 结论映射结果
 * @returns {{ ok: boolean, message?: string, failHints: string[], mappedResult: string }}
 */
export function validateLineSheetPassRule(line = {}, fields = [], sheetPassRule) {
  const rule = normalizeSheetPassRule(sheetPassRule)
  const conclusionField = findQcConclusionField(fields)
  const valueMap = resolveValueMap(line)
  const conclusionRaw = conclusionField ? valueMap[conclusionField.code] : ''
  const mappedResult = mapConclusionValueToQcResult(conclusionRaw, conclusionField)

  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.MANUAL) {
    return { ok: true, failHints: [], mappedResult, rule }
  }

  const failHints = collectSheetPassFailHints(line, fields, rule)
  if (failHints.length && mappedResult === QC_TASK_RESULT.PASS) {
    const preview = failHints.slice(0, 3).join('；')
    const more = failHints.length > 3 ? `等共 ${failHints.length} 项` : ''
    return {
      ok: false,
      failHints,
      mappedResult,
      rule,
      message: `按模板规则「${sheetPassRuleLabel(rule)}」，以下项未达标，不能判定通过：${preview}${more}`,
    }
  }

  if (
    rule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS &&
    !listSheetPassEnforcedFields(fields, rule).length
  ) {
    return {
      ok: false,
      failHints: [],
      mappedResult,
      rule,
      message: '模板规则为「关键项必须达标」，但未勾选任何关键项，请先编辑模板',
    }
  }

  return { ok: true, failHints, mappedResult, rule }
}
