<template>
  <CustomerFormPage v-if="record" page-mode :list-path="listPath" :record="record" />
  <a-empty v-else description="客户不存在" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getCustomerById } from '@/store/customerStore'
import CustomerFormPage from './components/CustomerFormPage.vue'

defineOptions({ name: 'CustomerEditView' })

const route = useRoute()
const listPath = '/basic-config/customers'

const record = computed(() => getCustomerById(route.params.id))
</script>
