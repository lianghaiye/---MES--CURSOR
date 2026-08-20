<template>
  <FormComponent page-mode :list-path="listPath" :edit-record="editRecord" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FormComponent from './components/MasterItemFormModal.vue'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { resolveMasterItemEditRecord } from '@/utils/masterItemSave'

defineOptions({ name: 'MasterItemEditView' })

const route = useRoute()
const listPath = '/product-process/products'

const editRecord = computed(() => {
  const id = route.params.id
  if (!id) return null
  void productInfoState.products
  void materialInfoState.materials
  const product = productInfoState.products.find((p) => p.id === id)
  if (product) return resolveMasterItemEditRecord(product)
  const material = materialInfoState.materials.find((m) => m.id === id)
  return material ? resolveMasterItemEditRecord(material) : null
})
</script>
