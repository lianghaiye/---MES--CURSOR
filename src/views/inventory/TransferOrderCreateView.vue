<template>
  <FormComponent page-mode :list-path="listPath" />
</template>
<script setup>
import FormComponent from './components/TransferOrderFormModal.vue'
defineOptions({ name: 'TransferOrderCreateView' })
const listPath = '/inventory/transfer'
</script>
