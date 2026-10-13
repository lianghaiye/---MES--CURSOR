<template>
  <a-modal
    :open="open"
    :title="record?.id ? '编辑设备' : '新增设备'"
    :confirm-loading="saving"
    destroy-on-close
    width="720px"
    @ok="handleSave"
    @cancel="emit('update:open', false)"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="horizontal"
      :label-col="{ flex: '0 0 96px' }"
      :wrapper-col="{ flex: '1 1 auto' }"
    >
      <a-row :gutter="[12, 8]">
        <a-col :span="12">
          <a-form-item label="设备编码" name="code">
            <a-input v-model:value="form.code" allow-clear placeholder="空则自动生成" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="设备名称" name="name">
            <a-input v-model:value="form.name" allow-clear placeholder="请输入设备名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="设备类别" name="category">
            <a-select
              v-model:value="form.category"
              :options="EQUIPMENT_CATEGORY_OPTIONS"
              placeholder="请选择"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="规格型号" name="model">
            <a-input v-model:value="form.model" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="所属车间" name="workshop">
            <a-input v-model:value="form.workshop" allow-clear placeholder="如：机加车间" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="安装位置" name="location">
            <a-input v-model:value="form.location" allow-clear placeholder="如：A区-01" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="设备状态" name="status">
            <a-select
              v-model:value="form.status"
              :options="EQUIPMENT_STATUS_OPTIONS"
              placeholder="请选择"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="责任人" name="responsible">
            <a-input v-model:value="form.responsible" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="生产厂家" name="manufacturer">
            <a-input v-model:value="form.manufacturer" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="投用日期" name="installDate">
            <a-date-picker
              v-model:value="installDateValue"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注" name="remark">
            <a-textarea v-model:value="form.remark" :rows="2" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_STATUS,
  EQUIPMENT_STATUS_OPTIONS,
} from '@/mock/equipmentSeed'
import { addDevice, updateDevice } from '@/store/equipmentStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const form = reactive(emptyForm())

const installDateValue = computed({
  get: () => form.installDate || undefined,
  set: (v) => {
    form.installDate = v || ''
  },
})

const rules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择设备类别', trigger: 'change' }],
  status: [{ required: true, message: '请选择设备状态', trigger: 'change' }],
}

function emptyForm() {
  return {
    code: '',
    name: '',
    category: '机加工设备',
    model: '',
    workshop: '',
    location: '',
    status: EQUIPMENT_STATUS.IN_USE,
    responsible: '',
    manufacturer: '',
    installDate: '',
    remark: '',
  }
}

watch(
  () => [props.open, props.record],
  ([open]) => {
    if (!open) return
    const r = props.record
    Object.assign(form, emptyForm(), r ? { ...r } : {})
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
    const res = props.record?.id
      ? updateDevice(props.record.id, { ...form })
      : addDevice({ ...form })
    if (!res.ok) {
      message.warning(res.message || '保存失败')
      return
    }
    message.success('保存成功')
    emit('update:open', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
