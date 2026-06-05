<template>
  <div class="employee-group-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="名称">
              <a-input
                v-model:value="filters.name"
                allow-clear
                size="small"
                placeholder="请输入 名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="岗位">
              <a-select
                v-model:value="filters.position"
                allow-clear
                size="small"
                placeholder="请选择 岗位"
                :options="positionOpts"
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
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleBatchDelete">
          <DeleteOutlined />
          删除
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
        :scroll="{ x: 1400 }"
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <a class="link-code" @click="openEdit(record)">{{ record.code }}</a>
          </template>
          <template v-else-if="column.key === 'allowTaskGen'">
            <a-tag :color="record.allowTaskGen ? 'success' : 'error'">
              {{ record.allowTaskGen ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'leaderParticipates'">
            <a-tag :color="record.leaderParticipates ? 'success' : 'error'">
              {{ record.leaderParticipates ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'multiExecutor'">
            <a-tag :color="record.multiExecutor ? 'success' : 'error'">
              {{ record.multiExecutor ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '启用' ? 'success' : 'default'">{{
              record.status
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a class="danger-link" @click="handleDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <EmployeeGroupModal v-model:open="modalOpen" :record="editRecord" @saved="handleSearch" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import EmployeeGroupModal from './components/EmployeeGroupModal.vue'
import {
  employeeGroupState,
  deleteEmployeeGroups,
  positionOptions,
} from '@/store/employeeGroupStore'

const filters = reactive({ name: '', position: undefined })
const applied = reactive({ name: '', position: undefined })
const selectedRowKeys = ref([])
const modalOpen = ref(false)
const editRecord = ref(null)

const positionOpts = positionOptions.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '编码', key: 'code', dataIndex: 'code', width: 140 },
  { title: '名称', dataIndex: 'name', width: 120 },
  { title: '工作中心', dataIndex: 'workCenter', width: 100 },
  { title: '岗位', dataIndex: 'position', width: 120 },
  { title: '允许生成任务', key: 'allowTaskGen', width: 110 },
  { title: '组长参与生产', key: 'leaderParticipates', width: 120 },
  { title: '执行人多选', key: 'multiExecutor', width: 100 },
  { title: '状态', key: 'status', width: 80 },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const filteredList = computed(() =>
  employeeGroupState.groups.filter((g) => {
    if (applied.name && !g.name?.includes(applied.name)) return false
    if (applied.position && g.position !== applied.position) return false
    return true
  }),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function handleSearch() {
  applied.name = filters.name
  applied.position = filters.position
}

function handleReset() {
  filters.name = ''
  filters.position = undefined
  applied.name = ''
  applied.position = undefined
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
    content: `确定删除组别「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      deleteEmployeeGroups([record.id])
      selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
      message.success('已删除')
    },
  })
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请勾选要删除的组别')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除选中的 ${selectedRowKeys.value.length} 条组别吗？`,
    okType: 'danger',
    onOk: () => {
      deleteEmployeeGroups(selectedRowKeys.value)
      message.success('已删除')
      selectedRowKeys.value = []
    },
  })
}
</script>

<style lang="less" scoped>
.employee-group-page {
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

  .link-code {
    color: #1677ff;
  }

  .danger-link {
    color: #ff4d4f;
  }
}
</style>
