<template>
  <div class="tab-pane-body item-bom-info-tab">
    <div class="bom-status-card">
      <div class="bom-status-main">
        <template v-if="activeBom">
          <div class="bom-status-title">自有生效 BOM</div>
          <div class="bom-status-meta">
            {{ activeBom.bomNo || activeBom.id }} · {{ activeBom.bomName || '—' }} · 版本
            {{ activeBom.version || '—' }}
            <span v-if="activeBom.effectiveAt"> · 生效 {{ activeBom.effectiveAt }}</span>
          </div>
        </template>
        <template v-else>
          <div class="bom-status-title is-empty">未关联自有生效 BOM</div>
          <div class="bom-status-meta">
            销售「使用产品 BOM」需本 SKU 自有生效版本；族模板仅作设计参考，不可直接投产。
          </div>
        </template>
        <div v-if="variantHint" class="bom-variant-hint">{{ variantHint }}</div>
        <div v-if="spuTemplateHint" class="bom-template-hint">{{ spuTemplateHint }}</div>
      </div>
      <a-space wrap>
        <a-button
          v-if="itemId"
          type="primary"
          size="small"
          :disabled="disabled"
          @click="openCreateBom"
        >
          新建 BOM
        </a-button>
        <a-button
          v-if="activeBom"
          size="small"
          :disabled="disabled"
          @click="openBomDetail(activeBom)"
        >
          编辑/查看生效版
        </a-button>
      </a-space>
    </div>

    <div class="section-label">版本列表</div>
    <a-table
      v-if="rows.length"
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1180 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'bomNo'">
          <a class="link-code" @click.prevent="openBomDetail(record)">{{ record.bomNo }}</a>
        </template>
        <template v-else-if="column.key === 'effectiveAt'">
          {{ record.effectiveAt || '—' }}
        </template>
        <template v-else-if="column.key === 'expiredAt'">
          {{ record.expiredAt || '—' }}
        </template>
      </template>
    </a-table>
    <a-empty v-else description="暂无关联 BOM 版本" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  productBomState,
  getBomsForItem,
  getOwnActiveBomForItem,
  getProductBomById,
} from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { findSpuById } from '@/store/spuStore'
import { bomStatusColor } from '@/mock/productBomOptions'
import { useTabs } from '@/composables/useTabs'

const props = defineProps({
  itemType: { type: String, required: true },
  itemId: { type: [String, Number], default: '' },
  disabled: { type: Boolean, default: false },
})

const router = useRouter()
const { openTab } = useTabs()

const masterRecord = computed(() => {
  if (!props.itemId) return null
  if (props.itemType === 'product') {
    return productInfoState.products.find((p) => String(p.id) === String(props.itemId)) || null
  }
  return materialInfoState.materials.find((m) => String(m.id) === String(props.itemId)) || null
})

const activeBom = computed(() => {
  void productBomState.boms
  if (!props.itemId) return null
  return getOwnActiveBomForItem(props.itemType, props.itemId)
})

const rows = computed(() => {
  void productBomState.boms
  if (!props.itemId) return []
  return getBomsForItem(props.itemType, props.itemId)
})

const variantHint = computed(() => {
  const row = masterRecord.value
  if (!row?.isVariantSku && !row?.spuId) return ''
  const bits = [row.specModel, row.material].filter(Boolean)
  return bits.length ? `变体：${bits.join(' / ')}` : '变体 SKU'
})

const spuTemplateHint = computed(() => {
  const row = masterRecord.value
  if (!row?.spuId) return ''
  const spu = findSpuById(row.spuId)
  if (!spu?.baseBomId) return ''
  const tpl = getProductBomById(spu.baseBomId)
  const label = tpl?.bomNo || tpl?.bomName || spu.baseBomId
  return `族模板：${label}（仅作设计参考，不直接投产）`
})

const columns = [
  { title: '状态', key: 'status', width: 88, fixed: 'left' },
  { title: 'BOM编码', key: 'bomNo', width: 160, ellipsis: true },
  { title: 'BOM名称', dataIndex: 'bomName', width: 180, ellipsis: true },
  { title: 'BOM版本', dataIndex: 'version', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
  { title: '生效日期', key: 'effectiveAt', width: 150 },
  { title: '失效日期', key: 'expiredAt', width: 150 },
]

function openBomDetail(record) {
  const resolved = router.resolve({
    name: 'product-process-bom-detail',
    params: { id: record.id },
  })
  openTab(resolved.path, record.bomName || 'BOM详情')
  router.push(resolved)
}

function openCreateBom() {
  if (!props.itemId) return
  const master = masterRecord.value
  const resolved = router.resolve({
    path: '/product-process/bom/new',
    query: {
      itemType: props.itemType,
      itemId: String(props.itemId),
      itemName: master?.name || '',
      bomType: '产品BOM',
    },
  })
  openTab(resolved.path, '新建产品BOM')
  router.push(resolved)
}
</script>

<style lang="less" scoped>
.bom-status-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.bom-status-title {
  font-weight: 600;
  font-size: 13px;
  &.is-empty {
    color: rgba(0, 0, 0, 0.65);
  }
}
.bom-status-meta,
.bom-variant-hint,
.bom-template-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}
.section-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}
.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}
</style>
