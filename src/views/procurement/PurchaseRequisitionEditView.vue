<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/CreatePurchaseRequisitionModal.vue'
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'

defineOptions({ name: 'PurchaseRequisitionEditView' })

const route = useRoute()
const listPath = '/procurement/purchase-req'

const editRecord = computed(
  () => purchaseRequisitionState.requisitions.find((r) => r.id === route.params.id) || null,
)
</script>
