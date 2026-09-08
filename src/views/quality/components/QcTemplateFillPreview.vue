<template>
  <div class="qc-sheet-preview">
    <div class="sheet-paper">
      <div class="sheet-header">
        <div class="sheet-title">{{ templateName || '质检单' }}</div>
        <div class="sheet-meta">
          <span v-if="templateCode">模板编号：{{ templateCode }}</span>
          <span>整单规则：{{ sheetPassRuleLabel(sheetPassRule) }}</span>
          <span class="sheet-meta-muted">预览试填，不保存</span>
        </div>
      </div>

      <div v-if="headerFields.length" class="sheet-section">
        <div class="sheet-section-title">基本信息</div>
        <div class="sheet-form-grid">
          <div v-for="field in headerFields" :key="field.code" class="sheet-form-item">
            <label class="sheet-label">
              <span v-if="field.required !== false" class="req">*</span>
              {{ field.name }}
            </label>
            <div class="sheet-control">
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
              <a-textarea
                v-else-if="field.type === 'textarea'"
                v-model:value="fieldMap[field.code]"
                :rows="2"
                allow-clear
                :placeholder="field.placeholder || `请输入${field.name}`"
                @change="() => onFieldChange(field)"
              />
              <a-input
                v-else
                v-model:value="fieldMap[field.code]"
                allow-clear
                size="middle"
                :placeholder="field.placeholder || `请输入${field.name}`"
                @change="() => onFieldChange(field)"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="inspectFields.length" class="sheet-section">
        <div class="sheet-section-title">检验项目</div>
        <div class="sheet-inspect-list">
          <template v-for="(field, idx) in inspectFields" :key="field.code">
            <div
              v-if="isComplexField(field)"
              class="sheet-inspect-block is-complex"
              :class="{
                'is-pass': judgeHint(field) === 'pass',
                'is-fail': judgeHint(field) === 'fail',
              }"
            >
              <div class="sheet-inspect-head">
                <span class="sheet-seq">{{ idx + 1 }}</span>
                <div class="sheet-inspect-title">
                  <span v-if="field.required !== false" class="req">*</span>
                  {{ field.name }}
                  <a-tag color="processing">复合</a-tag>
                </div>
                <a-tag v-if="judgeHint(field) === 'pass'" color="success">合格</a-tag>
                <a-tag v-else-if="judgeHint(field) === 'fail'" color="error">不合格</a-tag>
              </div>
              <div class="sheet-standard">子项分别判定，录入时展开填写</div>
              <QcInspectComplexField
                :field="field"
                v-model="fieldMap[field.code]"
                @change="() => onFieldChange(field)"
              />
            </div>

            <div
              v-else
              class="sheet-inspect-block"
              :class="{
                'is-pass': judgeHint(field) === 'pass',
                'is-fail': judgeHint(field) === 'fail',
              }"
            >
              <div class="sheet-inspect-head">
                <span class="sheet-seq">{{ idx + 1 }}</span>
                <div class="sheet-inspect-title">
                  <span v-if="field.required !== false" class="req">*</span>
                  {{ field.name }}
                </div>
                <a-tag v-if="judgeHint(field) === 'pass'" color="success">合格</a-tag>
                <a-tag v-else-if="judgeHint(field) === 'fail'" color="error">不合格</a-tag>
                <span v-else class="judge-placeholder">待判定</span>
              </div>
              <div class="sheet-standard">
                合格标准：{{ standardHint(field) || '未设置（仅记录）' }}
              </div>
              <div class="sheet-form-item is-inline">
                <label class="sheet-label">实测值</label>
                <div class="sheet-control field-input-wrap">
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
                  <a-textarea
                    v-else-if="field.type === 'textarea'"
                    :value="getMeasuredValue(field)"
                    :rows="2"
                    allow-clear
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
              </div>
              <div v-if="isManualJudgeField(field)" class="sheet-form-item is-inline">
                <label class="sheet-label"><span class="req">*</span>本项结论</label>
                <div class="sheet-control">
                  <a-select
                    :value="getManualJudgment(field) || undefined"
                    allow-clear
                    size="middle"
                    placeholder="请选择"
                    :options="listManualJudgmentSelectOptions(field)"
                    style="width: 100%"
                    @update:value="(v) => setManualJudgment(field, v)"
                  />
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="showConclusionSection" class="sheet-section sheet-footer-section">
        <div class="sheet-section-title">整单结论</div>
        <div class="sheet-conclusion-hint">{{ conclusionHint }}</div>
        <div
          class="sheet-form-item is-inline conclusion-item"
          :class="{
            'is-pass': isPassConclusion,
            'is-fail': isFailConclusion,
          }"
        >
          <label class="sheet-label">
            <span v-if="!isAutoConclusion" class="req">*</span>整单结论
          </label>
          <div class="sheet-control">
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
              style="width: 100%; max-width: 320px"
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
  mapConclusionValueToQcResult,
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
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'

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

const isPassConclusion = computed(() => {
  void tick.n
  if (isAutoConclusion.value) return autoConclusion.value.status === 'pass'
  const raw = conclusionValue.value
  if (raw === undefined || raw === null || raw === '') return false
  return (
    mapConclusionValueToQcResult(raw, {
      optionItems: conclusionOptionItems.value,
    }) === QC_TASK_RESULT.PASS
  )
})

const isFailConclusion = computed(() => {
  void tick.n
  if (isAutoConclusion.value) return autoConclusion.value.status === 'fail'
  const raw = conclusionValue.value
  if (raw === undefined || raw === null || raw === '') return false
  return (
    mapConclusionValueToQcResult(raw, {
      optionItems: conclusionOptionItems.value,
    }) === QC_TASK_RESULT.FAIL
  )
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
  padding-bottom: 8px;
}

.sheet-paper {
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.sheet-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
}

.sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
  line-height: 28px;
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

.sheet-section {
  padding: 14px 20px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.sheet-section:last-child {
  border-bottom: none;
}

.sheet-section-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  padding-left: 8px;
  border-left: 3px solid #1677ff;
  line-height: 1.2;
}

.sheet-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
}

@media (max-width: 640px) {
  .sheet-form-grid {
    grid-template-columns: 1fr;
  }
}

.sheet-form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sheet-form-item.is-inline {
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
}

.sheet-form-item.is-inline .sheet-label {
  width: 72px;
  flex-shrink: 0;
  padding-top: 5px;
  text-align: right;
}

.sheet-form-item.is-inline .sheet-control {
  flex: 1;
  min-width: 0;
}

.sheet-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 22px;
}

.sheet-control {
  min-width: 0;
}

.req {
  margin-right: 2px;
  color: #ff4d4f;
}

.sheet-inspect-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sheet-inspect-block {
  padding: 12px 14px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafbfc;
}

.sheet-inspect-block.is-complex {
  background: #fff;
  border-color: #e5e6eb;
}

.sheet-inspect-block.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.sheet-inspect-block.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.sheet-inspect-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.sheet-seq {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  font-size: 12px;
  line-height: 22px;
  text-align: center;
}

.sheet-inspect-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sheet-standard {
  margin: 0 0 10px 30px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.sheet-inspect-block :deep(.complex-inspect-block) {
  margin-left: 30px;
  margin-top: 4px;
  border: none;
  background: transparent;
  padding: 0;
}

.sheet-inspect-block :deep(.complex-head) {
  display: none;
}

.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 420px;
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
  width: 100%;
  max-width: 480px;
}

.auto-conclusion-box.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.auto-conclusion-box.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.auto-conclusion-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.judge-placeholder {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.25);
}

.unit-affix {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
}

.sheet-footer-section .conclusion-item {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.sheet-conclusion-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.sheet-footer-section .conclusion-item.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.sheet-footer-section .conclusion-item.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}
</style>
