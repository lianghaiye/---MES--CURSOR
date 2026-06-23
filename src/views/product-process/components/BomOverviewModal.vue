<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="96vw"
    :style="{ maxWidth: '1480px', top: '24px' }"
    :mask-closable="false"
    destroy-on-close
    class="bom-overview-modal"
    @cancel="handleClose"
  >
    <div ref="printRef" class="overview-body">
      <div class="overview-toolbar">
        <div class="toolbar-left">
          <div class="root-name">{{ rootItemName }}</div>
          <div class="qty-row">
            <span class="qty-label">数量</span>
            <a-input-number
              v-model:value="quantity"
              size="small"
              :min="0"
              :precision="2"
              class="qty-input"
            />
          </div>
        </div>
        <div class="toolbar-right">
          <a-button size="small" @click="handlePrint">
            <PrinterOutlined />
            打印
          </a-button>
          <a-button size="small" @click="toggleExpandAll">
            {{ allExpanded ? '收起' : '展开' }}
          </a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="tableData"
        row-key="key"
        size="small"
        bordered
        :pagination="false"
        v-model:expanded-row-keys="expandedKeys"
        :scroll="{ x: 1400, y: 480 }"
        @update:expandedRowKeys="onExpandedChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'unitQty'">
            {{ formatQty(record.unitQty) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无子项" />
        </template>
      </a-table>
    </div>

    <template #footer>
      <a-button type="primary" @click="handleClose">关闭</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { PrinterOutlined } from '@ant-design/icons-vue'
import {
  assignOverviewIndexes,
  buildBomOverviewTree,
  collectOverviewRowKeys,
} from '@/utils/bomOverview'

const props = defineProps({
  open: Boolean,
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  rootItemName: { type: String, default: '' },
})

const emit = defineEmits(['update:open'])

const quantity = ref(1)
const expandedKeys = ref([])
const printRef = ref(null)

const modalTitle = computed(() => `${props.rootItemName || '—'}/BOM概览`)

const treeData = computed(() => {
  const scale = Number(quantity.value) || 1
  return assignOverviewIndexes(buildBomOverviewTree(props.flatNodes, props.lineItems, scale))
})

const tableData = computed(() => treeData.value)

const allExpanded = computed(() => {
  const all = collectOverviewRowKeys(treeData.value)
  return all.length > 0 && all.every((k) => expandedKeys.value.includes(k))
})

const columns = [
  { title: '序号', dataIndex: 'index', key: 'index', width: 72, fixed: 'left' },
  { title: '产品名称', dataIndex: 'itemName', key: 'itemName', width: 180, ellipsis: true },
  { title: '产品编码', dataIndex: 'materialCode', key: 'materialCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90 },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 100, ellipsis: true },
  { title: '单位用量', dataIndex: 'unitQty', key: 'unitQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 72 },
  { title: '物料类型', dataIndex: 'materialType', key: 'materialType', width: 90 },
  { title: '物料类别', dataIndex: 'categoryName', key: 'categoryName', width: 90 },
  { title: '供应型态', dataIndex: 'supplyForm', key: 'supplyForm', width: 90 },
  { title: '工艺文件', dataIndex: 'processDocName', key: 'processDocName', width: 110, ellipsis: true },
  { title: '工艺路线', dataIndex: 'processRoute', key: 'processRoute', width: 120, ellipsis: true },
]

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    quantity.value = 1
    expandedKeys.value = collectOverviewRowKeys(
      assignOverviewIndexes(buildBomOverviewTree(props.flatNodes, props.lineItems, 1)),
    )
  },
)

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(2)
}

function onExpandedChange(keys) {
  expandedKeys.value = keys
}

function toggleExpandAll() {
  if (allExpanded.value) {
    expandedKeys.value = []
  } else {
    expandedKeys.value = collectOverviewRowKeys(treeData.value)
  }
}

function handlePrint() {
  window.print()
}

function handleClose() {
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.bom-overview-modal {
  .overview-body {
    min-height: 200px;
  }

  .overview-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
  }

  .toolbar-left {
    min-width: 0;
  }

  .root-name {
    font-size: 16px;
    font-weight: 600;
    color: #262626;
    margin-bottom: 8px;
  }

  .qty-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .qty-label {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .qty-input {
    width: 120px;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

@media print {
  :global(.ant-modal-mask),
  :global(.ant-modal-wrap:not(.bom-overview-modal)) {
    display: none !important;
  }

  :global(.bom-overview-modal .ant-modal-footer) {
    display: none !important;
  }
}
</style>
