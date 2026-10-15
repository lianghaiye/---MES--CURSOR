<template>
  <FormComponent
    page-mode
    :list-path="listPath"
    :mode="formMode"
    :initial-sales-order-id="salesOrderId"
    :delivery-kind="deliveryKind"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/DeliveryFormModal.vue'
import { DELIVERY_KIND } from '@/utils/accessoryReship'

defineOptions({ name: 'DeliveryCreateView' })

const route = useRoute()
const salesOrderId = computed(() => String(route.query.salesOrderId || ''))
const formMode = computed(() => (salesOrderId.value ? 'apply' : 'create'))
const listPath = computed(() => (salesOrderId.value ? '/sales/orders' : '/sales/delivery'))
const deliveryKind = computed(() =>
  String(route.query.deliveryKind || '') === DELIVERY_KIND.ACCESSORY_RESHIP
    ? DELIVERY_KIND.ACCESSORY_RESHIP
    : DELIVERY_KIND.NORMAL,
)
</script>
