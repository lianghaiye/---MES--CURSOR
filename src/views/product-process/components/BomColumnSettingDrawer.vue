<template>
  <TableColumnSettingDrawer
    :open="open"
    :settings="visibleSettings"
    :default-settings="visibleDefaultSettings"
    @update:open="emit('update:open', $event)"
    @update:settings="onUpdateSettings"
  />
</template>

<script setup>
import { computed } from 'vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'

const LIST_HIDDEN_KEYS = new Set(['blankSizeText'])

const props = defineProps({
  open: Boolean,
  settings: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'update:settings'])

const visibleDefaultSettings = defaultBomColumnSettings.filter((c) => !LIST_HIDDEN_KEYS.has(c.key))

const visibleSettings = computed(() =>
  (props.settings || []).filter((c) => !LIST_HIDDEN_KEYS.has(c.key)),
)

function onUpdateSettings(next) {
  const hiddenCols = (props.settings || []).filter((c) => LIST_HIDDEN_KEYS.has(c.key))
  emit('update:settings', [...next, ...hiddenCols])
}
</script>
