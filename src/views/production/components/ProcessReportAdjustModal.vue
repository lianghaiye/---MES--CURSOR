<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="600px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-descriptions bordered size="small" :column="2" class="info-desc">
      <a-descriptions-item v-if="variant === 'task'" label="任务编号">{{
        line?.taskNo || '—'
      }}</a-descriptions-item>
      <a-descriptions-item label="执行人">{{ line?.reporter || '—' }}</a-descriptions-item>
      <a-descriptions-item label="工序名称">{{ line?.processName || '—' }}</a-descriptions-item>
      <a-descriptions-item v-if="variant === 'quick'" label="报工类型">{{
        line?.reportType || '—'
      }}</a-descriptions-item>
      <a-descriptions-item label="报工良品数">{{ line?.goodQty ?? '—' }}</a-descriptions-item>
      <a-descriptions-item label="报工不良品数">{{ line?.defectQty ?? '—' }}</a-descriptions-item>
      <a-descriptions-item v-if="line?.defectReason && line.defectReason !== '—'" label="报工不良原因">
        {{ line.defectReason }}
      </a-descriptions-item>
      <a-descriptions-item v-if="showDuration" label="报工时长">
        {{ displayReportDuration }} 小时
      </a-descriptions-item>
    </a-descriptions>

    <a-form layout="vertical" class="form-block">
      <a-form-item label="调整良品数" required>
        <a-input-number
          v-model:value="form.adjustedGoodQty"
          :min="0"
          :precision="0"
          style="width: 100%"
          addon-after="件"
        />
      </a-form-item>
      <a-form-item label="调整不良品数" required>
        <a-input-number
          v-model:value="form.adjustedDefectQty"
          :min="0"
          :precision="0"
          style="width: 100%"
          addon-after="件"
        />
      </a-form-item>
      <a-form-item
        v-if="form.adjustedDefectQty > 0 && defectItems.length"
        label="调整不良原因"
        required
      >
        <DefectBreakdownField
          v-model="form.adjustedDefectBreakdown"
          :defect-qty="form.adjustedDefectQty"
          :items="defectItems"
        />
      </a-form-item>
      <a-form-item v-if="showAdjustDuration" label="调整报工时长" :required="!isBatchPieceHourly">
        <div v-if="isBatchPieceHourly" class="readonly-duration">
          {{ displayAdjustedDuration }} 小时
        </div>
        <a-input-number
          v-else
          v-model:value="form.adjustedWorkHours"
          :min="0"
          :precision="2"
          style="width: 100%"
          addon-after="小时"
        />
      </a-form-item>
      <a-form-item label="调整原因">
        <a-textarea
          v-model:value="form.adjustReason"
          :rows="3"
          :maxlength="100"
          show-count
          placeholder="请输入"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { calcAutoDurationHours } from '@/utils/laborHourCalc'
import {
  ensureDefectBreakdown,
  resolveProcessDefectItems,
  syncDefectBreakdownOnQtyChange,
  validateDefectBreakdown,
} from '@/utils/defectBreakdown'
import DefectBreakdownField from './DefectBreakdownField.vue'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  config: { type: Object, default: null },
  /** task=任务报工详情；quick=快速报工详情（仅记录调整结果） */
  variant: { type: String, default: 'task' },
})

const emit = defineEmits(['update:open', 'confirm'])

const form = reactive({
  adjustedGoodQty: null,
  adjustedDefectQty: null,
  adjustedWorkHours: null,
  adjustedDefectBreakdown: [],
  adjustReason: '',
})

const modalTitle = computed(() => {
  const c = props.config
  if (!c) return '调整'
  return `调整-${c.reportType}+${c.salaryMethod}`
})

const defectItems = computed(() => {
  if (!props.line?.processName) return []
  return resolveProcessDefectItems(props.line.processName, form.adjustedDefectBreakdown)
})

const showDuration = computed(
  () => props.config?.reportType === '时长报工' || props.config?.salaryMethod === '计时工资',
)

const isBatchPieceHourly = computed(
  () => props.config?.reportType === '批量计件' && props.config?.salaryMethod === '计时工资',
)

const showAdjustDuration = computed(
  () =>
    (props.config?.reportType === '时长报工' && props.config?.salaryMethod === '计时工资') ||
    isBatchPieceHourly.value,
)

const displayReportDuration = computed(() => {
  if (isBatchPieceHourly.value && props.config) {
    return calcAutoDurationHours(props.config, props.line?.goodQty ?? 0)
  }
  return props.line?.workHours ?? 0
})

const displayAdjustedDuration = computed(() => {
  if (isBatchPieceHourly.value && props.config) {
    return calcAutoDurationHours(props.config, form.adjustedGoodQty ?? 0)
  }
  return form.adjustedWorkHours ?? 0
})

function initBreakdown(line) {
  const source = line.adjustedDefectBreakdown?.length
    ? line.adjustedDefectBreakdown
    : line.defectBreakdown
  const qty = line.adjustedDefectQty ?? line.defectQty ?? 0
  const items = resolveProcessDefectItems(line.processName, source || [])
  const base = ensureDefectBreakdown({ defectQty: qty, defectBreakdown: source }, items)
  return syncDefectBreakdownOnQtyChange({ defectQty: qty, defectBreakdown: base }, items)
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.line) return
    form.adjustedGoodQty = props.line.adjustedGoodQty ?? props.line.goodQty ?? 0
    form.adjustedDefectQty = props.line.adjustedDefectQty ?? props.line.defectQty ?? 0
    form.adjustedWorkHours = props.line.adjustedWorkHours ?? props.line.workHours ?? 0
    form.adjustReason = props.line.adjustReason || ''
    form.adjustedDefectBreakdown = initBreakdown(props.line)
    if (isBatchPieceHourly.value) {
      form.adjustedWorkHours = calcAutoDurationHours(props.config, form.adjustedGoodQty)
    }
  },
)

watch(
  () => form.adjustedGoodQty,
  (qty) => {
    if (!isBatchPieceHourly.value || !props.config) return
    form.adjustedWorkHours = calcAutoDurationHours(props.config, qty)
  },
)

watch(
  () => form.adjustedDefectQty,
  (qty) => {
    if (qty <= 0) {
      form.adjustedDefectBreakdown = []
      return
    }
    form.adjustedDefectBreakdown = syncDefectBreakdownOnQtyChange(
      { defectQty: qty, defectBreakdown: form.adjustedDefectBreakdown },
      defectItems.value,
    )
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  const defectQty = Number(form.adjustedDefectQty) || 0
  if (defectQty > 0 && defectItems.value.length) {
    const err = validateDefectBreakdown(
      defectQty,
      form.adjustedDefectBreakdown,
      defectItems.value,
    )
    if (err) {
      message.warning(err)
      return
    }
  }

  emit('confirm', {
    adjustedGoodQty: form.adjustedGoodQty,
    adjustedDefectQty: form.adjustedDefectQty,
    adjustedWorkHours: form.adjustedWorkHours,
    adjustedDefectBreakdown: defectQty > 0 ? [...form.adjustedDefectBreakdown] : [],
    adjustReason: form.adjustReason,
  })
  emit('update:open', false)
}
</script>

<style scoped>
.info-desc {
  margin-bottom: 16px;
}

.form-block {
  margin-top: 8px;
}

.readonly-duration {
  line-height: 32px;
  color: rgba(0, 0, 0, 0.88);
}
</style>
