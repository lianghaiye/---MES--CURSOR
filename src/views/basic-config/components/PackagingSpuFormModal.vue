<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="780px"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="族编码" name="code">
            <a-input v-model:value="form.code" placeholder="忽略将自动生成" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="族名称" name="name" required>
            <a-input v-model:value="form.name" placeholder="如：出口木箱" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="业务类型" required>
        <a-space>
          <a-checkbox v-model:checked="form.canSell">可销售</a-checkbox>
          <a-checkbox v-model:checked="form.canPurchase">可采购</a-checkbox>
        </a-space>
      </a-form-item>

      <a-form-item label="变体维度">
        <VariantAttributeEditor
          v-model:variant-axes="form.variantAxes"
          v-model:sku-code-pattern="form.skuCodePattern"
          :spu-code="form.code"
          enum-only
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
import VariantAttributeEditor from '@/views/product-process/components/VariantAttributeEditor.vue'
import { DEFAULT_PACKAGING_VARIANT_AXES } from '@/constants/packagingSpu'
import { defaultPackagingSkuCodePattern } from '@/constants/packagingSpu'
import { addPackagingSpu, updatePackagingSpu } from '@/store/packagingSpuStore'

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
  canSell: true,
  canPurchase: false,
  variantAxes: JSON.parse(JSON.stringify(DEFAULT_PACKAGING_VARIANT_AXES)),
  skuCodePattern: defaultPackagingSkuCodePattern(),
})

const isEdit = computed(() => Boolean(props.record?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/basic-config/packaging',
  getTitle: () => (isEdit.value ? '编辑包装族' : '新建包装族'),
})

const rules = {
  name: [{ required: true, message: '请输入族名称', trigger: 'blur' }],
}

watch(
  () => isActive.value,
  (v) => {
    if (!v) return
    if (props.record?.id) {
      form.code = props.record.code || ''
      form.name = props.record.name || ''
      form.canSell = Boolean(props.record.canSell)
      form.canPurchase = Boolean(props.record.canPurchase)
      form.variantAxes = JSON.parse(
        JSON.stringify(props.record.variantAxes || DEFAULT_PACKAGING_VARIANT_AXES),
      )
      form.skuCodePattern =
        props.record.skuCodePattern || defaultPackagingSkuCodePattern(form.variantAxes)
      return
    }
    form.code = ''
    form.name = ''
    form.canSell = true
    form.canPurchase = false
    form.variantAxes = JSON.parse(JSON.stringify(DEFAULT_PACKAGING_VARIANT_AXES))
    form.skuCodePattern = defaultPackagingSkuCodePattern()
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
  const payload = {
    code: form.code,
    name: form.name,
    canSell: form.canSell,
    canPurchase: form.canPurchase,
    variantAxes: form.variantAxes,
    skuCodePattern: form.skuCodePattern,
  }
  const res = isEdit.value ? updatePackagingSpu(props.record.id, payload) : addPackagingSpu(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已保存' : '已创建')
  emit('saved', res.item)
  closeAfterSave()
}
</script>
