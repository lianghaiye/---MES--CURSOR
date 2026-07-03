<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/WarehouseFormModal.vue'

defineOptions({ name: 'WarehouseCreateView' })

const listPath = '/basic-config/warehouses'
</script>
