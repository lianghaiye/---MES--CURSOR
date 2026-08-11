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
      <a-form v-if="ecnNewMaterialMode" layout="inline" class="ecn-filter-form toolbar-left">
        <a-form-item label="类型">
          <a-select
            v-model:value="quickItemType"
            size="small"
            class="type-select"
            :options="itemTypeOpts"
          />
        </a-form-item>
        <a-form-item label="物品名称">
          <a-input
            v-model:value="ecnFilters.itemName"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 110px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="编码">
          <a-input
            v-model:value="ecnFilters.materialCode"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 110px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="规格型号">
          <a-input
            v-model:value="ecnFilters.specModel"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 100px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="类别">
          <a-input
            v-model:value="ecnFilters.categoryName"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 90px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="材质">
          <a-input
            v-model:value="ecnFilters.material"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 90px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="图号">
          <a-input
            v-model:value="ecnFilters.drawingNo"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 100px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item>
          <a-space :size="8">
            <a-button type="primary" size="small" @click="handleEcnSearch">搜索</a-button>
            <a-button size="small" @click="handleEcnClear">清空</a-button>
          </a-space>
        </a-form-item>
      </a-form>
      <a-form v-else layout="inline" class="ecn-filter-form toolbar-left">
        <a-form-item v-if="!onlyWithBom && !hideAddMaterial">
          <a-button type="primary" size="small" @click="materialFormOpen = true">
            <PlusOutlined />
            添加产品/物料
          </a-button>
        </a-form-item>
        <a-form-item label="类型">
          <a-select
            v-model:value="quickItemType"
            allow-clear
            size="small"
            placeholder="全部"
            class="type-select"
            :options="itemTypeOpts"
          />
        </a-form-item>
        <a-form-item v-if="includeSpuTemplates" label="产品族/SKU">
          <a-select
            v-model:value="catalogKindFilter"
            allow-clear
            size="small"
            placeholder="全部"
            style="width: 110px"
            :options="catalogKindOpts"
          />
        </a-form-item>
        <a-form-item label="物品名称">
          <a-input
            v-model:value="ecnFilters.itemName"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 110px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="编码">
          <a-input
            v-model:value="ecnFilters.materialCode"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 110px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="规格型号">
          <a-input
            v-model:value="ecnFilters.specModel"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 100px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="类别">
          <a-input
            v-model:value="ecnFilters.categoryName"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 90px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="材质">
          <a-input
            v-model:value="ecnFilters.material"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 90px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item label="图号">
          <a-input
            v-model:value="ecnFilters.drawingNo"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 100px"
            @press-enter="handleEcnSearch"
          />
        </a-form-item>
        <a-form-item>
          <a-space :size="8">
            <a-button type="primary" size="small" @click="handleEcnSearch">搜索</a-button>
            <a-button size="small" @click="handleEcnClear">清空</a-button>
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
        </a-form-item>
      </a-form>
      <a-tooltip v-if="!ecnNewMaterialMode" title="列显隐">
        <a-button type="text" size="small" @click="columnDrawerOpen = true">
          <SettingOutlined />
        </a-button>
      </a-tooltip>
      <a-tooltip v-if="ecnNewMaterialMode" title="列显隐">
        <a-button type="text" size="small" @click="columnDrawerOpen = true">
          <SettingOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <div v-if="!ecnNewMaterialMode && activeFilterCount" class="filter-tags">
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
          :custom-row="customRow"
          row-key="rowKey"
          size="small"
          bordered
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: tableScrollX, y: tableScrollY }"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, text, record }">
            <template v-if="column.key === 'variantSummary'">
              <a-tooltip v-if="record.variantTooltip || text">
                <template #title>
                  <div class="variant-tip-title">{{ tooltipTitle(record) }}</div>
                </template>
                <span class="variant-summary-cell">{{ text || '—' }}</span>
              </a-tooltip>
              <span v-else class="variant-summary-cell is-empty">—</span>
            </template>
          </template>
        </a-table>
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
            <a-button
              type="text"
              size="small"
              class="remove-btn"
              @click="removeSelected(item.rowKey)"
            >
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button
        type="primary"
        :loading="confirming"
        :disabled="!selectedRows.length"
        @click="handleConfirm"
      >
        {{ multiple ? '确定' : '确定选择' }}
      </a-button>
    </template>

    <MaterialFormModal
      v-if="!onlyWithBom && !hideAddMaterial"
      v-model:open="materialFormOpen"
      @saved="onMaterialSaved"
    />
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
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SettingOutlined, PlusOutlined, CloseOutlined, FilterOutlined } from '@ant-design/icons-vue'
import {
  buildBomSubItemPickerRows,
  dedupePickerRowsPreferProduct,
  filterEcnNewMaterialRows,
  invalidateBomSubItemPickerRowsCache,
  toBomSubItemPayload,
} from '@/utils/bomSubItemPicker'
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
  hideAddMaterial: { type: Boolean, default: false },
  ecnNewMaterialMode: { type: Boolean, default: false },
  pickerDefaultItemType: { type: String, default: '' },
  multiple: { type: Boolean, default: true },
  title: { type: String, default: '添加子项' },
  /** 销售选品：列表同时展示产品族模板（规格/材质/变体为空） */
  includeSpuTemplates: { type: Boolean, default: false },
  /** 仅展示可销售产品族 */
  spuCanSellOnly: { type: Boolean, default: true },
  /** 打开时预勾选的主数据 id（产品/物料），配合 multiple 回显已选 */
  initialSelectedIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'selected'])

const keyword = ref('')
const quickItemType = ref(undefined)
const catalogKindFilter = ref(undefined)
const loading = ref(false)
const confirming = ref(false)
const page = ref(1)
const pageSize = ref(20)
const materialFormOpen = ref(false)
const columnDrawerOpen = ref(false)
const filterModalOpen = ref(false)

const emptyEcnFilters = () => ({
  itemName: '',
  materialCode: '',
  specModel: '',
  categoryName: '',
  material: '',
  drawingNo: '',
})

const ecnFilters = reactive(emptyEcnFilters())
const appliedEcnFilters = reactive(emptyEcnFilters())

function buildDefaultColumnSettings() {
  return defaultBomSubItemPickerColumns.filter((c) => c.key !== 'subItemCount')
}

const columnSettings = ref(JSON.parse(JSON.stringify(buildDefaultColumnSettings())))
const selectedRowKeys = ref([])
const selectedRows = ref([])
const listVersion = ref(0)
const appliedFilterConditions = ref([])

const itemTypeOpts = [
  { label: '产品', value: '产品' },
  { label: '物料', value: '物料' },
]

const catalogKindOpts = [
  { label: '产品族', value: 'spu' },
  { label: 'SKU', value: 'sku' },
]

const widthMap = {
  name: 160,
  code: 120,
  specModel: 110,
  itemType: 100,
  categoryName: 100,
  material: 80,
  variantSummary: 180,
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
  if (props.onlyWithBom) {
    return buildBomLinkedPickerRows({
      skipSubItemCount: props.ecnNewMaterialMode,
      dedupeProductMaterial: false,
    })
  }
  // 不去重：产品物料在产品侧与物料侧各一行，便于按类型筛选
  return buildBomSubItemPickerRows({
    skipSubItemCount: props.ecnNewMaterialMode,
    dedupeProductMaterial: false,
    includeSpuTemplates: props.includeSpuTemplates,
    spuCanSellOnly: props.spuCanSellOnly,
  })
})

const filteredRows = computed(() => {
  let rows = allRows.value
  if (quickItemType.value) {
    // 产品 → 含产品物料（产品行）；物料 → 含产品物料（物料镜像行）
    rows = rows.filter((r) => r.itemType === quickItemType.value)
  } else {
    // 全部 → 去掉同 ID 镜像，优先留产品行
    rows = dedupePickerRowsPreferProduct(rows)
  }
  if (props.includeSpuTemplates && catalogKindFilter.value) {
    rows = rows.filter((r) => (r.catalogKind || 'sku') === catalogKindFilter.value)
  }
  if (props.ecnNewMaterialMode) {
    return filterEcnNewMaterialRows(rows, appliedEcnFilters)
  }
  rows = applyBomSubItemFilterConditions(rows, appliedFilterConditions.value)
  return filterEcnNewMaterialRows(rows, appliedEcnFilters)
})

const activeFilterCount = computed(
  () =>
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
    ellipsis: ['name', 'processRoute', 'defaultSupplier', 'variantSummary'].includes(c.key),
  }))
})

function tooltipTitle(record) {
  const tip = String(record?.variantTooltip || '').trim()
  if (tip) return tip
  return String(record?.variantSummary || '').trim() || undefined
}

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

function syncSelectionFromKeys(keys, rows = []) {
  selectedRowKeys.value = keys
  const map = new Map(selectedRows.value.map((r) => [r.rowKey, r]))
  rows.forEach((r) => map.set(r.rowKey, r))
  selectedRows.value = keys
    .map((key) => map.get(key) || allRows.value.find((r) => r.rowKey === key))
    .filter(Boolean)
}

function toggleRow(record) {
  const key = record.rowKey
  if (!key) return
  if (!props.multiple) {
    if (selectedRowKeys.value.includes(key)) {
      syncSelectionFromKeys([])
    } else {
      syncSelectionFromKeys([key], [record])
    }
    return
  }
  if (selectedRowKeys.value.includes(key)) {
    syncSelectionFromKeys(
      selectedRowKeys.value.filter((k) => k !== key),
      [],
    )
  } else {
    syncSelectionFromKeys([...selectedRowKeys.value, key], [record])
  }
}

function isSelectionControlClick(target) {
  return Boolean(
    target?.closest?.('.ant-table-selection-column') ||
    target?.closest?.('.ant-checkbox-wrapper') ||
    target?.closest?.('.ant-checkbox') ||
    target?.closest?.('.ant-radio-wrapper') ||
    target?.closest?.('.ant-radio') ||
    target?.closest?.('input') ||
    target?.closest?.('a') ||
    target?.closest?.('button'),
  )
}

function customRow(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e) => {
      if (isSelectionControlClick(e.target)) return
      e.stopPropagation?.()
      toggleRow(record)
    },
  }
}

const rowSelection = computed(() => ({
  type: props.multiple ? 'checkbox' : 'radio',
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys) => {
    // 仅用 keys 同步，避免当前页 rows 不完整时误带入脏数据
    const uniqueKeys = [...new Set((keys || []).filter(Boolean))]
    syncSelectionFromKeys(uniqueKeys)
  },
}))

watch(quickItemType, () => {
  page.value = 1
})

watch(catalogKindFilter, () => {
  page.value = 1
})

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    keyword.value = ''
    Object.assign(ecnFilters, emptyEcnFilters())
    Object.assign(appliedEcnFilters, emptyEcnFilters())
    quickItemType.value =
      props.pickerDefaultItemType || (props.ecnNewMaterialMode ? '物料' : undefined)
    catalogKindFilter.value = undefined
    page.value = 1
    appliedFilterConditions.value = []
    columnSettings.value = JSON.parse(JSON.stringify(buildDefaultColumnSettings()))
    listVersion.value += 1
    invalidateBomSubItemPickerRowsCache()
    seedInitialSelection()
  },
)

/** 按 initialSelectedIds 回显已选（优先匹配当前类型筛选下的行） */
function seedInitialSelection() {
  const ids = (props.initialSelectedIds || []).map(String).filter(Boolean)
  if (!ids.length) {
    selectedRowKeys.value = []
    selectedRows.value = []
    return
  }
  const idSet = new Set(ids)
  const preferredType = props.pickerDefaultItemType || ''
  const matches = []
  const seen = new Set()
  for (const row of allRows.value) {
    const id = String(row.itemId || '')
    if (!idSet.has(id) || seen.has(id)) continue
    if (preferredType && row.itemType !== preferredType) continue
    matches.push(row)
    seen.add(id)
  }
  // 未命中首选类型时再兜底任意类型
  if (matches.length < ids.length) {
    for (const row of allRows.value) {
      const id = String(row.itemId || '')
      if (!idSet.has(id) || seen.has(id)) continue
      matches.push(row)
      seen.add(id)
    }
  }
  selectedRowKeys.value = matches.map((r) => r.rowKey)
  selectedRows.value = matches
}

function handleEcnSearch() {
  Object.assign(appliedEcnFilters, { ...ecnFilters })
  page.value = 1
}

function handleEcnClear() {
  Object.assign(ecnFilters, emptyEcnFilters())
  Object.assign(appliedEcnFilters, emptyEcnFilters())
  appliedFilterConditions.value = []
  catalogKindFilter.value = undefined
  page.value = 1
}

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
  confirming.value = true
  const payload = selectedRows.value.map((row) => toBomSubItemPayload(row))
  requestAnimationFrame(() => {
    emit('selected', payload)
    keyword.value = ''
    page.value = 1
    appliedFilterConditions.value = []
    selectedRowKeys.value = []
    selectedRows.value = []
    confirming.value = false
    emit('update:open', false)
  })
}

function onMaterialSaved({ isEdit, data }) {
  if (isEdit) return
  const row = addMaterial(data)
  listVersion.value += 1
  invalidateBomSubItemPickerRowsCache()
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

    .ecn-filter-form {
      flex: 1;
      min-width: 0;

      :deep(.ant-form-item) {
        margin-bottom: 8px;
      }
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

  .variant-summary-cell {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;

    &.is-empty {
      color: rgba(0, 0, 0, 0.25);
    }
  }
}
</style>

<style lang="less">
.variant-tip-title {
  white-space: pre-line;
  max-width: 320px;
}
</style>
