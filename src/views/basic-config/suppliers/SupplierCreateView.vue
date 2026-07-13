<template>
  <SupplierFormPage page-mode :list-path="listPath" />
</template>

<script setup>
import SupplierFormPage from './components/SupplierFormPage.vue'

defineOptions({ name: 'SupplierCreateView' })

const listPath = '/basic-config/suppliers'
</script>
