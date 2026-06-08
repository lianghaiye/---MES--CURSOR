<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑' : '新增'"
    width="480px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="工序分类名称" name="name" required>
        <a-input v-model:value="form.name" placeholder="请输入 工序分类名称" />
      </a-form-item>
      <a-form-item v-if="isEdit" label="备注" name="remark">
        <a-textarea v-model:value="form.remark" placeholder="请输入备注" :rows="2" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">
          <CloseCircleOutlined />
          取消
        </a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">
          <PlusCircleOutlined />
          保存
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons-vue'
import { addProcessCategory, updateProcessCategory } from '@/store/processCategoryStore'
import { renameProcessCategory } from '@/store/processConfigStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const formRef = ref()
const saving = ref(false)
const form = reactive({ name: '', remark: '' })

const isEdit = computed(() => Boolean(props.record?.id))

const rules = {
  name: [{ required: true, message: '请输入工序分类名称', trigger: 'blur' }],
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    form.name = props.record?.name || ''
    form.remark = props.record?.remark || ''
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
  const payload = { name: form.name, remark: form.remark }
  const res = isEdit.value
    ? updateProcessCategory(props.record.id, payload)
    : addProcessCategory(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  if (res.renamedFrom) renameProcessCategory(res.renamedFrom, res.category.name)
  message.success(isEdit.value ? '已保存' : '已新增')
  emit('saved')
  emit('update:open', false)
}
</script>
