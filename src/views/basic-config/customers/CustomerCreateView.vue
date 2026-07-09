<template>
  <CustomerFormPage page-mode :list-path="listPath" />
</template>

<script setup>
import CustomerFormPage from './components/CustomerFormPage.vue'

defineOptions({ name: 'CustomerCreateView' })

const listPath = '/basic-config/customers'
</script>
