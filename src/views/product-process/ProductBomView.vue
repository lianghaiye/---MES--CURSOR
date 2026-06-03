<template>
  <div class="product-bom-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="BOM编号">
              <a-input
                v-model:value="filters.bomNo"
                allow-clear
                size="small"
                placeholder="请输入 BOM 编号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="BOM名称">
              <a-input
                v-model:value="filters.bomName"
                allow-clear
                size="small"
                placeholder="请输入 BOM 名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="物品名称">
              <a-select
                v-model:value="filters.itemId"
                allow-clear
                show-search
                size="small"
                placeholder="请选择物品"
                :filter-option="filterItem"
                :options="itemFilterOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="BOM状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择状态"
                :options="bomStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
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
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleBatchArchive">
          <InboxOutlined />
          归档
        </a-button>
        <a-dropdown>
          <a-button size="small">
            <DownloadOutlined />
            导出BOM
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onExportMenu">
              <a-menu-item key="selected">导出选中</a-menu-item>
              <a-menu-item key="all">导出全部</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
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
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 1600 }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'bomName'">
            <a class="link-name" @click.prevent="openVersionDrawer(record)">{{ record.bomName }}</a>
          </template>
          <template v-else-if="column.key === 'isDefault'">
            <a-tag :color="record.isDefault ? 'success' : 'error'">
              {{ record.isDefault ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0" wrap>
              <a-button
                v-if="record.status === '待发布'"
                type="link"
                size="small"
                @click="openEdit(record)"
              >
                <EditOutlined />
                编辑
              </a-button>
              <a-button
                v-if="canDelete(record)"
                type="link"
                size="small"
                danger
                @click="confirmDelete(record)"
              >
                <DeleteOutlined />
                删除
              </a-button>
              <a-button
                v-if="record.status !== '已归档'"
                type="link"
                size="small"
                @click="handleArchive(record)"
              >
                <InboxOutlined />
                归档
              </a-button>
              <a-button type="link" size="small" @click="handleClone(record)">
                <CopyOutlined />
                克隆
              </a-button>
              <a-button
                v-if="record.status === '待发布'"
                type="link"
                size="small"
                @click="openAudit(record)"
              >
                <AuditOutlined />
                审核发布
              </a-button>
              <a-button
                v-if="record.status === '待启用'"
                type="link"
                size="small"
                @click="handleEnable(record)"
              >
                <CheckOutlined />
                启用
              </a-button>
              <a-button
                v-if="record.status === '使用中' || record.status === '已归档'"
                type="link"
                size="small"
                @click="handleNewVersion(record)"
              >
                <PlusCircleOutlined />
                新版本
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <ProductBomFormModal
      v-model:open="formOpen"
      :edit-record="editRecord"
      @saved="onSaved"
    />
    <ProductBomAuditModal v-model:open="auditOpen" :record="auditRecord" @done="onSaved" />
    <ProductBomVersionDrawer v-model:open="versionOpen" :record="versionRecord" />
  </div>
</template>

<script>
export default { name: 'ProductBomView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  InboxOutlined,
  DownloadOutlined,
  DownOutlined,
  CheckOutlined,
  AuditOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons-vue'
import { filterProductBoms } from '@/mock/productBom'
import { bomStatusOptions, bomStatusColor } from '@/mock/productBomOptions'
import { productBomState } from '@/store/productBomStore'
import {
  deleteProductBom,
  cloneProductBom,
  archiveProductBom,
  batchArchiveProductBom,
  enableProductBom,
  createBomNewVersion,
} from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import ProductBomFormModal from './components/ProductBomFormModal.vue'
import ProductBomAuditModal from './components/ProductBomAuditModal.vue'
import ProductBomVersionDrawer from './components/ProductBomVersionDrawer.vue'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  bomNo: '',
  bomName: '',
  itemId: undefined,
  status: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const formOpen = ref(false)
const auditOpen = ref(false)
const versionOpen = ref(false)
const editRecord = ref(null)
const auditRecord = ref(null)
const versionRecord = ref(null)

const itemFilterOptions = computed(() => {
  const products = productInfoState.products.slice(0, 150).map((p) => ({
    label: p.name,
    value: p.id,
  }))
  const materials = materialInfoState.materials.slice(0, 80).map((m) => ({
    label: m.name,
    value: m.id,
  }))
  return [...products, ...materials]
})

function filterItem(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

const filteredList = computed(() =>
  filterProductBoms(productBomState.boms, appliedFilters.value),
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  fixed: true,
  columnWidth: 40,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

const columns = [
  { title: 'BOM状态', key: 'status', width: 92, fixed: 'left' },
  { title: 'BOM名称', key: 'bomName', width: 160, fixed: 'left', ellipsis: true },
  { title: 'BOM编号', dataIndex: 'bomNo', width: 140, ellipsis: true },
  { title: '物品名称', dataIndex: 'itemName', width: 180, ellipsis: true },
  { title: 'BOM版本', dataIndex: 'version', width: 100 },
  { title: '是否默认', key: 'isDefault', width: 88, align: 'center' },
  { title: '生效日期', dataIndex: 'effectiveAt', width: 150 },
  { title: '失效日期', dataIndex: 'expiredAt', width: 150 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
]

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.bomNo = ''
  filters.bomName = ''
  filters.itemId = undefined
  filters.status = undefined
  handleSearch()
}

function openCreate() {
  const path = '/product-process/bom/new'
  openTab(path, '新增BOM')
  router.push(path)
}

function openEdit(record) {
  editRecord.value = record
  formOpen.value = true
}

function openAudit(record) {
  auditRecord.value = record
  auditOpen.value = true
}

function openVersionDrawer(record) {
  versionRecord.value = record
  versionOpen.value = true
}

function onSaved() {
  handleSearch()
}

function canDelete(record) {
  return record.status === '待发布' || record.status === '已归档'
}

function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除 BOM「${record.bomName}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteProductBom(record.id)
      if (res?.error) {
        message.warning(res.error)
        return
      }
      message.success('已删除')
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
    },
  })
}

function handleArchive(record) {
  archiveProductBom(record.id)
  message.success('已归档')
}

function handleBatchArchive() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要归档的 BOM')
    return
  }
  Modal.confirm({
    title: '批量归档',
    content: `确定归档选中的 ${selectedRowKeys.value.length} 条 BOM 吗？`,
    onOk: () => {
      batchArchiveProductBom(selectedRowKeys.value)
      selectedRowKeys.value = []
      message.success('已归档')
    },
  })
}

function handleClone(record) {
  const cloned = cloneProductBom(record.id)
  if (cloned) message.success('已克隆为待发布版本')
}

function handleEnable(record) {
  const res = enableProductBom(record.id)
  if (res?.error) {
    message.warning(res.error)
    return
  }
  message.success('已启用，当前版本可用于生产')
}

function handleNewVersion(record) {
  Modal.confirm({
    title: '创建新版本',
    content: `将基于「${record.version}」生成次版本号 +1 的待发布 BOM，需审核发布后方可用于生产。`,
    onOk: () => {
      const created = createBomNewVersion(record.id)
      if (created) {
        message.success(`已创建新版本 ${created.version}，状态：待发布`)
      }
    },
  })
}

function onExportMenu({ key }) {
  message.info(key === 'selected' ? '导出选中功能开发中' : '导出全部功能开发中')
}
</script>

<style lang="less" scoped>
.product-bom-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
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

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
    white-space: nowrap;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 8px;
    font-size: 13px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 13px;
  }
}

.link-name {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
