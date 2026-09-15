<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/WarehouseLocationFormModal.vue'

defineOptions({ name: 'WarehouseLocationCreateView' })

const listPath = '/basic-config/warehouse-locations'
</script>
