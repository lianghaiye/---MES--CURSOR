<template>
  <FormComponent page-mode :list-path="listPath" :record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/PurchaseReturnFormModal.vue'
import { purchaseReturnState } from '@/store/purchaseReturnStore'

defineOptions({ name: 'PurchaseReturnEditView' })

const route = useRoute()
const listPath = '/procurement/purchase-returns'

const editRecord = computed(
  () => purchaseReturnState.returns.find((r) => r.id === route.params.id) || null,
)
</script>
