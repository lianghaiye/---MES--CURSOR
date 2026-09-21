<template>
  <FormComponent page-mode :list-path="listPath" :record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/ProcessConfigFormModal.vue'
import { getProcessById, processConfigState } from '@/store/processConfigStore'

defineOptions({ name: 'ProcessConfigEditView' })

const route = useRoute()
const listPath = '/product-process/process-config'

const editRecord = computed(() => {
  void processConfigState.processes
  return getProcessById(route.params.id) || null
})
</script>
