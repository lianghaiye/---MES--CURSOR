<template>
  <FormComponent
    page-mode
    :list-path="listPath"
    :initial-purchase-order-no="initialPurchaseOrderNo"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/PurchaseReturnFormModal.vue'

defineOptions({ name: 'PurchaseReturnCreateView' })

const route = useRoute()
const listPath = '/procurement/purchase-returns'
const initialPurchaseOrderNo = computed(() => String(route.query.purchaseOrderNo || '').trim())
</script>
