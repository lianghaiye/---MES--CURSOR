<template>
  <SupplierFormPage v-if="record" page-mode :list-path="listPath" :record="record" />
  <a-empty v-else description="供应商不存在" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getSupplierById } from '@/store/supplierStore'
import SupplierFormPage from './components/SupplierFormPage.vue'

defineOptions({ name: 'SupplierEditView' })

const route = useRoute()
const listPath = '/basic-config/suppliers'

const record = computed(() => getSupplierById(route.params.id))
</script>
