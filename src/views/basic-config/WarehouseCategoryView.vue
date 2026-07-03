<template>
  <div class="warehouse-category-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="分类编码">
              <a-input
                v-model:value="filters.code"
                allow-clear
                size="small"
                placeholder="请输入 分类编码"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="分类名称">
              <a-input
                v-model:value="filters.name"
                allow-clear
                size="small"
                placeholder="请输入 分类名称"
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
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <a class="link-code" @click="openEdit(record)">{{ record.code }}</a>
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

    <WarehouseCategoryFormModal
      v-model:open="modalOpen"
      :record="editRecord"
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
export default { name: 'WarehouseCategoryView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import WarehouseCategoryFormModal from './components/WarehouseCategoryFormModal.vue'
import {
  warehouseCategoryState,
  filterWarehouseCategories,
  deleteWarehouseCategory,
} from '@/store/warehouseCategoryStore'
import { countWarehousesByCategoryId } from '@/store/warehouseStore'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({ code: '', name: '' })
const applied = reactive({ code: '', name: '' })
const modalOpen = ref(false)
const editRecord = ref(null)

const baseColumns = [
  { title: '分类编码', key: 'code', width: 120 },
  { title: '分类名称', dataIndex: 'name', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 100 },
  { title: '创建部门', dataIndex: 'createdDept', width: 120 },
  { title: '创建日期', dataIndex: 'createdAt', width: 170 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('warehouse-category-list', baseColumns)

const filteredList = computed(() =>
  filterWarehouseCategories(warehouseCategoryState.categories, applied),
)

function handleSearch() {
  applied.code = filters.code.trim()
  applied.name = filters.name.trim()
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  handleSearch()
}

function openCreate() {
  const page = findCreatePageByListPath('/basic-config/warehouse-categories')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function confirmDelete(record) {
  const count = countWarehousesByCategoryId(record.id)
  if (count > 0) {
    message.warning('该分类下存在仓库，无法删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除仓库分类「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteWarehouseCategory(record.id)
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
.warehouse-category-page {
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
