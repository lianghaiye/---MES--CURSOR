<template>
  <div class="bom-version-info-section">
    <div v-if="latestBom" class="latest-bom-bar">
      <div class="latest-main">
        <span class="label">最新 BOM</span>
        <span class="name">{{ latestBom.bomName }}</span>
        <a-tag color="blue">{{ latestBom.version }}</a-tag>
        <a-tag v-if="latestBomStatusLabel" :color="latestBomStatusColor">
          {{ latestBomStatusLabel }}
        </a-tag>
      </div>
      <div v-if="showBoundHint" class="bound-hint">
        绑定版本：{{ boundVersion || '—' }} · 当前已升级至 {{ latestBom.version }}
      </div>
    </div>
    <a-empty v-else description="暂无关联 BOM" />

    <template v-if="historyItems.length">
      <div class="history-title">版本变更记录</div>
      <EcnBomVersionTimeline
        :items="historyItems"
        @view-bom="handleViewBom"
        @compare="handleCompare"
      />
    </template>

    <BomVersionCompareModal
      v-model:open="compareOpen"
      :old-bom="compareOldBom"
      :new-bom="compareNewBom"
      :quantity="compareQuantity"
      :title="compareTitle"
    />
  </div>
</template>

<script>
export default { name: 'BomVersionInfoSection' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getOwnActiveBomForItem, getBomsForItem, getProductBomById } from '@/store/productBomStore'
import {
  buildBomVersionHistoryFromGroup,
  buildBomVersionHistoryForProduct,
} from '@/utils/ecnBomVersionHistory'
import { useTabs } from '@/composables/useTabs'
import EcnBomVersionTimeline from '@/views/engineering-change/components/EcnBomVersionTimeline.vue'
import BomVersionCompareModal from '@/components/BomVersionCompareModal.vue'

const props = defineProps({
  productId: { type: [String, Number], default: '' },
  bomId: { type: String, default: '' },
  boundVersion: { type: String, default: '' },
  versionGroupId: { type: String, default: '' },
  /** EBOM 展开数量（销售订单行销售数量） */
  compareQuantity: { type: Number, default: 1 },
})

const router = useRouter()
const { openTab } = useTabs()
const compareOpen = ref(false)
const compareOldBom = ref(null)
const compareNewBom = ref(null)
const compareTitle = ref('')

const latestBom = computed(() => {
  // 投产口径：仅 SKU 自有生效 BOM，不用族模板解析
  if (props.productId) return getOwnActiveBomForItem('product', props.productId)
  if (props.bomId) {
    const row = getProductBomById(props.bomId)
    if (!row) return null
    return getOwnActiveBomForItem(row.itemType, row.itemId) || row
  }
  return null
})

const resolvedGroupId = computed(
  () => props.versionGroupId || latestBom.value?.versionGroupId || '',
)

const historyItems = computed(() => {
  if (resolvedGroupId.value) {
    return buildBomVersionHistoryFromGroup(resolvedGroupId.value)
  }
  if (props.productId) {
    return buildBomVersionHistoryForProduct(props.productId)
  }
  return []
})

const showBoundHint = computed(() => {
  if (!props.boundVersion || !latestBom.value?.version) return false
  return props.boundVersion !== latestBom.value.version
})

const latestBomStatusLabel = computed(() => {
  const status = latestBom.value?.status
  if (status === '生效') return '现行'
  return status || ''
})

const latestBomStatusColor = computed(() => {
  const status = latestBom.value?.status
  if (status === '生效' || status === '现行') return 'success'
  return 'default'
})

function handleViewBom(item) {
  const bomId = item.bomId || latestBom.value?.id
  if (!bomId) {
    message.info('暂无关联 BOM')
    return
  }
  const path = `/product-process/bom/${bomId}`
  openTab(path, 'BOM详情')
  router.push(path)
}

function resolveBomsForCompare() {
  if (props.productId) return getBomsForItem('product', props.productId)
  const seed = props.bomId ? getProductBomById(props.bomId) : latestBom.value
  if (seed) return getBomsForItem(seed.itemType, seed.itemId)
  return []
}

function handleCompare(item) {
  const newBom = getProductBomById(item.bomId)
  if (!newBom) {
    message.warning('未找到当前版本 BOM')
    return
  }

  const allBoms = resolveBomsForCompare()
  const oldBom = allBoms.find((bom) => bom.version === item.compareVersion)
  if (!oldBom) {
    message.warning(`未找到对比版本 ${item.compareVersion || ''}`)
    return
  }

  compareOldBom.value = oldBom
  compareNewBom.value = newBom
  compareTitle.value = `${newBom.bomName || 'BOM'} · ${oldBom.version} → ${newBom.version}`
  compareOpen.value = true
}
</script>

<style lang="less" scoped>
.bom-version-info-section {
  padding: 4px 0;
}

.latest-bom-bar {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.latest-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .label {
    font-size: 12px;
    color: #8c8c8c;
  }

  .name {
    font-size: 14px;
    font-weight: 600;
  }
}

.bound-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #fa8c16;
}

.history-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}
</style>
