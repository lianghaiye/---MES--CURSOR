<template>
  <a-modal
    :open="open"
    :title="title"
    width="1480px"
    :mask-closable="false"
    destroy-on-close
    class="select-bom-material-modal"
    @cancel="handleCancel"
  >
    <div class="picker-toolbar">
      <a-space :size="8" wrap class="toolbar-left">
        <a-button v-if="!onlyWithBom" type="primary" size="small" @click="materialFormOpen = true">
          <PlusOutlined />
          添加产品/物料
        </a-button>
        <a-input
          v-model:value="keyword"
          allow-clear
          size="small"
          placeholder="搜索产品/物料编号、名称、规格型号"
          class="search-input"
          @press-enter="handleQuickSearch"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
        <a-select
          v-model:value="quickItemType"
          allow-clear
          size="small"
          placeholder="类型"
          class="type-select"
          :options="itemTypeOpts"
          @change="handleQuickSearch"
        />
        <a-badge :count="activeFilterCount" :offset="[-4, 4]">
          <a-button
            size="small"
            :type="activeFilterCount ? 'primary' : 'default'"
            :ghost="!!activeFilterCount"
            @click="filterModalOpen = true"
          >
            <FilterOutlined />
            筛选
          </a-button>
        </a-badge>
      </a-space>
      <a-tooltip title="列显隐">
        <a-button type="text" size="small" @click="columnDrawerOpen = true">
          <SettingOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <div v-if="activeFilterCount" class="filter-tags">
      <span class="filter-tags-label">已设筛选：</span>
      <a-tag
        v-for="tag in filterTags"
        :key="tag.id"
        closable
        @close="removeFilterCondition(tag.id)"
      >
        {{ tag.label }}
      </a-tag>
      <a-button type="link" size="small" class="clear-filter-btn" @click="clearFilterConditions">
        清空筛选
      </a-button>
    </div>

    <div class="picker-body">
      <div class="table-panel">
        <a-table
          :row-selection="rowSelection"
          :columns="tableColumns"
          :data-source="pagedRows"
          row-key="rowKey"
          size="small"
          bordered
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: tableScrollX, y: tableScrollY }"
          @change="onTableChange"
        />
      </div>

      <div class="selected-panel">
        <div class="selected-head">
          <span class="selected-title">已选 {{ selectedRows.length }} 项</span>
          <a-button
            v-if="selectedRows.length"
            type="link"
            size="small"
            class="clear-btn"
            @click="clearSelection"
          >
            清空
          </a-button>
        </div>
        <div v-if="selectedRows.length" class="selected-list">
          <div v-for="item in selectedRows" :key="item.rowKey" class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ item.code }}</span>
              <span class="selected-name" :title="item.name">{{ item.name }}</span>
            </div>
            <a-button type="text" size="small" class="remove-btn" @click="removeSelected(item.rowKey)">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧勾选" class="selected-empty" />
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRows.length" @click="handleConfirm">
        {{ multiple ? '确定' : '确定选择' }}
      </a-button>
    </template>

    <MaterialFormModal v-if="!onlyWithBom" v-model:open="materialFormOpen" @saved="onMaterialSaved" />
    <BomSubItemColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
    />
    <BomSubItemFilterModal
      v-model:open="filterModalOpen"
      :conditions="appliedFilterConditions"
      @confirm="onFilterConfirm"
    />
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  SearchOutlined,
  SettingOutlined,
  PlusOutlined,
  CloseOutlined,
  FilterOutlined,
} from '@ant-design/icons-vue'
import { buildBomSubItemPickerRows, filterBomSubItemPickerRows, toBomSubItemPayload } from '@/utils/bomSubItemPicker'
import { buildBomLinkedPickerRows } from '@/utils/bomWithBomPicker'
import { applyBomSubItemFilterConditions } from '@/utils/bomSubItemFilter'
import {
  bomSubItemFilterFields,
  bomSubItemFilterOperatorOptions,
} from '@/mock/bomSubItemFilterFields'
import { addMaterial } from '@/store/materialInfoStore'
import { defaultBomSubItemPickerColumns } from '@/mock/bomSubItemPickerColumns'
import MaterialFormModal from './MaterialFormModal.vue'
import BomSubItemColumnSettingDrawer from './BomSubItemColumnSettingDrawer.vue'
import BomSubItemFilterModal from './BomSubItemFilterModal.vue'

const props = defineProps({
  open: Boolean,
  onlyWithBom: { type: Boolean, default: false },
  multiple: { type: Boolean, default: true },
  title: { type: String, default: '添加子项' },
})

const emit = defineEmits(['update:open', 'selected'])

const keyword = ref('')
const quickItemType = ref(undefined)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const materialFormOpen = ref(false)
const columnDrawerOpen = ref(false)
const filterModalOpen = ref(false)
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomSubItemPickerColumns)))
const selectedRowKeys = ref([])
const selectedRows = ref([])
const listVersion = ref(0)
const appliedFilterConditions = ref([])

const itemTypeOpts = [
  { label: '产品', value: '产品' },
  { label: '物料', value: '物料' },
]

const widthMap = {
  name: 160,
  code: 120,
  specModel: 110,
  itemType: 100,
  categoryName: 100,
  material: 80,
  drawingNo: 100,
  inventoryUnit: 72,
  subItemCount: 88,
  productAttribute: 120,
  supplyForm: 88,
  weight: 72,
  processRoute: 120,
  defaultWarehouse: 100,
  defaultSupplier: 110,
  defaultWorkCenter: 110,
  createdAt: 110,
  creator: 88,
}

const allRows = computed(() => {
  void listVersion.value
  if (props.onlyWithBom) return buildBomLinkedPickerRows()
  return buildBomSubItemPickerRows()
})

const filteredRows = computed(() => {
  let rows = allRows.value
  if (quickItemType.value) {
    rows = rows.filter((r) => r.itemType === quickItemType.value)
  }
  rows = applyBomSubItemFilterConditions(rows, appliedFilterConditions.value)
  return filterBomSubItemPickerRows(rows, keyword.value)
})

const activeFilterCount = computed(() =>
  appliedFilterConditions.value.filter(
    (c) =>
      c.field &&
      c.operator &&
      (c.operator === 'empty' ||
        c.operator === 'notEmpty' ||
        String(c.value ?? '').trim() !== ''),
  ).length,
)

const filterTags = computed(() =>
  appliedFilterConditions.value
    .filter(
      (c) =>
        c.field &&
        c.operator &&
        (c.operator === 'empty' ||
          c.operator === 'notEmpty' ||
          String(c.value ?? '').trim() !== ''),
    )
    .map((c) => ({
      id: c.id,
      label: formatFilterTag(c),
    })),
)

const tableColumns = computed(() => {
  const sorted = [...columnSettings.value]
    .filter((c) => !c.hidden)
    .sort((a, b) => a.order - b.order)
  return sorted.map((c) => ({
    title: c.title,
    key: c.key,
    dataIndex: c.key,
    width: widthMap[c.key] || 100,
    fixed: c.frozen ? 'left' : undefined,
    ellipsis: ['name', 'processRoute', 'defaultSupplier'].includes(c.key),
  }))
})

const tableScrollX = computed(() => {
  const sum = tableColumns.value.reduce((s, c) => s + (c.width || 100), 0)
  return Math.max(sum, 900)
})

const tableScrollY = computed(() => 520)

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredRows.value.length,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100'],
  showTotal: (total) => `共 ${total} 条（产品信息 + 物料信息）`,
  size: 'small',
}))

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const rowSelection = computed(() => ({
  type: props.multiple ? 'checkbox' : 'radio',
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    const map = new Map(selectedRows.value.map((r) => [r.rowKey, r]))
    rows.forEach((r) => map.set(r.rowKey, r))
    selectedRows.value = keys
      .map((key) => map.get(key) || allRows.value.find((r) => r.rowKey === key))
      .filter(Boolean)
  },
}))

watch(keyword, () => {
  page.value = 1
})

watch(quickItemType, () => {
  page.value = 1
})

watch(
  () => keyword.value,
  () => {
    loading.value = true
    requestAnimationFrame(() => {
      loading.value = false
    })
  },
)

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    keyword.value = ''
    quickItemType.value = undefined
    page.value = 1
    appliedFilterConditions.value = []
    selectedRowKeys.value = []
    selectedRows.value = []
    listVersion.value += 1
  },
)

function formatFilterTag(condition) {
  const field = bomSubItemFilterFields.find((f) => f.key === condition.field)
  const type = field?.type || 'text'
  const operator =
    bomSubItemFilterOperatorOptions[type]?.find((o) => o.value === condition.operator)?.label ||
    condition.operator
  const fieldLabel = field?.label || condition.field
  if (condition.operator === 'empty' || condition.operator === 'notEmpty') {
    return `${fieldLabel} ${operator}`
  }
  return `${fieldLabel} ${operator} ${condition.value ?? ''}`
}

function handleQuickSearch() {
  page.value = 1
}

function onFilterConfirm(conditions) {
  appliedFilterConditions.value = conditions || []
  page.value = 1
}

function removeFilterCondition(id) {
  appliedFilterConditions.value = appliedFilterConditions.value.filter((c) => c.id !== id)
  page.value = 1
}

function clearFilterConditions() {
  appliedFilterConditions.value = []
  page.value = 1
}

function onTableChange(pag) {
  page.value = pag.current
  pageSize.value = pag.pageSize
}

function removeSelected(rowKey) {
  selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== rowKey)
  selectedRows.value = selectedRows.value.filter((r) => r.rowKey !== rowKey)
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedRows.value = []
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRows.value.length) {
    message.warning('请至少选择一项')
    return
  }
  emit(
    'selected',
    selectedRows.value.map((row) => toBomSubItemPayload(row)),
  )
  keyword.value = ''
  page.value = 1
  appliedFilterConditions.value = []
  selectedRowKeys.value = []
  selectedRows.value = []
  emit('update:open', false)
}

function onMaterialSaved({ isEdit, data }) {
  if (isEdit) return
  const row = addMaterial(data)
  listVersion.value += 1
  const picked = buildBomSubItemPickerRows().find((r) => r.rowKey === `物料-${row.id}`)
  if (picked && !selectedRowKeys.value.includes(picked.rowKey)) {
    selectedRowKeys.value = [...selectedRowKeys.value, picked.rowKey]
    selectedRows.value = [...selectedRows.value, picked]
  }
  message.success('物料已保存并加入已选列表')
}
</script>

<style lang="less" scoped>
.select-bom-material-modal {
  :deep(.ant-modal-body) {
    padding-top: 16px;
  }

  .picker-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;

    .toolbar-left {
      flex: 1;
      min-width: 0;
    }

    .search-input {
      width: 360px;
    }

    .type-select {
      width: 120px;
    }
  }

  .filter-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
    padding: 8px 10px;
    background: #f6ffed;
    border: 1px solid #d9f7be;
    border-radius: 4px;
  }

  .filter-tags-label {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
    flex-shrink: 0;
  }

  .clear-filter-btn {
    padding: 0;
    height: auto;
  }

  .picker-body {
    display: flex;
    gap: 12px;
    height: 580px;
    max-height: calc(86vh - 200px);
    min-height: 520px;
  }

  .table-panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .selected-panel {
    width: 260px;
    flex-shrink: 0;
    height: 100%;
    min-height: 0;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    background: #fafafa;
    overflow: hidden;
  }

  .selected-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    background: #fff;
    flex-shrink: 0;
  }

  .selected-title {
    font-weight: 600;
    font-size: 13px;
    color: #333;
  }

  .clear-btn {
    padding: 0;
    height: auto;
  }

  .selected-list {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 8px;
  }

  .selected-item {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 8px;
    margin-bottom: 6px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
  }

  .selected-item-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .selected-code {
    font-size: 12px;
    color: #1677ff;
    font-weight: 500;
  }

  .selected-name {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    flex-shrink: 0;
    color: rgba(0, 0, 0, 0.45);

    &:hover {
      color: #ff4d4f;
    }
  }

  .selected-empty {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 0;
  }
}
</style>
