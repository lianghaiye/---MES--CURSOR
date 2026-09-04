<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/QcFieldLibraryFormModal.vue'

defineOptions({ name: 'QcFieldLibraryCreateView' })

const listPath = '/quality/qc-field-library'
</script>
