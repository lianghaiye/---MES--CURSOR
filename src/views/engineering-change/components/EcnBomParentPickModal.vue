<template>
  <a-modal
    :open="open"
    :title="title"
    width="98vw"
    :style="{ maxWidth: '1680px', top: '20px' }"
    :mask-closable="false"
    destroy-on-close
    class="ecn-bom-parent-pick-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="filter-form">
      <a-form-item label="物料名称">
        <a-input
          v-model:value="filters.itemName"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 110px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="物料编码">
        <a-input
          v-model:value="filters.materialCode"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 110px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="规格型号">
        <a-input
          v-model:value="filters.specModel"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 100px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="类别">
        <a-input
          v-model:value="filters.categoryName"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 90px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="材质">
        <a-input
          v-model:value="filters.material"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 90px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="图号">
        <a-input
          v-model:value="filters.drawingNo"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 100px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item>
        <a-space :size="8">
          <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
          <a-button size="small" @click="handleReset">清空</a-button>
          <a-button v-if="isMaterialTreeMode" size="small" @click="toggleExpandAll">
            {{ allExpanded ? '收起' : '展开' }}
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <div v-if="isMaterialTreeMode" class="table-meta">共 {{ treeRowCount }} 条</div>

    <a-table
      :columns="displayColumns"
      :data-source="tableData"
      row-key="key"
      size="small"
      bordered
      :pagination="isMaterialTreeMode ? false : pagination"
      :row-selection="rowSelection"
      :expanded-row-keys="isMaterialTreeMode ? expandedKeys : []"
      @update:expandedRowKeys="onExpandedChange"
      :scroll="{ x: tableScrollX, y: 460 }"
      @change="onTableChange"
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
        <a-empty description="暂无 BOM 物料" />
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!canConfirm" @click="handleConfirm">
        {{ confirmLabel }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { collectOverviewRowKeys } from '@/utils/bomOverview'
import { bomOverviewBaseColumns } from '@/mock/bomOverviewColumns'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import {
  flattenBomOverviewPickerRows,
  filterBomOverviewPickerRows,
  buildBomOverviewPickTree,
  filterBomOverviewPickTree,
  countBomOverviewPickTreeRows,
  resolveBomLineFromPickRow,
} from '@/utils/ecnProductSource'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '选择父项物料' },
  pickMode: { type: String, default: 'parent' },
  multiple: { type: Boolean, default: false },
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  rootLabel: { type: String, default: '' },
  bomPickerLines: { type: Array, default: () => [] },
  excludeLineIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const emptyFilters = () => ({
  itemName: '',
  materialCode: '',
  specModel: '',
  categoryName: '',
  material: '',
  drawingNo: '',
})

const filters = reactive(emptyFilters())
const appliedFilters = reactive(emptyFilters())
const selectedRowKey = ref('')
const selectedRow = ref(null)
const selectedRowKeys = ref([])
const selectedRows = ref([])
const expandedKeys = ref([])
const page = ref(1)
const pageSize = ref(20)

const isMaterialTreeMode = computed(() => props.pickMode === 'material')

const { displayColumns, tableScrollX } = useTableColumnSettings(
  'ecn-bom-parent-pick',
  bomOverviewBaseColumns,
  { minScrollX: 1400 },
)

const sourceTree = computed(() => buildBomOverviewPickTree(props.flatNodes, props.lineItems))

const filteredTree = computed(() => filterBomOverviewPickTree(sourceTree.value, appliedFilters))

const flatParentRows = computed(() =>
  flattenBomOverviewPickerRows(props.flatNodes, props.lineItems, props.rootLabel),
)

const filteredFlatRows = computed(() =>
  filterBomOverviewPickerRows(flatParentRows.value, appliedFilters),
)

const tableData = computed(() => {
  if (isMaterialTreeMode.value) return filteredTree.value
  const start = (page.value - 1) * pageSize.value
  return filteredFlatRows.value.slice(start, start + pageSize.value)
})

const treeRowCount = computed(() => countBomOverviewPickTreeRows(filteredTree.value))

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredFlatRows.value.length,
  size: 'small',
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
}))

const allExpanded = computed(() => {
  const all = collectOverviewRowKeys(filteredTree.value)
  return all.length > 0 && all.every((k) => expandedKeys.value.includes(k))
})

const canConfirm = computed(() =>
  props.multiple ? selectedRows.value.length > 0 : !!selectedRow.value,
)

const confirmLabel = computed(() => {
  if (props.multiple && selectedRows.value.length) {
    return `确定添加（${selectedRows.value.length}）`
  }
  return '确定'
})

const rowSelection = computed(() => {
  const selection = {
    type: props.multiple ? 'checkbox' : 'radio',
    selectedRowKeys: props.multiple
      ? selectedRowKeys.value
      : selectedRowKey.value
        ? [selectedRowKey.value]
        : [],
    preserveSelectedRowKeys: props.multiple,
    onChange: (keys, rows) => {
      if (props.multiple) {
        selectedRowKeys.value = keys
        const map = new Map(selectedRows.value.map((r) => [r.key, r]))
        rows.forEach((r) => map.set(r.key, r))
        selectedRows.value = keys.map((key) => map.get(key)).filter(Boolean)
      } else {
        selectedRowKey.value = keys[0] || ''
        selectedRow.value = rows[0] || null
      }
    },
  }
  if (props.multiple) {
    selection.getCheckboxProps = (record) => ({
      disabled: props.excludeLineIds.length > 0 && props.excludeLineIds.includes(record.key),
    })
  }
  return selection
})

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    handleReset()
    selectedRowKey.value = ''
    selectedRow.value = null
    selectedRowKeys.value = []
    selectedRows.value = []
    page.value = 1
    expandedKeys.value = collectOverviewRowKeys(sourceTree.value)
  },
)

watch(filteredTree, (tree) => {
  if (!props.open || !isMaterialTreeMode.value) return
  expandedKeys.value = collectOverviewRowKeys(tree)
})

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(2)
}

function handleSearch() {
  Object.assign(appliedFilters, { ...filters })
  page.value = 1
}

function handleReset() {
  Object.assign(filters, emptyFilters())
  Object.assign(appliedFilters, emptyFilters())
  page.value = 1
}

function onExpandedChange(keys) {
  if (!isMaterialTreeMode.value) return
  expandedKeys.value = keys
}

function toggleExpandAll() {
  if (allExpanded.value) {
    expandedKeys.value = []
  } else {
    expandedKeys.value = collectOverviewRowKeys(filteredTree.value)
  }
}

function onTableChange(pag) {
  if (isMaterialTreeMode.value) return
  page.value = pag.current
  pageSize.value = pag.pageSize
}

function handleCancel() {
  emit('update:open', false)
}

function resolveLine(row) {
  return resolveBomLineFromPickRow(row, props.bomPickerLines, props.lineItems, props.flatNodes)
}

function handleConfirm() {
  if (props.pickMode === 'material') {
    if (props.multiple) {
      if (!selectedRows.value.length) {
        message.warning('请选择需要变更的 BOM 行')
        return
      }
      const lines = selectedRows.value.map((row) => resolveLine(row)).filter(Boolean)
      if (!lines.length) {
        message.warning('未找到对应 BOM 物料行')
        return
      }
      emit('confirm', lines)
    } else {
      if (!selectedRow.value) {
        message.warning('请选择BOM物料')
        return
      }
      const line = resolveLine(selectedRow.value)
      if (!line) {
        message.warning('未找到对应 BOM 物料行')
        return
      }
      emit('confirm', { line, row: selectedRow.value })
    }
  } else {
    if (!selectedRow.value) {
      message.warning('请选择父项物料')
      return
    }
    emit('confirm', {
      parentPath: selectedRow.value.pickValue || selectedRow.value.parentPath,
      parentMaterial: selectedRow.value.pickValue || selectedRow.value.parentPath,
      row: selectedRow.value,
    })
  }
  emit('update:open', false)
}
</script>

<script>
export default { name: 'EcnBomParentPickModal' }
</script>

<style lang="less" scoped>
.filter-form {
  margin-bottom: 12px;
  row-gap: 8px;
}

.table-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.overview-index-cell {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  min-width: 56px;
  font-variant-numeric: tabular-nums;
  line-height: 22px;
  vertical-align: middle;
}

:deep(.ant-table-cell-with-append) {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

:deep(.ant-table-row-expand-icon) {
  margin-top: 0;
  margin-bottom: 0;
  flex-shrink: 0;
}

:deep(.ant-table-row-indent) {
  flex-shrink: 0;
}

:deep(.ant-table-cell) {
  .overview-index-cell {
    word-break: keep-all;
  }
}
</style>
