<template>
  <FormComponent page-mode :list-path="listPath" mode="edit" :record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/DeliveryFormModal.vue'
import { getDeliveryOrderById } from '@/store/deliveryOrderStore'

defineOptions({ name: 'DeliveryEditView' })

const route = useRoute()
const listPath = '/sales/delivery'

const editRecord = computed(() => getDeliveryOrderById(route.params.id) || null)
</script>
