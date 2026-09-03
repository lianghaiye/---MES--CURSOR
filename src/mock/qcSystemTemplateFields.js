/** 系统通用质检模板字段（全业务类型兜底） */
import { ensureFieldsWithSystemFixedItems } from '@/utils/qcConclusionField'

export const QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE = 'QCT-SYS-001'
export const QC_SYSTEM_UNIVERSAL_BIZ_SCOPE = '通用'

function field(code, name, type, extra = {}) {
  return {
    code,
    name,
    type,
    required: extra.required !== false,
    isConclusion: Boolean(extra.isConclusion),
    category: extra.category || '',
    unit: extra.unit || '',
    judgeRule: extra.judgeRule || 'manual',
    options: extra.options ? [...extra.options] : [],
    sortOrder: extra.sortOrder ?? 0,
    placeholder: extra.placeholder || '',
    defaultValue: extra.defaultValue ?? '',
    allowDecimal: Boolean(extra.allowDecimal),
    withUnit: Boolean(extra.withUnit),
    format: extra.format || '',
    charLimit: extra.charLimit ?? null,
    description: extra.description || '',
  }
}

/** 系统通用模板字段顺序：质检方式 → 质检数量 → 质检结果 */
export function createUniversalSystemTemplateFields() {
  const base = [
    field('QC_INSPECT_METHOD', '质检方式', 'radio', {
      required: true,
      options: ['抽检', '全检'],
      defaultValue: '抽检',
      placeholder: '请选择质检方式',
      sortOrder: 1,
    }),
    field('QC_INSPECT_QTY', '质检数量', 'number', {
      required: true,
      allowDecimal: true,
      placeholder: '请输入质检数量',
      sortOrder: 2,
    }),
  ]
  return ensureFieldsWithSystemFixedItems(base, { layout: 'default' }).map((f) => {
    if (f.isPresetConclusion || f.isConclusion) {
      return {
        ...f,
        name: '质检结果',
        placeholder: '请选择质检结果',
        sortOrder: 99,
      }
    }
    return f
  })
}

export function cloneUniversalSystemTemplateFields() {
  return createUniversalSystemTemplateFields().map((f) => ({
    ...f,
    options: f.options ? [...f.options] : [],
    optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
    optionResults: f.optionResults ? { ...f.optionResults } : undefined,
  }))
}

/** @deprecated 统一返回系统通用模板字段（忽略业务类型参数） */
export function cloneSystemTemplateFields() {
  return cloneUniversalSystemTemplateFields()
}
