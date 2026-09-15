<template>
  <a-modal
    :open="open"
    :title="title"
    ok-text="拒绝出库"
    ok-type="danger"
    cancel-text="取消"
    :confirm-loading="confirmLoading"
    destroy-on-close
    @ok="handleOk"
    @cancel="handleCancel"
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
          @pressEnter.prevent
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
})

const emit = defineEmits(['update:open', 'confirm'])

const reason = ref('')
const error = ref('')

const title = computed(() => {
  const nos = props.docNos || []
  if (nos.length === 1) return `拒绝出库 ${nos[0]}？`
  if (nos.length > 1) return `拒绝出库所选 ${nos.length} 条单据？`
  return '拒绝出库'
})

const hint = computed(() =>
  (props.docNos || []).length > 1
    ? '拒绝后出库单将标记为「已拒绝」；领料出库会同步回写关联领料申请。'
    : '拒绝后出库单将标记为「已拒绝」。领料出库会同步回写关联领料申请。',
)

watch(
  () => props.open,
  (val) => {
    if (val) {
      reason.value = ''
      error.value = ''
    }
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  const text = String(reason.value || '').trim()
  if (!text) {
    error.value = '请填写拒绝理由'
    return
  }
  error.value = ''
  emit('confirm', text)
}
</script>

<script>
export default { name: 'OutboundRefuseModal' }
</script>

<style lang="less" scoped>
.refuse-hint {
  margin: 0 0 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>
