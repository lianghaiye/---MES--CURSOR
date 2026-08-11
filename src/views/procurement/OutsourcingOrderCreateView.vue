<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateOutsourcingOrderModal.vue'

defineOptions({ name: 'OutsourcingOrderCreateView' })

const listPath = '/procurement/outsourcing-orders'
</script>
