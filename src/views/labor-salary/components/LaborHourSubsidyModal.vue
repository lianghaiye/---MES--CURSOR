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
      <a-form-item v-if="isPieceSalary" label="补贴报工数" required>
        <a-input-number
          v-model:value="form.subsidyReportQty"
          :min="0"
          :precision="3"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item v-else label="补贴时长" required>
        <a-input-number
          v-model:value="form.subsidyHours"
          :min="0"
          :precision="2"
          style="width: 100%"
          addon-after="小时"
        />
      </a-form-item>
      <a-form-item label="补贴原因">
        <a-textarea
          v-model:value="form.subsidyReason"
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

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  config: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const form = reactive({
  subsidyReportQty: 0,
  subsidyHours: 0,
  subsidyReason: '',
})

const modalTitle = computed(() => {
  const c = props.config
  if (!c) return '补贴'
  return `补贴-${c.reportType}+${c.salaryMethod}`
})

const isPieceSalary = computed(() => props.config?.salaryMethod === '计件工资')

const showDuration = computed(() => props.config?.salaryMethod === '计时工资')

watch(
  () => props.open,
  (val) => {
    if (!val || !props.line) return
    form.subsidyReportQty = props.line.subsidyReportQty ?? 0
    form.subsidyHours = props.line.subsidyHours ?? 0
    form.subsidyReason = props.line.subsidyReason || ''
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
</style>
