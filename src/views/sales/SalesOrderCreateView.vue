<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateSalesOrderModal.vue'

defineOptions({ name: 'SalesOrderCreateView' })

const listPath = '/sales/orders'
</script>
