<template>
  <div class="qc-inspect-page">
    <a-spin :spinning="loading">
      <template v-if="task">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">录入质检结果</span>
            <span class="page-sub">{{ task.qcNo }}</span>
            <a-tag :color="statusColor(task.qcStatus)">{{ task.qcStatus }}</a-tag>
          </div>
          <a-space>
            <a-button size="small" @click="handleCancel">取消</a-button>
            <a-button type="primary" size="small" :loading="saving" @click="handleOk">
              确认
            </a-button>
          </a-space>
        </div>

        <a-alert
          type="info"
          show-icon
          class="channel-tip"
          message="各物料按建单时冻结的质检模板分别录入（质检方式、检验项可不同）。展开行可填写该物料专属检验项。"
        />

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-form layout="inline" class="header-form horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="6">
                <a-form-item label="质检单号">
                  <a-input :value="task.qcNo" disabled size="small" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="来源单号">
                  <a-input :value="task.sourceDocNo" disabled size="small" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="供应商">
                  <a-input :value="task.supplier" disabled size="small" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="模板摘要">
                  <a-input :value="templateSummary" disabled size="small" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="质检人">
                  <a-input v-model:value="form.inspector" size="small" placeholder="请输入质检人" />
                </a-form-item>
              </a-col>
              <a-col :span="18">
                <a-form-item label="备注" class="remark-item">
                  <a-textarea
                    v-model:value="form.remark"
                    :rows="1"
                    :maxlength="200"
                    show-count
                    placeholder="选填"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>

        <div class="section-card">
          <div class="section-title">质检明细（{{ form.lineItems.length }}）</div>
          <a-table
            :columns="lineColumns"
            :data-source="form.lineItems"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1280 }"
            v-model:expandedRowKeys="expandedKeys"
          >
            <template #expandIcon="{ expanded, onExpand: onExp, record }">
              <a-button
                v-if="extraFields(record).length"
                type="link"
                size="small"
                @click="(e) => onExp(record, e)"
              >
                {{ expanded ? '收起检验项' : '展开检验项' }}
              </a-button>
              <span v-else class="muted">—</span>
            </template>

            <template #expandedRowRender="{ record }">
              <div v-if="extraFields(record).length" class="expand-form-wrap">
                <div class="inspect-fields-grid">
                  <template v-for="field in extraFields(record)" :key="field.code">
                    <QcInspectComplexField
                      v-if="isComplexField(field)"
                      :field="field"
                      v-model="record.fieldMap[field.code]"
                      @change="onFieldChange(record, field)"
                    />
                    <div
                      v-else
                      class="inspect-field-card"
                      :class="{
                        'is-pass': judgeHint(record, field) === 'pass',
                        'is-fail': judgeHint(record, field) === 'fail',
                      }"
                    >
                      <div class="inspect-field-head">
                        <div class="inspect-field-title">
                          <span v-if="field.required !== false" class="req">*</span>
                          {{ field.name }}
                        </div>
                        <a-tag
                          v-if="judgeHint(record, field) === 'pass'"
                          color="success"
                          class="judge-tag"
                        >
                          达标
                        </a-tag>
                        <a-tag
                          v-else-if="judgeHint(record, field) === 'fail'"
                          color="error"
                          class="judge-tag"
                        >
                          未达标
                        </a-tag>
                      </div>
                      <div class="inspect-field-standard">
                        <template v-if="standardHint(field)">
                          合格标准：{{ standardHint(field) }}
                        </template>
                        <template v-else>合格标准：未设置（仅记录实测值）</template>
                      </div>
                      <div class="field-input-wrap">
                        <span v-if="unitPrefix(field)" class="unit-affix">{{
                          unitPrefix(field)
                        }}</span>
                        <a-select
                          v-if="isSelectLike(field)"
                          :value="getMeasuredValue(record, field)"
                          size="small"
                          allow-clear
                          :placeholder="field.placeholder || `请选择${field.name}`"
                          :options="fieldOptions(field)"
                          style="flex: 1; min-width: 0"
                          @update:value="(v) => setMeasuredValue(record, field, v)"
                        />
                        <a-input-number
                          v-else-if="field.type === 'number'"
                          :value="getMeasuredValue(record, field)"
                          size="small"
                          :min="0"
                          style="flex: 1; min-width: 0"
                          :formatter="qtyFormatter"
                          :parser="qtyParser"
                          :placeholder="field.placeholder || `请输入${field.name}`"
                          @update:value="(v) => setMeasuredValue(record, field, v)"
                        />
                        <a-input
                          v-else
                          :value="getMeasuredValue(record, field)"
                          size="small"
                          allow-clear
                          style="flex: 1; min-width: 0"
                          :placeholder="field.placeholder || `请输入${field.name}`"
                          @update:value="(v) => setMeasuredValue(record, field, v)"
                        />
                        <span v-if="unitSuffix(field)" class="unit-affix">{{
                          unitSuffix(field)
                        }}</span>
                      </div>
                      <div v-if="isManualJudgeField(field)" class="manual-judgment-row">
                        <span class="manual-label"><span class="req">*</span>本项结论</span>
                        <a-select
                          :value="getManualJudgment(record, field)"
                          size="small"
                          allow-clear
                          placeholder="请选择"
                          :options="listManualJudgmentSelectOptions(field)"
                          style="flex: 1; min-width: 0"
                          @update:value="(v) => setManualJudgment(record, field, v)"
                        />
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <span v-else class="muted">该行无额外检验项</span>
            </template>

            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'receiptQty'">
                {{ formatQty(record.receiptQty) }}
              </template>
              <template v-else-if="column.key === 'inspectQty'">
                <a-input-number
                  :value="record.fieldMap.QC_INSPECT_QTY"
                  size="small"
                  :min="0"
                  style="width: 100%"
                  :formatter="qtyFormatter"
                  :parser="qtyParser"
                  @update:value="(v) => onInspectQtyChange(record, v)"
                />
              </template>
              <template v-else-if="column.key === 'inspectMethod'">
                <a-select
                  v-model:value="record.fieldMap.QC_INSPECT_METHOD"
                  size="small"
                  style="width: 100%"
                  :options="methodOptsFor(record)"
                  @change="onMethodChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'conclusion'">
                <a-select
                  v-model:value="record.fieldMap[conclusionCode(record)]"
                  size="small"
                  placeholder="请选择"
                  style="width: 100%"
                  :options="conclusionOptsFor(record)"
                  @change="onConclusionChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'treatmentPlan'">
                <a-select
                  v-model:value="record.treatmentPlan"
                  size="small"
                  allow-clear
                  placeholder="请选择"
                  style="width: 100%"
                  :options="planOpts"
                  :disabled="!needTreatment(getConclusionValue(record))"
                />
              </template>
              <template v-else>
                {{ displayCell(record, column) }}
              </template>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该质检单或不可录入" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'QcTaskInspectView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  QC_CONCLUSION_CONCESSION_OPTION,
  QC_CONCLUSION_FAIL_OPTION,
  QC_CONCLUSION_FIELD_CODE,
  findQcConclusionField,
  isQcConclusionField,
  normalizeConclusionOptionItems,
} from '@/utils/qcConclusionField'
import {
  QC_TASK_STATUS,
  canInspectQcTask,
  getQcTaskById,
  startQcTaskInspection,
  submitQcTaskInspection,
} from '@/store/qcTaskStore'
import { formatQty } from '@/utils/numberFormat'
import { useTabs, tabStore } from '@/composables/useTabs'
import {
  QC_UNIT_POSITION,
  buildStandardText,
  evaluateFieldAgainstStandard,
  isManualJudgeField,
  isManualJudgmentMissing,
  listManualJudgmentSelectOptions,
  normalizeUnitPosition,
  parseManualFieldValue,
  pickFieldStandardProps,
  wrapManualFieldValue,
} from '@/utils/qcFieldStandard'
import {
  collectAllFailingStandardHints,
  evaluateComplexOrSimpleField,
  isComplexField,
  isComplexValueEmpty,
  normalizeComplexValue,
} from '@/utils/qcComplexField'
import {
  QC_TEMPLATE_SHEET_PASS_RULE,
  normalizeSheetPassRule,
  sheetPassRuleLabel,
  validateLineSheetPassRule,
} from '@/utils/qcTemplateSheetPass'
import { getQcLibraryFieldByCode, ensureQcLibraryDemoSeed } from '@/store/qcFieldLibraryStore'
import { getQcTemplateByCode, ensureQcTemplateDemoSeed } from '@/store/qcTemplateStore'
import { cloneTemplateFieldsSnapshot } from '@/store/qcTaskStore'
import QcInspectComplexField from './components/QcInspectComplexField.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const saving = ref(false)
const task = ref(null)
const expandedKeys = ref([])
const form = reactive({
  inspector: 'admin1',
  remark: '',
  lineItems: [],
})

const planOpts = [
  { label: '退货', value: '退货' },
  { label: '让步接收', value: '让步接收' },
  { label: '返工', value: '返工' },
  { label: '换批次', value: '换批次' },
]

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品名称', dataIndex: 'itemName', width: 130, ellipsis: true },
  { title: '产品编号', dataIndex: 'itemCode', width: 110 },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '质检模板', dataIndex: 'templateName', width: 140, ellipsis: true },
  { title: '收货数量', key: 'receiptQty', width: 90, align: 'right' },
  { title: '质检数量', key: 'inspectQty', width: 110 },
  { title: '质检方式', key: 'inspectMethod', width: 100 },
  { title: '质检结果', key: 'conclusion', width: 110 },
  { title: '处理方案', key: 'treatmentPlan', width: 110 },
]

const templateSummary = computed(() => {
  const lines = form.lineItems || []
  const names = [...new Set(lines.map((l) => l.templateName || l.templateCode).filter(Boolean))]
  if (!names.length) return task.value?.templateName || '—'
  if (names.length === 1) return names[0]
  return `多模板（${names.length}）`
})

function loadPage() {
  ensureQcLibraryDemoSeed()
  ensureQcTemplateDemoSeed()
  const id = route.params.id
  loading.value = true
  const row = getQcTaskById(id)
  task.value = row
  loading.value = false

  if (!row) return
  if (!canInspectQcTask(row)) {
    message.warning('当前状态不可录入质检结果')
    return
  }

  startQcTaskInspection(row.id, { entryChannel: 'web' })
  // 开始检验后状态可能变为「检验中」，重新取最新引用
  task.value = getQcTaskById(id) || row
  form.inspector = task.value.inspector || 'admin1'
  form.remark = task.value.remark || ''
  form.lineItems = JSON.parse(JSON.stringify(task.value.lineItems || [])).map((line) =>
    hydrateLineDraft(line, task.value),
  )
  expandedKeys.value = form.lineItems.filter((l) => extraFields(l).length).map((l) => l.id)

  const tab = tabStore.tabs.find((t) => t.path === route.path)
  if (tab) tab.title = `质检 ${task.value.qcNo || ''}`.trim()
}

watch(() => route.params.id, loadPage, { immediate: true })

function resolveLineFields(line, t) {
  const frozen =
    Array.isArray(line.templateFields) && line.templateFields.length
      ? line.templateFields
      : t?.templateFields || []
  const hasComplex = (frozen || []).some(
    (f) => f.type === 'composite' || f.type === 'matrix' || f.code === 'QC_RUN_TEST',
  )
  if (hasComplex) return frozen
  const live = getQcTemplateByCode(line.templateCode || t?.templateCode)
  if (live?.fields?.length) {
    return cloneTemplateFieldsSnapshot(live.fields)
  }
  return frozen
}

function resolveLineSheetPassRule(line, t) {
  if (line?.sheetPassRule) return normalizeSheetPassRule(line.sheetPassRule)
  const live = getQcTemplateByCode(line?.templateCode || t?.templateCode)
  if (live?.sheetPassRule) return normalizeSheetPassRule(live.sheetPassRule)
  return QC_TEMPLATE_SHEET_PASS_RULE.MANUAL
}

function hydrateLineDraft(line, t) {
  const fields = resolveLineFields(line, t)
  const fieldMap = {}
  ;(line.fieldValues || []).forEach((v) => {
    const code = v.fieldCode || v.code
    if (code) fieldMap[code] = v.value ?? v.fieldValue
  })

  fields.forEach((f) => {
    if (isComplexField(f)) {
      fieldMap[f.code] = normalizeComplexValue(f, fieldMap[f.code])
      return
    }
    if (isManualJudgeField(f)) {
      const existing = fieldMap[f.code]
      const defJudgment =
        listManualJudgmentSelectOptions(f).find((o) => {
          const items = f.manualOptionItems || []
          return items.some((it) => it.value === o.value && it.isDefault)
        })?.value ||
        (f.manualOptionItems || []).find((o) => o.isDefault)?.value ||
        ''
      if (existing !== undefined && existing !== null && existing !== '') {
        const parsed = parseManualFieldValue(existing)
        if (!parsed.judgment && defJudgment) {
          fieldMap[f.code] = wrapManualFieldValue(parsed.measured, defJudgment)
        }
        return
      }
      const measured = f.defaultValue !== '' && f.defaultValue != null ? f.defaultValue : ''
      fieldMap[f.code] = wrapManualFieldValue(measured, defJudgment)
      return
    }
    if (fieldMap[f.code] !== undefined && fieldMap[f.code] !== null && fieldMap[f.code] !== '') {
      return
    }
    if (f.code === 'QC_INSPECT_METHOD') {
      fieldMap[f.code] = line.inspectMethod || f.defaultValue || '抽检'
      return
    }
    if (f.code === 'QC_INSPECT_QTY') {
      const raw = line.inspectQty ?? line.receiptQty ?? f.defaultValue ?? 0
      fieldMap[f.code] = Number(raw)
      return
    }
    if (isQcConclusionField(f)) {
      if (line.lineQcResult === '质检通过') fieldMap[f.code] = '合格'
      else if (line.lineQcResult === '质检不通过') fieldMap[f.code] = '不合格'
      else fieldMap[f.code] = f.defaultValue || undefined
      return
    }
    fieldMap[f.code] = f.defaultValue !== '' ? f.defaultValue : undefined
  })

  return {
    ...line,
    templateFields: fields.map((f) => ({
      ...f,
      options: f.options ? [...f.options] : [],
      optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
      children: Array.isArray(f.children) ? f.children.map((c) => ({ ...c })) : [],
      matrixColumns: Array.isArray(f.matrixColumns) ? f.matrixColumns.map((c) => ({ ...c })) : [],
      matrixRows: Array.isArray(f.matrixRows) ? f.matrixRows.map((r) => ({ ...r })) : [],
    })),
    inspectMethod: fieldMap.QC_INSPECT_METHOD || line.inspectMethod || '抽检',
    inspectQty: Number(fieldMap.QC_INSPECT_QTY ?? line.inspectQty ?? line.receiptQty ?? 0),
    treatmentPlan: line.treatmentPlan || undefined,
    fieldMap,
  }
}

function conclusionCode(line) {
  const fields = resolveLineFields(line, task.value)
  return findQcConclusionField(fields)?.code || QC_CONCLUSION_FIELD_CODE
}

/** 表格外展开的专属检验项（排除方式/数量/结论） */
function extraFields(line) {
  return resolveLineFields(line, task.value)
    .filter(
      (f) =>
        f.code !== 'QC_INSPECT_METHOD' && f.code !== 'QC_INSPECT_QTY' && !isQcConclusionField(f),
    )
    .map((f) => enrichInspectField(f))
}

/** 补齐单位/合格标准：优先用行内冻结模板，缺省时回落检验项库 */
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

function methodOptsFor(line) {
  const fields = resolveLineFields(line, task.value)
  const methodField = fields.find((f) => f.code === 'QC_INSPECT_METHOD')
  const opts = methodField?.options?.length ? methodField.options : ['抽检', '全检']
  return opts.map((v) => ({ label: v, value: v }))
}

function conclusionOptsFor(line) {
  const fields = resolveLineFields(line, task.value)
  const conclusion = findQcConclusionField(fields)
  const items = normalizeConclusionOptionItems(conclusion || {})
  return items.map((o) => ({ label: o.value, value: o.value }))
}

function isSelectLike(field) {
  if (isQcConclusionField(field)) return true
  if (field.type === 'radio' || field.type === 'select') return true
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

function getMeasuredValue(line, field) {
  if (isManualJudgeField(field)) {
    return parseManualFieldValue(line.fieldMap?.[field.code]).measured
  }
  return line.fieldMap?.[field.code]
}

function setMeasuredValue(line, field, v) {
  if (isManualJudgeField(field)) {
    const prev = parseManualFieldValue(line.fieldMap?.[field.code])
    line.fieldMap[field.code] = wrapManualFieldValue(v, prev.judgment)
  } else {
    line.fieldMap[field.code] = v
  }
  onFieldChange(line, field)
}

function getManualJudgment(line, field) {
  return parseManualFieldValue(line.fieldMap?.[field.code]).judgment || undefined
}

function setManualJudgment(line, field, v) {
  const prev = parseManualFieldValue(line.fieldMap?.[field.code])
  line.fieldMap[field.code] = wrapManualFieldValue(prev.measured, v)
  onFieldChange(line, field)
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

function judgeHint(line, field) {
  if (isComplexField(field)) {
    return evaluateComplexOrSimpleField(field, line?.fieldMap?.[field.code])
  }
  return evaluateFieldAgainstStandard(field, line?.fieldMap?.[field.code])
}

function getConclusionValue(line) {
  return line.fieldMap?.[conclusionCode(line)]
}

function needTreatment(conclusion) {
  return conclusion === QC_CONCLUSION_FAIL_OPTION || conclusion === QC_CONCLUSION_CONCESSION_OPTION
}

function qtyFormatter(value) {
  if (value === '' || value == null) return ''
  return formatQty(value, 4)
}

function qtyParser(value) {
  const s = String(value ?? '').replace(/[^\d.-]/g, '')
  if (s === '' || s === '-' || s === '.') return ''
  const n = Number(s)
  return Number.isFinite(n) ? n : ''
}

function onInspectQtyChange(line, v) {
  line.fieldMap.QC_INSPECT_QTY = v
  line.inspectQty = v
}

function onMethodChange(line) {
  line.inspectMethod = line.fieldMap.QC_INSPECT_METHOD
}

function onConclusionChange(line) {
  if (!needTreatment(getConclusionValue(line))) {
    line.treatmentPlan = undefined
  }
}

function onFieldChange(line, field) {
  if (field.code === 'QC_INSPECT_METHOD') line.inspectMethod = line.fieldMap[field.code]
  if (field.code === 'QC_INSPECT_QTY') line.inspectQty = line.fieldMap[field.code]
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const val = record[key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function statusColor(status) {
  if (status === QC_TASK_STATUS.COMPLETED) return 'success'
  if (status === QC_TASK_STATUS.IN_PROGRESS) return 'processing'
  if (status === QC_TASK_STATUS.CANCELLED) return 'default'
  return 'warning'
}

function buildFieldValues(line) {
  const fields = resolveLineFields(line, task.value)
  return fields
    .map((f) => ({
      fieldCode: f.code,
      fieldName: f.name,
      value: line.fieldMap?.[f.code],
    }))
    .filter((v) => {
      if (v.value === undefined || v.value === null) return false
      if (typeof v.value === 'object') return true
      return String(v.value).trim() !== ''
    })
}

function handleCancel() {
  const path = route.path
  closeTab(path)
  router.push({ name: 'quality-incoming-qc-detail', params: { id: route.params.id } })
}

async function handleOk() {
  if (!task.value?.id) {
    message.warning('未找到质检单')
    return
  }
  if (!form.lineItems.length) {
    message.warning('质检明细为空')
    return
  }

  for (const line of form.lineItems) {
    const fields = resolveLineFields(line, task.value)
    if (!fields.length) {
      message.warning(`「${line.itemName || line.itemCode}」未绑定质检模板`)
      return
    }
    for (const field of fields) {
      if (field.required === false && !isManualJudgeField(field)) continue
      const val = line.fieldMap?.[field.code]
      if (isComplexField(field)) {
        if (field.required === false) continue
        if (isComplexValueEmpty(field, val)) {
          message.warning(
            `请填写「${line.itemName || line.itemCode}」的${field.name || field.code}`,
          )
          return
        }
        continue
      }
      if (isManualJudgeField(field)) {
        const { measured } = parseManualFieldValue(val)
        if (
          field.required !== false &&
          (measured === undefined || measured === null || String(measured).trim() === '')
        ) {
          message.warning(
            `请填写「${line.itemName || line.itemCode}」的${field.name || field.code}`,
          )
          return
        }
        if (isManualJudgmentMissing(val)) {
          message.warning(
            `请为「${line.itemName || line.itemCode}」的${field.name || field.code}选择本项结论`,
          )
          return
        }
        continue
      }
      if (field.required === false) continue
      if (val === undefined || val === null || String(val).trim() === '') {
        message.warning(`请填写「${line.itemName || line.itemCode}」的${field.name || field.code}`)
        return
      }
    }
    const conclusion = getConclusionValue(line)
    if (needTreatment(conclusion) && !String(line.treatmentPlan || '').trim()) {
      message.warning(`请为「${line.itemName || line.itemCode}」选择处理方案`)
      return
    }

    const sheetRule = resolveLineSheetPassRule(line, task.value)
    const check = validateLineSheetPassRule(line, fields, sheetRule)
    if (!check.ok) {
      message.warning(check.message || '未满足模板整单合格规则')
      return
    }
  }

  const failHints = collectAllFailingStandardHints(form.lineItems, (line) => extraFields(line))
  if (failHints.length) {
    const hasHardRule = form.lineItems.some((line) => {
      const rule = resolveLineSheetPassRule(line, task.value)
      return rule !== QC_TEMPLATE_SHEET_PASS_RULE.MANUAL
    })
    // 强制规则已在上方拦截「通过」；此处仅对「仍人工判定」做软提示
    if (!hasHardRule) {
      const preview = failHints.slice(0, 5).join('；')
      const more = failHints.length > 5 ? `等共 ${failHints.length} 项` : ''
      Modal.confirm({
        title: '存在未达标检验项',
        content: `以下检验项未达标准：${preview}${more}。模板规则为「${sheetPassRuleLabel(QC_TEMPLATE_SHEET_PASS_RULE.MANUAL)}」，整单结论仍以「质检结果」为准，是否继续提交？`,
        okText: '继续提交',
        cancelText: '返回修改',
        onOk: () => doSubmit(),
      })
      return
    }
  }

  await doSubmit()
}

async function doSubmit() {
  saving.value = true
  try {
    const lineItems = form.lineItems.map((line) => ({
      ...line,
      inspectMethod: line.fieldMap?.QC_INSPECT_METHOD || line.inspectMethod,
      inspectQty: line.fieldMap?.QC_INSPECT_QTY ?? line.inspectQty,
      fieldValues: buildFieldValues(line),
      treatmentPlan: line.treatmentPlan || '',
      sheetPassRule: resolveLineSheetPassRule(line, task.value),
      fieldMap: undefined,
    }))
    const res = submitQcTaskInspection(task.value.id, {
      lineItems,
      inspector: form.inspector || 'admin1',
      entryChannel: 'web',
      remark: form.remark,
    })
    if (!res.ok) {
      message.warning(res.message || '提交失败')
      return
    }
    message.success(`质检完成：${res.qcResult}`)
    const path = route.path
    closeTab(path)
    router.push({ name: 'quality-incoming-qc-detail', params: { id: task.value.id } })
  } catch (err) {
    console.error(err)
    message.error(err?.message || '提交失败')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.qc-inspect-page {
  margin: -12px;
  padding: 12px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.page-sub {
  color: #8c8c8c;
}

.channel-tip {
  margin-bottom: 12px;
}

.section-card {
  margin-bottom: 12px;
  padding: 12px 16px 16px;
  background: #fff;
  border-radius: 6px;
}

.section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.header-form {
  :deep(.remark-item) {
    width: 100%;

    .ant-form-item-control {
      flex: 1;
      max-width: none;
    }

    .ant-form-item-control-input,
    .ant-form-item-control-input-content {
      width: 100%;
    }

    textarea {
      width: 100%;
    }
  }
}

.expand-form-wrap {
  padding: 10px 12px;
  background: #f7f8fa;
}

.inspect-fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
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

.inspect-field-title .req {
  margin-right: 2px;
  color: #ff4d4f;
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
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.judge-tag {
  margin: 0;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
