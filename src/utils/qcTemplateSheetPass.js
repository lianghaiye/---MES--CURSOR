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
    label: '仍人工判定',
    desc: '整单结论以「质检结果」为准；未达标仅提示，不强制拦截。',
  },
  {
    value: QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS,
    label: '全部达标才通过',
    desc: '凡配置了合格标准的检验项均须达标，才允许判定「质检通过」。',
  },
  {
    value: QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS,
    label: '关键项必须达标',
    desc: '勾选为关键项的检验项必须达标，才允许判定「质检通过」。',
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

export function sheetPassRuleLabel(rule) {
  const hit = QC_TEMPLATE_SHEET_PASS_RULE_OPTIONS.find(
    (o) => o.value === normalizeSheetPassRule(rule),
  )
  return hit?.label || '仍人工判定'
}

export function sheetPassRuleDesc(rule) {
  const hit = QC_TEMPLATE_SHEET_PASS_RULE_OPTIONS.find(
    (o) => o.value === normalizeSheetPassRule(rule),
  )
  return hit?.desc || ''
}

/** 参与整单规则判定的检验项（排除方式/数量/结论） */
export function listSheetPassCandidateFields(fields = []) {
  return (fields || []).filter(
    (f) =>
      f &&
      f.code &&
      !isQcInspectMethodField(f) &&
      !isQcInspectQtyField(f) &&
      !isQcConclusionField(f),
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
