<template>
  <a-modal
    :open="open"
    title="执行保养"
    :confirm-loading="saving"
    destroy-on-close
    width="560px"
    ok-text="完成保养"
    @ok="handleSubmit"
    @cancel="emit('update:open', false)"
  >
    <div v-if="order" class="meta">
      <div>{{ order.orderNo }} · {{ order.deviceCode }} {{ order.deviceName }}</div>
      <div>{{ order.maintainType }} · 计划 {{ order.planDate }}</div>
    </div>
    <a-form-item label="执行人">
      <a-input v-model:value="executor" placeholder="请输入执行人" />
    </a-form-item>
    <div v-for="item in items" :key="item.id" class="item-row">
      <a-checkbox v-model:checked="doneMap[item.id]">{{ item.name }}</a-checkbox>
    </div>
    <a-form-item label="备注" style="margin-top: 12px">
      <a-textarea v-model:value="remark" :rows="2" />
    </a-form-item>
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { executeMaintainOrder } from '@/store/equipmentStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const executor = ref('')
const remark = ref('')
const items = ref([])
const doneMap = reactive({})

watch(
  () => [props.open, props.order],
  ([open]) => {
    if (!open || !props.order) return
    executor.value = ''
    remark.value = props.order.remark || ''
    items.value = (props.order.items || []).map((it) => ({ ...it }))
    Object.keys(doneMap).forEach((k) => delete doneMap[k])
    items.value.forEach((it) => {
      doneMap[it.id] = true
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
    const res = executeMaintainOrder(props.order.id, {
      executor: executor.value.trim(),
      remark: remark.value,
      doneMap: { ...doneMap },
    })
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('保养已完成')
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
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
}
.item-row {
  margin-bottom: 8px;
}
</style>
