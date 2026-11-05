<template>
  <a-modal
    :open="open"
    title="上传回货单"
    width="640px"
    ok-text="保存物流信息"
    cancel-text="关闭"
    destroy-on-close
    @ok="onOk"
    @cancel="emit('update:open', false)"
  >
    <DeliveryReturnReceiptSection v-if="order" ref="sectionRef" :order="order" @saved="onSaved" />
  </a-modal>
</template>

<script>
export default { name: 'DeliveryReturnReceiptModal' }
</script>

<script setup>
import { ref } from 'vue'
import DeliveryReturnReceiptSection from './DeliveryReturnReceiptSection.vue'

defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const sectionRef = ref(null)

function onOk() {
  sectionRef.value?.saveLogistics?.()
}

function onSaved(order) {
  emit('saved', order)
}
</script>
