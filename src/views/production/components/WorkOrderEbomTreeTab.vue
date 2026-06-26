<template>
  <EbomMaterialTreeView
    :tree-data="bundle.treeData"
    :expanded-keys="bundle.expandedKeys"
    :bom-meta="bundle.bomMeta"
    :empty-text="emptyText"
    :subtitle="subtitle"
  />
</template>

<script setup>
import { computed } from 'vue'
import { buildWorkOrderEbomTree } from '@/utils/workOrderEbomTree'
import EbomMaterialTreeView from './EbomMaterialTreeView.vue'

const props = defineProps({
  workOrder: { type: Object, default: null },
  variant: { type: String, default: 'production' },
})

const bundle = computed(() => buildWorkOrderEbomTree(props.workOrder, props.variant))

const subtitle = computed(() => {
  if (props.variant === 'assembly') return ''
  if (props.workOrder?.ebomSnapshot?.snapshotAt) {
    return `EBOM 快照 · ${props.workOrder.ebomSnapshot.snapshotAt}`
  }
  if (props.workOrder?.status === '待下发') {
    return '未下发：展示保存时关联的产品 BOM'
  }
  const parent = props.workOrder?.bom
  if (parent && parent !== props.workOrder?.productName) {
    return `所属成品 EBOM：${parent}（当前制品：${props.workOrder?.productName || '—'}）`
  }
  return ''
})

const emptyText = computed(() =>
  props.variant === 'assembly'
    ? '未找到该成品的使用中 BOM，请先在「产品BOM」维护'
    : '未找到关联成品 EBOM，请确认工单 BOM 字段或产品BOM 配置',
)
</script>
