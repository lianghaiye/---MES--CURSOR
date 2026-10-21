<template>
  <a-modal
    :open="open"
    title="返工任务报工"
    :width="480"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <a-form layout="vertical">
      <a-form-item label="任务">
        <a-input
          :value="task ? `${task.taskNo || ''} · ${task.processName || ''}` : '—'"
          disabled
        />
      </a-form-item>
      <a-form-item label="返工单">
        <a-input :value="task?.reworkNo || '—'" disabled />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="待重做数量">
            <a-input :value="targetQty" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="本次良品数" required>
            <a-input-number
              v-model:value="goodQty"
              :min="1"
              :max="targetQty || undefined"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="备注">
        <a-input v-model:value="remark" allow-clear />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleOk">提交报工</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { submitReworkProcessReportTask } from '@/store/processReportStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'done'])

const saving = ref(false)
const goodQty = ref(1)
const remark = ref('')

const targetQty = computed(() =>
  Math.max(0, Number(props.task?.targetQty ?? props.task?.scheduleQty) || 0),
)

watch(
  () => props.open,
  (val) => {
    if (!val) return
    goodQty.value = targetQty.value || 1
    remark.value = props.task?.remark || ''
  },
)

function handleOk() {
  if (!props.task?.id) return
  saving.value = true
  const res = submitReworkProcessReportTask(props.task.id, {
    goodQty: goodQty.value,
    remark: remark.value,
  })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message || '报工成功')
  emit('done', res.record)
  emit('update:open', false)
}
</script>
