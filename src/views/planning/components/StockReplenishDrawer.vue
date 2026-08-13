<template>
  <a-drawer
    :open="open"
    title="库存预警"
    width="980"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <StockReplenishPanel v-if="open" table-scroll-y="420" @created="onCreated" />
  </a-drawer>
</template>

<script setup>
import StockReplenishPanel from './StockReplenishPanel.vue'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'created'])

function onCreated(payload) {
  emit('created', payload)
  emit('update:open', false)
}
</script>
