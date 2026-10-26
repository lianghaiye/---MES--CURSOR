<template>
  <SalesContractChangeFormModal
    page-mode
    list-path="/sales/contract-changes"
    :initial-contract-id="initialContractId"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SalesContractChangeFormModal from './components/SalesContractChangeFormModal.vue'

defineOptions({ name: 'SalesContractChangeCreateView' })

const route = useRoute()
const initialContractId = computed(() => String(route.query.contractId || '').trim())
</script>
