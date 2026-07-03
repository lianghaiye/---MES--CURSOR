<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/InboundOrderFormModal.vue'

defineOptions({ name: 'InboundOrderCreateView' })

const listPath = '/inventory/inbound'
</script>
