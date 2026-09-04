<template>
  <div class="qc-template-fill-preview">
    <a-alert type="info" show-icon class="preview-tip" :message="previewTip" />

    <div v-if="methodOrQtyFields.length" class="system-row">
      <div v-for="field in methodOrQtyFields" :key="field.code" class="system-item">
        <span class="system-label">
          <span v-if="field.required !== false" class="req">*</span>
          {{ field.name }}
        </span>
        <a-select
          v-if="isSelectLike(field)"
          v-model:value="fieldMap[field.code]"
          size="small"
          allow-clear
          :placeholder="field.placeholder || `请选择${field.name}`"
          :options="fieldOptions(field)"
          style="width: 160px"
          @change="() => onFieldChange(field)"
        />
        <a-input-number
          v-else-if="field.type === 'number'"
          v-model:value="fieldMap[field.code]"
          size="small"
          :min="0"
          style="width: 160px"
          :placeholder="field.placeholder || `请输入${field.name}`"
          @change="() => onFieldChange(field)"
        />
        <a-input
          v-else
          v-model:value="fieldMap[field.code]"
          size="small"
          allow-clear
          style="width: 160px"
          :placeholder="field.placeholder || `请输入${field.name}`"
          @change="() => onFieldChange(field)"
        />
      </div>
    </div>

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
            </div>
            <a-tag v-if="judgeHint(field) === 'pass'" color="success" class="judge-tag">
              达标
            </a-tag>
            <a-tag v-else-if="judgeHint(field) === 'fail'" color="error" class="judge-tag">
              未达标
            </a-tag>
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
              size="small"
              allow-clear
              :placeholder="field.placeholder || `请选择${field.name}`"
              :options="fieldOptions(field)"
              style="flex: 1; min-width: 0"
              @update:value="(v) => setMeasuredValue(field, v)"
            />
            <a-input-number
              v-else-if="field.type === 'number'"
              :value="getMeasuredValue(field)"
              size="small"
              :min="0"
              style="flex: 1; min-width: 0"
              :placeholder="field.placeholder || `请输入${field.name}`"
              @update:value="(v) => setMeasuredValue(field, v)"
            />
            <a-input
              v-else
              :value="getMeasuredValue(field)"
              size="small"
              allow-clear
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
              size="small"
              allow-clear
              placeholder="请选择"
              :options="listManualJudgmentSelectOptions(field)"
              style="flex: 1; min-width: 0"
              @update:value="(v) => setManualJudgment(field, v)"
            />
          </div>
        </div>
      </template>
    </div>

    <div v-if="conclusionField" class="conclusion-row">
      <div
        class="inspect-field-card conclusion-card"
        :class="{
          'is-pass': isPassConclusion,
          'is-fail': isFailConclusion,
        }"
      >
        <div class="inspect-field-head">
          <div class="inspect-field-title">
            <span class="req">*</span>
            {{ conclusionField.name || '质检结果' }}
          </div>
        </div>
        <div class="inspect-field-standard">整单结论（录入时选择，回写任务质检结果）</div>
        <a-select
          v-model:value="fieldMap[conclusionField.code]"
          size="small"
          allow-clear
          :placeholder="conclusionField.placeholder || '请选择质检结果'"
          :options="fieldOptions(conclusionField)"
          style="width: 100%"
        />
      </div>
    </div>

    <a-empty v-if="!sortedFields.length" description="暂无字段可预览" />
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
  normalizeConclusionOptionItems,
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
import { sheetPassRuleLabel } from '@/utils/qcTemplateSheetPass'

const props = defineProps({
  fields: { type: Array, default: () => [] },
  sheetPassRule: { type: String, default: 'manual' },
})

const previewTip = computed(() => {
  const rule = sheetPassRuleLabel(props.sheetPassRule)
  return `填写预览：样式与「录入质检结果」一致，可试填查看达标提示。整单规则：${rule}。数据不会保存。`
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

const methodOrQtyFields = computed(() =>
  sortedFields.value.filter((f) => isQcInspectMethodField(f) || isQcInspectQtyField(f)),
)

const inspectFields = computed(() =>
  sortedFields.value.filter(
    (f) => !isQcInspectMethodField(f) && !isQcInspectQtyField(f) && !isQcConclusionField(f),
  ),
)

const conclusionField = computed(
  () => sortedFields.value.find((f) => isQcConclusionField(f)) || null,
)

const isPassConclusion = computed(() => {
  const f = conclusionField.value
  if (!f) return false
  const val = fieldMap[f.code]
  if (!val) return false
  const item = normalizeConclusionOptionItems(f).find((o) => o.value === val)
  return item?.result === '质检通过'
})

const isFailConclusion = computed(() => {
  const f = conclusionField.value
  if (!f) return false
  const val = fieldMap[f.code]
  if (!val) return false
  const item = normalizeConclusionOptionItems(f).find((o) => o.value === val)
  return item?.result === '质检不通过'
})

watch(
  () => props.fields,
  (list) => {
    Object.keys(fieldMap).forEach((k) => delete fieldMap[k])
    ;(list || []).forEach((f) => {
      if (!f?.code) return
      if (isComplexField(f)) {
        fieldMap[f.code] = normalizeComplexValue(f, f.defaultValue)
      } else if (f.defaultValue !== '' && f.defaultValue != null) {
        fieldMap[f.code] = f.defaultValue
      } else {
        fieldMap[f.code] = undefined
      }
    })
    tick.n += 1
  },
  { immediate: true, deep: true },
)

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
      standardText: field.standardText || buildStandardText({ ...field, ...standard }),
    }
  }
  const lib = getQcLibraryFieldByCode(field.code)
  if (!lib) return { ...field, ...pickFieldStandardProps(field) }
  const standard = pickFieldStandardProps({ ...lib, ...field })
  return {
    ...field,
    ...standard,
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

function onFieldChange() {
  tick.n += 1
}
</script>

<style lang="less" scoped>
.preview-tip {
  margin-bottom: 12px;
}

.system-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.system-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.system-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

.system-label .req,
.inspect-field-title .req {
  margin-right: 2px;
  color: #ff4d4f;
}

.inspect-fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.conclusion-row {
  margin-top: 12px;
}

.conclusion-card {
  max-width: 360px;
}

.inspect-field-card {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
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
  gap: 6px;
  width: 100%;
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

.manual-label .req {
  margin-right: 2px;
  color: #ff4d4f;
}

.unit-affix {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
}

.judge-tag {
  margin: 0;
}
</style>
