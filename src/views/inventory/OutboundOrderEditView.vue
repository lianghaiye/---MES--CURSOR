<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/OutboundOrderFormModal.vue'
import { getOutboundOrderById } from '@/store/outboundStore'

defineOptions({ name: 'OutboundOrderEditView' })

const route = useRoute()
const listPath = '/inventory/outbound'

const editRecord = computed(() => getOutboundOrderById(route.params.id) || null)
</script>
