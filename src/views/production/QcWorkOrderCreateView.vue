<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateQcWorkOrderModal.vue'

defineOptions({ name: 'QcWorkOrderCreateView' })

const listPath = '/production/qc-work-orders'
</script>
