<template>
  <a-modal
    :open="open"
    title="设备报修"
    :confirm-loading="saving"
    destroy-on-close
    width="640px"
    @ok="handleSave"
    @cancel="emit('update:open', false)"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="horizontal"
      :label-col="{ flex: '0 0 96px' }"
    >
      <a-form-item label="设备" name="deviceId">
        <a-select
          v-model:value="form.deviceId"
          show-search
          option-filter-prop="label"
          placeholder="请选择设备"
          :options="deviceOpts"
        />
      </a-form-item>
      <a-form-item label="报修人" name="reporter">
        <a-input v-model:value="form.reporter" placeholder="请输入报修人" />
      </a-form-item>
      <a-form-item label="故障描述" name="faultDesc">
        <a-textarea v-model:value="form.faultDesc" :rows="4" placeholder="请描述故障现象" />
      </a-form-item>
      <a-form-item label="备注">
        <a-input v-model:value="form.remark" allow-clear />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { addRepairOrder, equipmentState } from '@/store/equipmentStore'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const form = reactive({
  deviceId: undefined,
  reporter: '',
  faultDesc: '',
  remark: '',
})
const rules = {
  deviceId: [{ required: true, message: '请选择设备' }],
  faultDesc: [{ required: true, message: '请填写故障描述' }],
}

const deviceOpts = computed(() =>
  equipmentState.devices.map((d) => ({
    label: `${d.code} ${d.name}`,
    value: d.id,
  })),
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.deviceId = undefined
    form.reporter = ''
    form.faultDesc = ''
    form.remark = ''
  },
)

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const res = addRepairOrder({
      ...form,
      source: '人工报修',
    })
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success(`已创建维修单 ${res.order.orderNo}`)
    emit('update:open', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
