<template>
  <FormComponent page-mode :list-path="listPath" />
</template>
<script setup>
import FormComponent from './components/StocktakeOrderFormModal.vue'
defineOptions({ name: 'StocktakeOrderCreateView' })
const listPath = '/inventory/stocktake'
</script>
