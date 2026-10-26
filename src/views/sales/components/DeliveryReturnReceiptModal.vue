<template>
  <a-modal
    :open="open"
    title="上传回货单"
    width="560px"
    :footer="null"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <DeliveryReturnReceiptSection v-if="order" :order="order" />
  </a-modal>
</template>

<script>
export default { name: 'DeliveryReturnReceiptModal' }
</script>

<script setup>
import DeliveryReturnReceiptSection from './DeliveryReturnReceiptSection.vue'

defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])
</script>
