<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/CreatePurchaseOrderModal.vue'
import { purchaseOrderState } from '@/store/purchaseOrderStore'

defineOptions({ name: 'PurchaseOrderEditView' })

const route = useRoute()
const listPath = '/procurement/purchase-orders'

const editRecord = computed(
  () => purchaseOrderState.orders.find((o) => o.id === route.params.id) || null,
)
</script>
