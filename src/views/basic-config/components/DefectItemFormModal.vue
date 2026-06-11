<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑不良品项' : '创建不良品项'"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="不良品项编号" name="code">
        <a-input v-model:value="form.code" placeholder="请输入，忽略将自动生成" />
      </a-form-item>
      <a-form-item label="不良品项名称" name="name" required>
        <a-input v-model:value="form.name" placeholder="请输入" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">确定</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { addDefectItem, updateDefectItem } from '@/store/defectItemStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const formRef = ref()
const saving = ref(false)
const form = reactive({ code: '', name: '' })
const isEdit = computed(() => Boolean(props.record?.id))

const rules = {
  name: [{ required: true, message: '请输入不良品项名称', trigger: 'blur' }],
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    form.code = props.record?.code || ''
    form.name = props.record?.name || ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  const res = isEdit.value
    ? updateDefectItem(props.record.id, form)
    : addDefectItem(form)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已保存' : '已创建')
  emit('saved')
  emit('update:open', false)
}
</script>
