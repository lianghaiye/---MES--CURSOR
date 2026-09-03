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
                <a-form layout="inline" class="horizontal-form expand-form">
                  <a-row :gutter="[12, 12]" style="width: 100%">
                    <a-col
                      v-for="field in extraFields(record)"
                      :key="field.code"
                      :span="field.type === 'textarea' ? 24 : 6"
                    >
                      <a-form-item :label="field.name" :required="field.required !== false">
                        <a-select
                          v-if="isSelectLike(field)"
                          v-model:value="record.fieldMap[field.code]"
                          size="small"
                          allow-clear
                          :placeholder="field.placeholder || `请选择${field.name}`"
                          :options="fieldOptions(field)"
                          style="width: 100%"
                          @change="onFieldChange(record, field)"
                        />
                        <a-input-number
                          v-else-if="field.type === 'number'"
                          v-model:value="record.fieldMap[field.code]"
                          size="small"
                          :min="0"
                          style="width: 100%"
                          :formatter="qtyFormatter"
                          :parser="qtyParser"
                          :placeholder="field.placeholder || `请输入${field.name}`"
                          @change="onFieldChange(record, field)"
                        />
                        <a-input
                          v-else
                          v-model:value="record.fieldMap[field.code]"
                          size="small"
                          allow-clear
                          :placeholder="field.placeholder || `请输入${field.name}`"
                          @change="onFieldChange(record, field)"
                        />
                      </a-form-item>
                    </a-col>
                  </a-row>
                </a-form>
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
import { message } from 'ant-design-vue'
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
  if (Array.isArray(line.templateFields) && line.templateFields.length) return line.templateFields
  return t?.templateFields || []
}

function hydrateLineDraft(line, t) {
  const fields = resolveLineFields(line, t)
  const fieldMap = {}
  ;(line.fieldValues || []).forEach((v) => {
    const code = v.fieldCode || v.code
    if (code) fieldMap[code] = v.value ?? v.fieldValue
  })

  fields.forEach((f) => {
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
  return resolveLineFields(line, task.value).filter(
    (f) => f.code !== 'QC_INSPECT_METHOD' && f.code !== 'QC_INSPECT_QTY' && !isQcConclusionField(f),
  )
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
    .filter((v) => v.value !== undefined && v.value !== null && String(v.value).trim() !== '')
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
      if (field.required === false) continue
      const val = line.fieldMap?.[field.code]
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
  }

  saving.value = true
  try {
    const lineItems = form.lineItems.map((line) => ({
      ...line,
      inspectMethod: line.fieldMap?.QC_INSPECT_METHOD || line.inspectMethod,
      inspectQty: line.fieldMap?.QC_INSPECT_QTY ?? line.inspectQty,
      fieldValues: buildFieldValues(line),
      treatmentPlan: line.treatmentPlan || '',
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
  padding: 8px 12px 4px;
  background: #fafafa;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
