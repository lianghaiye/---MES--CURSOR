<template>
  <a-modal
    :open="open"
    :title="title"
    ok-text="确认"
    cancel-text="取消"
    destroy-on-close
    :ok-button-props="{ disabled: !canConfirm }"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <p v-if="hint" class="post-hint">{{ hint }}</p>
    <a-radio-group v-model:value="mode" class="post-mode-group">
      <a-radio
        v-for="opt in STOCKTAKE_POST_MODE_OPTIONS"
        :key="opt.value"
        :value="opt.value"
        :disabled="Boolean(disabledMap[opt.value])"
        class="post-mode-item"
      >
        <span>{{ opt.label }}</span>
        <span
          v-if="disabledMap[opt.value] && opt.value !== STOCKTAKE_POST_MODE.BOTH"
          class="opt-tip"
        >
          （已生成）
        </span>
      </a-radio>
    </a-radio-group>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  STOCKTAKE_POST_MODE,
  STOCKTAKE_POST_MODE_OPTIONS,
  resolveDefaultStocktakePostMode,
} from '@/utils/stocktakeConfirm'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '生成盘盈盘亏' },
  hint: { type: String, default: '请选择本次要生成的单据范围。' },
  /** { gain, loss, both } 为 true 时禁用 */
  disabledModes: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:open', 'confirm'])

const mode = ref(STOCKTAKE_POST_MODE.BOTH)

const disabledMap = computed(() => ({
  [STOCKTAKE_POST_MODE.GAIN]: Boolean(props.disabledModes?.[STOCKTAKE_POST_MODE.GAIN]),
  [STOCKTAKE_POST_MODE.LOSS]: Boolean(props.disabledModes?.[STOCKTAKE_POST_MODE.LOSS]),
  [STOCKTAKE_POST_MODE.BOTH]: Boolean(props.disabledModes?.[STOCKTAKE_POST_MODE.BOTH]),
}))

const canConfirm = computed(() => !disabledMap.value[mode.value])

watch(
  () => [props.open, props.disabledModes],
  ([v]) => {
    if (!v) return
    mode.value = resolveDefaultStocktakePostMode(disabledMap.value)
  },
)

function handleOk() {
  if (!canConfirm.value) return
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
  line-height: 1.5;
}

.post-mode-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-mode-item {
  margin-inline-end: 0;
}

.opt-tip {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
