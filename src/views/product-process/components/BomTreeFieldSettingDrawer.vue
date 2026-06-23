<template>
  <TableColumnSettingDrawer
    :open="open"
    :settings="settings"
    :default-settings="defaultBomTreeFieldSettings"
    title="字段配置"
    hint="最多支持显示4个字段"
    :max-visible="4"
    :show-frozen="false"
    display-mode="show"
    @update:open="emit('update:open', $event)"
    @update:settings="emit('update:settings', $event)"
  />
</template>

<script setup>
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import { defaultBomTreeFieldSettings } from '@/mock/bomTreeFieldSettings'

defineProps({
  open: Boolean,
  settings: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'update:settings'])
</script>
