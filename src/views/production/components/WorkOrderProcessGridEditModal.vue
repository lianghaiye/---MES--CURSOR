<template>
  <a-modal
    :open="open"
    title="调整本单工序"
    width="96%"
    :style="{ top: '24px' }"
    :body-style="{ padding: '12px 16px', maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }"
    destroy-on-close
    :confirm-loading="saving"
    @cancel="handleCancel"
    @update:open="(v) => emit('update:open', v)"
  >
    <a-alert
      type="info"
      show-icon
      class="hint-alert"
      message="「保存」仅写入本单；「保存并更新主数据」会同步修改关联工艺路线。"
    />
    <div class="grid-wrap">
      <ProcessRouteGridEditor
        v-model:grid="draftGrid"
        v-model:step-policies="draftPolicies"
        v-model:selected-step="selectedStep"
        v-model:selected-row="selectedRow"
      />
    </div>
    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" ghost :loading="saving" @click="handleOk(true)">
        保存并更新主数据
      </a-button>
      <a-button type="primary" :loading="saving" @click="handleOk(false)">保存</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import ProcessRouteGridEditor from '@/views/product-process/components/ProcessRouteGridEditor.vue'
import {
  applyGridToWorkOrder,
  applyGridToWorkOrderAndMasterRoute,
  buildGridFromWorkOrderProcesses,
} from '@/utils/workOrderProcessGrid'
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
const saving = ref(false)

const routeName = computed(() => String(props.workOrder?.processRouteName || '').trim())

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

function doApply(withMaster) {
  if (!props.workOrder) {
    message.warning('工单无效')
    return Promise.reject()
  }
  saving.value = true
  try {
    const result = withMaster
      ? applyGridToWorkOrderAndMasterRoute(props.workOrder, draftGrid.value, draftPolicies.value)
      : applyGridToWorkOrder(props.workOrder, draftGrid.value, draftPolicies.value)
    if (!result.ok) {
      message.warning(result.message || '工序结构无效')
      // 本单已写入但主数据失败时仍刷新本单
      if (result.appliedWorkOrder) {
        syncWorkOrderBlankingMaterials(props.workOrder)
        emit('applied')
      }
      return Promise.reject()
    }
    syncWorkOrderBlankingMaterials(props.workOrder)
    message.success(result.message || (withMaster ? '已写入本单并更新主数据' : '已写入本单工序'))
    emit('applied')
    emit('update:open', false)
    return Promise.resolve()
  } finally {
    saving.value = false
  }
}

function handleOk(withMaster) {
  if (!withMaster) return doApply(false)

  const name = routeName.value
  if (!name) {
    message.warning('本单未关联工艺路线，无法更新主数据')
    return Promise.reject()
  }

  return new Promise((resolve, reject) => {
    Modal.confirm({
      title: '保存并更新主数据',
      content: `确认将当前工序结构写入本单，并同步更新工艺路线「${name}」？此操作会影响后续引用该路线的新工单。`,
      okText: '确认同步',
      cancelText: '取消',
      onOk: () => doApply(true).then(resolve).catch(reject),
      onCancel: () => reject(),
    })
  })
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
