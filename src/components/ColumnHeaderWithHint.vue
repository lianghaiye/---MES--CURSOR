<template>
  <span class="column-header-with-hint">
    <span>{{ title }}</span>
    <a-tooltip v-if="hint" :title="hint">
      <InfoCircleOutlined class="column-header-hint-icon" />
    </a-tooltip>
  </span>
</template>

<script setup>
import { InfoCircleOutlined } from '@ant-design/icons-vue'

defineProps({
  title: { type: String, required: true },
  hint: { type: String, default: '' },
})
</script>

<style scoped>
.column-header-with-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.column-header-hint-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
}
</style>
