<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="560px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-descriptions bordered size="small" :column="2" class="info-desc">
      <a-descriptions-item label="任务单号">{{ line?.taskNo || '—' }}</a-descriptions-item>
      <a-descriptions-item label="执行人">{{ line?.executor || '—' }}</a-descriptions-item>
      <a-descriptions-item label="工序名称">{{ line?.processName || '—' }}</a-descriptions-item>
      <a-descriptions-item label="报工数量">{{ line?.reportQty ?? '—' }}</a-descriptions-item>
      <a-descriptions-item v-if="showDuration" label="报工时长" :span="2">
        {{ line?.reportDuration ?? 0 }} 小时
      </a-descriptions-item>
    </a-descriptions>

    <a-form layout="vertical" class="form-block">
      <a-form-item label="调整报工数量" required>
        <a-input-number
          v-model:value="form.adjustedReportQty"
          :min="0"
          :precision="3"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item v-if="showAdjustDuration" label="调整报工时长" required>
        <a-input-number
          v-model:value="form.adjustedDuration"
          :min="0"
          :precision="2"
          style="width: 100%"
          addon-after="小时"
          :disabled="durationReadonly"
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
import { calcAutoDurationHours } from '@/utils/laborHourCalc'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  config: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const form = reactive({
  adjustedReportQty: null,
  adjustedDuration: null,
  adjustReason: '',
})

const modalTitle = computed(() => {
  const c = props.config
  if (!c) return '调整'
  return `调整-${c.reportType}+${c.salaryMethod}`
})

const showDuration = computed(
  () => props.config?.reportType === '时长报工' || props.config?.salaryMethod === '计时工资',
)

const showAdjustDuration = computed(
  () => props.config?.reportType === '时长报工' && props.config?.salaryMethod === '计时工资',
)

const durationReadonly = computed(
  () => props.config?.reportType === '批量计件' && props.config?.salaryMethod === '计时工资',
)

watch(
  () => props.open,
  (val) => {
    if (!val || !props.line) return
    form.adjustedReportQty = props.line.adjustedReportQty ?? props.line.reportQty ?? 0
    form.adjustedDuration = props.line.adjustedDuration ?? props.line.reportDuration ?? 0
    form.adjustReason = props.line.adjustReason || ''
    if (durationReadonly.value) {
      form.adjustedDuration = calcAutoDurationHours(props.config, form.adjustedReportQty)
    }
  },
)

watch(
  () => form.adjustedReportQty,
  (qty) => {
    if (!durationReadonly.value || !props.config) return
    form.adjustedDuration = calcAutoDurationHours(props.config, qty)
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  emit('confirm', { ...form })
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
</style>
