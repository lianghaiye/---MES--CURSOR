<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/ProcessConfigFormModal.vue'

defineOptions({ name: 'ProcessConfigCreateView' })

const listPath = '/product-process/process-config'
</script>
