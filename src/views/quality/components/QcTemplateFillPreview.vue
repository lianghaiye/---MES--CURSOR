<template>
  <div class="qc-sheet-preview">
    <div class="sheet-header">
      <div class="sheet-title">{{ templateName || '质检单' }}</div>
      <div class="sheet-meta">
        <span v-if="templateCode">模板编号：{{ templateCode }}</span>
        <span>整单规则：{{ sheetPassRuleLabel(sheetPassRule) }}</span>
        <span class="sheet-meta-muted">预览试填，不保存</span>
      </div>
    </div>

    <div class="line-sheet-wrap">
      <div v-if="headerFields.length" class="line-sheet-section">
        <div class="line-sheet-title">基本信息</div>
        <div class="line-header-grid">
          <div v-for="field in headerFields" :key="field.code" class="line-header-item">
            <label class="line-field-label">
              <span v-if="field.required !== false" class="req">*</span>
              {{ field.name }}
            </label>
            <a-select
              v-if="isSelectLike(field)"
              v-model:value="fieldMap[field.code]"
              allow-clear
              size="middle"
              :placeholder="field.placeholder || `请选择${field.name}`"
              :options="fieldOptions(field)"
              style="width: 100%"
              @change="() => onFieldChange(field)"
            />
            <a-input-number
              v-else-if="field.type === 'number'"
              v-model:value="fieldMap[field.code]"
              :min="0"
              size="middle"
              style="width: 100%"
              :placeholder="field.placeholder || `请输入${field.name}`"
              @change="() => onFieldChange(field)"
            />
            <a-input
              v-else-if="field.type === 'textarea'"
              v-model:value="fieldMap[field.code]"
              allow-clear
              size="middle"
              style="width: 100%"
              :placeholder="field.placeholder || `请输入${field.name}`"
              @change="() => onFieldChange(field)"
            />
            <a-input
              v-else
              v-model:value="fieldMap[field.code]"
              allow-clear
              size="middle"
              style="width: 100%"
              :placeholder="field.placeholder || `请输入${field.name}`"
              @change="() => onFieldChange(field)"
            />
          </div>
        </div>
      </div>

      <div class="line-sheet-section">
        <div class="line-sheet-title">检验项目</div>
        <div v-if="inspectFields.length" class="inspect-fields-grid">
          <template v-for="field in inspectFields" :key="field.code">
            <QcInspectComplexField
              v-if="isComplexField(field)"
              :field="field"
              v-model="fieldMap[field.code]"
              @change="() => onFieldChange(field)"
            />
            <div
              v-else
              class="inspect-field-card"
              :class="{
                'is-pass': judgeHint(field) === 'pass',
                'is-fail': judgeHint(field) === 'fail',
              }"
            >
              <div class="inspect-field-head">
                <div class="inspect-field-title">
                  <span v-if="field.required !== false" class="req">*</span>
                  {{ field.name }}
                  <a-tag v-if="field.keyForSheetPass" color="warning" class="key-item-tag"
                    >关键项</a-tag
                  >
                </div>
                <a-tag v-if="judgeHint(field) === 'pass'" color="success" class="judge-tag">
                  合格
                </a-tag>
                <a-tag v-else-if="judgeHint(field) === 'fail'" color="error" class="judge-tag">
                  不合格
                </a-tag>
                <span v-else class="judge-placeholder">待判定</span>
              </div>
              <div class="inspect-field-standard">
                <template v-if="standardHint(field)">合格标准：{{ standardHint(field) }}</template>
                <template v-else>合格标准：未设置（仅记录实测值）</template>
              </div>
              <div class="field-input-wrap">
                <span v-if="unitPrefix(field)" class="unit-affix">{{ unitPrefix(field) }}</span>
                <a-select
                  v-if="isSelectLike(field)"
                  :value="getMeasuredValue(field)"
                  allow-clear
                  size="middle"
                  :placeholder="field.placeholder || `请选择${field.name}`"
                  :options="fieldOptions(field)"
                  style="flex: 1; min-width: 0"
                  @update:value="(v) => setMeasuredValue(field, v)"
                />
                <a-input-number
                  v-else-if="field.type === 'number'"
                  :value="getMeasuredValue(field)"
                  :min="0"
                  size="middle"
                  style="flex: 1; min-width: 0"
                  :placeholder="field.placeholder || `请输入${field.name}`"
                  @update:value="(v) => setMeasuredValue(field, v)"
                />
                <a-input
                  v-else
                  :value="getMeasuredValue(field)"
                  allow-clear
                  size="middle"
                  style="flex: 1; min-width: 0"
                  :placeholder="field.placeholder || `请输入${field.name}`"
                  @update:value="(v) => setMeasuredValue(field, v)"
                />
                <span v-if="unitSuffix(field)" class="unit-affix">{{ unitSuffix(field) }}</span>
              </div>
              <div v-if="isManualJudgeField(field)" class="manual-judgment-row">
                <span class="manual-label"><span class="req">*</span>本项结论</span>
                <a-select
                  :value="getManualJudgment(field) || undefined"
                  allow-clear
                  size="middle"
                  placeholder="请选择本项结论"
                  :options="listManualJudgmentSelectOptions(field)"
                  style="flex: 1; min-width: 0"
                  @update:value="(v) => setManualJudgment(field, v)"
                />
              </div>
            </div>
          </template>
        </div>
        <div v-else class="muted">该模板未配置检验项目</div>
      </div>

      <div v-if="showConclusionSection" class="line-sheet-section line-conclusion-section">
        <div class="line-conclusion-head">
          <div class="line-conclusion-left">
            <div class="line-sheet-title">整单结论</div>
            <div class="line-conclusion-hint">{{ conclusionHint }}</div>
          </div>
          <div class="line-conclusion-right">
            <div
              v-if="isAutoConclusion"
              class="auto-conclusion-box"
              :class="{
                'is-pass': autoConclusion.status === 'pass',
                'is-fail': autoConclusion.status === 'fail',
                'is-pending':
                  autoConclusion.status === 'pending' || autoConclusion.status === 'unavailable',
              }"
            >
              <a-tag v-if="autoConclusion.status === 'pass'" color="success">{{
                autoConclusion.value || '合格'
              }}</a-tag>
              <a-tag v-else-if="autoConclusion.status === 'fail'" color="error">{{
                autoConclusion.value || '不合格'
              }}</a-tag>
              <a-tag v-else color="default">待判定</a-tag>
              <span class="auto-conclusion-text">{{
                autoConclusion.reason || '系统自动判定'
              }}</span>
            </div>
            <a-select
              v-else
              v-model:value="conclusionValue"
              allow-clear
              size="middle"
              placeholder="请选择整单结论"
              :options="conclusionSelectOptions"
              style="width: 200px"
            />
          </div>
        </div>
      </div>

      <a-empty v-if="!sortedFields.length" description="暂无字段可预览" />
    </div>
  </div>
</template>

<script>
export default { name: 'QcTemplateFillPreview' }
</script>

<script setup>
import { computed, reactive, watch } from 'vue'
import QcInspectComplexField from './QcInspectComplexField.vue'
import {
  isQcConclusionField,
  isQcInspectMethodField,
  isQcInspectQtyField,
  isQcInspectRemarkField,
  normalizeConclusionOptionItems,
  normalizeSheetConclusionOptionItems,
  QC_CONCLUSION_FIELD_CODE,
} from '@/utils/qcConclusionField'
import {
  QC_UNIT_POSITION,
  buildStandardText,
  evaluateFieldAgainstStandard,
  isManualJudgeField,
  listManualJudgmentSelectOptions,
  normalizeUnitPosition,
  parseManualFieldValue,
  pickFieldStandardProps,
  wrapManualFieldValue,
} from '@/utils/qcFieldStandard'
import {
  evaluateComplexOrSimpleField,
  isComplexField,
  normalizeComplexValue,
} from '@/utils/qcComplexField'
import { getQcLibraryFieldByCode } from '@/store/qcFieldLibraryStore'
import {
  QC_TEMPLATE_SHEET_PASS_RULE,
  isAutoSheetConclusionRule,
  normalizeSheetPassRule,
  resolveAutoSheetConclusion,
  sheetPassRuleLabel,
} from '@/utils/qcTemplateSheetPass'

const props = defineProps({
  fields: { type: Array, default: () => [] },
  sheetPassRule: { type: String, default: 'manual' },
  /** 模板级整单结论选项（人工判定）；优先于字段内嵌选项 */
  sheetConclusionOptionItems: { type: Array, default: null },
  templateName: { type: String, default: '' },
  templateCode: { type: String, default: '' },
})

const fieldMap = reactive({})
const tick = reactive({ n: 0 })

const sortedFields = computed(() => {
  const list = props.fields || []
  return [...list]
    .map((f, idx) => ({ ...f, _idx: idx }))
    .sort((a, b) => {
      const sa = a.sortOrder
      const sb = b.sortOrder
      if (sa != null && sb != null && sa !== sb) return sa - sb
      if (sa != null && sb == null) return -1
      if (sa == null && sb != null) return 1
      return a._idx - b._idx
    })
    .map((f) => enrichInspectField(f))
})

const headerFields = computed(() =>
  sortedFields.value.filter(
    (f) => isQcInspectMethodField(f) || isQcInspectQtyField(f) || isQcInspectRemarkField(f),
  ),
)

const inspectFields = computed(() =>
  sortedFields.value.filter(
    (f) =>
      !isQcInspectMethodField(f) &&
      !isQcInspectQtyField(f) &&
      !isQcInspectRemarkField(f) &&
      !isQcConclusionField(f) &&
      f.type !== 'matrix',
  ),
)

const conclusionField = computed(
  () => sortedFields.value.find((f) => isQcConclusionField(f)) || null,
)

const sheetRule = computed(() => normalizeSheetPassRule(props.sheetPassRule))

const isAutoConclusion = computed(() => isAutoSheetConclusionRule(sheetRule.value))

/** 整单结论选项：优先模板级配置，其次结论字段，最后默认三项 */
const conclusionOptionItems = computed(() => {
  if (Array.isArray(props.sheetConclusionOptionItems) && props.sheetConclusionOptionItems.length) {
    return normalizeSheetConclusionOptionItems(props.sheetConclusionOptionItems)
  }
  if (conclusionField.value) return normalizeConclusionOptionItems(conclusionField.value)
  return normalizeSheetConclusionOptionItems([])
})

const conclusionSelectOptions = computed(() =>
  conclusionOptionItems.value.map((o) => ({ label: o.value, value: o.value })),
)

const conclusionCode = computed(() => conclusionField.value?.code || QC_CONCLUSION_FIELD_CODE)

const autoConclusion = computed(() => {
  void tick.n
  return resolveAutoSheetConclusion(
    { fieldMap },
    sortedFields.value,
    sheetRule.value,
    conclusionOptionItems.value,
  )
})

const conclusionValue = computed({
  get() {
    return fieldMap[conclusionCode.value]
  },
  set(v) {
    fieldMap[conclusionCode.value] = v
    tick.n += 1
  },
})

/** 填写预览始终展示整单结论；选项来自模板配置而非检验项库 */
const showConclusionSection = computed(() => {
  if (isAutoConclusion.value) return true
  return conclusionSelectOptions.value.length > 0
})

const conclusionHint = computed(() => {
  const rule = sheetRule.value
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.MANUAL) {
    return '整单规则为「人工判定」：请从本模板配置的结论选项中选择；检验项未达标仅提示，不强制拦截。'
  }
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS) {
    return `整单规则为「${sheetPassRuleLabel(rule)}」：无需手选，系统根据检验项达标情况自动给出合格/不合格。`
  }
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS) {
    return `整单规则为「${sheetPassRuleLabel(rule)}」：无需手选，系统根据关键项达标情况自动给出合格/不合格。`
  }
  return ''
})

watch(
  () => [props.fields, props.sheetConclusionOptionItems, props.sheetPassRule],
  () => {
    Object.keys(fieldMap).forEach((k) => delete fieldMap[k])
    ;(props.fields || []).forEach((f) => {
      if (!f?.code) return
      if (isComplexField(f)) {
        fieldMap[f.code] = normalizeComplexValue(f, f.defaultValue)
      } else if (f.defaultValue !== '' && f.defaultValue != null) {
        fieldMap[f.code] = f.defaultValue
      } else {
        fieldMap[f.code] = undefined
      }
    })
    const code = conclusionCode.value
    if (isAutoConclusion.value) {
      fieldMap[code] = undefined
      syncFillAutoConclusion()
    } else if (fieldMap[code] === undefined || fieldMap[code] === null || fieldMap[code] === '') {
      const def = conclusionOptionItems.value.find((o) => o.isDefault)?.value
      if (def) fieldMap[code] = def
    }
    tick.n += 1
  },
  { immediate: true, deep: true },
)

function syncFillAutoConclusion() {
  if (!isAutoConclusion.value) return
  const resolved = resolveAutoSheetConclusion(
    { fieldMap },
    sortedFields.value,
    sheetRule.value,
    conclusionOptionItems.value,
  )
  fieldMap[conclusionCode.value] = resolved.value || undefined
}

function onFieldChange(field) {
  void field
  syncFillAutoConclusion()
  tick.n += 1
}

function enrichInspectField(field = {}) {
  const hasStandard =
    Boolean(field.judgeRule && field.judgeRule !== 'none') ||
    Boolean(buildStandardText(field)) ||
    Boolean(field.withUnit || field.unit)
  if (hasStandard) {
    const standard = pickFieldStandardProps(field)
    return {
      ...field,
      ...standard,
      children: field.children,
      standardText: field.standardText || buildStandardText({ ...field, ...standard }),
    }
  }
  const lib = getQcLibraryFieldByCode(field.code)
  if (!lib) return { ...field, ...pickFieldStandardProps(field) }
  const standard = pickFieldStandardProps({ ...lib, ...field })
  return {
    ...field,
    ...standard,
    children: field.children,
    options: field.options?.length ? field.options : lib.options ? [...lib.options] : [],
    standardText:
      field.standardText ||
      lib.standardText ||
      buildStandardText({ ...lib, ...field, ...standard }),
  }
}

function isSelectLike(field) {
  if (isQcConclusionField(field)) return true
  if (field.type === 'radio' || field.type === 'select' || field.type === 'checkbox') return true
  return Array.isArray(field.options) && field.options.length > 0
}

function fieldOptions(field) {
  if (isQcConclusionField(field)) {
    return normalizeConclusionOptionItems(field).map((o) => ({ label: o.value, value: o.value }))
  }
  return (field.options || []).map((v) =>
    typeof v === 'string' ? { label: v, value: v } : { label: v.label || v.value, value: v.value },
  )
}

function getMeasuredValue(field) {
  if (isManualJudgeField(field)) {
    return parseManualFieldValue(fieldMap[field.code]).measured
  }
  return fieldMap[field.code]
}

function setMeasuredValue(field, v) {
  if (isManualJudgeField(field)) {
    const prev = parseManualFieldValue(fieldMap[field.code])
    fieldMap[field.code] = wrapManualFieldValue(v, prev.judgment)
  } else {
    fieldMap[field.code] = v
  }
  onFieldChange(field)
}

function getManualJudgment(field) {
  return parseManualFieldValue(fieldMap[field.code]).judgment
}

function setManualJudgment(field, v) {
  const prev = parseManualFieldValue(fieldMap[field.code])
  fieldMap[field.code] = wrapManualFieldValue(prev.measured, v)
  onFieldChange(field)
}

function unitText(field) {
  if (!field?.withUnit && !field?.unit) return ''
  return String(field.unit || '').trim()
}

function unitPrefix(field) {
  const unit = unitText(field)
  if (!unit) return ''
  return normalizeUnitPosition(field.unitPosition) === QC_UNIT_POSITION.PREFIX ? unit : ''
}

function unitSuffix(field) {
  const unit = unitText(field)
  if (!unit) return ''
  return normalizeUnitPosition(field.unitPosition) === QC_UNIT_POSITION.SUFFIX ? unit : ''
}

function standardHint(field) {
  return buildStandardText(field)
}

function judgeHint(field) {
  void tick.n
  if (isComplexField(field)) {
    return evaluateComplexOrSimpleField(field, fieldMap[field.code])
  }
  return evaluateFieldAgainstStandard(field, fieldMap[field.code])
}
</script>

<style lang="less" scoped>
.qc-sheet-preview {
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.sheet-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.sheet-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 24px;
}

.sheet-meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

.sheet-meta-muted {
  color: rgba(0, 0, 0, 0.35);
}

/* 与录入质检结果行展开模板一致 */
.line-sheet-wrap {
  padding: 12px 14px;
  background: #fafbfc;
}

.line-sheet-section {
  margin-bottom: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.line-sheet-section:last-child {
  margin-bottom: 0;
}

.line-sheet-title {
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1677ff;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.2;
}

.line-header-grid {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(140px, 1fr) minmax(220px, 2fr);
  gap: 12px 16px;
  align-items: end;
}

@media (max-width: 900px) {
  .line-header-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.line-header-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.line-field-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 22px;
}

.line-field-label .req,
.inspect-field-title .req,
.manual-label .req {
  margin-right: 2px;
  color: #ff4d4f;
}

.inspect-fields-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 1280px) {
  .inspect-fields-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .inspect-fields-grid {
    grid-template-columns: 1fr;
  }
}

.inspect-field-card {
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.inspect-field-card.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.inspect-field-card.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.inspect-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.inspect-field-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.key-item-tag {
  margin: 0;
  font-weight: 500;
}

.inspect-field-standard {
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
}

.unit-affix {
  flex-shrink: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.manual-judgment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.manual-label {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.judge-placeholder {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.judge-tag {
  margin: 0;
}

.muted {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.line-conclusion-section {
  padding-top: 12px;
  padding-bottom: 12px;
}

.line-conclusion-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
}

.line-conclusion-left {
  flex: 1;
  min-width: 0;
}

.line-conclusion-left .line-sheet-title {
  margin-bottom: 6px;
}

.line-conclusion-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 48%;
}

.line-conclusion-hint {
  margin-bottom: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.auto-conclusion-box {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  background: #fafbfc;
}

.auto-conclusion-box.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.auto-conclusion-box.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.auto-conclusion-box.is-pending {
  border-color: #e5e6eb;
  background: #fafbfc;
}

.auto-conclusion-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

@media (max-width: 900px) {
  .line-conclusion-head {
    flex-direction: column;
  }

  .line-conclusion-right {
    max-width: 100%;
    justify-content: flex-start;
  }
}
</style>
