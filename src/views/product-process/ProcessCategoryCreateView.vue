<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/ProcessCategoryFormModal.vue'

defineOptions({ name: 'ProcessCategoryCreateView' })

const listPath = '/product-process/process-category'
</script>
