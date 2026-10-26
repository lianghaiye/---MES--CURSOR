<template>
  <a-modal
    :open="open"
    title="确认签署"
    :confirm-loading="submitting"
    destroy-on-close
    :mask-closable="false"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="sign-form">
      <a-form-item label="合同编号">
        <a-input :value="contract?.contractNo || '—'" disabled size="small" />
      </a-form-item>
      <a-form-item label="签署时间" required>
        <a-date-picker
          v-model:value="form.signedAt"
          show-time
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm"
          size="small"
          style="width: 100%"
          placeholder="请选择签署时间"
        />
      </a-form-item>
      <a-form-item label="签署人">
        <a-input
          v-model:value="form.signedBy"
          size="small"
          allow-clear
          placeholder="请输入签署人（选填）"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { markContractSigned } from '@/store/salesContractStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  contract: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'signed'])

const submitting = ref(false)
const form = reactive({
  signedAt: '',
  signedBy: '',
})

watch(
  () => [props.open, props.contract?.id],
  ([open]) => {
    if (!open) return
    form.signedAt = dayjs().format('YYYY-MM-DD HH:mm')
    form.signedBy = props.contract?.signer || props.contract?.signedBy || ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!form.signedAt) {
    message.warning('请填写签署时间')
    return
  }
  submitting.value = true
  try {
    const res = markContractSigned(props.contract.id, {
      signedAt: form.signedAt,
      signedBy: String(form.signedBy || '').trim(),
    })
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('已标记为已签署')
    emit('signed', res.data)
    emit('update:open', false)
  } finally {
    submitting.value = false
  }
}
</script>

<script>
export default { name: 'SalesContractSignModal' }
</script>
