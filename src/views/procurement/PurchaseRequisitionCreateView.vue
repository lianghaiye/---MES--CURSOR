<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreatePurchaseRequisitionModal.vue'

defineOptions({ name: 'PurchaseRequisitionCreateView' })

const listPath = '/procurement/purchase-req'
</script>
