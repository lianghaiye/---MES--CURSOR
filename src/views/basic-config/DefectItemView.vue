<template>
  <div class="defect-item-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="不良品项编号">
              <a-input
                v-model:value="filters.code"
                allow-clear
                size="small"
                placeholder="请输入不良品项编号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="不良品项名称">
              <a-input
                v-model:value="filters.name"
                allow-clear
                size="small"
                placeholder="请输入不良品项名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  查询
                </a-button>
                <a-button size="small" @click="handleReset">
                  <DeleteOutlined />
                  清空
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          创建不良品项
        </a-button>
        <a-button size="small" disabled>
          <ExportOutlined />
          导出
        </a-button>
        <a-button size="small" disabled>
          <ImportOutlined />
          导入
        </a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a class="danger-link" @click="handleDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <DefectItemFormModal v-model:open="modalOpen" :record="editRecord" @saved="handleSearch" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import DefectItemFormModal from './components/DefectItemFormModal.vue'
import { defectItemState, deleteDefectItem, filterDefectItems } from '@/store/defectItemStore'

const filters = reactive({ code: '', name: '' })
const applied = reactive({ code: '', name: '' })
const selectedRowKeys = ref([])
const modalOpen = ref(false)
const editRecord = ref(null)

const columns = [
  { title: '#', key: 'index', width: 56 },
  { title: '不良品项编号', dataIndex: 'code', width: 180 },
  { title: '不良品项名称', dataIndex: 'name' },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const filteredList = computed(() =>
  filterDefectItems(defectItemState.items, applied),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function handleSearch() {
  applied.code = filters.code
  applied.name = filters.name
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  applied.code = ''
  applied.name = ''
}

function openCreate() {
  editRecord.value = null
  modalOpen.value = true
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除不良品项「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteDefectItem(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.defect-item-page {
  .filter-card,
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .danger-link {
    color: #ff4d4f;
  }
}
</style>
