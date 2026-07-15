<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/CreateSalesOrderModal.vue'
import { salesOrderState } from '@/store/salesOrderStore'

defineOptions({ name: 'SalesOrderEditView' })

const route = useRoute()
const listPath = '/sales/orders'

const editRecord = computed(
  () => salesOrderState.orders.find((o) => o.id === route.params.id) || null,
)
</script>
