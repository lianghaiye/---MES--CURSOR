<template>
  <a-modal
    :open="open"
    title="BOM概览"
    width="98vw"
    :style="{ maxWidth: '1680px', top: '20px' }"
    :mask-closable="false"
    destroy-on-close
    class="bom-overview-modal"
    @cancel="handleClose"
  >
    <div class="overview-body">
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
          <TableColumnSettingButton @click="columnDrawerOpen = true" />
        </div>
      </div>

      <div class="overview-meta">
        <div class="meta-item">
          <span class="meta-label">BOM编码</span>
          <span class="meta-value" :title="displayInfo.bomNo">{{ displayInfo.bomNo }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">规格型号</span>
          <span class="meta-value" :title="displayInfo.specModel">{{ displayInfo.specModel }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">BOM版本号</span>
          <span class="meta-value" :title="displayInfo.version">{{ displayInfo.version }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">材质</span>
          <span class="meta-value" :title="displayInfo.material">{{ displayInfo.material }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">图号</span>
          <span class="meta-value" :title="displayInfo.drawingNo">{{ displayInfo.drawingNo }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">技术参数</span>
          <span class="meta-value" :title="displayInfo.techParams">{{ displayInfo.techParams }}</span>
        </div>
        <div class="meta-item meta-item-wide">
          <span class="meta-label">配置要求</span>
          <span class="meta-value" :title="displayInfo.matchingRequirements">
            {{ displayInfo.matchingRequirements }}
          </span>
        </div>
      </div>

      <div class="components-section-title">组件</div>

      <a-table
        :columns="displayColumns"
        :data-source="tableData"
        row-key="key"
        size="small"
        bordered
        :pagination="false"
        v-model:expanded-row-keys="expandedKeys"
        :scroll="{ x: tableScrollX, y: 480 }"
        @update:expandedRowKeys="onExpandedChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'index'">
            <span class="overview-index-cell">{{ record.index }}</span>
          </template>
          <template v-else-if="column.key === 'unitQty'">
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

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <BomPrintModal
      v-model:open="printModalOpen"
      :flat-nodes="flatNodes"
      :line-items="lineItems"
      :root-item-name="rootItemName"
      :overview-info="overviewInfo"
      :quantity="quantity"
      :column-settings="columnSettings"
    />
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
import { bomOverviewBaseColumns } from '@/mock/bomOverviewColumns'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import BomPrintModal from './BomPrintModal.vue'

const props = defineProps({
  open: Boolean,
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  rootItemName: { type: String, default: '' },
  overviewInfo: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:open'])

const quantity = ref(1)
const expandedKeys = ref([])
const printModalOpen = ref(false)

const {
  columnSettings,
  columnDrawerOpen,
  displayColumns,
  tableScrollX,
  defaultColumnSettings,
} = useTableColumnSettings('bom-overview-list', bomOverviewBaseColumns, { minScrollX: 1400 })

const displayInfo = computed(() => ({
  bomNo: props.overviewInfo?.bomNo || '—',
  specModel: props.overviewInfo?.specModel || '—',
  version: props.overviewInfo?.version || '—',
  material: props.overviewInfo?.material || '—',
  drawingNo: props.overviewInfo?.drawingNo || '—',
  techParams: props.overviewInfo?.techParams || '—',
  matchingRequirements: props.overviewInfo?.matchingRequirements || '—',
}))

const treeData = computed(() => {
  const scale = Number(quantity.value) || 1
  return assignOverviewIndexes(buildBomOverviewTree(props.flatNodes, props.lineItems, scale))
})

const tableData = computed(() => treeData.value)

const allExpanded = computed(() => {
  const all = collectOverviewRowKeys(treeData.value)
  return all.length > 0 && all.every((k) => expandedKeys.value.includes(k))
})

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
  printModalOpen.value = true
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
    align-items: center;
  }

  .overview-meta {
    display: flex;
    flex-wrap: nowrap;
    gap: 0;
    margin-bottom: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    overflow-x: auto;
    background: #fafafa;
  }

  .meta-item {
    display: flex;
    align-items: center;
    flex: 1 0 auto;
    min-width: 0;
    border-right: 1px solid #f0f0f0;

    &:last-child {
      border-right: none;
    }
  }

  .meta-item-wide {
    flex: 1.4 0 auto;
    min-width: 160px;
  }

  .meta-label {
    flex-shrink: 0;
    padding: 8px 10px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);
    background: #fafafa;
    border-right: 1px solid #f0f0f0;
    white-space: nowrap;
  }

  .meta-value {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
    background: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .components-section-title {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #262626;
  }

  .overview-index-cell {
    display: inline-block;
    white-space: nowrap;
    min-width: 56px;
    font-variant-numeric: tabular-nums;
  }

  :deep(.ant-table-cell) {
    .overview-index-cell {
      word-break: keep-all;
    }
  }
}
</style>
