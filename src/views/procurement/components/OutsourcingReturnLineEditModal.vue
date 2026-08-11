<template>
  <a-modal
    :open="open"
    title="编辑异常处理明细"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-form layout="vertical" class="line-edit-form">
      <a-form-item label="产品">
        <a-input :value="displayName" disabled size="small" />
      </a-form-item>
      <a-form-item label="处理数量" required>
        <a-input-number
          v-model:value="form.returnQty"
          :min="0"
          :precision="4"
          size="small"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="单位" required>
        <a-select
          v-model:value="form.unit"
          size="small"
          :options="unitOpts"
          placeholder="请选择单位"
        />
      </a-form-item>
      <a-form-item label="异常类型" required>
        <a-select
          v-model:value="form.returnType"
          size="small"
          :options="returnTypeOpts"
          placeholder="请选择异常类型"
        />
      </a-form-item>
      <a-form-item label="赔偿方式">
        <a-select
          v-model:value="form.compensationMethod"
          size="small"
          allow-clear
          :options="compensationMethodOpts"
          placeholder="请选择赔偿方式"
          @change="onCompensationMethodChange"
        />
      </a-form-item>
      <a-form-item label="赔偿金额">
        <a-input-number
          v-model:value="form.compensationAmount"
          :min="0"
          :precision="2"
          size="small"
          style="width: 100%"
          :disabled="form.compensationMethod !== '赔款'"
          placeholder="选填"
        />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="form.remark" :rows="3" size="small" placeholder="请输入备注" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const form = reactive({
  returnQty: 0,
  unit: '',
  returnType: '返工',
  compensationMethod: undefined,
  compensationAmount: null,
  remark: '',
})

const returnTypeOpts = [
  { label: '返工', value: '返工' },
  { label: '换料重做', value: '换料重做' },
  { label: '让步接收', value: '让步接收' },
  { label: '料废索赔', value: '料废索赔' },
  { label: '报废', value: '报废' },
]

const compensationMethodOpts = [
  { label: '赔料', value: '赔料' },
  { label: '赔款', value: '赔款' },
]

const displayName = computed(() => {
  const l = props.line
  if (!l) return ''
  return `${l.productName || '—'}（${l.productCode || '—'}）`
})

const unitOpts = computed(() => {
  const units = props.line?.unitOptions?.length
    ? props.line.unitOptions
    : [props.line?.unit].filter(Boolean)
  return units.map((u) => ({ label: u, value: u }))
})

function onCompensationMethodChange() {
  if (form.compensationMethod !== '赔款') {
    form.compensationAmount = null
  } else if (form.compensationAmount == null) {
    form.compensationAmount = 0
  }
}

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.line) return
    form.returnQty = Number(props.line.returnQty) || 0
    form.unit = props.line.unit || ''
    form.returnType = props.line.returnType || '返工'
    form.compensationMethod = props.line.compensationMethod || undefined
    form.compensationAmount =
      props.line.compensationMethod === '赔款' ? Number(props.line.compensationAmount) || 0 : null
    form.remark = props.line.remark || ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!(Number(form.returnQty) > 0)) {
    message.warning('请填写处理数量')
    return
  }
  if (!form.unit) {
    message.warning('请选择单位')
    return
  }
  if (!form.returnType) {
    message.warning('请选择异常类型')
    return
  }
  emit('saved', {
    returnQty: Number(form.returnQty) || 0,
    unit: form.unit,
    returnType: form.returnType,
    compensationMethod: form.compensationMethod || '',
    compensationAmount:
      form.compensationMethod === '赔款' ? Number(form.compensationAmount) || 0 : null,
    remark: String(form.remark || '').trim(),
  })
  emit('update:open', false)
}
</script>

<script>
export default { name: 'OutsourcingReturnLineEditModal' }
</script>
