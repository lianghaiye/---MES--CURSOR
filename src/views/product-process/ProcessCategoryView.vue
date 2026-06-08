<template>
  <div class="process-category-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="工序分类名称">
              <a-input
                v-model:value="filters.name"
                allow-clear
                size="small"
                placeholder="请输入 工序分类名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
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
      <a-button type="primary" size="small" @click="openCreate">
        <PlusOutlined />
        新增
      </a-button>
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
        :pagination="{
          pageSize: 10,
          size: 'small',
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">
                <EditOutlined />
                编辑
              </a>
              <a v-if="record.status === '使用中'" @click="handleArchive(record)">
                <InboxOutlined />
                归档
              </a>
              <a v-if="record.status === '已归档'" @click="handleUnarchive(record)"> 取消归档 </a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <ProcessCategoryFormModal v-model:open="modalOpen" :record="editRecord" @saved="handleSearch" />
  </div>
</template>

<script>
export default { name: 'ProcessCategoryView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import ProcessCategoryFormModal from './components/ProcessCategoryFormModal.vue'
import {
  processCategoryState,
  filterProcessCategories,
  archiveProcessCategory,
  unarchiveProcessCategory,
} from '@/store/processCategoryStore'
import { countProcessesByCategory } from '@/store/processConfigStore'

const filters = reactive({ name: '' })
const applied = reactive({ name: '' })
const modalOpen = ref(false)
const editRecord = ref(null)

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '工序分类名称', dataIndex: 'name', width: 160 },
  { title: '状态', key: 'status', width: 100 },
  { title: '更新日期', dataIndex: 'updatedAt', width: 120 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const filteredList = computed(() =>
  filterProcessCategories(processCategoryState.categories, applied),
)

function statusColor(status) {
  if (status === '使用中') return 'processing'
  if (status === '已归档') return 'warning'
  return 'default'
}

function handleSearch() {
  applied.name = filters.name.trim()
}

function handleReset() {
  filters.name = ''
  handleSearch()
}

function openCreate() {
  editRecord.value = null
  modalOpen.value = true
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function handleArchive(record) {
  const count = countProcessesByCategory(record.name)
  if (count > 0) {
    message.warning('该分类下存在工序，无法归档')
    return
  }
  Modal.confirm({
    title: '确认归档',
    content: `确定归档工序分类「${record.name}」吗？`,
    onOk: () => {
      const res = archiveProcessCategory(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已归档')
    },
  })
}

function handleUnarchive(record) {
  Modal.confirm({
    title: '取消归档',
    content: `确定将「${record.name}」恢复为使用中吗？`,
    onOk: () => {
      const res = unarchiveProcessCategory(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已取消归档')
    },
  })
}
</script>

<style lang="less" scoped>
.process-category-page {
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
}
</style>
