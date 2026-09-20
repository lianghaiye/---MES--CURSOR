<template>
  <a-modal
    :open="open"
    :title="title"
    ok-text="确认"
    cancel-text="取消"
    destroy-on-close
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <p v-if="hint" class="post-hint">{{ hint }}</p>
    <a-radio-group v-model:value="mode" class="post-mode-group">
      <a-radio
        v-for="opt in STOCKTAKE_POST_MODE_OPTIONS"
        :key="opt.value"
        :value="opt.value"
        class="post-mode-item"
      >
        {{ opt.label }}
      </a-radio>
    </a-radio-group>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { STOCKTAKE_POST_MODE, STOCKTAKE_POST_MODE_OPTIONS } from '@/utils/stocktakeConfirm'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '生成盘盈盘亏' },
  hint: { type: String, default: '请选择本次要生成的单据范围。' },
})

const emit = defineEmits(['update:open', 'confirm'])

const mode = ref(STOCKTAKE_POST_MODE.BOTH)

watch(
  () => props.open,
  (v) => {
    if (v) mode.value = STOCKTAKE_POST_MODE.BOTH
  },
)

function handleOk() {
  emit('confirm', mode.value)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'StocktakePostModeModal' }
</script>

<style lang="less" scoped>
.post-hint {
  margin: 0 0 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.post-mode-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-mode-item {
  margin-inline-end: 0;
}
</style>
