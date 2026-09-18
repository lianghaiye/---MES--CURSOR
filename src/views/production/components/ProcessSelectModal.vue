<template>
  <a-modal
    :open="open"
    title="选择工序"
    :width="modalWidth"
    :mask-closable="false"
    destroy-on-close
    class="process-select-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="filter-form horizontal-form">
      <a-row :gutter="[12, 8]" style="width: 100%">
        <a-col :xs="24" :sm="12" :md="8">
          <a-form-item label="工序名称">
            <a-input
              v-model:value="filters.name"
              allow-clear
              size="small"
              placeholder="名称或编码"
              @press-enter="handleSearch"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8">
          <a-form-item label="工序分类">
            <a-select
              v-model:value="filters.category"
              allow-clear
              size="small"
              placeholder="全部分类"
              :options="categoryOptions"
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
        />
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
              <span class="selected-code">{{ item.code || '—' }}</span>
              <span class="selected-name" :title="item.name">{{ item.name || '—' }}</span>
              <span v-if="item.category" class="selected-meta">{{ item.category }}</span>
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

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import {
  filterProcessConfig,
  getActiveProcessCategories,
  processConfigState,
} from '@/store/processConfigStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 已在报工单中的工序配置 id */
  excludeProcessIds: { type: Array, default: () => [] },
  /** 已在报工单中的工序名称（工艺路线工序无 processConfigId 时按名称去重） */
  excludeNames: { type: Array, default: () => [] },
  /** 多选（报工添加工序）/ 单选（外协选工序） */
  multiple: { type: Boolean, default: true },
})

const emit = defineEmits(['update:open', 'confirm'])

const modalWidth = 'min(1200px, 90vw)'
const tableScrollY = 360

const filters = reactive({ name: '', category: undefined })
const applied = reactive({ name: '', category: undefined })
const selectedRowKeys = ref([])
const selectedRows = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const columns = [
  { title: '工序编码', dataIndex: 'code', width: 130, ellipsis: true },
  { title: '工序名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '工序分类', dataIndex: 'category', width: 100 },
  { title: '资源类型', dataIndex: 'resourceType', width: 100 },
]

const categoryOptions = computed(() =>
  getActiveProcessCategories().map((c) => ({ label: c, value: c })),
)

const filteredList = computed(() => {
  const list = filterProcessConfig(processConfigState.processes, {
    ...applied,
    status: '使用中',
  })
  const idSet = new Set(props.excludeProcessIds)
  const nameSet = new Set(props.excludeNames)
  return list.filter((p) => !idSet.has(p.id) && !nameSet.has(p.name))
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function syncSelectionFromKeys(keys, touchedRows = []) {
  const nextKeys = props.multiple ? keys : keys.slice(-1)
  selectedRowKeys.value = nextKeys
  const map = new Map(selectedRows.value.map((r) => [r.id, r]))
  touchedRows.forEach((r) => {
    if (r?.id) map.set(r.id, r)
  })
  selectedRows.value = nextKeys.map((key) => map.get(key)).filter(Boolean)
}

const rowSelection = computed(() => ({
  type: props.multiple ? 'checkbox' : 'radio',
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys, rows) => {
    syncSelectionFromKeys(keys, rows)
  },
}))

function toggleRow(record) {
  const key = record.id
  if (props.multiple) {
    if (selectedRowKeys.value.includes(key)) {
      syncSelectionFromKeys(
        selectedRowKeys.value.filter((k) => k !== key),
        [],
      )
    } else {
      syncSelectionFromKeys([...selectedRowKeys.value, key], [record])
    }
    return
  }
  syncSelectionFromKeys([key], [record])
}

function customRow(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e) => {
      const target = e.target
      if (
        target?.closest?.('.ant-checkbox-wrapper') ||
        target?.closest?.('.ant-checkbox') ||
        target?.closest?.('.ant-radio-wrapper') ||
        target?.closest?.('.ant-radio')
      ) {
        return
      }
      toggleRow(record)
    },
  }
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
  (visible) => {
    if (!visible) return
    clearSelection()
    handleReset()
  },
)

function handleSearch() {
  applied.name = filters.name?.trim() || ''
  applied.category = filters.category || undefined
  pagination.current = 1
}

function handleReset() {
  filters.name = ''
  filters.category = undefined
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
    message.warning(props.multiple ? '请至少选择一道工序' : '请选择一道工序')
    return
  }
  if (props.multiple) {
    emit('confirm', [...selectedRows.value])
  } else {
    emit('confirm', selectedRows.value[0])
  }
  closeModal()
}
</script>

<script>
export default { name: 'ProcessSelectModal' }
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
  padding: 8px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;

  &:last-child {
    margin-bottom: 0;
  }
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
</style>
