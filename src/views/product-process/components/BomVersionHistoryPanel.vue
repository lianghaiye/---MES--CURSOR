<template>
  <div class="bom-version-history-panel">
    <EcnBomVersionTimeline
      :items="timelineItems"
      @view-bom="emit('view-bom', $event)"
      @compare="emit('compare', $event)"
    />
    <a-empty v-if="!timelineItems.length" description="暂无历史版本" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { buildBomVersionHistoryFromGroup } from '@/utils/ecnBomVersionHistory'
import { productBomState } from '@/store/productBomStore'
import EcnBomVersionTimeline from '@/views/engineering-change/components/EcnBomVersionTimeline.vue'

const props = defineProps({
  versionGroupId: { type: String, default: '' },
  /** 无版本组时展示当前 BOM 单条记录 */
  currentBom: { type: Object, default: null },
})

const emit = defineEmits(['view-bom', 'compare'])

function formatDate(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

const timelineItems = computed(() => {
  if (props.versionGroupId) {
    return buildBomVersionHistoryFromGroup(props.versionGroupId, productBomState.boms)
  }
  if (props.currentBom) {
    return [
      {
        version: props.currentBom.version || '—',
        tag: '当前版本',
        date: formatDate(props.currentBom.effectiveAt || props.currentBom.createdAt),
        ecnNo: props.currentBom.sourceEcnNo || '',
        changeSummary: props.currentBom.changeSummary || props.currentBom.remark || '',
        executor: props.currentBom.creator || '—',
        isInitial: true,
        initialNote: '初始BOM · 当前仅有一个版本',
        bomId: props.currentBom.id,
      },
    ]
  }
  return []
})
</script>

<script>
export default { name: 'BomVersionHistoryPanel' }
</script>

<style lang="less" scoped>
.bom-version-history-panel {
  padding: 4px 0;
}
</style>
