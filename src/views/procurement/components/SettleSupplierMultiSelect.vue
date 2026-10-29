<template>
  <div class="supplier-field">
    <div class="supplier-toolbar">
      <a-button type="primary" ghost size="small" :disabled="disabled" @click="openPicker">
        选择供应商
      </a-button>
      <span class="supplier-count">已选 {{ boundRows.length }} 家</span>
      <a-button
        v-if="boundRows.length && !disabled"
        type="link"
        size="small"
        class="clear-link"
        @click="clearBound"
      >
        清空
      </a-button>
    </div>

    <a-table
      v-if="boundRows.length"
      class="supplier-bound-table"
      size="small"
      bordered
      row-key="id"
      :pagination="boundRows.length > 8 ? { pageSize: 8, size: 'small' } : false"
      :columns="boundColumns"
      :data-source="boundRows"
      :scroll="{ x: 560 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'code'">{{ record.code || '—' }}</template>
        <template v-else-if="column.key === 'name'">{{ record.name || '—' }}</template>
        <template v-else-if="column.key === 'settlementCycle'">
          {{ record.settlementCycle || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a v-if="!disabled" class="remove-link" @click="removeBound(record.id)">移除</a>
          <span v-else>—</span>
        </template>
      </template>
    </a-table>
    <div v-else class="supplier-empty">请选择本规则覆盖的供应商</div>
  </div>

  <a-modal
    :open="pickerOpen"
    title="选择供应商"
    width="min(1480px, 94vw)"
    wrap-class-name="select-settle-supplier-modal-wrap"
    class="select-settle-supplier-modal"
    :mask-closable="false"
    destroy-on-close
    @cancel="closePicker"
  >
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <ListFilterBar
          :field-count="4"
          search-text="搜索"
          reset-text="清空"
          @search="handleSearch"
          @reset="handleClear"
        >
          <a-form-item label="供应商编码">
            <a-input
              v-model:value="search.code"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="供应商名称">
            <a-input
              v-model:value="search.name"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="结算类型">
            <a-select
              v-model:value="search.settlementType"
              allow-clear
              size="small"
              placeholder="全部"
              :options="settlementTypeOptions"
            />
          </a-form-item>
          <a-form-item label="结算周期">
            <a-select
              v-model:value="search.settlementCycle"
              allow-clear
              size="small"
              placeholder="全部"
              :options="settlementCycleOptions"
            />
          </a-form-item>
        </ListFilterBar>
      </a-form>
    </div>

    <div class="picker-body">
      <div class="table-panel">
        <div class="table-wrap">
          <a-table
            :row-selection="rowSelection"
            :columns="columns"
            :data-source="pagedList"
            :custom-row="customRow"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 980, y: '100%' }"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ (page - 1) * pageSize + index + 1 }}
              </template>
              <template v-else-if="column.key === 'type'">
                {{ record.typeText || '—' }}
              </template>
              <template v-else-if="column.key === 'name'">
                {{ record.name || '—' }}
              </template>
              <template v-else-if="column.key === 'settlementMethod'">
                {{ record.settlementMethod || '—' }}
              </template>
              <template v-else-if="column.key === 'settlementType'">
                {{ record.settlementType || '—' }}
              </template>
              <template v-else-if="column.key === 'settlementCycle'">
                {{ record.settlementCycle || '—' }}
              </template>
              <template v-else-if="column.key === 'paymentTermStart'">
                {{ record.paymentTermStart || '—' }}
              </template>
              <template v-else-if="column.key === 'paymentTermDays'">
                {{
                  record.paymentTermDays === 0 || record.paymentTermDays
                    ? record.paymentTermDays
                    : '—'
                }}
              </template>
            </template>
          </a-table>
        </div>
        <div class="table-pager">
          <a-pagination
            v-model:current="page"
            v-model:page-size="pageSize"
            size="small"
            :total="filteredList.length"
            show-size-changer
            :page-size-options="['10', '20', '50']"
            :show-total="(total) => `共 ${total} 条`"
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
          <div v-for="item in selectedRows" :key="item.id" class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ item.code || '—' }}</span>
              <span
                class="selected-name"
                :title="[item.name, item.settlementCycle].filter(Boolean).join(' · ')"
              >
                {{ item.name || '—' }}{{ item.settlementCycle ? ` · ${item.settlementCycle}` : '' }}
              </span>
            </div>
            <a-button type="text" size="small" class="remove-btn" @click="removeSelected(item.id)">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
      </div>
    </div>

    <template #footer>
      <a-button @click="closePicker">取消</a-button>
      <a-button type="primary" :disabled="!selectedRows.length" @click="confirmPicker">
        确定{{ selectedRows.length ? ` (${selectedRows.length})` : '' }}
      </a-button>
    </template>
  </a-modal>
</template>

<script>
export default { name: 'SettleSupplierMultiSelect' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import ListFilterBar from '@/components/ListFilterBar.vue'
import { settlementCycleOptions, settlementTypeOptions } from '@/constants/supplierMaster'
import { supplierState } from '@/store/supplierStore'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const pickerOpen = ref(false)
const selectedKeys = ref([])
const selectedRows = ref([])
const search = reactive({
  code: '',
  name: '',
  settlementType: undefined,
  settlementCycle: undefined,
})
const applied = reactive({
  code: '',
  name: '',
  settlementType: undefined,
  settlementCycle: undefined,
})
const page = ref(1)
const pageSize = ref(10)

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '类型', key: 'type', width: 120, ellipsis: true },
  { title: '供应商名称', key: 'name', width: 160, ellipsis: true },
  { title: '结算方式', key: 'settlementMethod', width: 110, ellipsis: true },
  { title: '结算类型', key: 'settlementType', width: 100, ellipsis: true },
  { title: '结算周期', key: 'settlementCycle', width: 90 },
  { title: '账期起算', key: 'paymentTermStart', width: 100 },
  { title: '账期天数', key: 'paymentTermDays', width: 90, align: 'right' },
]

const boundColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '编码', key: 'code', width: 110, ellipsis: true },
  { title: '供应商名称', key: 'name', ellipsis: true },
  { title: '结算周期', key: 'settlementCycle', width: 90 },
  { title: '操作', key: 'action', width: 72, align: 'center' },
]

const allSuppliers = computed(() =>
  supplierState.suppliers
    .filter((s) => s.status !== '停用')
    .map((s) => ({
      ...s,
      typeText: (s.supplierRoles || []).filter(Boolean).join('/') || s.legacyType || '',
    })),
)

const boundRows = computed(() =>
  (props.modelValue || [])
    .map((id) => allSuppliers.value.find((s) => s.id === id) || { id, name: id, code: '' })
    .filter(Boolean),
)

const filteredList = computed(() => {
  const codeKw = applied.code.trim().toLowerCase()
  const nameKw = applied.name.trim().toLowerCase()
  return allSuppliers.value.filter((s) => {
    if (
      codeKw &&
      !String(s.code || '')
        .toLowerCase()
        .includes(codeKw)
    )
      return false
    if (
      nameKw &&
      !String(s.name || '')
        .toLowerCase()
        .includes(nameKw)
    )
      return false
    if (applied.settlementType && s.settlementType !== applied.settlementType) return false
    if (applied.settlementCycle && s.settlementCycle !== applied.settlementCycle) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const rowSelection = computed(() => ({
  type: 'checkbox',
  selectedRowKeys: selectedKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys, rows) => {
    syncSelectionFromKeys(keys, rows)
  },
}))

watch(
  () => pickerOpen.value,
  (visible) => {
    if (!visible) return
    search.code = ''
    search.name = ''
    search.settlementType = undefined
    search.settlementCycle = undefined
    applied.code = ''
    applied.name = ''
    applied.settlementType = undefined
    applied.settlementCycle = undefined
    page.value = 1
    const ids = [...(props.modelValue || [])]
    selectedKeys.value = ids
    selectedRows.value = ids
      .map((id) => allSuppliers.value.find((s) => s.id === id))
      .filter(Boolean)
  },
)

function syncSelectionFromKeys(keys, touchedRows = []) {
  selectedKeys.value = keys
  const map = new Map(selectedRows.value.map((r) => [r.id, r]))
  touchedRows.forEach((r) => {
    if (r?.id) map.set(r.id, r)
  })
  const keySet = new Set(keys)
  selectedRows.value = keys
    .map((id) => map.get(id) || allSuppliers.value.find((s) => s.id === id))
    .filter(Boolean)
    .filter((r) => keySet.has(r.id))
}

function customRow(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e) => {
      const target = e.target
      if (
        target?.closest?.('.ant-table-selection-column') ||
        target?.closest?.('.ant-checkbox-wrapper') ||
        target?.closest?.('.ant-checkbox') ||
        target?.closest?.('input')
      ) {
        return
      }
      const exists = selectedKeys.value.includes(record.id)
      const nextKeys = exists
        ? selectedKeys.value.filter((id) => id !== record.id)
        : [...selectedKeys.value, record.id]
      syncSelectionFromKeys(nextKeys, [record])
    },
  }
}

function openPicker() {
  if (props.disabled) return
  pickerOpen.value = true
}

function closePicker() {
  pickerOpen.value = false
}

function handleSearch() {
  applied.code = search.code
  applied.name = search.name
  applied.settlementType = search.settlementType
  applied.settlementCycle = search.settlementCycle
  page.value = 1
}

function handleClear() {
  search.code = ''
  search.name = ''
  search.settlementType = undefined
  search.settlementCycle = undefined
  handleSearch()
}

function clearSelection() {
  selectedKeys.value = []
  selectedRows.value = []
}

function removeSelected(id) {
  syncSelectionFromKeys(
    selectedKeys.value.filter((k) => k !== id),
    [],
  )
}

function emitIds(ids) {
  emit('update:modelValue', ids)
  emit('change', ids)
}

function clearBound() {
  emitIds([])
}

function removeBound(id) {
  emitIds((props.modelValue || []).filter((x) => x !== id))
}

function confirmPicker() {
  emitIds([...selectedKeys.value])
  pickerOpen.value = false
}
</script>

<style lang="less" scoped>
.supplier-field {
  width: 100%;
}

.supplier-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.supplier-count {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.clear-link {
  padding: 0;
  height: auto;
}

.supplier-bound-table {
  :deep(.ant-table-thead > tr > th),
  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 13px;
  }
}

.remove-link {
  color: #ff4d4f;
}

.supplier-empty {
  padding: 16px 12px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  text-align: center;
  background: #fafafa;
}

.select-settle-supplier-modal {
  .filter-card {
    flex-shrink: 0;
    margin-bottom: 12px;
  }

  .horizontal-form {
    width: 100%;

    :deep(.ant-form-item) {
      margin-bottom: 0;
    }
  }

  .picker-body {
    display: flex;
    gap: 12px;
    align-items: stretch;
    flex: 1;
    min-height: 480px;
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

  .table-pager {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    margin-top: 12px;
    padding-top: 4px;
  }

  .selected-panel {
    width: 320px;
    flex-shrink: 0;
    align-self: stretch;
    min-height: 0;
    overflow: hidden;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    background: #fff;
  }

  .selected-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
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

<style lang="less">
.select-settle-supplier-modal-wrap {
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
