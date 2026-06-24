<template>
  <a-modal
    v-model:open="open"
    title="新增设计任务"
    width="720px"
    :confirm-loading="submitting"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item
        label="产品"
        name="productId"
        :rules="[{ required: true, message: '请选择定制类产品' }]"
      >
        <a-select
          v-model:value="form.productId"
          show-search
          placeholder="请选择定制类产品"
          :options="productOpts"
          :filter-option="filterProduct"
          @change="onProductChange"
        />
      </a-form-item>
      <a-form-item label="客户名称" name="customerName">
        <a-input v-model:value="form.customerName" placeholder="请输入" />
      </a-form-item>
      <a-form-item label="订单类型" name="orderType">
        <a-select v-model:value="form.orderType" :options="orderTypeOpts" />
      </a-form-item>
      <a-form-item label="紧急度" name="urgency">
        <a-select v-model:value="form.urgency" :options="urgencyOpts" />
      </a-form-item>
      <a-form-item label="订单日期" name="orderDate">
        <a-date-picker v-model:value="form.orderDate" style="width: 100%" />
      </a-form-item>
      <a-form-item label="交货日期" name="deliveryDate">
        <a-date-picker v-model:value="form.deliveryDate" style="width: 100%" />
      </a-form-item>
      <a-form-item label="技术参数" name="techParams">
        <a-textarea v-model:value="form.techParams" :rows="3" placeholder="请输入" />
      </a-form-item>
      <a-form-item label="工艺文件" name="processFile">
        <a-input v-model:value="form.processFile" placeholder="工艺文件名称或链接（选填）" />
      </a-form-item>
      <a-form-item label="业务员" name="salesperson">
        <a-input v-model:value="form.salesperson" placeholder="请输入" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { productInfoState } from '@/store/productInfoStore'
import { isCustomProductAttribute } from '@/constants/designTask'
import { createManualDesignTask } from '@/store/designTaskStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const open = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const formRef = ref()
const submitting = ref(false)

const form = reactive({
  productId: undefined,
  customerName: '',
  orderType: '标准订单',
  urgency: '普通',
  orderDate: dayjs(),
  deliveryDate: undefined,
  techParams: '',
  processFile: '',
  salesperson: '',
})

const orderTypeOpts = ['标准订单', '项目订单', '备件订单'].map((v) => ({ label: v, value: v }))
const urgencyOpts = ['紧急', '加急', '普通'].map((v) => ({ label: v, value: v }))

const productOpts = computed(() =>
  productInfoState.products
    .filter((p) => isCustomProductAttribute(p.productAttribute))
    .map((p) => ({
      label: `[${p.code}] ${p.name}（${p.productAttribute}）`,
      value: p.id,
    })),
)

function filterProduct(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function onProductChange(productId) {
  const p = productInfoState.products.find((x) => x.id === productId)
  if (p?.techParams && !form.techParams) form.techParams = p.techParams
}

function resetForm() {
  form.productId = undefined
  form.customerName = ''
  form.orderType = '标准订单'
  form.urgency = '普通'
  form.orderDate = dayjs()
  form.deliveryDate = undefined
  form.techParams = ''
  form.processFile = ''
  form.salesperson = ''
}

watch(
  () => props.open,
  (val) => {
    if (val) resetForm()
  },
)

async function handleOk() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const task = createManualDesignTask({
      productId: form.productId,
      customerName: form.customerName,
      orderType: form.orderType,
      urgency: form.urgency,
      orderDate: form.orderDate ? form.orderDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      deliveryDate: form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : '',
      techParams: form.techParams,
      processFile: form.processFile,
      salesperson: form.salesperson,
    })
    message.success(`设计任务 ${task.taskNo} 已创建`)
    emit('saved', task)
    open.value = false
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  open.value = false
}
</script>
