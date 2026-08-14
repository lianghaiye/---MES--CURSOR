<template>
  <div class="inbound-line-scope-toggle">
    <a-radio-group
      :value="modelValue"
      size="small"
      button-style="solid"
      @update:value="emit('update:modelValue', $event)"
    >
      <a-radio-button value="pending">仅展示未入库</a-radio-button>
      <a-radio-button value="all">展示所有</a-radio-button>
    </a-radio-group>
    <span v-if="hint" class="scope-hint">{{ hint }}</span>
  </div>
</template>

<script>
export default { name: 'InboundLineScopeToggle' }
</script>

<script setup>
defineProps({
  modelValue: { type: String, default: 'pending' },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<style lang="less" scoped>
.inbound-line-scope-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 10px;
}

.scope-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
