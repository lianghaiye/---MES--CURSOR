<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateFactoryQcModal.vue'

defineOptions({ name: 'FactoryQcCreateView' })

const listPath = '/quality/factory-qc'
</script>
