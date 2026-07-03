<template>
  <FormComponent page-mode :list-path="listPath" />
</template>

<script setup>
import FormComponent from './components/CreateDesignTaskModal.vue'

defineOptions({ name: 'DesignTaskCreateView' })

const listPath = '/planning/design-task'
</script>
