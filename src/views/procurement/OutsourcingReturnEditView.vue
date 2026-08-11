<template>
  <FormComponent page-mode :list-path="listPath" :record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/OutsourcingReturnFormModal.vue'
import { outsourcingReturnState } from '@/store/outsourcingReturnStore'

defineOptions({ name: 'OutsourcingReturnEditView' })

const route = useRoute()
const listPath = '/procurement/outsourcing-returns'

const editRecord = computed(
  () => outsourcingReturnState.returns.find((r) => r.id === route.params.id) || null,
)
</script>
