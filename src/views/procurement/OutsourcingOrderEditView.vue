<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/CreateOutsourcingOrderModal.vue'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

defineOptions({ name: 'OutsourcingOrderEditView' })

const route = useRoute()
const listPath = '/procurement/outsourcing-orders'

const editRecord = computed(
  () => outsourcingOrderState.orders.find((o) => o.id === route.params.id) || null,
)
</script>
