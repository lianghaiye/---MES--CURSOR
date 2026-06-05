<template>
  <EbomMaterialTreeView
    :tree-data="bundle.treeData"
    :expanded-keys="bundle.expandedKeys"
    :bom-meta="bundle.bomMeta"
    empty-text="未找到该物品的使用中 BOM，请先在「产品BOM」维护"
  />
</template>

<script setup>
import { computed } from 'vue'
import { buildDisassemblyEbomTree } from '@/utils/disassemblyEbomTree'
import EbomMaterialTreeView from './EbomMaterialTreeView.vue'

const props = defineProps({
  workOrder: { type: Object, default: null },
})

const bundle = computed(() => buildDisassemblyEbomTree(props.workOrder))
</script>
