<template>
  <div class="tab-pane-body item-bom-info-tab">
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
    <a-empty v-else description="暂无关联 BOM" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { productBomState, getBomsForItem } from '@/store/productBomStore'
import { bomStatusColor } from '@/mock/productBomOptions'
import { useTabs } from '@/composables/useTabs'

const props = defineProps({
  itemType: { type: String, required: true },
  itemId: { type: [String, Number], default: '' },
})

const router = useRouter()
const { openTab } = useTabs()

const rows = computed(() => {
  void productBomState.boms
  if (!props.itemId) return []
  return getBomsForItem(props.itemType, props.itemId)
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
</script>

<style lang="less" scoped>
.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}
</style>
