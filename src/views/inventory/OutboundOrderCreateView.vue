<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/OutboundOrderFormModal.vue'

defineOptions({ name: 'OutboundOrderCreateView' })

const listPath = '/inventory/outbound'
</script>
