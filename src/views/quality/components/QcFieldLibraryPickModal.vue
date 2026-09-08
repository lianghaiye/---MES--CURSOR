<template>
  <a-modal
    :open="open"
    title="从检验项库添加"
    :width="modalWidth"
    :mask-closable="false"
    destroy-on-close
    class="qc-field-pick-modal"
    @cancel="handleCancel"
  >
    <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
      <a-row :gutter="[12, 8]" style="width: 100%">
        <a-col :xs="24" :sm="12" :md="8">
          <a-form-item label="关键词">
            <a-input
              v-model:value="filters.keyword"
              allow-clear
              size="small"
              placeholder="编码/名称"
              @press-enter="handleSearch"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8">
          <a-form-item label="类型">
            <a-select
              v-model:value="filters.type"
              allow-clear
              size="small"
              placeholder="全部"
              :options="typeOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8">
          <a-form-item class="filter-actions-item">
            <a-space>
              <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
              <a-button size="small" @click="handleReset">清空</a-button>
            </a-space>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="picker-body">
      <div class="table-panel">
        <a-table
          :columns="columns"
          :data-source="pagedList"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ y: tableScrollY }"
          :row-selection="rowSelection"
          :custom-row="customRow"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
            <template v-else-if="column.key === 'type'">
              {{ qcFieldTypeLabel(record.type) }}
            </template>
            <template v-else-if="column.key === 'required'">
              {{ record.required ? '是' : '否' }}
            </template>
            <template v-else-if="column.key === 'unit'">
              {{ displayUnit(record) }}
            </template>
            <template v-else-if="column.key === 'standard'">
              {{ buildStandardText(record) || '—' }}
            </template>
            <template v-else-if="column.key === 'inTemplate'">
              <a-tag v-if="isInTemplate(record)" color="default">已在模板</a-tag>
              <span v-else class="muted">—</span>
            </template>
            <template v-else>
              {{ record[column.dataIndex] || '—' }}
            </template>
          </template>
        </a-table>
        <div class="table-pagination">
          <a-pagination
            v-model:current="pagination.current"
            v-model:page-size="pagination.pageSize"
            :total="filteredList.length"
            size="small"
            show-size-changer
            :page-size-options="['10', '20', '50']"
            :show-total="(t) => `共 ${t} 条`"
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
              <span class="selected-code">{{ item.code }}</span>
              <span class="selected-name" :title="item.name">{{ item.name }}</span>
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
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRows.length" @click="handleConfirm">
        确定 ({{ selectedRows.length }})
      </a-button>
    </template>
  </a-modal>
</template>

<script>
export default { name: 'QcFieldLibraryPickModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { qcFieldLibraryTypeOptions, qcFieldTypeLabel } from '@/mock/qcFieldLibrary'
import { listQcLibraryFields } from '@/store/qcFieldLibraryStore'
import { buildStandardText } from '@/utils/qcFieldStandard'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 当前模板已有字段，用于标记/去重提示 */
  existingFields: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const modalWidth = 'min(1200px, 90vw)'
const tableScrollY = 360

const filters = reactive({
  keyword: '',
  type: undefined,
})
const applied = ref({ keyword: '', type: undefined })
const selectedRowKeys = ref([])
const selectedRows = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const typeOpts = qcFieldLibraryTypeOptions

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '编码', dataIndex: 'code', width: 130 },
  { title: '名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '类型', key: 'type', width: 100 },
  { title: '必填', key: 'required', width: 56, align: 'center' },
  { title: '单位', key: 'unit', width: 88 },
  { title: '合格标准', key: 'standard', width: 140, ellipsis: true },
  { title: '状态', key: 'inTemplate', width: 90, align: 'center' },
]

const existingCodeSet = computed(() => {
  const set = new Set()
  ;(props.existingFields || []).forEach((f) => {
    const c = String(f.code || '')
      .trim()
      .toUpperCase()
    if (c) set.add(c)
  })
  return set
})

function isInTemplate(record) {
  return existingCodeSet.value.has(
    String(record.code || '')
      .trim()
      .toUpperCase(),
  )
}

function displayUnit(record) {
  if (!record?.withUnit && !record?.unit) return '—'
  const unit = String(record.unit || '').trim()
  if (!unit) return '—'
  return record.unitPosition === 'prefix' ? `${unit}（前）` : `${unit}（后）`
}

const filteredList = computed(() =>
  listQcLibraryFields({
    status: '启用',
    keyword: applied.value.keyword,
    type: applied.value.type,
  }),
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function syncSelectionFromKeys(keys, touchedRows = []) {
  selectedRowKeys.value = keys
  const map = new Map(selectedRows.value.map((r) => [r.id, r]))
  touchedRows.forEach((r) => {
    if (r?.id) map.set(r.id, r)
  })
  selectedRows.value = keys.map((key) => map.get(key)).filter(Boolean)
}

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys, rows) => {
    syncSelectionFromKeys(keys, rows)
  },
  getCheckboxProps: (record) => ({
    disabled: isInTemplate(record),
  }),
}))

function toggleRow(record) {
  if (isInTemplate(record)) return
  const key = record.id
  if (selectedRowKeys.value.includes(key)) {
    syncSelectionFromKeys(
      selectedRowKeys.value.filter((k) => k !== key),
      [],
    )
  } else {
    syncSelectionFromKeys([...selectedRowKeys.value, key], [record])
  }
}

function customRow(record) {
  return {
    style: { cursor: isInTemplate(record) ? 'not-allowed' : 'pointer' },
    onClick: (e) => {
      const target = e.target
      if (target?.closest?.('.ant-checkbox-wrapper') || target?.closest?.('.ant-checkbox')) return
      toggleRow(record)
    },
  }
}

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function removeSelected(id) {
  syncSelectionFromKeys(
    selectedRowKeys.value.filter((k) => k !== id),
    [],
  )
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedRows.value = []
}

watch(
  () => props.open,
  (val) => {
    if (!val) return
    clearSelection()
    handleReset()
  },
)

function handleSearch() {
  applied.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.keyword = ''
  filters.type = undefined
  handleSearch()
}

function closeModal() {
  emit('update:open', false)
}

function handleCancel() {
  if (!selectedRows.value.length) {
    closeModal()
    return
  }
  Modal.confirm({
    title: '放弃选择？',
    content: `已选择 ${selectedRows.value.length} 项，确认放弃？`,
    onOk: () => closeModal(),
  })
}

function handleConfirm() {
  if (!selectedRows.value.length) {
    message.warning('请先勾选检验项')
    return
  }
  emit(
    'confirm',
    selectedRows.value.map((r) => r.id),
  )
  closeModal()
}
</script>

<style lang="less" scoped>
.filter-form {
  margin-bottom: 12px;
}

.filter-actions-item :deep(.ant-form-item-control-input-content) {
  display: flex;
}

.picker-body {
  display: flex;
  gap: 12px;
  height: 480px;
  max-height: calc(80vh - 200px);
  min-height: 400px;
}

.table-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.table-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.selected-panel {
  width: 26%;
  min-width: 200px;
  max-width: 280px;
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
  color: rgba(0, 0, 0, 0.45);
}

.selected-name {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
}

.selected-empty {
  margin-top: 48px;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
