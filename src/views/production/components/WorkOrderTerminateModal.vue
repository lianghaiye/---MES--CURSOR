<template>
  <a-modal
    :open="open"
    title="终止工单"
    ok-text="确认终止"
    ok-type="danger"
    cancel-text="取消"
    destroy-on-close
    :width="480"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <p class="hint">确定终止工单「{{ workOrder?.code || '—' }}」吗？终止后不可恢复生产。</p>
    <p v-if="needChoose" class="hint warn">
      {{ chooseMessage }}
    </p>
    <a-form layout="vertical">
      <a-form-item v-if="needChoose" label="报工处理方式" required>
        <a-radio-group v-model:value="mode">
          <a-radio value="reset">仍终止（重置报工）</a-radio>
          <a-radio value="keep">不处理（保留报工）</a-radio>
        </a-radio-group>
        <div class="mode-tip">
          仍终止：报工数量重置为
          0，小程序任务不再显示；不处理：承认报工数量，不影响工时工资结算，未完成任务隐藏。
        </div>
      </a-form-item>
      <a-form-item label="终止原因（选填）">
        <a-textarea
          v-model:value="reason"
          :rows="3"
          :maxlength="200"
          show-count
          placeholder="请填写终止原因，可不填"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  workOrder: { type: Object, default: null },
  needChoose: { type: Boolean, default: false },
  chooseMessage: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

const reason = ref('')
const mode = ref('reset')

watch(
  () => props.open,
  (val) => {
    if (val) {
      reason.value = ''
      mode.value = 'reset'
    }
  },
)

function handleOk() {
  emit('confirm', {
    mode: props.needChoose ? mode.value : 'reset',
    reason: String(reason.value || '').trim(),
  })
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;

  &.warn {
    color: #d46b08;
  }
}

.mode-tip {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}
</style>
