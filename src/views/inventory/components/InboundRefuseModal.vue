<template>
  <a-modal
    :open="open"
    :title="title"
    ok-text="拒绝入库"
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
  /** line：拒绝明细；order：拒绝整单（默认） */
  mode: { type: String, default: 'order' },
})

const emit = defineEmits(['update:open', 'confirm'])

const reason = ref('')
const error = ref('')

const title = computed(() => {
  const nos = props.docNos || []
  if (props.mode === 'line') {
    if (nos.length === 1) return `拒绝入库明细 ${nos[0]}？`
    return `拒绝入库所选 ${nos.length} 行明细？`
  }
  if (nos.length === 1) return `拒绝入库 ${nos[0]}？`
  if (nos.length > 1) return `拒绝入库所选 ${nos.length} 条单据？`
  return '拒绝入库'
})

const hint = computed(() => {
  if (props.mode === 'line') {
    return '仅拒绝尚未入库的明细；已入库行不受影响。拒绝后该行不可再确认入库。'
  }
  return (props.docNos || []).length > 1
    ? '拒绝后入库单将标记为「已拒绝」。'
    : '拒绝后入库单将标记为「已拒绝」。'
})

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
export default { name: 'InboundRefuseModal' }
</script>

<style lang="less" scoped>
.refuse-hint {
  margin: 0 0 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>
