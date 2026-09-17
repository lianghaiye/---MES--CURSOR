<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/TransferOrderFormModal.vue'
import { getTransferOrderById, transferOrderState } from '@/store/transferOrderStore'
defineOptions({ name: 'TransferOrderEditView' })
const route = useRoute()
const listPath = '/inventory/transfer'
const editRecord = computed(() => {
  void transferOrderState.orders
  return getTransferOrderById(route.params.id)
})
</script>
