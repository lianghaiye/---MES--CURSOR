<template>
  <SalesContractChangeFormModal
    page-mode
    review-mode
    list-path="/contracts/changes"
    :record="record"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getContractChangeById, salesContractChangeState } from '@/store/salesContractChangeStore'
import SalesContractChangeFormModal from './components/SalesContractChangeFormModal.vue'

defineOptions({ name: 'SalesContractChangeApproveView' })

const route = useRoute()
const record = computed(() => {
  void salesContractChangeState.changes
  return getContractChangeById(route.params.id)
})
</script>
