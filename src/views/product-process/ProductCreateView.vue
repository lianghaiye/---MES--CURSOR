<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/ProductFormModal.vue'

defineOptions({ name: 'ProductCreateView' })

const listPath = '/product-process/products'
</script>
