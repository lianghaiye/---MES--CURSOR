<template>
  <a-dropdown :trigger="['click']">
    <a-tooltip title="字号">
      <a-button type="text" size="small" class="table-density-trigger">
        <span class="density-icon" aria-hidden="true">A</span>
      </a-button>
    </a-tooltip>
    <template #overlay>
      <a-menu :selected-keys="[modelValue]" @click="onSelect">
        <a-menu-item v-for="level in levels" :key="level">
          {{ labels[level] }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup>
import { TABLE_DENSITY_LABELS, TABLE_DENSITY_LEVELS } from '@/utils/tableDensity'

defineProps({
  modelValue: { type: String, default: 'large' },
})

const emit = defineEmits(['update:modelValue'])

const levels = TABLE_DENSITY_LEVELS
const labels = TABLE_DENSITY_LABELS

function onSelect({ key }) {
  emit('update:modelValue', key)
}
</script>

<style scoped>
.table-density-trigger {
  color: rgba(0, 0, 0, 0.45);
}

.table-density-trigger:hover {
  color: #1677ff;
}

.density-icon {
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  font-family: Georgia, 'Times New Roman', serif;
}
</style>
