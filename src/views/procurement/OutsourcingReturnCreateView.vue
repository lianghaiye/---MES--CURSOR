<template>
  <FormComponent
    page-mode
    :list-path="listPath"
    :initial-outsourcing-order-no="initialOutsourcingOrderNo"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/OutsourcingReturnFormModal.vue'

defineOptions({ name: 'OutsourcingReturnCreateView' })

const route = useRoute()
const listPath = '/procurement/outsourcing-returns'
const initialOutsourcingOrderNo = computed(() =>
  String(route.query.outsourcingOrderNo || '').trim(),
)
</script>
