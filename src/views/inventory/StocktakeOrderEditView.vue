<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/StocktakeOrderFormModal.vue'
import { getStocktakeOrderById, stocktakeOrderState } from '@/store/stocktakeOrderStore'
defineOptions({ name: 'StocktakeOrderEditView' })
const route = useRoute()
const listPath = '/inventory/stocktake'
const editRecord = computed(() => {
  void stocktakeOrderState.orders
  return getStocktakeOrderById(route.params.id)
})
</script>
