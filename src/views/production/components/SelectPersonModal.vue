<template>
  <a-modal
    :open="open"
    title="请选择人员"
    width="900px"
    :mask-closable="false"
    destroy-on-close
    class="select-person-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="search-form">
      <a-form-item label="姓名">
        <a-input
          v-model:value="search.name"
          allow-clear
          placeholder="请输入 姓名"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="员工编号">
        <a-input
          v-model:value="search.employeeNo"
          allow-clear
          placeholder="请输入 员工编号"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="handleSearch">
          <SearchOutlined />
          搜索
        </a-button>
      </a-form-item>
    </a-form>

    <div class="picker-body">
      <div class="table-panel">
        <a-table
          :row-selection="rowSelection"
          :columns="columns"
          :data-source="filteredList"
          :custom-row="customRow"
          row-key="id"
          size="small"
          bordered
          :pagination="{ pageSize: 8, size: 'small' }"
          :scroll="{ y: 360 }"
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
          <div v-for="item in selectedRows" :key="item.id" class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ item.employeeNo || '—' }}</span>
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
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { SearchOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { mockEmployees } from '@/mock/workOrderMaster'

const props = defineProps({
  open: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const search = reactive({ name: '', employeeNo: '' })
const appliedSearch = reactive({ name: '', employeeNo: '' })
const selectedRowKeys = ref([])
const selectedRows = ref([])

const columns = [
  { title: '姓名', dataIndex: 'name', width: 140 },
  { title: '员工编号', dataIndex: 'employeeNo', customRender: ({ text }) => text || '-' },
]

const filteredList = computed(() =>
  mockEmployees.filter((emp) => {
    if (appliedSearch.name && !emp.name.includes(appliedSearch.name)) return false
    if (appliedSearch.employeeNo && !(emp.employeeNo || '').includes(appliedSearch.employeeNo)) {
      return false
    }
    return true
  }),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    const map = new Map(selectedRows.value.map((r) => [r.id, r]))
    rows.forEach((r) => map.set(r.id, r))
    selectedRows.value = keys
      .map((key) => map.get(key) || mockEmployees.find((r) => r.id === key))
      .filter(Boolean)
  },
}))

function toggleRow(record) {
  const key = record.id
  const idx = selectedRowKeys.value.indexOf(key)
  if (idx >= 0) {
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== key)
    selectedRows.value = selectedRows.value.filter((r) => r.id !== key)
  } else {
    selectedRowKeys.value = [...selectedRowKeys.value, key]
    selectedRows.value = [...selectedRows.value, record]
  }
}

function customRow(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e) => {
      const target = e.target
      if (
        target?.closest?.('.ant-checkbox-wrapper') ||
        target?.closest?.('.ant-checkbox') ||
        target?.closest?.('input')
      ) {
        return
      }
      toggleRow(record)
    },
  }
}

watch(
  () => props.open,
  (val) => {
    if (!val) return
    const names = props.selected || []
    const rows = mockEmployees.filter((e) => names.includes(e.name))
    selectedRowKeys.value = rows.map((r) => r.id)
    selectedRows.value = rows
    search.name = ''
    search.employeeNo = ''
    appliedSearch.name = ''
    appliedSearch.employeeNo = ''
  },
)

function handleSearch() {
  appliedSearch.name = search.name
  appliedSearch.employeeNo = search.employeeNo
}

function removeSelected(id) {
  selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== id)
  selectedRows.value = selectedRows.value.filter((r) => r.id !== id)
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedRows.value = []
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  emit(
    'confirm',
    selectedRows.value.map((r) => r.name),
  )
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.search-form {
  margin-bottom: 12px;
}

.picker-body {
  display: flex;
  gap: 12px;
  height: 420px;
  max-height: calc(86vh - 220px);
  min-height: 360px;
}

.table-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.selected-panel {
  width: 240px;
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
</style>
