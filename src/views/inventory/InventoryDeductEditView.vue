<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/InventoryDeductEditModal.vue'
import { getMaterialDeductById, materialRequisitionState } from '@/store/materialRequisitionStore'

defineOptions({ name: 'InventoryDeductEditView' })

const route = useRoute()
const listPath = '/inventory/deduct-records'
const editRecord = computed(() => {
  void materialRequisitionState.records
  return getMaterialDeductById(String(route.params.id || ''))
})
</script>
