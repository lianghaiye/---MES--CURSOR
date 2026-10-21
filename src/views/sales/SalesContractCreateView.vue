<template>
  <SalesContractFormModal page-mode :list-path="listPath" :default-type="defaultType" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CONTRACT_TYPE } from '@/constants/salesContract'
import SalesContractFormModal from './components/SalesContractFormModal.vue'

defineOptions({ name: 'SalesContractCreateView' })

const listPath = '/sales/contracts'
const route = useRoute()

const defaultType = computed(() => {
  const t = String(route.query.type || '')
  if (t === CONTRACT_TYPE.STANDARD || t === 'standard') return CONTRACT_TYPE.STANDARD
  if (t === CONTRACT_TYPE.FRAMEWORK || t === 'framework') return CONTRACT_TYPE.FRAMEWORK
  return CONTRACT_TYPE.FRAMEWORK
})
</script>
