<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateWorkOrderModal.vue'

defineOptions({ name: 'WorkOrderCreateView' })

const listPath = '/production/work-orders'
</script>
