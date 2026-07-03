<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreatePurchaseOrderModal.vue'

defineOptions({ name: 'PurchaseOrderCreateView' })

const listPath = '/procurement/purchase-orders'
</script>
