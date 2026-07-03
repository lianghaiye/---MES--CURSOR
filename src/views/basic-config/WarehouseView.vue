<template>
  <div class="warehouse-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="仓库编号">
              <a-input
                v-model:value="filters.code"
                allow-clear
                size="small"
                placeholder="请输入 仓库编号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="仓库名称">
              <a-input
                v-model:value="filters.name"
                allow-clear
                size="small"
                placeholder="请输入 仓库名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="仓库类型">
              <a-select
                v-model:value="filters.categoryId"
                allow-clear
                size="small"
                placeholder="请选择 仓库类型"
                :options="categoryOpts"
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
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        :columns="displayColumns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
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
          <template v-else-if="column.key === 'categoryName'">
            {{ record.categoryName || '—' }}
          </template>
          <template v-else-if="column.key === 'storedCount'">
            {{ (record.storedItems || []).length }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a @click="openStorage(record)">存放管理</a>
              <a class="danger-link" @click="confirmDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <WarehouseFormModal v-model:open="modalOpen" :record="editRecord" @saved="handleSearch" />
    <WarehouseStorageModal
      v-model:open="storageOpen"
      :warehouse="storageRecord"
      @saved="handleSearch"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'WarehouseView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import WarehouseFormModal from './components/WarehouseFormModal.vue'
import WarehouseStorageModal from './components/WarehouseStorageModal.vue'
import { warehouseState, filterWarehouses, deleteWarehouse } from '@/store/warehouseStore'
import { getWarehouseCategoryOptions } from '@/store/warehouseCategoryStore'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const router = useRouter()
const { openTab } = useTabs()
const filters = reactive({ code: '', name: '', categoryId: undefined })
const applied = reactive({ code: '', name: '', categoryId: undefined })
const modalOpen = ref(false)
const editRecord = ref(null)
const storageOpen = ref(false)
const storageRecord = ref(null)

const categoryOpts = computed(() => getWarehouseCategoryOptions())

const baseColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '仓库编号', key: 'code', width: 160, ellipsis: true },
  { title: '仓库名称', dataIndex: 'name', width: 140 },
  { title: '仓库类型', key: 'categoryName', width: 100 },
  { title: '管理员', dataIndex: 'managerName', width: 100 },
  { title: '所属工作中心', dataIndex: 'workCenter', width: 120, ellipsis: true },
  { title: '仓库地址', dataIndex: 'address', width: 140, ellipsis: true },
  { title: '存放物品', key: 'storedCount', width: 80, align: 'center' },
  { title: '创建日期', dataIndex: 'createdAt', width: 170 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('warehouse-list', baseColumns)

const filteredList = computed(() => filterWarehouses(warehouseState.warehouses, applied))

function handleSearch() {
  applied.code = filters.code.trim()
  applied.name = filters.name.trim()
  applied.categoryId = filters.categoryId
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  filters.categoryId = undefined
  handleSearch()
}

function openCreate() {
  const page = findCreatePageByListPath('/basic-config/warehouses')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function goDetail(record) {
  router.push(`/basic-config/warehouses/${record.id}`)
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function openStorage(record) {
  storageRecord.value = record
  storageOpen.value = true
}

function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除仓库「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteWarehouse(record.id)
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
.warehouse-page {
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
}
</style>
