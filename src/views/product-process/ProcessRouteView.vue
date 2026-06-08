<template>
  <div class="process-route-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="编号">
              <a-input v-model:value="filters.code" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="名称">
              <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="statusOpts"
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
                <a-button size="small" @click="handleReset">清空</a-button>
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
        :scroll="{ x: 1400 }"
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'code'">
            <a class="link-code" @click="goDetail(record)">{{ record.code }}</a>
          </template>
          <template v-else-if="column.key === 'product'">
            {{ record.productDisplay || '—' }}
          </template>
          <template v-else-if="column.key === 'applyScope'">
            {{ record.applyScope === '物品类别' ? '产品类别' : record.applyScope }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="0" wrap>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="confirmDelete(record)"
                >删除</a-button
              >
              <a-button
                v-if="record.status === '使用中'"
                type="link"
                size="small"
                @click="handleArchive(record)"
              >
                归档
              </a-button>
              <a-button
                v-if="record.status === '已归档'"
                type="link"
                size="small"
                @click="handleUnarchive(record)"
              >
                取消归档
              </a-button>
              <a-button type="link" size="small" @click="handleClone(record)">克隆</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <ProcessRouteEditorModal v-model:open="editorOpen" :edit-record="editRecord" @saved="onSaved" />
  </div>
</template>

<script>
export default { name: 'ProcessRouteView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import {
  processRouteState,
  filterProcessRoutes,
  deleteProcessRoute,
  archiveProcessRoute,
  unarchiveProcessRoute,
  cloneProcessRoute,
  ROUTE_STATUS,
} from '@/store/processRouteStore'
import ProcessRouteEditorModal from './components/ProcessRouteEditorModal.vue'

const router = useRouter()
const filters = reactive({ code: '', name: '', status: undefined })
const applied = reactive({ code: '', name: '', status: undefined })
const editorOpen = ref(false)
const editRecord = ref(null)

const statusOpts = ROUTE_STATUS.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '工艺路线编号', key: 'code', width: 120 },
  { title: '名称', dataIndex: 'name', width: 160 },
  { title: '产品', key: 'product', width: 120 },
  { title: '工艺应用范围', key: 'applyScope', dataIndex: 'applyScope', width: 120 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
  { title: '创建日期', dataIndex: 'createdAt', width: 160 },
  { title: '更新日期', dataIndex: 'updatedAt', width: 160 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const filteredList = computed(() => filterProcessRoutes(processRouteState.routes, applied))

function statusColor(status) {
  if (status === '使用中') return 'processing'
  if (status === '已归档') return 'warning'
  return 'default'
}

function handleSearch() {
  applied.code = filters.code.trim()
  applied.name = filters.name.trim()
  applied.status = filters.status
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  filters.status = undefined
  handleSearch()
}

function openCreate() {
  editRecord.value = null
  editorOpen.value = true
}

function openEdit(record) {
  editRecord.value = record
  editorOpen.value = true
}

function goDetail(record) {
  router.push(`/product-process/routing/${record.id}`)
}

function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除工艺路线「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteProcessRoute(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
    },
  })
}

function handleArchive(record) {
  const res = archiveProcessRoute(record.id)
  if (!res.ok) message.warning(res.message)
  else message.success('已归档')
}

function handleUnarchive(record) {
  const res = unarchiveProcessRoute(record.id)
  if (!res.ok) message.warning(res.message)
  else message.success('已取消归档')
}

function handleClone(record) {
  const res = cloneProcessRoute(record.id)
  if (!res.ok) message.warning(res.message)
  else message.success(`已克隆为 ${res.route.code}`)
}

function onSaved() {
  editRecord.value = null
}
</script>

<style scoped>
.process-route-page {
  padding: 0;
}
.toolbar-row {
  display: flex;
  justify-content: space-between;
  margin: 12px 0;
}
.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>
