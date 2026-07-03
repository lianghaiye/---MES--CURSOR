<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateDisassemblyWorkOrderModal.vue'

defineOptions({ name: 'DisassemblyWorkOrderCreateView' })

const listPath = '/production/disassembly-work-orders'
</script>
