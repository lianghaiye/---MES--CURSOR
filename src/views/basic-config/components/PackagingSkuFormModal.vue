<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="560px"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-alert
      v-if="record?.spuName"
      type="info"
      :message="`所属包装族：${record.spuName}`"
      show-icon
      style="margin-bottom: 12px"
    />

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="SKU 编码" name="code">
        <a-input v-model:value="form.code" />
      </a-form-item>
      <a-form-item label="SKU 名称">
        <a-input :value="record?.name" disabled />
      </a-form-item>
      <a-descriptions size="small" bordered :column="1" class="variant-desc">
        <a-descriptions-item label="包装形式">{{
          record?.packagingForm || '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="外包装尺寸">{{ record?.outerSize || '—' }}</a-descriptions-item>
        <a-descriptions-item label="标准包装量">{{
          record?.capacityQty ?? '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="单位">{{ record?.unit || '—' }}</a-descriptions-item>
      </a-descriptions>
      <a-form-item label="业务类型" style="margin-top: 12px">
        <a-space>
          <a-checkbox v-model:checked="form.canSell">可销售</a-checkbox>
          <a-checkbox v-model:checked="form.canPurchase">可采购</a-checkbox>
        </a-space>
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
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { updatePackagingSku } from '@/store/packagingStore'

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
  canSell: true,
  canPurchase: false,
})

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/basic-config/packaging',
  getTitle: () => '编辑包装 SKU',
})

const rules = {
  code: [{ required: true, message: '请输入 SKU 编码', trigger: 'blur' }],
}

watch(
  () => isActive.value,
  (v) => {
    if (!v || !props.record) return
    form.code = props.record.code || ''
    form.canSell = Boolean(props.record.canSell)
    form.canPurchase = Boolean(props.record.canPurchase)
  },
  { immediate: true },
)

async function handleSave() {
  if (!form.canSell && !form.canPurchase) {
    message.warning('请至少勾选「可销售」或「可采购」之一')
    return
  }
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  const res = updatePackagingSku(props.record.id, {
    code: form.code,
    canSell: form.canSell,
    canPurchase: form.canPurchase,
  })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已保存')
  emit('saved')
  closeAfterSave()
}
</script>

<style scoped>
.variant-desc {
  margin-top: 4px;
}
</style>
