<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑仓库分类' : '新增仓库分类'"
    width="480px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="分类编码" name="code" required>
        <a-input v-model:value="form.code" placeholder="请输入 分类编码" />
      </a-form-item>
      <a-form-item label="分类名称" name="name" required>
        <a-input v-model:value="form.name" placeholder="请输入 分类名称" />
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
import { addWarehouseCategory, updateWarehouseCategory } from '@/store/warehouseCategoryStore'
import { syncWarehouseCategoryName } from '@/store/warehouseStore'

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
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
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
    ? updateWarehouseCategory(props.record.id, form)
    : addWarehouseCategory(form)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  if (res.renamedFrom) {
    syncWarehouseCategoryName(res.renamedFrom, res.category.name, res.category)
  } else if (isEdit.value) {
    syncWarehouseCategoryName('', res.category.name, res.category)
  }
  message.success(isEdit.value ? '已保存' : '已新增')
  emit('saved')
  emit('update:open', false)
}
</script>
