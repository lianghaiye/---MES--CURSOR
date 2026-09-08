/** 系统通用质检模板字段（全业务类型兜底） */
import {
  createPresetInspectMethodField,
  createPresetInspectQtyField,
  createPresetInspectRemarkField,
} from '@/utils/qcConclusionField'

export const QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE = 'QCT-SYS-001'
export const QC_SYSTEM_UNIVERSAL_BIZ_SCOPE = '通用'

/** 系统通用模板默认字段：质检方式 → 质检数量 → 检验备注（均来自系统检验项，用户可改删） */
export function createUniversalSystemTemplateFields() {
  return [
    createPresetInspectMethodField({ sortOrder: 1 }),
    createPresetInspectQtyField({ sortOrder: 2 }),
    createPresetInspectRemarkField({ sortOrder: 3 }),
  ]
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
