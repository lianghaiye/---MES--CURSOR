/**
 * 检验项库（质检字段库）mock
 */
import dayjs from 'dayjs'
import { isQcSystemFixedField } from '@/utils/qcConclusionField'
import {
  QC_FIELD_JUDGE_RULE,
  QC_UNIT_POSITION,
  buildStandardText,
  pickFieldStandardProps,
} from '@/utils/qcFieldStandard'
import { isComplexField, pickComplexFieldProps } from '@/utils/qcComplexField'

export const qcFieldLibraryStatusOptions = ['启用', '停用']

export const qcFieldLibraryCategoryOptions = ['外观', '尺寸', '性能', '材料', '功能', '其他']

export const qcFieldLibraryTypeOptions = [
  { value: 'text', label: '文本框' },
  { value: 'textarea', label: '文本域' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'radio', label: '单选' },
  { value: 'checkbox', label: '多选' },
  { value: 'composite', label: '复合项（多子项）' },
]

/** 基础字段类型（不含复合） */
export const qcFieldLibraryBasicTypeOptions = qcFieldLibraryTypeOptions.filter(
  (o) => o.value !== 'composite',
)

/** @deprecated 保留兼容；编辑表单已改为指标类型分流 */
export const qcFieldLibraryTypeGroupedOptions = [
  {
    label: '基础类型',
    options: qcFieldLibraryBasicTypeOptions,
  },
  {
    label: '复合类型',
    options: [{ value: 'composite', label: '复合项（一组子项，类型/判定可各自配置）' }],
  },
]

export function qcFieldTypeLabel(type) {
  return qcFieldLibraryTypeOptions.find((o) => o.value === type)?.label || type || '—'
}

export function createQcLibraryField(partial = {}) {
  const options = Array.isArray(partial.options) ? [...partial.options] : []
  const standard = pickFieldStandardProps({ ...partial, options })
  const complex = pickComplexFieldProps(partial)
  const row = {
    id: partial.id || `qcf-${Date.now()}`,
    code: String(partial.code || '').trim(),
    name: String(partial.name || '').trim(),
    type: partial.type || 'text',
    status: partial.status || '启用',
    category: partial.category || '其他',
    required: Boolean(partial.required),
    allowDecimal: Boolean(partial.allowDecimal),
    description: partial.description || '',
    placeholder: partial.placeholder || '',
    options,
    defaultValue: partial.defaultValue ?? '',
    format: partial.format || '',
    charLimit: partial.charLimit ?? null,
    ...standard,
    ...complex,
    creator: partial.creator || 'admin1',
    createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updater: partial.updater || partial.creator || 'admin1',
    updatedAt: partial.updatedAt || partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  if (isComplexField(row)) {
    row.standardText =
      row.standardText || (row.type === 'composite' ? '含子项分别判定' : '多点测点录入')
  } else if (!row.standardText) {
    row.standardText = buildStandardText(row)
  }
  return row
}

/** 演示种子：常见检验项 */
export const mockQcLibraryFields = [
  createQcLibraryField({
    id: 'qcf-hardness',
    code: 'QC_HARDNESS',
    name: '硬度(HRC)',
    type: 'number',
    status: '启用',
    category: '材料',
    required: true,
    allowDecimal: true,
    withUnit: true,
    unit: 'HRC',
    unitPosition: QC_UNIT_POSITION.SUFFIX,
    judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
    standardMin: 58,
    standardMax: 62,
    placeholder: '请输入硬度',
    creator: '质检员A',
    createdAt: '2026-07-01 10:00:00',
    updater: '质检员A',
    updatedAt: '2026-08-01 10:00:00',
  }),
  createQcLibraryField({
    id: 'qcf-seal-face',
    code: 'QC_SEAL_FACE',
    name: '密封面外观',
    type: 'radio',
    status: '启用',
    category: '外观',
    required: true,
    options: ['完好', '划伤', '破损'],
    judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
    passOptions: ['完好'],
    placeholder: '请选择密封面外观',
    creator: '质检员A',
    createdAt: '2026-07-01 10:00:00',
    updater: '质检员A',
    updatedAt: '2026-08-01 10:00:00',
  }),
  createQcLibraryField({
    id: 'qcf-noise',
    code: 'QC_NOISE',
    name: '异响检查',
    type: 'radio',
    status: '启用',
    category: '功能',
    required: true,
    options: ['无异响', '有异响'],
    judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
    passOptions: ['无异响'],
    placeholder: '请选择异响检查结果',
    creator: '质检员B',
    createdAt: '2026-07-02 10:00:00',
    updater: '质检员B',
    updatedAt: '2026-08-02 10:00:00',
  }),
  createQcLibraryField({
    id: 'qcf-clearance',
    code: 'QC_CLEARANCE',
    name: '游隙(mm)',
    type: 'number',
    status: '启用',
    category: '尺寸',
    required: true,
    allowDecimal: true,
    withUnit: true,
    unit: 'mm',
    unitPosition: QC_UNIT_POSITION.SUFFIX,
    judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
    standardMin: 0.01,
    standardMax: 0.03,
    placeholder: '请输入游隙',
    creator: '质检员B',
    createdAt: '2026-07-02 10:00:00',
    updater: '质检员B',
    updatedAt: '2026-08-02 10:00:00',
  }),
  createQcLibraryField({
    id: 'qcf-appearance',
    code: 'QC_APPEARANCE',
    name: '外观检查',
    type: 'radio',
    status: '启用',
    category: '外观',
    required: true,
    options: ['合格', '不合格'],
    judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
    passOptions: ['合格'],
    placeholder: '请选择外观检查结果',
    creator: '系统管理员',
    createdAt: '2026-06-01 09:00:00',
    updater: '系统管理员',
    updatedAt: '2026-06-01 09:00:00',
  }),
  createQcLibraryField({
    id: 'qcf-dim-od',
    code: 'QC_DIM_OD',
    name: '外径尺寸',
    type: 'number',
    status: '启用',
    category: '尺寸',
    required: true,
    allowDecimal: true,
    withUnit: true,
    unit: 'mm',
    unitPosition: QC_UNIT_POSITION.SUFFIX,
    judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
    standardMin: 49.9,
    standardMax: 50.1,
    placeholder: '请输入外径',
    creator: '系统管理员',
    createdAt: '2026-06-01 09:10:00',
    updater: '系统管理员',
    updatedAt: '2026-06-01 09:10:00',
  }),
  createQcLibraryField({
    id: 'qcf-remark',
    code: 'QC_FIELD_REMARK',
    name: '检验备注',
    type: 'textarea',
    status: '停用',
    category: '其他',
    required: false,
    judgeRule: QC_FIELD_JUDGE_RULE.NONE,
    placeholder: '请输入备注',
    creator: '系统管理员',
    createdAt: '2026-06-15 11:00:00',
    updater: '系统管理员',
    updatedAt: '2026-06-15 11:00:00',
  }),
  createQcLibraryField({
    id: 'qcf-run-test',
    code: 'QC_RUN_TEST',
    name: '出厂试验-运转',
    type: 'composite',
    status: '启用',
    category: '性能',
    required: true,
    description: '演示：同一复合项内可混用数字区间、单选合格项、文本等于、人工判定',
    children: [
      {
        code: 'bearing_temp',
        name: '轴承温升（滚动）',
        type: 'number',
        withUnit: true,
        unit: '°C',
        judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
        standardMax: 80,
        allowDecimal: true,
      },
      {
        code: 'seal_leak',
        name: '机封泄漏',
        type: 'number',
        withUnit: true,
        unit: 'ml/h',
        judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
        standardMax: 5,
        allowDecimal: true,
      },
      {
        code: 'surface_state',
        name: '表面状态',
        type: 'radio',
        options: ['完好', '轻微划伤', '破损'],
        judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
        passOptions: ['完好'],
      },
      {
        code: 'batch_mark',
        name: '批次标识',
        type: 'text',
        judgeRule: QC_FIELD_JUDGE_RULE.EQUALS,
        standardValue: 'A1',
      },
      {
        code: 'remark',
        name: '备注说明',
        type: 'textarea',
        required: false,
        judgeRule: QC_FIELD_JUDGE_RULE.MANUAL,
      },
    ],
    creator: '质检员A',
    createdAt: '2026-07-10 10:00:00',
    updater: '质检员A',
    updatedAt: '2026-08-01 10:00:00',
  }),
]

export function cloneQcLibraryFields() {
  return mockQcLibraryFields.map((f) =>
    createQcLibraryField({
      ...f,
      options: f.options ? [...f.options] : [],
      children: f.children,
      matrixColumns: f.matrixColumns,
      matrixRows: f.matrixRows,
    }),
  )
}

export function filterQcLibraryFields(list = [], filters = {}) {
  return (list || []).filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.category && row.category !== filters.category) return false
    if (filters.type && row.type !== filters.type) return false
    if (filters.code && !(row.code || '').includes(String(filters.code).trim())) return false
    if (filters.name && !(row.name || '').includes(String(filters.name).trim())) return false
    if (filters.creator && !(row.creator || '').includes(String(filters.creator).trim())) {
      return false
    }
    if (filters.keyword) {
      const kw = String(filters.keyword).trim().toLowerCase()
      const hay = `${row.code || ''} ${row.name || ''}`.toLowerCase()
      if (!hay.includes(kw)) return false
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

export function nextQcLibraryFieldCode(list = []) {
  const nums = (list || [])
    .map((f) => {
      const m = String(f.code || '').match(/QC_FIELD_(\d+)/i)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `QC_FIELD_${String(next).padStart(3, '0')}`
}

/** 模板字段 → 库字段（排除系统项） */
export function templateFieldToLibraryPayload(field = {}) {
  if (isQcSystemFixedField(field)) return null
  const standard = pickFieldStandardProps(field)
  const complex = pickComplexFieldProps(field)
  return {
    code: field.code,
    name: field.name,
    type: field.type,
    required: Boolean(field.required),
    allowDecimal: Boolean(field.allowDecimal),
    description: field.description || '',
    placeholder: field.placeholder || '',
    options: field.options ? [...field.options] : [],
    defaultValue: field.defaultValue ?? '',
    format: field.format || '',
    charLimit: field.charLimit ?? null,
    category: field.category || '其他',
    ...standard,
    ...complex,
    standardText:
      field.standardText ||
      (isComplexField(field)
        ? field.type === 'composite'
          ? '含子项分别判定'
          : '多点测点录入'
        : buildStandardText({ ...field, ...standard })),
  }
}

/** 库字段 → 模板字段快照 */
export function libraryFieldToTemplateField(lib = {}) {
  const standard = pickFieldStandardProps(lib)
  const complex = pickComplexFieldProps(lib)
  return {
    code: lib.code,
    name: lib.name,
    type: lib.type,
    required: Boolean(lib.required),
    allowDecimal: Boolean(lib.allowDecimal),
    description: lib.description || '',
    placeholder: lib.placeholder || '',
    options: lib.options ? [...lib.options] : [],
    defaultValue: lib.defaultValue ?? '',
    format: lib.format || '',
    charLimit: lib.charLimit ?? null,
    category: lib.category || '',
    ...standard,
    ...complex,
    standardText:
      lib.standardText ||
      (isComplexField(lib)
        ? lib.type === 'composite'
          ? '含子项分别判定'
          : '多点测点录入'
        : buildStandardText({ ...lib, ...standard })),
    isConclusion: false,
    isPresetConclusion: false,
    isSystemFixed: false,
    libraryFieldId: lib.id || '',
  }
}
