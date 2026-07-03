<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/DeliveryFormModal.vue'

defineOptions({ name: 'DeliveryCreateView' })

const listPath = '/sales/delivery'
</script>
