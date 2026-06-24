<template>
  <a-drawer
    :open="open"
    title="查看关联BOM"
    placement="right"
    width="720"
    :mask-closable="true"
    destroy-on-close
    class="bom-relation-drawer"
    @close="handleClose"
  >
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="child" tab="子件BOM" />
      <a-tab-pane key="parent" tab="父级BOM" />
    </a-tabs>

    <p class="tab-desc">{{ tabDesc }}</p>

    <a-table
      :columns="columns"
      :data-source="currentRows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 980 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'bomName'">
          <a class="link-name" @click.prevent="openBomDetail(record)">{{ record.bomName }}</a>
        </template>
        <template v-else-if="column.key === 'subItemCount'">
          {{ record.subItemCount ?? '—' }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] ?? '—' }}
        </template>
      </template>
      <template #emptyText>
        <a-empty :description="emptyText" />
      </template>
    </a-table>
  </a-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { findChildBomReferenceRows, findParentBomReferenceRows } from '@/utils/bomRelation'
import { useTabs } from '@/composables/useTabs'

const props = defineProps({
  open: Boolean,
  bom: { type: Object, default: null },
  lineItems: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const { openTab } = useTabs()
const activeTab = ref('child')

const columns = [
  { title: 'BOM名称', dataIndex: 'bomName', key: 'bomName', width: 140, ellipsis: true },
  { title: 'BOM编码', dataIndex: 'bomNo', key: 'bomNo', width: 120, ellipsis: true },
  { title: '物品名称', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 90, ellipsis: true },
  { title: '单位用量', dataIndex: 'unitQty', key: 'unitQty', width: 88, align: 'right' },
  { title: '子件项数', dataIndex: 'subItemCount', key: 'subItemCount', width: 88, align: 'center' },
]

const childRows = computed(() => {
  if (!props.bom) return []
  return findChildBomReferenceRows(props.bom, props.lineItems?.length ? props.lineItems : undefined)
})

const parentRows = computed(() => {
  if (!props.bom?.id) return []
  return findParentBomReferenceRows(props.bom)
})

const currentRows = computed(() =>
  activeTab.value === 'child' ? childRows.value : parentRows.value,
)

const tabDesc = computed(() =>
  activeTab.value === 'child'
    ? '当前 BOM 通过「按 BOM 添加」引用的子件 BOM'
    : '在其他 BOM 树结构中引用了本 BOM 的父级 BOM',
)

const emptyText = computed(() =>
  activeTab.value === 'child' ? '暂无引用的子件 BOM' : '暂无父级 BOM 引用本 BOM',
)

watch(
  () => props.open,
  (visible) => {
    if (visible) activeTab.value = 'child'
  },
)

function handleClose() {
  emit('update:open', false)
}

function openBomDetail(record) {
  if (!record.bomId) return
  const resolved = router.resolve({
    name: 'product-process-bom-detail',
    params: { id: record.bomId },
  })
  openTab(resolved.path, record.bomName || 'BOM详情')
  router.push(resolved)
}
</script>

<style lang="less" scoped>
.bom-relation-drawer {
  .tab-desc {
    margin: 0 0 12px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.5;
  }

  .link-name {
    color: #1677ff;
    cursor: pointer;

    &:hover {
      color: #4096ff;
    }
  }
}
</style>
