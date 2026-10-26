<template>
  <SalesPriceChangeModal
    page-mode
    list-path="/sales/order-changes"
    :sales-order="salesOrder"
    :pending-change="pendingChange"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getPriceChangeById, salesPriceChangeState } from '@/store/salesPriceChangeStore'
import { getSalesOrderById } from '@/store/salesOrderStore'
import SalesPriceChangeModal from './components/SalesPriceChangeModal.vue'

defineOptions({ name: 'SalesOrderChangeApproveView' })

const route = useRoute()

const pendingChange = computed(() => {
  void salesPriceChangeState.orders
  return getPriceChangeById(route.params.id)
})

const salesOrder = computed(() => getSalesOrderById(pendingChange.value?.salesOrderId))
</script>
