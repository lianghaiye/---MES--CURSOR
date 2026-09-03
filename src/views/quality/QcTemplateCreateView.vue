<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/QcTemplateFormModal.vue'

defineOptions({ name: 'QcTemplateCreateView' })

const listPath = '/quality/qc-template'
</script>
