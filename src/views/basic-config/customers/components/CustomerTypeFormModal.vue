<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑客户类型' : '新增客户类型'"
    width="480px"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-form-item label="分类编码" required>
        <a-input v-model:value="form.code" placeholder="请输入分类编码" />
      </a-form-item>
      <a-form-item label="分类名称" required>
        <a-input v-model:value="form.name" placeholder="请输入分类名称" />
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
import { addCustomerType, updateCustomerType } from '@/store/customerTypeStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const isEdit = computed(() => Boolean(props.record?.id))
const saving = ref(false)
const form = reactive({ code: '', name: '' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.code = props.record?.code || ''
    form.name = props.record?.name || ''
  },
)

function handleCancel() {
  visible.value = false
}

function handleSave() {
  saving.value = true
  const res = isEdit.value
    ? updateCustomerType(props.record.id, { ...form })
    : addCustomerType({ ...form })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已更新' : '已创建')
  emit('saved')
  visible.value = false
}
</script>
