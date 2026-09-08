/**
 * 质检模板 mock / 筛选项
 */
import dayjs from 'dayjs'
import {
  cloneUniversalSystemTemplateFields,
  QC_SYSTEM_UNIVERSAL_BIZ_SCOPE,
  QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
} from '@/mock/qcSystemTemplateFields'
import {
  ensureFieldsWithSystemFixedItems,
  createPresetConclusionField,
  createPresetInspectMethodField,
  createPresetInspectQtyField,
  createPresetInspectRemarkField,
  findQcConclusionField,
  normalizeSheetConclusionOptionItems,
  upsertSheetConclusionField,
} from '@/utils/qcConclusionField'
import {
  QC_FIELD_JUDGE_RULE,
  QC_UNIT_POSITION,
  buildStandardText,
  pickFieldStandardProps,
  createDefaultManualOptionItems,
} from '@/utils/qcFieldStandard'
import { pickComplexFieldProps } from '@/utils/qcComplexField'
import { QC_TEMPLATE_SHEET_PASS_RULE, normalizeSheetPassRule } from '@/utils/qcTemplateSheetPass'

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
  let fields = ensureFieldsWithSystemFixedItems(rawFields)
  const resolvedScopeType =
    partial.scopeType ||
    (Array.isArray(partial.objects) && partial.objects.length
      ? QC_TEMPLATE_SCOPE_TYPE.SINGLE
      : QC_TEMPLATE_SCOPE_TYPE.GLOBAL)
  const sheetPassRule = normalizeSheetPassRule(
    partial.sheetPassRule ?? QC_TEMPLATE_SHEET_PASS_RULE.MANUAL,
  )
  const sheetConclusionOptionItems = normalizeSheetConclusionOptionItems(
    partial.sheetConclusionOptionItems ?? findQcConclusionField(fields)?.optionItems,
  )
  fields = upsertSheetConclusionField(fields, sheetConclusionOptionItems)
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
    sheetPassRule,
    sheetConclusionOptionItems,
  }
}

/** 将自定义检验项规范化为模板字段快照（不自动注入系统项） */
function mapCustomField(f = {}, idx = 0) {
  const standard = pickFieldStandardProps(f)
  const complex = pickComplexFieldProps(f)
  const row = {
    code: f.code,
    name: f.name,
    type: f.type || 'text',
    required: f.required !== false,
    options: f.options ? [...f.options] : [],
    allowDecimal: Boolean(f.allowDecimal),
    placeholder: f.placeholder || `请填写${f.name}`,
    sortOrder: f.sortOrder ?? 20 + idx,
    defaultValue: f.defaultValue ?? '',
    keyForSheetPass: Boolean(f.keyForSheetPass),
    ...standard,
    ...complex,
    passOptions: Array.isArray(f.passOptions) ? [...f.passOptions] : standard.passOptions,
    manualOptionItems: Array.isArray(f.manualOptionItems)
      ? f.manualOptionItems.map((o) => ({ ...o }))
      : standard.manualOptionItems,
    standardText: f.standardText || '',
  }
  if (row.judgeRule === QC_FIELD_JUDGE_RULE.MANUAL && !(row.manualOptionItems || []).length) {
    row.manualOptionItems = createDefaultManualOptionItems()
  }
  if (!row.standardText) {
    row.standardText =
      row.type === 'composite'
        ? '含子项分别判定'
        : row.type === 'matrix'
          ? '多点测点录入'
          : buildStandardText(row)
  }
  return row
}

/**
 * 按新规则组装模板字段：系统默认项（方式/数量/备注/结果）按需选用 + 自定义检验项。
 * 不再强制补齐缺失系统项。
 */
function buildTemplateFields({
  method = true,
  qty = true,
  remark = false,
  conclusion = true,
  methodDefault = '抽检',
  extras = [],
} = {}) {
  const list = []
  if (method) {
    list.push(createPresetInspectMethodField({ defaultValue: methodDefault, sortOrder: 1 }))
  }
  if (qty) {
    list.push(createPresetInspectQtyField({ sortOrder: 2 }))
  }
  ;(extras || []).forEach((f, idx) => {
    list.push(mapCustomField(f, idx))
  })
  if (remark) {
    list.push(createPresetInspectRemarkField({ sortOrder: 90 }))
  }
  if (conclusion) {
    list.push(createPresetConclusionField({ sortOrder: 99 }))
  }
  return ensureFieldsWithSystemFixedItems(list)
}

/** 全部达标 / 关键项：结论仅合格·不合格（默认合格），强调「先达标再选通过」 */
const SHEET_CONCLUSION_STRICT = [
  { value: '合格', result: '质检通过', locked: true, isDefault: true },
  { value: '不合格', result: '质检不通过', locked: true },
]

/** 人工判定：含让步/特采，文案与严格规则区分开，避免误以为「全部达标」 */
const SHEET_CONCLUSION_MANUAL_DEMO = [
  { value: '合格', result: '质检通过', locked: true, isDefault: true },
  { value: '不合格', result: '质检不通过', locked: true },
  { value: '特采放行', result: '质检通过', locked: false },
]

/** 密封件来料：运转复合（数值子项，便于演示全部达标） */
const SEAL_RUN_COMPOSITE = {
  code: 'QC_RUN_TEST',
  name: '出厂试验-运转',
  type: 'composite',
  required: true,
  sortOrder: 30,
  children: [
    {
      code: 'bearing_temp',
      name: '轴承温升（滚动）',
      type: 'number',
      withUnit: true,
      unit: '°C',
      unitPosition: 'suffix',
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
      unitPosition: 'suffix',
      judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
      standardMax: 5,
      allowDecimal: true,
    },
    {
      code: 'vibration',
      name: '振动',
      type: 'number',
      withUnit: true,
      unit: 'mm/s',
      unitPosition: 'suffix',
      judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
      standardMax: 4.5,
      allowDecimal: true,
    },
    {
      code: 'noise',
      name: '噪声',
      type: 'number',
      withUnit: true,
      unit: 'dB(A)',
      unitPosition: 'suffix',
      judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
      standardMax: 85,
      allowDecimal: true,
    },
  ],
}

/** 成品/出厂演示：混用多种判定规则的复合项 */
const RUN_TEST_COMPOSITE = {
  code: 'QC_RUN_TEST',
  name: '出厂试验-运转',
  type: 'composite',
  required: true,
  sortOrder: 30,
  children: [
    {
      code: 'bearing_temp',
      name: '轴承温升（滚动）',
      type: 'number',
      withUnit: true,
      unit: '°C',
      unitPosition: 'suffix',
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
      unitPosition: 'suffix',
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
}

/** 新规则演示模板：字段由用户配置；系统项从检验项库选用 */
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
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.MANUAL,
      creator: '系统管理员',
      createdAt: '2026-01-15 10:30:00',
      updater: '系统管理员',
      updatedAt: '2026-09-01 09:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: true,
      conclusion: true,
      extras: [
        {
          code: 'QC_APPEARANCE',
          name: '外观检查',
          type: 'radio',
          options: ['合格', '轻微缺陷', '不合格'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['合格', '轻微缺陷'],
          keyForSheetPass: true,
          sortOrder: 10,
        },
        {
          code: 'QC_HARDNESS',
          name: '硬度(HRC)',
          type: 'number',
          allowDecimal: true,
          withUnit: true,
          unit: 'HRC',
          unitPosition: QC_UNIT_POSITION.SUFFIX,
          judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
          standardMin: 58,
          standardMax: 62,
          keyForSheetPass: true,
          sortOrder: 11,
        },
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-1',
      code: 'QCT-USR-001',
      name: '泵类成品检模板',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.CATEGORY,
      bizScope: '成品检',
      objects: [{ type: 'productCategory', value: '泵类', label: '泵类' }],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS,
      sheetConclusionOptionItems: SHEET_CONCLUSION_STRICT.map((o) => ({ ...o })),
      creator: '张三',
      createdAt: '2026-05-08 16:20:00',
      updater: '李四',
      updatedAt: '2026-08-18 11:30:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: false,
      conclusion: true,
      extras: [
        {
          code: 'QC_DIM_OD',
          name: '外径尺寸',
          type: 'number',
          allowDecimal: true,
          withUnit: true,
          unit: 'mm',
          unitPosition: QC_UNIT_POSITION.SUFFIX,
          judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
          standardMin: 49.9,
          standardMax: 50.1,
          sortOrder: 10,
        },
        {
          code: 'QC_SURFACE',
          name: '表面粗糙度',
          type: 'number',
          allowDecimal: true,
          withUnit: true,
          unit: 'μm',
          unitPosition: QC_UNIT_POSITION.SUFFIX,
          judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
          standardMax: 3.2,
          sortOrder: 11,
        },
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-2',
      code: 'QCT-USR-002',
      name: '机加过程检模板',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
      bizScope: '生产过程检',
      objects: [],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS,
      sheetConclusionOptionItems: SHEET_CONCLUSION_STRICT.map((o) => ({ ...o })),
      creator: '王五',
      createdAt: '2026-06-12 09:00:00',
      updater: '王五',
      updatedAt: '2026-07-20 09:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: true,
      conclusion: true,
      extras: [
        {
          code: 'QC_HARDNESS',
          name: '硬度(HRC)',
          type: 'number',
          allowDecimal: true,
          withUnit: true,
          unit: 'HRC',
          unitPosition: QC_UNIT_POSITION.SUFFIX,
          judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
          standardMin: 58,
          standardMax: 62,
          sortOrder: 10,
        },
        {
          code: 'QC_SEAL_FACE',
          name: '密封面外观',
          type: 'radio',
          options: ['完好', '划伤', '破损'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['完好'],
          sortOrder: 11,
        },
        SEAL_RUN_COMPOSITE,
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-ll-seal',
      code: 'QCT-USR-LL-001',
      name: '密封件来料检（全部达标·多项）',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
      bizScope: '来料质检',
      objects: [{ type: 'item', value: 'MJ-MF-001', code: 'MJ-MF-001', label: '机械密封件' }],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS,
      sheetConclusionOptionItems: SHEET_CONCLUSION_STRICT.map((o) => ({ ...o })),
      creator: '质检员A',
      createdAt: '2026-07-01 10:00:00',
      updater: '质检员A',
      updatedAt: '2026-09-08 10:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: false,
      conclusion: true,
      methodDefault: '全检',
      extras: [
        {
          code: 'QC_NOISE',
          name: '异响检查',
          type: 'radio',
          options: ['无异响', '有异响'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['无异响'],
          sortOrder: 10,
        },
        {
          code: 'QC_CLEARANCE',
          name: '游隙',
          type: 'number',
          allowDecimal: true,
          withUnit: true,
          unit: 'mm',
          unitPosition: QC_UNIT_POSITION.SUFFIX,
          judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
          standardMin: 0.01,
          standardMax: 0.03,
          sortOrder: 11,
        },
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-ll-bearing',
      code: 'QCT-USR-LL-002',
      name: '轴承来料检（人工判定·2项）',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
      bizScope: '来料质检',
      objects: [{ type: 'item', value: 'ZC-6312', code: 'ZC-6312', label: '深沟球轴承 6312' }],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.MANUAL,
      sheetConclusionOptionItems: SHEET_CONCLUSION_MANUAL_DEMO.map((o) => ({ ...o })),
      creator: '质检员B',
      createdAt: '2026-07-02 10:00:00',
      updater: '质检员B',
      updatedAt: '2026-09-08 10:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: true,
      conclusion: true,
      extras: [
        {
          code: 'QC_GASKET_FACE',
          name: '垫片面外观',
          type: 'radio',
          options: ['完好', '压痕', '破损'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['完好'],
          keyForSheetPass: true,
          sortOrder: 10,
        },
        {
          code: 'QC_GASKET_THICK',
          name: '厚度',
          type: 'number',
          allowDecimal: true,
          withUnit: true,
          unit: 'mm',
          unitPosition: QC_UNIT_POSITION.SUFFIX,
          judgeRule: QC_FIELD_JUDGE_RULE.RANGE,
          standardMin: 2.8,
          standardMax: 3.2,
          keyForSheetPass: false,
          sortOrder: 11,
        },
        {
          code: 'QC_GASKET_MARK',
          name: '材质标记',
          type: 'radio',
          options: ['清晰', '模糊', '缺失'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['清晰'],
          keyForSheetPass: false,
          sortOrder: 12,
        },
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-ll-gasket',
      code: 'QCT-USR-LL-003',
      name: '垫片来料检（关键项达标·3项）',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
      bizScope: '来料质检',
      objects: [{ type: 'item', value: 'DP-PTFE-3', code: 'DP-PTFE-3', label: 'PTFE 垫片 3mm' }],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS,
      sheetConclusionOptionItems: SHEET_CONCLUSION_STRICT.map((o) => ({ ...o })),
      creator: '质检员A',
      createdAt: '2026-07-03 10:00:00',
      updater: '质检员A',
      updatedAt: '2026-09-08 10:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: false,
      conclusion: true,
      methodDefault: '抽检',
      extras: [
        {
          code: 'QC_ORING_FACE',
          name: '外观检查',
          type: 'radio',
          options: ['合格', '轻微缺陷', '不合格'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['合格'],
          sortOrder: 10,
        },
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-ll-oring',
      code: 'QCT-USR-LL-004',
      name: 'O型圈快检（全部达标·1项）',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
      bizScope: '来料质检',
      objects: [{ type: 'item', value: 'OJ-50', code: 'OJ-50', label: 'O型圈 Φ50' }],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS,
      sheetConclusionOptionItems: SHEET_CONCLUSION_STRICT.map((o) => ({ ...o })),
      creator: '质检员C',
      createdAt: '2026-07-04 10:00:00',
      updater: '质检员C',
      updatedAt: '2026-09-08 10:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: true,
      conclusion: true,
      extras: [RUN_TEST_COMPOSITE],
    })
    return createQcTemplate({
      id: 'qct-usr-composite-demo',
      code: 'QCT-USR-005',
      name: '出厂试验复合项演示模板',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
      bizScope: '成品检',
      objects: [],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS,
      sheetConclusionOptionItems: SHEET_CONCLUSION_STRICT.map((o) => ({ ...o })),
      creator: '质检员A',
      createdAt: '2026-09-04 10:00:00',
      updater: '质检员A',
      updatedAt: '2026-09-04 10:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: true,
      remark: true,
      conclusion: true,
      extras: [
        {
          code: 'QC_PACK',
          name: '包装完整性',
          type: 'radio',
          options: ['完好', '破损'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['完好'],
          sortOrder: 10,
        },
        {
          code: 'QC_NAMEPLATE',
          name: '铭牌核对',
          type: 'radio',
          options: ['一致', '不一致'],
          judgeRule: QC_FIELD_JUDGE_RULE.OPTION_PASS,
          passOptions: ['一致'],
          sortOrder: 11,
        },
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-cc-1',
      code: 'QCT-USR-003',
      name: '出厂发货检模板',
      status: '启用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
      bizScope: '出厂质检',
      objects: [],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS,
      sheetConclusionOptionItems: SHEET_CONCLUSION_STRICT.map((o) => ({ ...o })),
      creator: '发货质检',
      createdAt: '2026-08-10 14:00:00',
      updater: '发货质检',
      updatedAt: '2026-08-28 16:00:00',
    })
  })(),
  (() => {
    const fields = buildTemplateFields({
      method: true,
      qty: false,
      remark: true,
      conclusion: true,
      extras: [
        {
          code: 'QC_WX_SURFACE',
          name: '回货外观',
          type: 'radio',
          options: ['合格', '返修', '报废'],
          judgeRule: QC_FIELD_JUDGE_RULE.MANUAL,
          sortOrder: 10,
        },
      ],
    })
    return createQcTemplate({
      id: 'qct-usr-wx-draft',
      code: 'QCT-USR-004',
      name: '外协回货检草稿',
      status: '停用',
      type: '自定义模板',
      isSystem: false,
      scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
      bizScope: '外协回货检',
      objects: [],
      fields,
      sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.MANUAL,
      sheetConclusionOptionItems: SHEET_CONCLUSION_MANUAL_DEMO.map((o) => ({ ...o })),
      creator: '赵六',
      createdAt: '2026-08-25 11:00:00',
      updater: '赵六',
      updatedAt: '2026-08-25 11:00:00',
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
            children: Array.isArray(f.children) ? f.children.map((c) => ({ ...c })) : [],
            matrixColumns: Array.isArray(f.matrixColumns)
              ? f.matrixColumns.map((c) => ({ ...c }))
              : [],
            matrixRows: Array.isArray(f.matrixRows) ? f.matrixRows.map((r) => ({ ...r })) : [],
            matrixAllowAddRow: f.matrixAllowAddRow,
          }))
        : [],
    )
    return {
      ...t,
      objects: [...(t.objects || [])],
      fields,
      fieldCount: fields.length,
      sheetConclusionOptionItems: Array.isArray(t.sheetConclusionOptionItems)
        ? t.sheetConclusionOptionItems.map((o) => ({ ...o }))
        : undefined,
    }
  })
}

export function filterQcTemplates(list = [], filters = {}) {
  return (list || []).filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.type && row.type !== filters.type) return false
    if (filters.bizScope) {
      const scope = String(filters.bizScope).trim()
      const isUniversal =
        row.isSystem && (row.isUniversal || row.bizScope === '通用' || row.code === 'QCT-SYS-001')
      if (!isUniversal && row.bizScope !== scope) return false
    }
    if (filters.scopeType && row.scopeType !== filters.scopeType) return false
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

function scopeSortRank(scopeType) {
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE) return 3
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.CATEGORY) return 2
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) return 1
  return 0
}

/** 生效视图排序：业务类型 → 适用范围（单产品>类别>全局）→ 更新时间倒序 */
export function sortQcTemplatesForBrowse(list = []) {
  return (list || []).slice().sort((a, b) => {
    const bizA = String(a.isUniversal || a.bizScope === '通用' ? '通用' : a.bizScope || '')
    const bizB = String(b.isUniversal || b.bizScope === '通用' ? '通用' : b.bizScope || '')
    if (bizA !== bizB) return bizA.localeCompare(bizB, 'zh-CN')
    const scopeDiff = scopeSortRank(b.scopeType) - scopeSortRank(a.scopeType)
    if (scopeDiff !== 0) return scopeDiff
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  })
}

/** 列表展示适用对象摘要 */
export function formatQcTemplateObjects(template = {}) {
  if (template.isUniversal || template.bizScope === '通用' || template.code === 'QCT-SYS-001') {
    return '全业务兜底'
  }
  const scopeType = template.scopeType || QC_TEMPLATE_SCOPE_TYPE.GLOBAL
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) return '全部'
  const objects = Array.isArray(template.objects) ? template.objects : []
  if (!objects.length) return '—'
  const labels = objects
    .map((o) => o.label || o.code || o.value || o.name)
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (!labels.length) return '—'
  if (labels.length <= 2) return labels.join('、')
  return `${labels.slice(0, 2).join('、')} 等${labels.length}项`
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
