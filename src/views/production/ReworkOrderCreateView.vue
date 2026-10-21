<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateReworkOrderModal.vue'

defineOptions({ name: 'ReworkOrderCreateView' })

const listPath = '/production/rework-orders'
</script>
