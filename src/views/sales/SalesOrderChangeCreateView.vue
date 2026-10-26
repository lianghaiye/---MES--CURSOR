<template>
  <SalesPriceChangeModal
    page-mode
    list-path="/sales/order-changes"
    :initial-sales-order-id="initialSalesOrderId"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SalesPriceChangeModal from './components/SalesPriceChangeModal.vue'

defineOptions({ name: 'SalesOrderChangeCreateView' })

const route = useRoute()
const initialSalesOrderId = computed(() => String(route.query.salesOrderId || '').trim())
</script>
