<template>
  <TableColumnSettingDrawer
    :open="open"
    :settings="settings"
    :default-settings="defaultBomColumnSettings"
    @update:open="emit('update:open', $event)"
    @update:settings="emit('update:settings', $event)"
  />
</template>

<script setup>
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'

defineProps({
  open: Boolean,
  settings: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'update:settings'])
</script>
