<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/MaterialFormModal.vue'

defineOptions({ name: 'MaterialCreateView' })

const listPath = '/product-process/materials'
</script>
