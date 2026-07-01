<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="1400px"
    wrap-class-name="bom-version-compare-modal-wrap"
    :footer="null"
    destroy-on-close
    class="bom-version-compare-modal"
    @cancel="emit('update:open', false)"
  >
    <div v-if="comparePayload" class="compare-body">
      <div class="compare-meta">
        <span>{{ comparePayload.leftVersion }}</span>
        <span class="arrow">→</span>
        <span>{{ comparePayload.rightVersion }}</span>
        <span v-if="comparePayload.quantity > 1" class="qty-hint">
          按数量 {{ comparePayload.quantity }} 展开
        </span>
      </div>

      <a-tabs v-model:active-key="viewMode">
        <a-tab-pane key="diff" tab="差异清单">
          <EbomDiffTable :diff="comparePayload.diff" />
        </a-tab-pane>
        <a-tab-pane key="full" tab="并排对比">
          <div class="full-hint">按 BOM 树结构位置左右对照；整项换料（编码与名称均变）在同一行以「原物料 ⇄ 新物料」展示。</div>
          <EbomFullCompareTable
            :rows="comparePayload.fullRows"
            :left-version="comparePayload.leftVersion"
            :right-version="comparePayload.rightVersion"
          />
        </a-tab-pane>
      </a-tabs>
    </div>
    <a-empty v-else description="暂无对比数据" />
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { buildBomVersionComparePayload } from '@/utils/ebomSnapshotDiff'
import EbomDiffTable from '@/components/EbomDiffTable.vue'
import EbomFullCompareTable from '@/components/EbomFullCompareTable.vue'

const props = defineProps({
  open: Boolean,
  oldBom: { type: Object, default: null },
  newBom: { type: Object, default: null },
  quantity: { type: Number, default: 1 },
  title: { type: String, default: '' },
})

const emit = defineEmits(['update:open'])

const viewMode = ref('diff')

const comparePayload = computed(() => {
  if (!props.oldBom || !props.newBom) return null
  return buildBomVersionComparePayload(props.oldBom, props.newBom, props.quantity)
})

const modalTitle = computed(
  () => props.title || `BOM 版本对比 · ${comparePayload.value?.leftVersion || ''} → ${comparePayload.value?.rightVersion || ''}`,
)
</script>

<script>
export default { name: 'BomVersionCompareModal' }
</script>

<style lang="less" scoped>
.compare-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);

  .arrow {
    color: rgba(0, 0, 0, 0.25);
  }
}

.qty-hint {
  margin-left: auto;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.full-hint {
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>

<style lang="less">
.bom-version-compare-modal-wrap .ant-modal {
  max-width: min(1400px, 96vw);
  top: 24px;
}

.bom-version-compare-modal-wrap .ant-modal-body {
  max-height: calc(100vh - 120px);
  overflow: auto;
}
</style>
