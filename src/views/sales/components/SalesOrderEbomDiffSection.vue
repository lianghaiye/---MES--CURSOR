<template>
  <div v-if="diffResult.hasDiff" class="ebom-diff-section">
    <div class="diff-head">
      <div class="diff-title">EBOM 差异对比</div>
      <div class="diff-meta">
        <span>初始版本 {{ diffResult.diff.boundVersion }}</span>
        <span class="arrow">→</span>
        <span>现行版本 {{ diffResult.diff.latestVersion }}</span>
      </div>
      <a-button
        v-if="canOpenCompare"
        size="small"
        type="link"
        class="open-compare-btn"
        @click="compareOpen = true"
      >
        弹窗对比
      </a-button>
    </div>

    <div class="diff-summary">
      <a-tag v-if="diffResult.diff.summary.added" color="success">
        新增 {{ diffResult.diff.summary.added }}
      </a-tag>
      <a-tag v-if="diffResult.diff.summary.modified" color="warning">
        修改 {{ diffResult.diff.summary.modified }}
      </a-tag>
      <a-tag v-if="diffResult.diff.summary.replaced" color="purple">
        替换 {{ diffResult.diff.summary.replaced }}
      </a-tag>
      <a-tag v-if="diffResult.diff.summary.removed" color="error">
        删除 {{ diffResult.diff.summary.removed }}
      </a-tag>
      <span v-if="!diffResult.diff.summary.total" class="no-structural-diff">
        物料结构无变化，仅 BOM 版本号已升级
      </span>
      <span v-if="diffResult.diff.boundSnapshotAt" class="snapshot-at">
        订单快照：{{ diffResult.diff.boundSnapshotAt }}
      </span>
    </div>

    <EbomDiffTable :diff="diffResult.diff" :show-summary="false" />

    <BomVersionCompareModal
      v-model:open="compareOpen"
      :old-bom="boundBom"
      :new-bom="activeBom"
      :quantity="salesQty"
      :title="compareTitle"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { buildSalesLineEbomDiff } from '@/utils/ebomSnapshotDiff'
import EbomDiffTable from '@/components/EbomDiffTable.vue'
import BomVersionCompareModal from '@/components/BomVersionCompareModal.vue'

const props = defineProps({
  line: { type: Object, required: true },
})

const compareOpen = ref(false)

const salesQty = computed(() => Number(props.line.salesQty ?? props.line.qty) || 1)

const diffResult = computed(() => buildSalesLineEbomDiff(props.line))

const boundBom = computed(() => {
  if (props.line.bomId) {
    const byId = getProductBomById(props.line.bomId)
    if (byId) return byId
  }
  return null
})

const activeBom = computed(() =>
  props.line.productId ? getActiveBomForItem('product', props.line.productId) : null,
)

const canOpenCompare = computed(() => Boolean(boundBom.value && activeBom.value))

const compareTitle = computed(() => {
  const left = diffResult.value.diff?.boundVersion || '订单版'
  const right = diffResult.value.diff?.latestVersion || '当前版'
  return `${props.line.productName || '产品'} · ${left} → ${right}`
})
</script>

<script>
export default { name: 'SalesOrderEbomDiffSection' }
</script>

<style lang="less" scoped>
.ebom-diff-section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.diff-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.diff-title {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.diff-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);

  .arrow {
    color: rgba(0, 0, 0, 0.35);
  }
}

.open-compare-btn {
  margin-left: auto;
  padding: 0;
}

.diff-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.no-structural-diff {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.snapshot-at {
  margin-left: auto;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
