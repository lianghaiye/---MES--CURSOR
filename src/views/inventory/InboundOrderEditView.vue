<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/InboundOrderFormModal.vue'
import { getInboundOrderById } from '@/store/inboundOrderStore'

defineOptions({ name: 'InboundOrderEditView' })

const route = useRoute()
const listPath = '/inventory/inbound'

const editRecord = computed(() => getInboundOrderById(route.params.id) || null)
</script>
