<template>
  <div class="process-config-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="工序名称">
              <a-input
                v-model:value="filters.name"
                allow-clear
                size="small"
                placeholder="请输入 工序名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="工序分类">
              <a-select
                v-model:value="filters.category"
                allow-clear
                size="small"
                placeholder="请选择 工序分类"
                :options="categoryOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="资源类型">
              <a-select
                v-model:value="filters.resourceType"
                allow-clear
                size="small"
                placeholder="请选择 资源类型"
                :options="resourceTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择 状态"
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
        :scroll="{ x: 1380 }"
        :pagination="{
          pageSize: 10,
          size: 'small',
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'code'">
            <a class="link-code" @click="goDetail(record)">{{ record.code }}</a>
          </template>
          <template v-else-if="column.key === 'defaultExecutors'">
            <div v-if="record.defaultExecutors?.length" class="executor-tags">
              <a-tag
                v-for="name in record.defaultExecutors"
                :key="name"
                color="processing"
                class="executor-tag"
              >
                {{ name }}
              </a-tag>
            </div>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'image'">
            <img v-if="record.image" :src="record.image" class="thumb" alt="" />
            <span v-else class="thumb-placeholder">—</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '使用中' ? 'processing' : 'default'">{{
              record.status
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a class="danger-link" @click="confirmDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <ProcessConfigFormModal v-model:open="modalOpen" :record="editRecord" @saved="handleSearch" />
  </div>
</template>

<script>
export default { name: 'ProcessConfigView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import ProcessConfigFormModal from './components/ProcessConfigFormModal.vue'
import {
  processConfigState,
  filterProcessConfig,
  deleteProcessConfig,
  PROCESS_STATUS,
  RESOURCE_TYPES,
} from '@/store/processConfigStore'
import { getActiveCategoryOptions } from '@/store/processCategoryStore'

const router = useRouter()
const filters = reactive({
  name: '',
  category: undefined,
  resourceType: undefined,
  status: undefined,
})
const applied = reactive({
  name: '',
  category: undefined,
  resourceType: undefined,
  status: undefined,
})
const modalOpen = ref(false)
const editRecord = ref(null)

const categoryOpts = computed(() => getActiveCategoryOptions())
const resourceTypeOpts = RESOURCE_TYPES.map((v) => ({ label: v, value: v }))
const statusOpts = PROCESS_STATUS.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '工序编码', key: 'code', width: 130 },
  { title: '工序名称', dataIndex: 'name', width: 140 },
  { title: '工序分类', dataIndex: 'category', width: 100 },
  { title: '资源类型', dataIndex: 'resourceType', width: 100 },
  { title: '默认执行人/工组', key: 'defaultExecutors', width: 180, ellipsis: true },
  { title: '图片', key: 'image', width: 72 },
  { title: '状态', key: 'status', width: 90 },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
  { title: '更新日期', dataIndex: 'updatedAt', width: 110 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const filteredList = computed(() => filterProcessConfig(processConfigState.processes, applied))

function handleSearch() {
  applied.name = filters.name.trim()
  applied.category = filters.category
  applied.resourceType = filters.resourceType
  applied.status = filters.status
}

function handleReset() {
  filters.name = ''
  filters.category = undefined
  filters.resourceType = undefined
  filters.status = undefined
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

function goDetail(record) {
  router.push(`/product-process/process-config/${record.id}`)
}

function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除工序「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteProcessConfig(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.process-config-page {
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
    cursor: pointer;
  }

  .danger-link {
    color: #ff4d4f;
  }

  .thumb {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    object-fit: cover;
  }

  .thumb-placeholder {
    color: #bbb;
  }

  .executor-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .executor-tag {
    margin: 0;
  }

  .muted {
    color: #bbb;
  }
}
</style>
