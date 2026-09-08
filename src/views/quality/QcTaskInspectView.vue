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
          message="各物料按建单时冻结的质检模板分别录入。展开行按「基本信息 / 检验项目 / 整单结论」填写；「全部达标 / 关键项达标」由系统自动给出结论，「人工判定」才需手选。"
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
                <a-form-item label="质检人">
                  <a-input v-model:value="form.inspector" size="small" placeholder="请输入质检人" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
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
            :scroll="{ x: 960 }"
            v-model:expandedRowKeys="expandedKeys"
          >
            <template #expandIcon="{ expanded, onExpand: onExp, record }">
              <a-button type="link" size="small" @click="(e) => onExp(record, e)">
                {{ expanded ? '收起' : '展开' }}
              </a-button>
            </template>

            <template #expandedRowRender="{ record }">
              <div class="line-sheet-wrap">
                <div class="line-sheet-meta">
                  <span>模板：{{ record.templateName || record.templateCode || '—' }}</span>
                  <span
                    >整单规则：{{
                      sheetPassRuleLabel(resolveLineSheetPassRule(record, task))
                    }}</span
                  >
                </div>

                <!-- 行内基本信息：方式 / 数量 / 备注 -->
                <div v-if="headerFields(record).length" class="line-sheet-section">
                  <div class="line-sheet-title">基本信息</div>
                  <div class="line-header-grid">
                    <div
                      v-for="field in headerFields(record)"
                      :key="field.code"
                      class="line-header-item"
                    >
                      <label class="line-field-label">
                        <span v-if="field.required !== false" class="req">*</span>
                        {{ field.name }}
                      </label>
                      <a-select
                        v-if="isQcInspectMethodField(field) || isSelectLike(field)"
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        allow-clear
                        style="width: 100%"
                        :placeholder="field.placeholder || `请选择${field.name}`"
                        :options="
                          isQcInspectMethodField(field)
                            ? methodOptsFor(record)
                            : fieldOptions(field)
                        "
                        @change="() => onFieldChange(record, field)"
                      />
                      <a-input-number
                        v-else-if="field.type === 'number' || isQcInspectQtyField(field)"
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        :min="0"
                        style="width: 100%"
                        :formatter="qtyFormatter"
                        :parser="qtyParser"
                        :placeholder="field.placeholder || `请输入${field.name}`"
                        @change="() => onFieldChange(record, field)"
                      />
                      <a-input
                        v-else-if="field.type === 'textarea'"
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        allow-clear
                        style="width: 100%"
                        :placeholder="field.placeholder || `请输入${field.name}`"
                        @change="() => onFieldChange(record, field)"
                      />
                      <a-input
                        v-else
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        allow-clear
                        style="width: 100%"
                        :placeholder="field.placeholder || `请输入${field.name}`"
                        @change="() => onFieldChange(record, field)"
                      />
                    </div>
                  </div>
                </div>

                <!-- 检验项目 -->
                <div class="line-sheet-section">
                  <div class="line-sheet-title">检验项目</div>
                  <div v-if="inspectFields(record).length" class="inspect-fields-grid">
                    <template v-for="field in inspectFields(record)" :key="field.code">
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
                            合格
                          </a-tag>
                          <a-tag
                            v-else-if="judgeHint(record, field) === 'fail'"
                            color="error"
                            class="judge-tag"
                          >
                            不合格
                          </a-tag>
                          <span v-else class="judge-placeholder">待判定</span>
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
                            size="middle"
                            allow-clear
                            :placeholder="field.placeholder || `请选择${field.name}`"
                            :options="fieldOptions(field)"
                            style="flex: 1; min-width: 0"
                            @update:value="(v) => setMeasuredValue(record, field, v)"
                          />
                          <a-input-number
                            v-else-if="field.type === 'number'"
                            :value="getMeasuredValue(record, field)"
                            size="middle"
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
                            size="middle"
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
                            size="middle"
                            allow-clear
                            placeholder="请选择本项结论"
                            :options="listManualJudgmentSelectOptions(field)"
                            style="flex: 1; min-width: 0"
                            @update:value="(v) => setManualJudgment(record, field, v)"
                          />
                        </div>
                      </div>
                    </template>
                  </div>
                  <div v-else class="muted">该模板未配置检验项目</div>
                </div>

                <!-- 整单结论 -->
                <div class="line-sheet-section">
                  <div class="line-sheet-title">整单结论</div>
                  <div class="line-conclusion-hint">{{ conclusionHintFor(record) }}</div>
                  <div class="line-conclusion-row">
                    <div class="line-conclusion-item">
                      <label class="line-field-label">
                        <span v-if="!isAutoConclusionLine(record)" class="req">*</span>整单结论
                      </label>
                      <!-- 全部达标 / 关键项：系统自动给出，只读 -->
                      <div
                        v-if="isAutoConclusionLine(record)"
                        class="auto-conclusion-box"
                        :class="{
                          'is-pass': autoConclusionStatus(record) === 'pass',
                          'is-fail': autoConclusionStatus(record) === 'fail',
                          'is-pending':
                            autoConclusionStatus(record) === 'pending' ||
                            autoConclusionStatus(record) === 'unavailable',
                        }"
                      >
                        <a-tag v-if="autoConclusionStatus(record) === 'pass'" color="success">{{
                          getConclusionValue(record) || '合格'
                        }}</a-tag>
                        <a-tag v-else-if="autoConclusionStatus(record) === 'fail'" color="error">{{
                          getConclusionValue(record) || '不合格'
                        }}</a-tag>
                        <a-tag v-else color="default">待判定</a-tag>
                        <span class="auto-conclusion-text">{{
                          autoConclusionReason(record) || '系统自动判定'
                        }}</span>
                      </div>
                      <a-select
                        v-else
                        v-model:value="record.fieldMap[conclusionCode(record)]"
                        size="middle"
                        placeholder="请选择整单结论"
                        style="width: 100%; max-width: 320px"
                        :options="conclusionOptsFor(record)"
                        @change="onConclusionChange(record)"
                      />
                    </div>
                    <!-- 处理方案为来料质检固定字段，仅在列表编辑；模板若单独配置了同名字段则在检验项目中展示 -->
                  </div>
                </div>
              </div>
            </template>

            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'receiptQty'">
                {{ formatQty(record.receiptQty) }}
              </template>
              <template v-else-if="column.key === 'treatmentPlan'">
                <a-select
                  v-model:value="record.treatmentPlan"
                  size="small"
                  allow-clear
                  placeholder="请选择"
                  style="width: 100%"
                  :options="planOpts"
                  :disabled="!needTreatmentForLine(record)"
                />
              </template>
              <template v-else-if="column.key === 'sheetRule'">
                {{ sheetPassRuleLabel(resolveLineSheetPassRule(record, task)) }}
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
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  QC_CONCLUSION_CONCESSION_OPTION,
  QC_CONCLUSION_FIELD_CODE,
  findQcConclusionField,
  isQcConclusionField,
  isQcInspectMethodField,
  isQcInspectQtyField,
  isQcInspectRemarkField,
  mapConclusionValueToQcResult,
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
  isMatrixField,
  normalizeComplexValue,
} from '@/utils/qcComplexField'
import {
  QC_TEMPLATE_SHEET_PASS_RULE,
  isAutoSheetConclusionRule,
  normalizeSheetPassRule,
  resolveAutoSheetConclusion,
  sheetPassRuleLabel,
  validateLineSheetPassRule,
} from '@/utils/qcTemplateSheetPass'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
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
  { title: '产品名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '产品编号', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '质检模板', dataIndex: 'templateName', width: 160, ellipsis: true },
  { title: '整单规则', key: 'sheetRule', width: 120, ellipsis: true },
  { title: '收货数量', key: 'receiptQty', width: 90, align: 'right' },
  { title: '处理方案', key: 'treatmentPlan', width: 120 },
]

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
  // 默认全部展开，便于按模板分区录入
  expandedKeys.value = form.lineItems.map((l) => l.id)

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
  if (hasComplex) {
    return cloneTemplateFieldsSnapshot(
      frozen,
      line.sheetConclusionOptionItems || t?.sheetConclusionOptionItems,
    )
  }
  const live = getQcTemplateByCode(line.templateCode || t?.templateCode)
  if (live?.fields?.length) {
    return cloneTemplateFieldsSnapshot(live.fields, live.sheetConclusionOptionItems)
  }
  return cloneTemplateFieldsSnapshot(
    frozen,
    line.sheetConclusionOptionItems || t?.sheetConclusionOptionItems,
  )
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
      const rule = normalizeSheetPassRule(
        line.sheetPassRule ||
          getQcTemplateByCode(line.templateCode || t?.templateCode)?.sheetPassRule,
      )
      // 自动结论规则：不预填默认「合格」，由 syncAutoConclusion 按实测回写
      if (isAutoSheetConclusionRule(rule)) {
        fieldMap[f.code] = fieldMap[f.code] || undefined
        return
      }
      const items = resolveConclusionOptionItems(line, t, fields)
      const def =
        items.find((o) => o.isDefault)?.value || f.defaultValue || items[0]?.value || undefined
      if (line.lineQcResult === '质检通过') {
        fieldMap[f.code] = items.find((o) => o.result === QC_TASK_RESULT.PASS)?.value || def
      } else if (line.lineQcResult === '质检不通过') {
        fieldMap[f.code] = items.find((o) => o.result === QC_TASK_RESULT.FAIL)?.value || def
      } else {
        fieldMap[f.code] = fieldMap[f.code] || def
      }
      return
    }
    fieldMap[f.code] = f.defaultValue !== '' ? f.defaultValue : undefined
  })

  const draft = {
    ...line,
    sheetPassRule: normalizeSheetPassRule(
      line.sheetPassRule ||
        getQcTemplateByCode(line.templateCode || t?.templateCode)?.sheetPassRule,
    ),
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
  syncAutoConclusion(draft)
  return draft
}

function conclusionCode(line) {
  const fields = resolveLineFields(line, task.value)
  return findQcConclusionField(fields)?.code || QC_CONCLUSION_FIELD_CODE
}

function resolveConclusionOptionItems(line, t = task.value, fields = null) {
  const list = fields || resolveLineFields(line, t)
  const conclusion = findQcConclusionField(list)
  const sheetItems =
    line?.sheetConclusionOptionItems ||
    getQcTemplateByCode(line?.templateCode || t?.templateCode)?.sheetConclusionOptionItems
  if (Array.isArray(sheetItems) && sheetItems.length) {
    return normalizeConclusionOptionItems({ optionItems: sheetItems })
  }
  return normalizeConclusionOptionItems(conclusion || {})
}

/** 行内基本信息：质检方式 / 数量 / 检验备注（多点指标本期不上线，一并排除） */
function headerFields(line) {
  return resolveLineFields(line, task.value)
    .filter(
      (f) =>
        !isMatrixField(f) &&
        (isQcInspectMethodField(f) || isQcInspectQtyField(f) || isQcInspectRemarkField(f)),
    )
    .map((f) => enrichInspectField(f))
}

/** 检验项目（排除方式/数量/备注/整单结论/多点指标） */
function inspectFields(line) {
  return resolveLineFields(line, task.value)
    .filter(
      (f) =>
        !isMatrixField(f) &&
        !isQcInspectMethodField(f) &&
        !isQcInspectQtyField(f) &&
        !isQcInspectRemarkField(f) &&
        !isQcConclusionField(f) &&
        // 处理方案为来料质检列表固定字段，不在模板展开区重复展示
        !isTreatmentPlanField(f),
    )
    .map((f) => enrichInspectField(f))
}

/** 模板内若配置了「处理方案」字段则识别（展开区不重复，只走列表固定列） */
function isTreatmentPlanField(field = {}) {
  const code = String(field.code || '')
    .trim()
    .toUpperCase()
  if (code === 'QC_TREATMENT_PLAN' || code === 'TREATMENT_PLAN') return true
  return String(field.name || '').trim() === '处理方案'
}

/** @deprecated 兼容旧调用，等同 inspectFields */
function extraFields(line) {
  return inspectFields(line)
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
  const methodField = fields.find((f) => isQcInspectMethodField(f))
  const opts = methodField?.options?.length ? methodField.options : ['抽检', '全检']
  return opts.map((v) => ({ label: v, value: v }))
}

function conclusionOptsFor(line) {
  return resolveConclusionOptionItems(line).map((o) => ({ label: o.value, value: o.value }))
}

function isAutoConclusionLine(line) {
  return isAutoSheetConclusionRule(resolveLineSheetPassRule(line, task.value))
}

function resolveLineAutoConclusion(line) {
  const fields = resolveLineFields(line, task.value)
  const rule = resolveLineSheetPassRule(line, task.value)
  return resolveAutoSheetConclusion(
    line,
    fields,
    rule,
    resolveConclusionOptionItems(line, task.value, fields),
  )
}

function autoConclusionStatus(line) {
  return resolveLineAutoConclusion(line).status
}

function autoConclusionReason(line) {
  return resolveLineAutoConclusion(line).reason
}

/** 将自动结论写回 fieldMap（提交与展示一致） */
function syncAutoConclusion(line) {
  if (!line?.fieldMap) return
  if (!isAutoConclusionLine(line)) return
  const code = conclusionCode(line)
  const resolved = resolveLineAutoConclusion(line)
  line.fieldMap[code] = resolved.value || undefined
  if (!needTreatmentForLine(line)) {
    line.treatmentPlan = undefined
  }
}

function conclusionHintFor(line) {
  const rule = resolveLineSheetPassRule(line, task.value)
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.MANUAL) {
    return '整单规则为「人工判定」：请从模板配置的结论选项中选择（可含特采等）；检验项未达标仅提示，不强制拦截。'
  }
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS) {
    return `整单规则为「${sheetPassRuleLabel(rule)}」：无需手选，系统根据检验项达标情况自动给出合格/不合格。`
  }
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS) {
    return `整单规则为「${sheetPassRuleLabel(rule)}」：无需手选，系统根据关键项达标情况自动给出合格/不合格。`
  }
  return ''
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

/** 不合格（映射不通过）或让步类结论需填处理方案 */
function needTreatmentForLine(line) {
  const raw = String(getConclusionValue(line) || '').trim()
  if (!raw) return false
  const items = resolveConclusionOptionItems(line)
  const mapped = mapConclusionValueToQcResult(raw, { optionItems: items })
  if (mapped === QC_TASK_RESULT.FAIL) return true
  if (raw === QC_CONCLUSION_CONCESSION_OPTION || raw.includes('让步')) return true
  return false
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

function onConclusionChange(line) {
  if (!needTreatmentForLine(line)) {
    line.treatmentPlan = undefined
  }
}

function onFieldChange(line, field) {
  if (isQcInspectMethodField(field) || field.code === 'QC_INSPECT_METHOD') {
    line.inspectMethod = line.fieldMap[field.code]
  }
  if (isQcInspectQtyField(field) || field.code === 'QC_INSPECT_QTY') {
    line.inspectQty = line.fieldMap[field.code]
  }
  syncAutoConclusion(line)
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
      // 多点指标本期不做，跳过必填校验
      if (isMatrixField(field)) continue
      if (isTreatmentPlanField(field)) continue
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
    const sheetRule = resolveLineSheetPassRule(line, task.value)
    if (isAutoSheetConclusionRule(sheetRule)) {
      syncAutoConclusion(line)
      const auto = resolveLineAutoConclusion(line)
      if (auto.status === 'unavailable') {
        message.warning(`「${line.itemName || line.itemCode}」：${auto.reason}`)
        return
      }
      if (auto.status === 'pending' || !getConclusionValue(line)) {
        message.warning(
          `请先完整填写「${line.itemName || line.itemCode}」的检验项目，系统将自动给出整单结论`,
        )
        return
      }
    } else if (!conclusion) {
      message.warning(`请为「${line.itemName || line.itemCode}」选择整单结论`)
      return
    }
    if (needTreatmentForLine(line) && !String(line.treatmentPlan || '').trim()) {
      message.warning(`请为「${line.itemName || line.itemCode}」选择处理方案`)
      return
    }

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
    // 强制规则已在上方拦截「通过」；此处仅对「人工判定」做软提示
    if (!hasHardRule) {
      const preview = failHints.slice(0, 5).join('；')
      const more = failHints.length > 5 ? `等共 ${failHints.length} 项` : ''
      Modal.confirm({
        title: '存在未达标检验项',
        content: `以下检验项未达标准：${preview}${more}。模板规则为「${sheetPassRuleLabel(QC_TEMPLATE_SHEET_PASS_RULE.MANUAL)}」，整单结论仍以模板配置的结论选项为准，是否继续提交？`,
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

.line-sheet-wrap {
  padding: 12px 14px;
  background: #fafbfc;
  border-radius: 6px;
}

.line-sheet-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
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

.line-conclusion-hint {
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.line-conclusion-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}

.line-conclusion-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
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

.inspect-fields-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
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
  gap: 8px;
  width: 100%;
  max-width: 100%;
}

.manual-judgment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.manual-label {
  flex-shrink: 0;
  font-size: 13px;
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
  font-size: 13px;
  white-space: nowrap;
  min-width: 28px;
}

.judge-tag {
  margin: 0;
}

.judge-placeholder {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.25);
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
