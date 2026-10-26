<template>
  <SalesContractFormModal
    page-mode
    :list-path="listPath"
    :default-type="defaultType"
    :seed-record="seedRecord"
  />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { CONTRACT_TYPE } from '@/constants/salesContract'
import { buildContractDraftFromSalesOrder } from '@/store/salesContractStore'
import { getSalesOrderById } from '@/utils/salesOrderDetail'
import SalesContractFormModal from './components/SalesContractFormModal.vue'

defineOptions({ name: 'SalesContractCreateView' })

const listPath = '/sales/contracts'
const route = useRoute()

const fromOrderId = computed(() => String(route.query.fromOrderId || '').trim())

const seedDraftResult = computed(() => {
  if (!fromOrderId.value) return null
  const order = getSalesOrderById(fromOrderId.value)
  return buildContractDraftFromSalesOrder(order)
})

const seedRecord = computed(() => (seedDraftResult.value?.ok ? seedDraftResult.value.data : null))

const defaultType = computed(() => {
  if (seedRecord.value?.contractType) return seedRecord.value.contractType
  const t = String(route.query.type || '')
  if (t === CONTRACT_TYPE.STANDARD || t === 'standard') return CONTRACT_TYPE.STANDARD
  if (t === CONTRACT_TYPE.FRAMEWORK || t === 'framework') return CONTRACT_TYPE.FRAMEWORK
  return CONTRACT_TYPE.STANDARD
})

watch(
  seedDraftResult,
  (res) => {
    if (!fromOrderId.value || !res) return
    if (!res.ok) {
      message.warning(res.message || '无法从订单生成合同')
      return
    }
    if (res.existing?.length) {
      message.info(
        `该订单已关联 ${res.existing.length} 份合同（如 ${res.existing[0].contractNo || '草稿'}），已预填仍可继续新建`,
      )
    }
  },
  { immediate: true },
)
</script>
