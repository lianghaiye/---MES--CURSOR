<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="560px"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="材质编号" name="code">
        <a-input v-model:value="form.code" placeholder="留空自动生成，如 M001" />
      </a-form-item>
      <a-form-item label="材质名称" name="name" required>
        <a-input v-model:value="form.name" placeholder="请输入" />
      </a-form-item>
      <a-form-item label="说明" name="description">
        <a-textarea
          v-model:value="form.description"
          :rows="3"
          :maxlength="200"
          show-count
          placeholder="请输入说明"
        />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-space>
        <a-button :size="pageMode ? 'small' : 'middle'" @click="handleCancel">取消</a-button>
        <a-button
          type="primary"
          :size="pageMode ? 'small' : 'middle'"
          :loading="saving"
          @click="handleSave"
        >
          确定
        </a-button>
      </a-space>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { addMaterialGrade, updateMaterialGrade } from '@/store/materialGradeStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const formRef = ref()
const saving = ref(false)

const form = reactive({
  code: '',
  name: '',
  description: '',
})

const isEdit = computed(() => Boolean(props.record?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/basic-config/material-grades',
  getTitle: () => (isEdit.value ? '编辑材质' : '创建材质'),
})

const rules = {
  name: [{ required: true, message: '请输入材质名称', trigger: 'blur' }],
}

watch(
  () => isActive.value,
  (v) => {
    if (!v) return
    form.code = props.record?.code || ''
    form.name = props.record?.name || ''
    form.description = props.record?.description || ''
  },
  { immediate: true },
)

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  const payload = {
    code: form.code,
    name: form.name,
    description: form.description,
  }
  const res = isEdit.value
    ? updateMaterialGrade(props.record.id, payload)
    : addMaterialGrade(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已保存' : '已创建')
  emit('saved')
  closeAfterSave()
}
</script>
