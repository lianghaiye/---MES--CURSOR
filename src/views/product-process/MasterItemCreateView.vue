<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/MasterItemFormModal.vue'

defineOptions({ name: 'MasterItemCreateView' })

const listPath = '/product-process/products'
</script>
