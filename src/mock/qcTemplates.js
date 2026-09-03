/**
 * 质检模板 mock / 筛选项
 */
import dayjs from 'dayjs'
import {
  cloneUniversalSystemTemplateFields,
  QC_SYSTEM_UNIVERSAL_BIZ_SCOPE,
  QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
} from '@/mock/qcSystemTemplateFields'
import { ensureFieldsWithSystemFixedItems } from '@/utils/qcConclusionField'

export const qcTemplateStatusOptions = ['启用', '停用']

export const qcTemplateTypeOptions = ['系统模板', '自定义模板']

/** 业务类型（质检场景） */
export const qcTemplateBizScopeOptions = [
  '成品检',
  '来料质检',
  '生产过程检',
  '外协回货检',
  '出厂质检',
]

/** 适用范围（对齐铭牌模板：全局 / 单产品 / 产品类别） */
export const QC_TEMPLATE_SCOPE_TYPE = {
  GLOBAL: 'global',
  SINGLE: 'single',
  CATEGORY: 'category',
}

export const qcTemplateScopeTypeOptions = [
  { value: QC_TEMPLATE_SCOPE_TYPE.GLOBAL, label: '全局' },
  { value: QC_TEMPLATE_SCOPE_TYPE.SINGLE, label: '单产品' },
  { value: QC_TEMPLATE_SCOPE_TYPE.CATEGORY, label: '产品类别' },
]

export function qcTemplateScopeTypeLabel(scopeType) {
  const hit = qcTemplateScopeTypeOptions.find((o) => o.value === scopeType)
  return hit?.label || '—'
}

export function createQcTemplate(partial = {}) {
  const rawFields = Array.isArray(partial.fields) ? partial.fields : []
  const fields = ensureFieldsWithSystemFixedItems(rawFields)
  const resolvedScopeType =
    partial.scopeType ||
    (Array.isArray(partial.objects) && partial.objects.length
      ? QC_TEMPLATE_SCOPE_TYPE.SINGLE
      : QC_TEMPLATE_SCOPE_TYPE.GLOBAL)
  return {
    id: partial.id || `qct-${Date.now()}`,
    code: partial.code || '',
    name: partial.name || '',
    status: partial.status || '停用',
    type: partial.type || '自定义模板',
    isSystem: Boolean(partial.isSystem),
    isUniversal: Boolean(partial.isUniversal),
    bizScope: partial.bizScope || '成品检',
    objects: Array.isArray(partial.objects) ? partial.objects : [],
    creator: partial.creator || 'admin1',
    createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updater: partial.updater || partial.creator || 'admin1',
    updatedAt: partial.updatedAt || partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...partial,
    // 固定项规范化必须在 spread 之后，避免被 partial.fields 覆盖
    fields,
    fieldCount: fields.length,
    scopeType: resolvedScopeType,
  }
}

/** 来料演示模板：通用字段 + 自定义检验项 + 结论 */
function ensureIncomingDemoFields(extraFields = [], { methodDefault = '抽检' } = {}) {
  const base = cloneUniversalSystemTemplateFields().map((f) => {
    if (f.code === 'QC_INSPECT_METHOD') {
      return { ...f, defaultValue: methodDefault }
    }
    return f
  })
  const extras = (extraFields || []).map((f, idx) => ({
    code: f.code,
    name: f.name,
    type: f.type || 'text',
    required: f.required !== false,
    options: f.options ? [...f.options] : [],
    allowDecimal: Boolean(f.allowDecimal),
    placeholder: f.placeholder || `请填写${f.name}`,
    sortOrder: f.sortOrder ?? 20 + idx,
    defaultValue: f.defaultValue ?? '',
  }))
  // 插在结论字段前
  const withoutConclusion = base.filter((f) => !f.isConclusion && !f.isPresetConclusion)
  const conclusion = base.find((f) => f.isConclusion || f.isPresetConclusion)
  const merged = [...withoutConclusion, ...extras]
  if (conclusion) merged.push(conclusion)
  return ensureFieldsWithSystemFixedItems(merged)
}

/** 仅保留 1 份系统通用模板；另附少量自定义演示模板 */
export const mockQcTemplates = [
  (() => {
    const fields = cloneUniversalSystemTemplateFields()
    return createQcTemplate({
      id: 'qct-sys-universal',
      code: QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
      name: '系统通用模板',
      status: '启用',
      type: '系统模板',
      isSystem: true,
      isUniversal: true,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
      bizScope: QC_SYSTEM_UNIVERSAL_BIZ_SCOPE,
      objects: [],
      fields,
      fieldCount: fields.length,
      creator: '系统管理员',
      createdAt: '2026-01-15 10:30:00',
      updater: '系统管理员',
      updatedAt: '2026-08-20 14:22:00',
    })
  })(),
  createQcTemplate({
    id: 'qct-usr-1',
    code: 'QCT-USR-001',
    name: '泵类成品检模板',
    status: '启用',
    type: '自定义模板',
    isSystem: false,
    scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
    bizScope: '成品检',
    objects: [],
    fields: cloneUniversalSystemTemplateFields(),
    fieldCount: 3,
    creator: '张三',
    createdAt: '2026-05-08 16:20:00',
    updater: '李四',
    updatedAt: '2026-06-10 11:30:00',
  }),
  createQcTemplate({
    id: 'qct-usr-2',
    code: 'QCT-USR-002',
    name: '机加过程检模板',
    status: '启用',
    type: '自定义模板',
    isSystem: false,
    scopeType: QC_TEMPLATE_SCOPE_TYPE.CATEGORY,
    bizScope: '生产过程检',
    objects: [],
    fields: cloneUniversalSystemTemplateFields(),
    fieldCount: 3,
    creator: '王五',
    createdAt: '2026-06-12 09:00:00',
    updater: '王五',
    updatedAt: '2026-06-12 09:00:00',
  }),
  (() => {
    const fields = ensureIncomingDemoFields([
      {
        code: 'QC_HARDNESS',
        name: '硬度(HRC)',
        type: 'number',
        required: true,
        allowDecimal: true,
        sortOrder: 10,
      },
      {
        code: 'QC_SEAL_FACE',
        name: '密封面外观',
        type: 'radio',
        required: true,
        options: ['完好', '划伤', '破损'],
        sortOrder: 11,
      },
    ])
    return createQcTemplate({
      id: 'qct-usr-ll-seal',
      code: 'QCT-USR-LL-001',
      name: '密封件来料检模板',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
      bizScope: '来料质检',
      objects: [{ type: 'item', value: 'MJ-MF-001', code: 'MJ-MF-001' }],
      fields,
      fieldCount: fields.length,
      creator: '质检员A',
      createdAt: '2026-07-01 10:00:00',
      updater: '质检员A',
      updatedAt: '2026-08-01 10:00:00',
    })
  })(),
  (() => {
    const fields = ensureIncomingDemoFields(
      [
        {
          code: 'QC_NOISE',
          name: '异响检查',
          type: 'radio',
          required: true,
          options: ['无异响', '有异响'],
          sortOrder: 10,
        },
        {
          code: 'QC_CLEARANCE',
          name: '游隙(mm)',
          type: 'number',
          required: true,
          allowDecimal: true,
          sortOrder: 11,
        },
      ],
      { methodDefault: '全检' },
    )
    return createQcTemplate({
      id: 'qct-usr-ll-bearing',
      code: 'QCT-USR-LL-002',
      name: '轴承来料检模板',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
      bizScope: '来料质检',
      objects: [{ type: 'item', value: 'ZC-6312', code: 'ZC-6312' }],
      fields,
      fieldCount: fields.length,
      creator: '质检员B',
      createdAt: '2026-07-02 10:00:00',
      updater: '质检员B',
      updatedAt: '2026-08-02 10:00:00',
    })
  })(),
]

export function cloneQcTemplates() {
  return mockQcTemplates.map((t) => {
    const fields = ensureFieldsWithSystemFixedItems(
      Array.isArray(t.fields)
        ? t.fields.map((f) => ({
            ...f,
            options: f.options ? [...f.options] : [],
            optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
            optionResults: f.optionResults ? { ...f.optionResults } : undefined,
          }))
        : [],
    )
    return {
      ...t,
      objects: [...(t.objects || [])],
      fields,
      fieldCount: fields.length,
    }
  })
}

export function filterQcTemplates(list = [], filters = {}) {
  return (list || []).filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.type && row.type !== filters.type) return false
    if (filters.code && !(row.code || '').includes(String(filters.code).trim())) return false
    if (filters.name && !(row.name || '').includes(String(filters.name).trim())) return false
    if (filters.creator && !(row.creator || '').includes(String(filters.creator).trim())) {
      return false
    }
    if (filters.dateRange?.length === 2) {
      const [start, end] = filters.dateRange
      const t = dayjs(row.createdAt)
      if (!t.isValid()) return false
      if (t.isBefore(dayjs(start).startOf('day')) || t.isAfter(dayjs(end).endOf('day'))) {
        return false
      }
    }
    return true
  })
}

export function nextQcTemplateCode(list = []) {
  const nums = (list || [])
    .map((t) => {
      const m = String(t.code || '').match(/QCT-USR-(\d+)/i)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `QCT-USR-${String(next).padStart(3, '0')}`
}
