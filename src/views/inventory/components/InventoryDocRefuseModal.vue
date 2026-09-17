<template>
  <a-modal
    :open="open"
    :title="title"
    :ok-text="okText"
    ok-type="danger"
    cancel-text="取消"
    :confirm-loading="confirmLoading"
    destroy-on-close
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <p class="refuse-hint">{{ hint }}</p>
    <a-form layout="vertical">
      <a-form-item label="拒绝理由" required :validate-status="error ? 'error' : ''" :help="error">
        <a-textarea
          v-model:value="reason"
          :rows="4"
          :maxlength="200"
          show-count
          placeholder="请填写拒绝理由"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  docNos: { type: Array, default: () => [] },
  confirmLoading: { type: Boolean, default: false },
  /** 调拨 | 盘点 */
  docLabel: { type: String, default: '单据' },
})

const emit = defineEmits(['update:open', 'confirm'])

const reason = ref('')
const error = ref('')

const okText = computed(() => `拒绝${props.docLabel}`)

const title = computed(() => {
  const nos = props.docNos || []
  if (nos.length === 1) return `拒绝${props.docLabel} ${nos[0]}？`
  if (nos.length > 1) return `拒绝所选 ${nos.length} 条${props.docLabel}？`
  return `拒绝${props.docLabel}`
})

const hint = computed(() => `拒绝后${props.docLabel}将标记为「已拒绝」。`)

watch(
  () => props.open,
  (val) => {
    if (val) {
      reason.value = ''
      error.value = ''
    }
  },
)

function handleOk() {
  const text = String(reason.value || '').trim()
  if (!text) {
    error.value = '请填写拒绝理由'
    return
  }
  emit('confirm', text)
}
</script>

<style scoped>
.refuse-hint {
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.65);
}
</style>
