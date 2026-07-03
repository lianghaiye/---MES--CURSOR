<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/WarehouseCategoryFormModal.vue'

defineOptions({ name: 'WarehouseCategoryCreateView' })

const listPath = '/basic-config/warehouse-categories'
</script>
