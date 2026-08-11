<template>
  <a-modal
    :open="open"
    title="新建排产批次"
    width="820px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-alert
      type="info"
      show-icon
      class="batch-alert"
      :message="`计划数量 ${planQty} · 已排产 ${scheduledQty} · 建议剩余 ${remainQty}（允许超计划排产）`"
    />

    <a-form layout="vertical" class="batch-form">
      <a-form-item label="本批排产数量" required>
        <a-input-number v-model:value="form.qty" :min="1" :precision="0" style="width: 200px" />
      </a-form-item>
    </a-form>

    <div class="section-title">本批工序执行人（可与其他批次不同）</div>
    <a-table
      :columns="columns"
      :data-source="form.assignments"
      row-key="processId"
      size="small"
      bordered
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'executors'">
          <ExecutorTagPicker
            :executors="record.executors || []"
            :resource-type="record.resourceType || '工人'"
            @update:executors="(v) => (record.executors = v)"
          />
        </template>
        <template v-else-if="column.key === 'resourceType'">
          <a-tag :color="record.resourceType === '工人小组' ? 'blue' : 'default'">
            {{ record.resourceType || '工人' }}
          </a-tag>
        </template>
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button :disabled="!canSubmit" @click="handleSave(false)">仅保存批次</a-button>
      <a-button type="primary" :disabled="!canSubmit" @click="handleSave(true)">
        保存并下发本批
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import ExecutorTagPicker from './ExecutorTagPicker.vue'
import {
  buildBatchProcessAssignments,
  getBatchesScheduledQty,
  getRemainScheduleQty,
  getWorkOrderPlanQty,
} from '@/utils/workOrderScheduleBatch'

const props = defineProps({
  open: { type: Boolean, default: false },
  workOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'submit'])

const form = reactive({
  qty: 1,
  assignments: [],
})

const planQty = computed(() => getWorkOrderPlanQty(props.workOrder))
const scheduledQty = computed(() => getBatchesScheduledQty(props.workOrder))
const remainQty = computed(() => getRemainScheduleQty(props.workOrder))

const canSubmit = computed(() => form.qty > 0)

const columns = [
  { title: '工序', dataIndex: 'processName', width: 140 },
  { title: '工序编码', dataIndex: 'processCode', width: 100 },
  { title: '资源类型', key: 'resourceType', width: 100 },
  { title: '本批执行人', key: 'executors', width: 280 },
]

watch(
  () => props.open,
  (open) => {
    if (!open || !props.workOrder) return
    const remain = getRemainScheduleQty(props.workOrder)
    form.qty = remain > 0 ? remain : 1
    form.assignments = buildBatchProcessAssignments(props.workOrder.processes).map((a) => ({
      ...a,
      executors: [...(a.executors || [])],
    }))
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleSave(dispatchNow) {
  if (!canSubmit.value) {
    message.warning('请填写有效的本批排产数量')
    return
  }
  if (dispatchNow) {
    const missing = form.assignments.filter((a) => !a.executors?.length)
    if (missing.length) {
      message.error(`请为工序「${missing.map((a) => a.processName).join('、')}」选择本批执行人`)
      return
    }
  }
  emit('submit', {
    qty: form.qty,
    processAssignments: form.assignments.map((a) => ({
      processId: a.processId,
      processName: a.processName,
      processCode: a.processCode,
      resourceType: a.resourceType,
      executors: [...(a.executors || [])],
    })),
    dispatchNow: Boolean(dispatchNow),
  })
}
</script>

<style lang="less" scoped>
.batch-alert {
  margin-bottom: 16px;
}

.batch-form {
  margin-bottom: 8px;
}

.section-title {
  font-weight: 600;
  margin: 8px 0 10px;
  color: rgba(0, 0, 0, 0.85);
}
</style>
