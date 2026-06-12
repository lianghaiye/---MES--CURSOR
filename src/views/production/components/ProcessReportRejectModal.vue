<template>
  <a-modal
    :open="open"
    title="拒绝工序报工"
    width="480px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-form-item label="拒绝原因" required>
        <a-textarea
          v-model:value="reason"
          :rows="4"
          :maxlength="200"
          show-count
          placeholder="请输入拒绝原因"
        />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" danger @click="handleOk">确认拒绝</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  open: Boolean,
})

const emit = defineEmits(['update:open', 'confirm'])

const reason = ref('')

watch(
  () => props.open,
  (val) => {
    if (val) reason.value = ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!reason.value.trim()) {
    message.warning('请填写拒绝原因')
    return
  }
  emit('confirm', reason.value.trim())
  emit('update:open', false)
}
</script>
