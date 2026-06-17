<template>
  <a-modal
    :open="open"
    title="审核"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-descriptions bordered size="small" :column="1" class="info-desc">
      <a-descriptions-item label="任务编号">{{ line?.taskNo || '—' }}</a-descriptions-item>
      <a-descriptions-item label="工序名称">{{ line?.processName || '—' }}</a-descriptions-item>
      <a-descriptions-item label="执行人">{{ line?.reporter || '—' }}</a-descriptions-item>
    </a-descriptions>

    <a-form layout="vertical">
      <a-form-item label="审核结果" required>
        <a-radio-group v-model:value="form.result">
          <a-radio value="approve">通过</a-radio>
          <a-radio value="reject">拒绝</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item v-if="form.result === 'approve'" label="说明">
        <div class="audit-hint">审核通过后，报工数据将锁定，无法再进行调整。</div>
      </a-form-item>
      <a-form-item v-else label="拒绝原因" required>
        <a-textarea
          v-model:value="form.rejectReason"
          :rows="3"
          :maxlength="200"
          show-count
          placeholder="请输入拒绝原因"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const form = reactive({
  result: 'approve',
  rejectReason: '',
})

watch(
  () => props.open,
  (val) => {
    if (!val) return
    form.result = 'approve'
    form.rejectReason = ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (form.result === 'reject' && !form.rejectReason?.trim()) {
    message.warning('请填写拒绝原因')
    return
  }
  emit('confirm', { ...form })
  emit('update:open', false)
}
</script>

<style scoped>
.info-desc {
  margin-bottom: 16px;
}

.audit-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.6;
}
</style>
