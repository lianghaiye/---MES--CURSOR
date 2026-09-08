<template>
  <a-modal
    :open="open"
    :title="title"
    :width="modalWidth"
    wrap-class-name="select-bom-picker-modal-wrap"
    :mask-closable="false"
    destroy-on-close
    class="select-bom-picker-modal"
    @cancel="handleCancel"
  >
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <ListFilterBar
          :field-count="8"
          search-text="搜索"
          reset-text="清空"
          @search="handleSearch"
          @reset="handleReset"
        >
          <a-form-item label="BOM类型">
            <a-select
              v-model:value="filters.bomType"
              allow-clear
              size="small"
              placeholder="全部"
              :options="bomTypeSelectOptions"
            />
          </a-form-item>
          <a-form-item label="BOM编号">
            <a-input
              v-model:value="filters.bomNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="BOM名称">
            <a-input
              v-model:value="filters.bomName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="产品族/SKU">
            <a-select
              v-model:value="filters.catalogKind"
              allow-clear
              size="small"
              placeholder="全部"
              :options="BOM_PICKER_CATALOG_KIND_OPTIONS"
            />
          </a-form-item>
          <a-form-item label="产品名称">
            <a-input
              v-model:value="filters.productName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="产品编号">
            <a-input
              v-model:value="filters.productCode"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="规格型号">
            <a-input
              v-model:value="filters.specModel"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="图号">
            <a-input
              v-model:value="filters.drawingNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
        </ListFilterBar>
      </a-form>
    </div>

    <div class="picker-body">
      <div class="table-panel">
        <div ref="tableWrapRef" class="table-wrap">
          <a-table
            :columns="BOM_PICKER_TABLE_COLUMNS"
            :data-source="pagedList"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :row-selection="rowSelection"
            :scroll="{ x: 1360, y: tableScrollY }"
            :custom-row="customRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'bomType'">
                {{ record.bomTypeLabel || '—' }}
              </template>
              <template v-else-if="column.dataIndex === 'productCode'">
                {{ record.productCode || '—' }}
              </template>
            </template>
          </a-table>
        </div>
        <div class="table-pagination">
          <a-pagination
            v-model:current="pagination.current"
            v-model:page-size="pagination.pageSize"
            :total="filteredList.length"
            size="small"
            show-size-changer
            :page-size-options="['10', '20', '50']"
            :show-total="(t) => `共 ${t} 条`"
            show-quick-jumper
          />
        </div>
      </div>

      <div class="selected-panel">
        <div class="selected-head">
          <span class="selected-title">已选 {{ selectedCount }} 项</span>
          <a-button
            v-if="selectedBom"
            type="link"
            size="small"
            class="clear-btn"
            @click="clearSelection"
          >
            清空
          </a-button>
        </div>
        <div v-if="selectedBom" class="selected-list">
          <div class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ selectedBom.bomNo }}</span>
              <span class="selected-name" :title="selectedBom.bomName">{{
                selectedBom.bomName || '—'
              }}</span>
              <span
                class="selected-meta"
                :title="
                  [selectedBom.productName, selectedBom.productCode].filter(Boolean).join(' ')
                "
              >
                {{ selectedBom.productName || '—' }}
                <template v-if="selectedBom.productCode"
                  >（{{ selectedBom.productCode }}）</template
                >
              </span>
            </div>
            <a-button type="text" size="small" class="remove-btn" @click="clearSelection">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedBom" @click="confirm">
        确定 ({{ selectedCount }})
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import ListFilterBar from '@/components/ListFilterBar.vue'
import { bomTypeSelectOptions } from '@/mock/bomMaterialColumns'
import { productBomState } from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { spuState } from '@/store/spuStore'
import {
  BOM_PICKER_CATALOG_KIND_OPTIONS,
  BOM_PICKER_TABLE_COLUMNS,
  createEmptyBomPickerFilters,
  enrichBomPickerRow,
  filterBomPickerRows,
} from '@/utils/bomPickerTable'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '选择BOM' },
  productId: { type: String, default: '' },
  confirmWarning: { type: String, default: '请选择 BOM' },
  /** (bom) => boolean */
  rowFilter: { type: Function, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const modalWidth = 'min(1480px, 94vw)'
const tableWrapRef = ref(null)
const tableScrollY = ref(480)
let tableResizeObserver = null

const filters = reactive(createEmptyBomPickerFilters())
const appliedFilters = ref(createEmptyBomPickerFilters())
const selectedRowKeys = ref([])
const selectedBom = ref(null)
const pagination = reactive({ current: 1, pageSize: 10 })

const selectedCount = computed(() => (selectedBom.value ? 1 : 0))

const sourceList = computed(() => {
  void productInfoState.products
  void materialInfoState.materials
  void spuState.spus
  let rows = productBomState.boms
  if (props.rowFilter) {
    rows = rows.filter((b) => props.rowFilter(b))
  }
  return rows
})

const filteredList = computed(() => {
  const rows = filterBomPickerRows(sourceList.value, appliedFilters.value, {
    productId: props.productId || undefined,
  })
  return rows.map(enrichBomPickerRow)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    selectedBom.value = rows[0] || null
  },
}))

function customRow(record) {
  return {
    onClick: () => {
      selectedRowKeys.value = [record.id]
      selectedBom.value = record
    },
  }
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedBom.value = null
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, createEmptyBomPickerFilters())
  handleSearch()
}

function closeModal() {
  emit('update:open', false)
}

function handleCancel() {
  if (!selectedBom.value) {
    closeModal()
    return
  }
  Modal.confirm({
    title: '放弃选择？',
    content: `已选择 ${selectedCount.value} 项，确认放弃？`,
    onOk: () => closeModal(),
  })
}

function syncTableScrollY() {
  const el = tableWrapRef.value
  if (!el) return
  const header = el.querySelector('.ant-table-header') || el.querySelector('.ant-table-thead')
  const headerH = header?.offsetHeight || 39
  tableScrollY.value = Math.max(280, Math.floor(el.clientHeight - headerH))
}

function unbindTableResize() {
  tableResizeObserver?.disconnect()
  tableResizeObserver = null
}

function bindTableResize() {
  unbindTableResize()
  const el = tableWrapRef.value
  if (!el) return
  if (typeof ResizeObserver !== 'undefined') {
    tableResizeObserver = new ResizeObserver(() => syncTableScrollY())
    tableResizeObserver.observe(el)
  }
  syncTableScrollY()
}

watch(
  () => props.open,
  async (v) => {
    if (!v) {
      unbindTableResize()
      return
    }
    clearSelection()
    handleReset()
    await nextTick()
    bindTableResize()
  },
)

onBeforeUnmount(unbindTableResize)

function confirm() {
  if (!selectedBom.value) {
    message.warning(props.confirmWarning)
    return
  }
  emit('confirm', selectedBom.value)
  closeModal()
}
</script>

<script>
export default { name: 'SelectBomPickerModal' }
</script>

<style lang="less" scoped>
.filter-card {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.filter-form {
  width: 100%;

  :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}

.picker-body {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex: 1;
  min-height: 520px;
  height: 560px;
  max-height: calc(90vh - 200px);
}

.table-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;

  :deep(.ant-table-wrapper),
  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container),
  :deep(.ant-table),
  :deep(.ant-table-container) {
    height: 100%;
  }
}

.table-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.selected-panel {
  width: 24%;
  min-width: 220px;
  max-width: 320px;
  flex-shrink: 0;
  align-self: stretch;
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
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.selected-name,
.selected-meta {
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

:deep(.ant-table-tbody > tr) {
  cursor: pointer;
}
</style>

<style lang="less">
.select-bom-picker-modal-wrap {
  .ant-modal {
    max-width: min(1480px, 94vw);
    top: 24px;
    padding-bottom: 0;
  }

  .ant-modal-content {
    display: flex;
    flex-direction: column;
    max-height: 92vh;
  }

  .ant-modal-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>
