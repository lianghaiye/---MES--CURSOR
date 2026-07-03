<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/EmployeeGroupModal.vue'

defineOptions({ name: 'EmployeeGroupCreateView' })

const listPath = '/basic-config/employee-groups'
</script>
