<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    width="480px"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-form-item label="类别编码" required>
        <a-input v-model:value="form.code" placeholder="请输入类别编码" :disabled="codeLocked" />
      </a-form-item>
      <a-form-item label="类别名称" required>
        <a-input v-model:value="form.title" placeholder="请输入类别名称" />
      </a-form-item>
      <div v-if="isSystem" class="system-hint">系统默认类别：可修改名称，不可删除</div>
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
import { addProductCategory, updateProductCategory } from '@/store/productCategoryStore'
import { addMaterialCategory, updateMaterialCategory } from '@/store/materialCategoryStore'
import { isSystemCategory } from '@/mock/materialCategories'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 'product' | 'material' */
  mode: { type: String, default: 'product' },
  record: { type: Object, default: null },
  parentKey: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const isEdit = computed(() => Boolean(props.record?.key))
const isSystem = computed(() => isSystemCategory(props.record))
const codeLocked = computed(() => isEdit.value && isSystem.value)
const modalTitle = computed(() => {
  const kind = props.mode === 'material' ? '物料类别' : '产品类别'
  return isEdit.value ? `编辑${kind}` : `新增${kind}`
})

const saving = ref(false)
const form = reactive({ code: '', title: '' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.code = props.record?.code || ''
    form.title = props.record?.title || ''
  },
)

function handleCancel() {
  visible.value = false
}

function handleSave() {
  saving.value = true
  const payload = { code: form.code, title: form.title, parentKey: props.parentKey || undefined }
  let res
  if (props.mode === 'material') {
    res = isEdit.value
      ? updateMaterialCategory(props.record.key, payload)
      : addMaterialCategory(payload)
  } else {
    res = isEdit.value
      ? updateProductCategory(props.record.key, payload)
      : addProductCategory(payload)
  }
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已更新' : '已创建')
  emit('saved', res.category)
  visible.value = false
}
</script>

<style scoped>
.system-hint {
  margin-top: -8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
