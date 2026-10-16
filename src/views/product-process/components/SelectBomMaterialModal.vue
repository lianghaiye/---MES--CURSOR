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
    <div class="filter-card">
      <a-form
        v-if="ecnNewMaterialMode"
        layout="inline"
        class="filter-form horizontal-form ecn-filter-form"
      >
        <ListFilterBar
          :field-count="7"
          search-text="搜索"
          reset-text="清空"
          @search="handleEcnSearch"
          @reset="handleEcnClear"
        >
          <a-form-item label="类型">
            <a-select
              v-model:value="quickMaterialType"
              allow-clear
              size="small"
              placeholder="全部"
              class="type-select"
              :options="materialTypeOpts"
            />
          </a-form-item>
          <a-form-item label="物品名称">
            <a-input
              v-model:value="ecnFilters.itemName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="编码">
            <a-input
              v-model:value="ecnFilters.materialCode"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="规格型号">
            <a-input
              v-model:value="ecnFilters.specModel"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="类别">
            <a-input
              v-model:value="ecnFilters.categoryName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="材质">
            <a-input
              v-model:value="ecnFilters.material"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="图号">
            <a-input
              v-model:value="ecnFilters.drawingNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
        </ListFilterBar>
      </a-form>
      <a-form v-else layout="inline" class="filter-form horizontal-form ecn-filter-form">
        <ListFilterBar
          :field-count="includeSpuTemplates ? 8 : 7"
          search-text="搜索"
          reset-text="清空"
          @search="handleEcnSearch"
          @reset="handleEcnClear"
        >
          <a-form-item label="类型">
            <a-select
              v-model:value="quickMaterialType"
              allow-clear
              size="small"
              placeholder="全部"
              class="type-select"
              :options="materialTypeOpts"
            />
          </a-form-item>
          <a-form-item v-if="includeSpuTemplates" label="产品族/SKU">
            <a-select
              v-model:value="catalogKindFilter"
              allow-clear
              size="small"
              placeholder="全部"
              :options="catalogKindOpts"
            />
          </a-form-item>
          <a-form-item label="物品名称">
            <a-input
              v-model:value="ecnFilters.itemName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="编码">
            <a-input
              v-model:value="ecnFilters.materialCode"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="规格型号">
            <a-input
              v-model:value="ecnFilters.specModel"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="类别">
            <a-input
              v-model:value="ecnFilters.categoryName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="材质">
            <a-input
              v-model:value="ecnFilters.material"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item label="图号">
            <a-input
              v-model:value="ecnFilters.drawingNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleEcnSearch"
            />
          </a-form-item>
          <a-form-item class="list-filter-skip filter-extra-action">
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
          </a-form-item>
        </ListFilterBar>
      </a-form>
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
        <div class="list-toolbar">
          <div class="list-toolbar-left">
            <a-button
              v-if="!ecnNewMaterialMode && !onlyWithBom && !hideAddMaterial"
              type="primary"
              size="small"
              @click="openAddMasterItem"
            >
              <PlusOutlined />
              添加产品/物料
            </a-button>
          </div>
          <div class="list-toolbar-right">
            <a-tooltip title="列显隐">
              <a-button type="text" size="small" @click="columnDrawerOpen = true">
                <SettingOutlined />
              </a-button>
            </a-tooltip>
          </div>
        </div>
        <a-table
          :row-selection="rowSelection"
          :columns="tableColumns"
          :data-source="pagedRows"
          :custom-row="customRow"
          row-key="rowKey"
          size="small"
          bordered
          :loading="loading"
          :pagination="false"
          :scroll="{ x: tableScrollX, y: tableScrollY }"
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
        <div class="table-pager">
          <a-pagination
            v-model:current="page"
            v-model:page-size="pageSize"
            size="small"
            :total="filteredRows.length"
            show-size-changer
            show-quick-jumper
            :page-size-options="['20', '50', '100']"
            :show-total="(total) => `共 ${total} 条（产品信息 + 物料信息）`"
          />
        </div>
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
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SettingOutlined, PlusOutlined, CloseOutlined, FilterOutlined } from '@ant-design/icons-vue'
import ListFilterBar from '@/components/ListFilterBar.vue'
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
import { defaultBomSubItemPickerColumns } from '@/mock/bomSubItemPickerColumns'
import { MATERIAL_TYPE_OPTIONS } from '@/utils/masterDataMigrate'
import BomSubItemColumnSettingDrawer from './BomSubItemColumnSettingDrawer.vue'
import BomSubItemFilterModal from './BomSubItemFilterModal.vue'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { tabStore, useTabs } from '@/composables/useTabs'

/** 历史 prop：产品/物料 = 主数据目录；其余视为主数据「类型」(materialType) */
const CATALOG_ITEM_TYPES = new Set(['产品', '物料'])

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

const router = useRouter()
const { openTab } = useTabs()
const productCreatePage = findCreatePageByListPath('/product-process/products')

const keyword = ref('')
const quickMaterialType = ref(undefined)
const catalogKindFilter = ref(undefined)
const loading = ref(false)
const confirming = ref(false)
const page = ref(1)
const pageSize = ref(20)
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

const materialTypeOpts = MATERIAL_TYPE_OPTIONS.map((v) => ({ label: v, value: v }))

function resolveDefaultMaterialTypeFilter() {
  const v = String(props.pickerDefaultItemType || '').trim()
  if (!v || CATALOG_ITEM_TYPES.has(v)) return undefined
  return MATERIAL_TYPE_OPTIONS.includes(v) ? v : undefined
}

function resolvePreferredCatalogType() {
  const v = String(props.pickerDefaultItemType || '').trim()
  if (CATALOG_ITEM_TYPES.has(v)) return v
  if (props.ecnNewMaterialMode) return '物料'
  return ''
}

const catalogKindOpts = [
  { label: '产品族', value: 'spu' },
  { label: 'SKU', value: 'sku' },
]

const widthMap = {
  name: 160,
  code: 120,
  specModel: 110,
  materialType: 100,
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
  // 默认去重镜像行；再按主数据「类型」(materialType) 筛选
  rows = dedupePickerRowsPreferProduct(rows)
  if (quickMaterialType.value) {
    rows = rows.filter((r) => r.materialType === quickMaterialType.value)
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

const tableScrollY = computed(() => 440)

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

watch(quickMaterialType, () => {
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
    quickMaterialType.value = resolveDefaultMaterialTypeFilter()
    catalogKindFilter.value = undefined
    page.value = 1
    appliedFilterConditions.value = []
    columnSettings.value = JSON.parse(JSON.stringify(buildDefaultColumnSettings()))
    listVersion.value += 1
    invalidateBomSubItemPickerRowsCache()
    seedInitialSelection()
  },
)

/** 按 initialSelectedIds 回显已选（优先匹配历史目录偏好：产品/物料） */
function seedInitialSelection() {
  const ids = (props.initialSelectedIds || []).map(String).filter(Boolean)
  if (!ids.length) {
    selectedRowKeys.value = []
    selectedRows.value = []
    return
  }
  const idSet = new Set(ids)
  const preferredCatalog = resolvePreferredCatalogType()
  const matches = []
  const seen = new Set()
  for (const row of allRows.value) {
    const id = String(row.itemId || '')
    if (!idSet.has(id) || seen.has(id)) continue
    if (preferredCatalog && row.itemType !== preferredCatalog) continue
    matches.push(row)
    seen.add(id)
  }
  // 未命中首选目录时再兜底任意行
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
  keyword.value = ''
  page.value = 1
  appliedFilterConditions.value = []
  selectedRowKeys.value = []
  selectedRows.value = []
  confirming.value = false
  emit('update:open', false)
  nextTick(() => {
    emit('selected', payload)
  })
}

/** 打开最新「新增产品」页（MasterItem）；须先关选品弹窗，否则遮罩挡住新标签 */
function openAddMasterItem() {
  if (!productCreatePage?.newPath) {
    message.warning('未找到新增产品页面配置')
    return
  }
  const path = productCreatePage.newPath
  const title = productCreatePage.title || '新增产品'
  emit('update:open', false)
  nextTick(() => {
    openCreateTab(router, openTab, { path, title }).catch(() => {
      // 重复导航等场景忽略
    })
  })
}

function refreshPickerList() {
  invalidateBomSubItemPickerRowsCache()
  listVersion.value += 1
}

/** 从新增产品标签切回时刷新选品列表，便于选到刚建的档案 */
watch(
  () => tabStore.activePath,
  (path, prev) => {
    if (!props.open) return
    const prevBase = String(prev || '').split('?')[0]
    const nextBase = String(path || '').split('?')[0]
    if (
      prevBase === '/product-process/products/new' &&
      nextBase !== '/product-process/products/new'
    ) {
      refreshPickerList()
    }
  },
)
</script>

<style lang="less" scoped>
.select-bom-material-modal {
  :deep(.ant-modal-body) {
    padding-top: 16px;
  }

  .ecn-filter-form {
    :deep(.type-select) {
      min-width: 0;
    }

    :deep(.filter-extra-action) {
      display: flex;
      align-items: center;
      justify-content: flex-end;
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
    align-items: stretch;
    min-height: 480px;
  }

  .table-panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .table-pager {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    margin-top: 12px;
  }

  .list-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
    flex-shrink: 0;
  }

  .list-toolbar-left,
  .list-toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .selected-panel {
    width: 260px;
    flex-shrink: 0;
    align-self: stretch;
    min-height: 0;
    overflow: hidden;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    background: #fafafa;
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
