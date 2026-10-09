<template>
  <a-modal
    :open="open"
    title="调整本单工序"
    width="96%"
    :style="{ top: '24px' }"
    :body-style="{ padding: '12px 16px', maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }"
    destroy-on-close
    ok-text="确认写入本单"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
    @update:open="(v) => emit('update:open', v)"
  >
    <a-alert
      type="info"
      show-icon
      class="hint-alert"
      message="仅影响当前工单工序快照，不会修改工艺路线主数据。"
    />
    <div class="grid-wrap">
      <ProcessRouteGridEditor
        v-model:grid="draftGrid"
        v-model:step-policies="draftPolicies"
        v-model:selected-step="selectedStep"
        v-model:selected-row="selectedRow"
      />
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import ProcessRouteGridEditor from '@/views/product-process/components/ProcessRouteGridEditor.vue'
import { applyGridToWorkOrder, buildGridFromWorkOrderProcesses } from '@/utils/workOrderProcessGrid'
import { syncWorkOrderBlankingMaterials } from '@/utils/blankingSettleMaterial'

const props = defineProps({
  open: { type: Boolean, default: false },
  workOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'applied'])

const draftGrid = ref([])
const draftPolicies = ref([])
const selectedStep = ref(-1)
const selectedRow = ref(-1)

watch(
  () => [props.open, props.workOrder?.id],
  ([isOpen]) => {
    if (!isOpen || !props.workOrder) return
    const built = buildGridFromWorkOrderProcesses(
      props.workOrder.processes,
      props.workOrder.stepPolicies,
    )
    draftGrid.value = built.grid
    draftPolicies.value = built.stepPolicies
    selectedStep.value = -1
    selectedRow.value = -1
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!props.workOrder) {
    message.warning('工单无效')
    return Promise.reject()
  }
  const result = applyGridToWorkOrder(props.workOrder, draftGrid.value, draftPolicies.value)
  if (!result.ok) {
    message.warning(result.message || '工序结构无效')
    return Promise.reject()
  }
  syncWorkOrderBlankingMaterials(props.workOrder)
  message.success('已写入本单工序')
  emit('applied')
  emit('update:open', false)
  return Promise.resolve()
}
</script>

<style lang="less" scoped>
.hint-alert {
  margin-bottom: 12px;
}

.grid-wrap {
  min-height: 420px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}
</style>
