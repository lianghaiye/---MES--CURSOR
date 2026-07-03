<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/ProcessRouteEditorModal.vue'

defineOptions({ name: 'ProcessRouteCreateView' })

const listPath = '/product-process/routing'
</script>
