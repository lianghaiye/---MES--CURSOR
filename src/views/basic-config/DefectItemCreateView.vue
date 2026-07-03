<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/DefectItemFormModal.vue'

defineOptions({ name: 'DefectItemCreateView' })

const listPath = '/basic-config/defect-items'
</script>
