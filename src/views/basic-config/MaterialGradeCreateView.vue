<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/MaterialGradeFormModal.vue'

defineOptions({ name: 'MaterialGradeCreateView' })

const listPath = '/basic-config/material-grades'
</script>
