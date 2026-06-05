<template>
  <EbomMaterialTreeView
    :tree-data="bundle.treeData"
    :expanded-keys="bundle.expandedKeys"
    :bom-meta="bundle.bomMeta"
    :empty-text="bundle.hint || '未找到当前制品在物料树中的子件 BOM'"
    :subtitle="subtitle"
  />
</template>

<script setup>
import { computed } from 'vue'
import { buildWorkOrderCurrentBomTree } from '@/utils/workOrderEbomTree'
import EbomMaterialTreeView from './EbomMaterialTreeView.vue'

const props = defineProps({
  workOrder: { type: Object, default: null },
})

const bundle = computed(() => buildWorkOrderCurrentBomTree(props.workOrder))

const subtitle = computed(() => {
  const wo = props.workOrder
  if (!wo) return ''
  return `当前制品：${wo.productName || '—'}${wo.materialCode ? `（${wo.materialCode}）` : ''}`
})
</script>
