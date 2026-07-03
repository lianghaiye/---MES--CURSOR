<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form ref="formRef" :model="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="设计单号" name="taskNo">
        <a-input v-model:value="form.taskNo" allow-clear placeholder="留空则系统自动生成" />
      </a-form-item>
      <a-form-item
        label="产品名称"
        name="productName"
        :rules="[{ required: true, message: '请输入产品名称' }]"
      >
        <a-input-group compact class="product-name-group">
          <a-input
            v-model:value="form.productName"
            placeholder="请输入产品名称"
            allow-clear
            style="width: calc(100% - 88px)"
          />
          <a-button style="width: 88px" @click="pickerOpen = true">选择产品</a-button>
        </a-input-group>
      </a-form-item>
      <a-form-item
        label="数量"
        name="quantity"
        :rules="[{ required: true, message: '请输入数量' }]"
      >
        <a-input-number v-model:value="form.quantity" :min="1" :precision="0" style="width: 100%" />
      </a-form-item>
      <a-form-item label="销售单号" name="salesOrderNo">
        <a-input v-model:value="form.salesOrderNo" allow-clear placeholder="选填" />
      </a-form-item>
      <a-form-item label="客户" name="customerName">
        <a-select
          v-model:value="form.customerName"
          allow-clear
          show-search
          placeholder="请选择客户"
          :options="customerOpts"
          :filter-option="filterCustomer"
        />
      </a-form-item>
      <a-form-item label="合同号" name="contractNo">
        <a-input v-model:value="form.contractNo" allow-clear placeholder="选填" />
      </a-form-item>
      <a-form-item label="备注" name="remark">
        <a-textarea v-model:value="form.remark" :rows="3" placeholder="选填" allow-clear />
      </a-form-item>
    </a-form>

    <SelectProductMaterialModal v-model:open="pickerOpen" @confirm="onItemPicked" />

    <template #footer>
      <a-button size="small" :loading="submitting" @click="handleCancel">取消</a-button>
      <a-button type="primary" size="small" :loading="submitting" @click="handleOk">保存</a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { customerOptions } from '@/mock/salesOrderOptions'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { createManualDesignTask } from '@/store/designTaskStore'
import SelectProductMaterialModal from '@/views/product-process/components/SelectProductMaterialModal.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/planning/design-task',
  getTitle: () => '新增设计任务',
})

const formRef = ref()
const submitting = ref(false)
const pickerOpen = ref(false)

const form = reactive({
  taskNo: '',
  productId: '',
  productCode: '',
  productName: '',
  productAttr: '',
  specModel: '',
  material: '',
  techParams: '',
  quantity: 1,
  salesOrderNo: '',
  customerName: undefined,
  contractNo: '',
  remark: '',
})

const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))

function filterCustomer(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

function resetForm() {
  form.taskNo = ''
  form.productId = ''
  form.productCode = ''
  form.productName = ''
  form.productAttr = ''
  form.specModel = ''
  form.material = ''
  form.techParams = ''
  form.quantity = 1
  form.salesOrderNo = ''
  form.customerName = undefined
  form.contractNo = ''
  form.remark = ''
}

watch(
  () => isActive.value,
  (val) => {
    if (val) resetForm()
  },
  { immediate: true },
)

function onItemPicked(row) {
  form.productName = row.name || ''
  form.productCode = row.code || ''
  form.specModel = row.specModel || ''

  if (row.itemType === '物料') {
    form.productId = ''
    const material = materialInfoState.materials.find((m) => m.id === row.id)
    form.productAttr = material?.productAttribute || material?.materialType || ''
    form.material = material?.material || ''
    form.techParams = material?.techParams || ''
    return
  }

  form.productId = row.id
  const product = productInfoState.products.find((p) => p.id === row.id)
  form.productAttr = product?.productAttribute || ''
  form.material = product?.material || ''
  form.techParams = product?.techParams || ''
}

async function handleOk() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const result = createManualDesignTask({
      taskNo: form.taskNo?.trim(),
      productId: form.productId || undefined,
      productCode: form.productCode,
      productName: form.productName?.trim(),
      productAttr: form.productAttr,
      specModel: form.specModel,
      material: form.material,
      techParams: form.techParams,
      quantity: form.quantity,
      salesOrderNo: form.salesOrderNo?.trim(),
      customerName: form.customerName || '',
      contractNo: form.contractNo?.trim(),
      remark: form.remark?.trim(),
    })
    if (!result.ok) {
      message.warning(result.message)
      return
    }
    message.success(`设计任务 ${result.task.taskNo} 已创建`)
    emit('saved', result.task)
    closeAfterSave()
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less" scoped>
.product-name-group {
  display: flex;
  width: 100%;
}
</style>
