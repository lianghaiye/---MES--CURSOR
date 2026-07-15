<template>
  <FormComponent
    page-mode
    mode="apply"
    :list-path="listPath"
    :initial-sales-order-id="salesOrderId"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/DeliveryFormModal.vue'

defineOptions({ name: 'ApplyDeliveryCreateView' })

const route = useRoute()
const listPath = '/sales/orders'
const salesOrderId = computed(() => String(route.query.salesOrderId || ''))
</script>
