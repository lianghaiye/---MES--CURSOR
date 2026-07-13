<template>
  <div class="supplier-profile-page">
    <div class="filter-card">
      <a-form layout="inline" :model="filters" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="供应商编码">
              <a-input v-model:value="filters.code" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="供应商名称">
              <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="供应商分类">
              <a-select
                v-model:value="filters.supplierCategoryId"
                allow-clear
                size="small"
                placeholder="全部"
                :options="supplierCategoryOpts"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="goCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" :disabled="!selectedRowKeys.length" @click="handleEnable">
          启用
        </a-button>
        <a-button size="small" :disabled="!selectedRowKeys.length" @click="handleDisable">
          停用
        </a-button>
        <a-dropdown>
          <a-button size="small">
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onBatchMenu">
              <a-menu-item key="import">导入</a-menu-item>
              <a-menu-item key="export">导出</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </div>

    <a-alert
      v-if="selectedRowKeys.length"
      type="info"
      show-icon
      class="selection-bar"
      :banner="false"
    >
      <template #message>
        <span>
          当前已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
        :scroll="{ x: 1600 }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'name'">
            <a class="link-name" @click.prevent="goDetail(record)">{{ record.name }}</a>
          </template>
          <template v-else-if="column.key === 'supplierRoles'">
            <a-space :size="4" wrap>
              <a-tag v-for="role in record.supplierRoles || []" :key="role" color="blue">{{
                role
              }}</a-tag>
              <span v-if="!(record.supplierRoles || []).length">—</span>
            </a-space>
          </template>
          <template v-else-if="column.key === 'supplierCategoryId'">
            {{ resolveCategoryName(record.supplierCategoryId) }}
          </template>
          <template v-else-if="column.key === 'supplyCycleDays'">
            {{ formatSupplyCycle(record.supplyCycleDays) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="supplierStatusColor(record.status)">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="goEdit(record)">编辑</a>
              <a class="danger-link" @click="handleDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DownOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { supplierState, deleteSupplier, setSuppliersStatus } from '@/store/supplierStore'
import { getSupplierCategoryById, getSupplierCategoryOptions } from '@/store/supplierCategoryStore'
import { supplierStatusColor } from '@/constants/supplierMaster'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({ code: '', name: '', supplierCategoryId: undefined })
const applied = reactive({ code: '', name: '', supplierCategoryId: undefined })
const selectedRowKeys = ref([])

const supplierCategoryOpts = computed(() => getSupplierCategoryOptions())

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '供应商编码', dataIndex: 'code', width: 120 },
  { title: '类型', key: 'supplierRoles', width: 120 },
  { title: '供应商名称', key: 'name', width: 180 },
  { title: '供应商简称', dataIndex: 'shortName', width: 120, ellipsis: true },
  { title: '供应商分类', key: 'supplierCategoryId', width: 120 },
  { title: '规模', dataIndex: 'enterpriseScale', width: 80 },
  { title: '供货期', key: 'supplyCycleDays', width: 90 },
  { title: '结算方式', dataIndex: 'settlementMethod', width: 100 },
  { title: '结算类型', dataIndex: 'settlementType', width: 110 },
  { title: '结算周期', dataIndex: 'settlementCycle', width: 90 },
  { title: '付款方式', dataIndex: 'paymentMethod', width: 100 },
  { title: '状态', key: 'status', width: 80 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建日期', key: 'createdAt', width: 150 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const filteredList = computed(() => {
  void supplierState.suppliers
  return supplierState.suppliers.filter((item) => {
    if (applied.code && !String(item.code || '').includes(applied.code)) return false
    if (applied.name && !String(item.name || '').includes(applied.name)) return false
    if (applied.supplierCategoryId && item.supplierCategoryId !== applied.supplierCategoryId) {
      return false
    }
    return true
  })
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function resolveCategoryName(categoryId) {
  return getSupplierCategoryById(categoryId)?.name || '—'
}

function formatSupplyCycle(days) {
  if (days == null || days === '') return '—'
  return `${days}天`
}

function formatDate(val) {
  if (!val) return '—'
  return String(val).slice(0, 10)
}

function handleSearch() {
  applied.code = filters.code.trim()
  applied.name = filters.name.trim()
  applied.supplierCategoryId = filters.supplierCategoryId
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  filters.supplierCategoryId = undefined
  handleSearch()
}

function goCreate() {
  const path = '/basic-config/suppliers/new'
  openTab(path, '新增供应商')
  router.push(path)
}

function goEdit(record) {
  const path = `/basic-config/suppliers/${record.id}/edit`
  openTab(path, '编辑供应商')
  router.push(path)
}

function goDetail(record) {
  const path = `/basic-config/suppliers/${record.id}`
  openTab(path, record.name || '供应商详情')
  router.push(path)
}

function handleEnable() {
  const res = setSuppliersStatus(selectedRowKeys.value, '启用')
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(`已启用 ${res.count} 条供应商`)
  selectedRowKeys.value = []
}

function handleDisable() {
  const res = setSuppliersStatus(selectedRowKeys.value, '停用')
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(`已停用 ${res.count} 条供应商`)
  selectedRowKeys.value = []
}

function onBatchMenu({ key }) {
  if (key === 'export') {
    message.info('导出功能开发中')
    return
  }
  message.info('导入功能开发中')
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除供应商「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteSupplier(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
      selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
    },
  })
}
</script>

<style scoped>
.supplier-profile-page {
  .filter-card,
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .toolbar-row {
    margin-bottom: 12px;
  }

  .selection-bar {
    margin-bottom: 12px;
  }

  .link-name {
    color: #1677ff;
  }

  .danger-link {
    color: #ff4d4f;
  }
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}
</style>
