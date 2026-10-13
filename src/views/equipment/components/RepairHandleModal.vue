<template>
  <a-modal
    :open="open"
    :title="title"
    :confirm-loading="saving"
    destroy-on-close
    width="640px"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <template v-if="order">
      <div class="meta">
        <div>{{ order.orderNo }} · {{ order.deviceCode }} {{ order.deviceName }}</div>
        <div>来源：{{ order.source }} · 状态：{{ order.status }}</div>
        <div>故障：{{ order.faultDesc }}</div>
      </div>

      <a-form layout="vertical">
        <template v-if="mode === 'dispatch'">
          <a-form-item label="维修人" required>
            <a-input v-model:value="handler" placeholder="请输入维修人" />
          </a-form-item>
        </template>
        <template v-else-if="mode === 'finish'">
          <a-form-item label="处理结果" required>
            <a-textarea v-model:value="result" :rows="3" placeholder="更换部件/调整参数等" />
          </a-form-item>
          <a-form-item label="备件消耗">
            <a-input v-model:value="spareParts" placeholder="如：轴承 1 套" />
          </a-form-item>
          <a-form-item label="备注">
            <a-input v-model:value="remark" />
          </a-form-item>
        </template>
        <template v-else>
          <p>确认验收通过并关闭工单？设备状态将恢复为「在用」。</p>
        </template>
      </a-form>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { acceptRepairOrder, dispatchRepairOrder, finishRepairOrder } from '@/store/equipmentStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
  mode: { type: String, default: 'dispatch' }, // dispatch | finish | accept
})
const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const handler = ref('')
const result = ref('')
const spareParts = ref('')
const remark = ref('')

const title = computed(() => {
  if (props.mode === 'dispatch') return '派工'
  if (props.mode === 'finish') return '完工填报'
  return '验收关闭'
})

watch(
  () => [props.open, props.order, props.mode],
  ([open]) => {
    if (!open) return
    handler.value = props.order?.handler || ''
    result.value = props.order?.result || ''
    spareParts.value = props.order?.spareParts || ''
    remark.value = props.order?.remark || ''
  },
)

async function handleOk() {
  saving.value = true
  try {
    let res
    if (props.mode === 'dispatch') {
      res = dispatchRepairOrder(props.order.id, handler.value)
    } else if (props.mode === 'finish') {
      res = finishRepairOrder(props.order.id, {
        result: result.value,
        spareParts: spareParts.value,
        remark: remark.value,
      })
    } else {
      res = acceptRepairOrder(props.order.id)
    }
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('操作成功')
    emit('update:open', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.meta {
  margin-bottom: 12px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>
