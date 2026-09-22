<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/ProcessRouteEditorModal.vue'
import { getProcessRouteById, processRouteState } from '@/store/processRouteStore'

defineOptions({ name: 'ProcessRouteEditView' })

const route = useRoute()
const listPath = '/product-process/routing'

const editRecord = computed(() => {
  void processRouteState.routes
  return getProcessRouteById(route.params.id) || null
})
</script>
