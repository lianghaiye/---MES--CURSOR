<template>
  <a-modal
    :open="open"
    title="执行点检"
    :confirm-loading="saving"
    destroy-on-close
    width="720px"
    ok-text="提交"
    @ok="handleSubmit"
    @cancel="emit('update:open', false)"
  >
    <div v-if="task" class="meta">
      <div>任务号：{{ task.taskNo }}</div>
      <div>设备：{{ task.deviceCode }} {{ task.deviceName }}</div>
      <div>标准：{{ task.standardName }}</div>
      <div>计划日期：{{ task.planDate }}</div>
    </div>
    <a-form layout="vertical" class="exec-form">
      <a-form-item label="执行人">
        <a-input v-model:value="executor" placeholder="请输入执行人" />
      </a-form-item>
      <div v-for="item in items" :key="item.id" class="check-item">
        <div class="check-title">
          <span>{{ item.name }}</span>
          <a-tag v-if="item.required" color="red">必检</a-tag>
          <span class="std">标准：{{ item.standard || '—' }}</span>
        </div>
        <div class="check-body">
          <a-radio-group v-model:value="results[item.id].ok">
            <a-radio :value="true">正常</a-radio>
            <a-radio :value="false">异常</a-radio>
          </a-radio-group>
          <a-input-number
            v-if="item.checkType === '数值'"
            v-model:value="results[item.id].value"
            placeholder="实测值"
            style="width: 140px"
          />
          <a-input
            v-model:value="results[item.id].note"
            placeholder="备注"
            allow-clear
            style="flex: 1"
          />
        </div>
      </div>
      <a-form-item label="整体备注">
        <a-textarea v-model:value="remark" :rows="2" allow-clear />
      </a-form-item>
      <a-checkbox v-model:checked="createRepair">异常时自动生成维修工单</a-checkbox>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { equipmentState, executeInspectionTask } from '@/store/equipmentStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const executor = ref('')
const remark = ref('')
const createRepair = ref(true)
const results = reactive({})

const items = computed(() => {
  const std = equipmentState.standards.find((s) => s.id === props.task?.standardId)
  return std?.items || []
})

watch(
  () => [props.open, props.task],
  ([open]) => {
    if (!open || !props.task) return
    executor.value = ''
    remark.value = ''
    createRepair.value = true
    Object.keys(results).forEach((k) => delete results[k])
    items.value.forEach((item) => {
      results[item.id] = { ok: true, value: undefined, note: '' }
    })
  },
)

async function handleSubmit() {
  if (!String(executor.value || '').trim()) {
    message.warning('请填写执行人')
    return
  }
  saving.value = true
  try {
    const res = executeInspectionTask(props.task.id, {
      executor: executor.value.trim(),
      remark: remark.value,
      createRepair: createRepair.value,
      results,
    })
    if (!res.ok) {
      message.warning(res.message || '提交失败')
      return
    }
    if (res.repair) {
      message.success(`点检已提交（异常），已生成维修单 ${res.repair.orderNo}`)
    } else {
      message.success('点检已提交')
    }
    emit('update:open', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}
.check-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.check-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
}
.std {
  margin-left: auto;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
.check-body {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
