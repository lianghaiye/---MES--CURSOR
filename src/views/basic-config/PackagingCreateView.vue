<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/PackagingSpuFormModal.vue'

defineOptions({ name: 'PackagingCreateView' })

const listPath = '/basic-config/packaging'
</script>
