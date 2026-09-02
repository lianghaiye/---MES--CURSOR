<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
    @ok="handleOk"
  >
    <a-alert type="info" show-icon :message="topAlertMessage" class="top-alert" />

    <div class="section-label">{{ isFillMode ? '填写工时参数' : '填写要批量修改的字段' }}</div>
    <a-form layout="vertical" class="fill-form">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="报工类型">
            <a-select
              v-model:value="form.reportType"
              size="small"
              :options="reportTypeFieldOpts"
              :placeholder="isFillMode ? '请选择' : '不修改'"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="计薪方式">
            <a-select
              v-model:value="form.salaryMethod"
              size="small"
              :options="salaryMethodFieldOpts"
              :placeholder="isFillMode ? '请选择' : '不修改'"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="单件标准工时（分钟）">
            <a-input-number
              v-model:value="form.standardMinutesPerPiece"
              size="small"
              :min="0"
              :precision="0"
              :placeholder="isFillMode ? '请输入' : '不修改'"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="整批准备工时（分钟）">
            <a-input-number
              v-model:value="form.setupMinutesPerBatch"
              size="small"
              :min="0"
              :precision="0"
              :placeholder="isFillMode ? '请输入' : '不修改'"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="标准工时单价（元/小时）">
            <a-input-number
              v-model:value="form.standardHourlyRate"
              size="small"
              :min="0"
              :precision="2"
              :placeholder="isFillMode ? '请输入' : '不修改'"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="单件计件单价（元/件）">
            <a-input-number
              v-model:value="form.pieceRate"
              size="small"
              :min="0"
              :precision="2"
              :placeholder="isFillMode ? '请输入' : '不修改'"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-alert v-if="!isFillMode" type="warning" show-icon :message="hintText" class="hint-alert" />

    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :disabled="!canSubmit" @click="handleOk">
        {{ confirmLabel }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { reportTypeOptions } from '@/mock/materialInfoOptions'
import { BATCH_UNCHANGED, buildBatchFillHint } from '@/utils/processLaborBatchConfig'
import {
  normalizeSalaryMethodForReportType,
  resolveSalaryMethodOptions,
} from '@/utils/laborConfigResolver'

const props = defineProps({
  open: Boolean,
  selectedCount: { type: Number, default: 0 },
  /** batch：批量填充；fill：单条填充（操作列 +） */
  mode: { type: String, default: 'batch' },
  initialRow: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const isFillMode = computed(() => props.mode === 'fill')

const modalTitle = computed(() => (isFillMode.value ? '填充工时参数' : '批量填充工时参数'))

const reportTypeFieldOpts = computed(() => {
  const items = reportTypeOptions.map((v) => ({ label: v, value: v }))
  return isFillMode.value ? items : [{ label: '不修改', value: BATCH_UNCHANGED }, ...items]
})

const salaryMethodFieldOpts = computed(() => {
  const reportType = form.reportType && form.reportType !== BATCH_UNCHANGED ? form.reportType : ''
  const methods = resolveSalaryMethodOptions(reportType)
  const items = methods.map((v) => ({ label: v, value: v }))
  return isFillMode.value ? items : [{ label: '不修改', value: BATCH_UNCHANGED }, ...items]
})

const form = reactive({
  reportType: BATCH_UNCHANGED,
  salaryMethod: BATCH_UNCHANGED,
  standardMinutesPerPiece: undefined,
  setupMinutesPerBatch: undefined,
  standardHourlyRate: undefined,
  pieceRate: undefined,
})

function resetBatchForm() {
  form.reportType = BATCH_UNCHANGED
  form.salaryMethod = BATCH_UNCHANGED
  form.standardMinutesPerPiece = undefined
  form.setupMinutesPerBatch = undefined
  form.standardHourlyRate = undefined
  form.pieceRate = undefined
}

function resetFillForm(row = {}) {
  form.reportType = row.reportType || undefined
  form.salaryMethod =
    normalizeSalaryMethodForReportType(row.reportType, row.salaryMethod) || undefined
  form.standardMinutesPerPiece =
    row.standardMinutesPerPiece != null && row.standardMinutesPerPiece !== ''
      ? Number(row.standardMinutesPerPiece)
      : undefined
  form.setupMinutesPerBatch =
    row.setupMinutesPerBatch != null && row.setupMinutesPerBatch !== ''
      ? Number(row.setupMinutesPerBatch)
      : undefined
  form.standardHourlyRate =
    row.standardHourlyRate != null && row.standardHourlyRate !== ''
      ? Number(row.standardHourlyRate)
      : undefined
  form.pieceRate = row.pieceRate != null && row.pieceRate !== '' ? Number(row.pieceRate) : undefined
}

watch(
  () => [props.open, props.mode, props.initialRow],
  () => {
    if (!props.open) return
    if (isFillMode.value) resetFillForm(props.initialRow || {})
    else resetBatchForm()
  },
)

watch(
  () => form.reportType,
  (reportType) => {
    if (!reportType || reportType === BATCH_UNCHANGED) return
    const next = normalizeSalaryMethodForReportType(reportType, form.salaryMethod)
    if (form.salaryMethod && form.salaryMethod !== BATCH_UNCHANGED && form.salaryMethod !== next) {
      form.salaryMethod = next
    } else if (isFillMode.value && !form.salaryMethod) {
      form.salaryMethod = next
    } else if (
      isFillMode.value &&
      form.salaryMethod &&
      !resolveSalaryMethodOptions(reportType).includes(form.salaryMethod)
    ) {
      form.salaryMethod = next
    }
  },
)

const topAlertMessage = computed(() => {
  if (isFillMode.value) {
    const name = props.initialRow?.name || props.initialRow?.code || '该产品'
    return `正在配置「${name}」的工时参数，保存主数据前可先在此填写`
  }
  return `已选择 ${props.selectedCount} 条产品记录 · 仅填写的字段会被覆盖，留空的字段保持原值不变`
})

const patch = computed(() => ({
  reportType: form.reportType,
  salaryMethod: form.salaryMethod,
  standardMinutesPerPiece: form.standardMinutesPerPiece,
  setupMinutesPerBatch: form.setupMinutesPerBatch,
  standardHourlyRate: form.standardHourlyRate,
  pieceRate: form.pieceRate,
}))

const hasBatchPatch = computed(() => {
  const p = patch.value
  return (
    (p.reportType && p.reportType !== BATCH_UNCHANGED) ||
    (p.salaryMethod && p.salaryMethod !== BATCH_UNCHANGED) ||
    p.standardMinutesPerPiece != null ||
    p.setupMinutesPerBatch != null ||
    p.standardHourlyRate != null ||
    p.pieceRate != null
  )
})

const hasFillPatch = computed(() => !!(form.reportType && form.salaryMethod))

const canSubmit = computed(() => (isFillMode.value ? hasFillPatch.value : hasBatchPatch.value))

const hintText = computed(() => buildBatchFillHint(patch.value, props.selectedCount))

const confirmLabel = computed(() =>
  isFillMode.value ? '确认' : `确认覆盖（${props.selectedCount}条）`,
)

function buildEmitPatch() {
  if (isFillMode.value) {
    const result = {}
    if (form.reportType) result.reportType = form.reportType
    if (form.salaryMethod) result.salaryMethod = form.salaryMethod
    if (form.standardMinutesPerPiece != null) {
      result.standardMinutesPerPiece = form.standardMinutesPerPiece
    }
    if (form.setupMinutesPerBatch != null) result.setupMinutesPerBatch = form.setupMinutesPerBatch
    if (form.standardHourlyRate != null) result.standardHourlyRate = form.standardHourlyRate
    if (form.pieceRate != null) result.pieceRate = form.pieceRate
    return result
  }

  const result = {}
  if (form.reportType && form.reportType !== BATCH_UNCHANGED) result.reportType = form.reportType
  if (form.salaryMethod && form.salaryMethod !== BATCH_UNCHANGED) {
    result.salaryMethod = form.salaryMethod
  }
  if (form.standardMinutesPerPiece != null) {
    result.standardMinutesPerPiece = form.standardMinutesPerPiece
  }
  if (form.setupMinutesPerBatch != null) result.setupMinutesPerBatch = form.setupMinutesPerBatch
  if (form.standardHourlyRate != null) result.standardHourlyRate = form.standardHourlyRate
  if (form.pieceRate != null) result.pieceRate = form.pieceRate
  return result
}

function handleOk() {
  if (!isFillMode.value && !props.selectedCount) {
    message.warning('请先在列表中勾选目标产品')
    return
  }
  if (!canSubmit.value) {
    message.warning(
      isFillMode.value ? '请至少填写报工类型与计薪方式' : '请至少填写一个需要批量修改的字段',
    )
    return
  }
  if (
    form.reportType &&
    form.reportType !== BATCH_UNCHANGED &&
    form.salaryMethod &&
    form.salaryMethod !== BATCH_UNCHANGED &&
    !resolveSalaryMethodOptions(form.reportType).includes(form.salaryMethod)
  ) {
    message.warning('时长报工仅支持计时工资')
    return
  }
  emit('confirm', buildEmitPatch())
  emit('update:open', false)
}
</script>

<style scoped>
.top-alert {
  margin-bottom: 16px;
}
.section-label {
  font-weight: 600;
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.88);
}
.hint-alert {
  margin-top: 8px;
}
</style>
