<template>
  <a-modal
    :open="open"
    title="修改排产数量"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    ok-text="确定"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="edit-schedule-form">
      <a-form-item label="计划数量">
        <a-input :value="planQty" disabled />
      </a-form-item>

      <template v-if="hasBatches">
        <a-form-item v-if="completedBatches.length" label="已完成批次（不可修改）">
          <div class="batch-chips">
            <a-tag v-for="b in completedBatches" :key="b.id" color="success">
              批次 #{{ b.batchNo }} · {{ b.qty }}
            </a-tag>
          </div>
        </a-form-item>
        <a-form-item label="选择要修改的批次" required>
          <a-select
            v-model:value="form.batchId"
            :options="editableBatchOptions"
            placeholder="请选择未完成批次"
            :disabled="editableBatches.length <= 1"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="当前批次排产数量">
          <a-input :value="currentBatchQty" disabled />
        </a-form-item>
        <a-form-item label="本批可改上限">
          <a-input :value="maxEditableQty" disabled />
        </a-form-item>
      </template>
      <template v-else>
        <a-form-item label="当前排产数量">
          <a-input :value="currentScheduleQty" disabled />
        </a-form-item>
      </template>

      <a-form-item label="修改后排产数量" required>
        <a-input-number
          v-model:value="form.qty"
          :min="1"
          :max="maxEditableQty > 0 ? maxEditableQty : undefined"
          :precision="0"
          style="width: 100%"
          placeholder="请输入排产数量"
        />
      </a-form-item>
      <div class="hint">
        {{
          hasBatches
            ? '仅可修改未完成批次；确认后将同步修改该批次对应小程序任务的目标数。'
            : '确认后将同步修改小程序端未完成任务的目标数。'
        }}
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { isScheduleBatchCompleted, listEditableScheduleBatches } from '@/utils/workOrderStatus'

const props = defineProps({
  open: { type: Boolean, default: false },
  workOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'submit'])

const form = reactive({ qty: 1, batchId: undefined })

const planQty = computed(() => Math.max(0, Number(props.workOrder?.planQty) || 0))

const batches = computed(() => props.workOrder?.scheduleBatches || [])
const hasBatches = computed(() => batches.value.length > 0)

const completedBatches = computed(() => batches.value.filter((b) => isScheduleBatchCompleted(b)))
const editableBatches = computed(() => listEditableScheduleBatches(props.workOrder))

const editableBatchOptions = computed(() =>
  editableBatches.value.map((b) => ({
    value: b.id,
    label: `批次 #${b.batchNo} · ${b.status || '待下发'} · 数量 ${b.qty}`,
  })),
)

const selectedBatch = computed(
  () => editableBatches.value.find((b) => b.id === form.batchId) || null,
)

const currentBatchQty = computed(() => Math.max(0, Number(selectedBatch.value?.qty) || 0))

const currentScheduleQty = computed(() => {
  const wo = props.workOrder
  if (batches.value.length) {
    return batches.value.reduce((s, b) => s + Math.max(0, Number(b.qty) || 0), 0)
  }
  return Math.max(0, Number(wo?.scheduleQty) || 0)
})

const maxEditableQty = computed(() => {
  const plan = planQty.value
  if (!hasBatches.value) return plan > 0 ? plan : undefined
  if (!selectedBatch.value) return 0
  const others = batches.value
    .filter((b) => b.id !== selectedBatch.value.id)
    .reduce((s, b) => s + Math.max(0, Number(b.qty) || 0), 0)
  if (plan > 0) return Math.max(0, plan - others)
  return Math.max(1, currentBatchQty.value)
})

watch(
  () => [props.open, props.workOrder],
  ([open]) => {
    if (!open || !props.workOrder) return
    const editable = listEditableScheduleBatches(props.workOrder)
    form.batchId = editable[0]?.id
    form.qty = Math.max(1, Number(editable[0]?.qty) || Number(props.workOrder.scheduleQty) || 1)
  },
)

watch(
  () => form.batchId,
  (id) => {
    if (!props.open) return
    const batch = editableBatches.value.find((b) => b.id === id)
    if (batch) form.qty = Math.max(1, Number(batch.qty) || 1)
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (hasBatches.value) {
    if (!editableBatches.value.length) {
      message.warning('所有排产批次均已完成，不可修改排产数量')
      return Promise.reject()
    }
    if (!form.batchId) {
      message.warning('请选择要修改的排产批次')
      return Promise.reject()
    }
  }
  const qty = Math.max(0, Math.floor(Number(form.qty) || 0))
  if (qty <= 0) {
    message.warning('请填写有效的排产数量')
    return Promise.reject()
  }
  if (maxEditableQty.value > 0 && qty > maxEditableQty.value) {
    message.warning(`排产数量不可超过 ${maxEditableQty.value}`)
    return Promise.reject()
  }
  emit('submit', { qty, batchId: form.batchId || '' })
  return Promise.reject()
}
</script>

<style lang="less" scoped>
.edit-schedule-form {
  .hint {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
    line-height: 1.5;
  }
  .batch-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
