<template>
  <TableColumnSettingDrawer
    :open="open"
    :settings="settings"
    :default-settings="defaultBomSubItemPickerColumns"
    title="列显隐"
    @update:open="emit('update:open', $event)"
    @update:settings="emit('update:settings', $event)"
  />
</template>

<script setup>
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import { defaultBomSubItemPickerColumns } from '@/mock/bomSubItemPickerColumns'

defineProps({
  open: Boolean,
  settings: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'update:settings'])
</script>
