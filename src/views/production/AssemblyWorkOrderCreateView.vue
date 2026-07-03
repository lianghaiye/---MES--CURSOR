<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateAssemblyWorkOrderModal.vue'

defineOptions({ name: 'AssemblyWorkOrderCreateView' })

const listPath = '/production/assembly-work-orders'
</script>
