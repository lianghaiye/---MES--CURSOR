<template>
  <a-modal
    :open="open"
    title="新建保养工单"
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
      <a-form-item label="保养类型" name="maintainType">
        <a-select v-model:value="form.maintainType" :options="MAINTAIN_TYPE_OPTIONS" />
      </a-form-item>
      <a-form-item label="计划日期" name="planDate">
        <a-date-picker
          v-model:value="form.planDate"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </a-form-item>
      <div class="items-head">
        <span>保养项目</span>
        <a-button type="link" size="small" @click="form.items.push({ name: '' })">+ 添加</a-button>
      </div>
      <div v-for="(item, i) in form.items" :key="i" class="item-row">
        <a-input v-model:value="item.name" placeholder="保养项" />
        <a-button type="text" danger @click="form.items.splice(i, 1)">删除</a-button>
      </div>
      <a-form-item label="备注" style="margin-top: 12px">
        <a-textarea v-model:value="form.remark" :rows="2" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { MAINTAIN_TYPE_OPTIONS } from '@/mock/equipmentSeed'
import { addMaintainOrder, equipmentState } from '@/store/equipmentStore'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const form = reactive({
  deviceId: undefined,
  maintainType: '日常保养',
  planDate: dayjs().format('YYYY-MM-DD'),
  items: [{ name: '清洁设备表面' }, { name: '检查紧固件' }],
  remark: '',
})
const rules = {
  deviceId: [{ required: true, message: '请选择设备' }],
  maintainType: [{ required: true, message: '请选择保养类型' }],
  planDate: [{ required: true, message: '请选择计划日期' }],
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
    form.maintainType = '日常保养'
    form.planDate = dayjs().format('YYYY-MM-DD')
    form.items = [{ name: '清洁设备表面' }, { name: '检查紧固件' }]
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
    const res = addMaintainOrder({ ...form })
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('已创建保养工单')
    emit('update:open', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.items-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
}
.item-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
