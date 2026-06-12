<template>
  <div class="product-info-page">
    <div class="page-layout">
      <div class="category-panel">
        <div class="category-tip">*右击可对列表项进行操作</div>
        <div class="category-search">
          <a-input v-model:value="categoryKeyword" allow-clear size="small" placeholder="搜索类别">
            <template #suffix>
              <SearchOutlined />
            </template>
          </a-input>
          <a-button type="primary" size="small" class="add-cat-btn" @click="onAddCategory">
            <PlusOutlined />
          </a-button>
        </div>
        <div class="category-tree-wrap">
          <a-tree
            v-if="displayTree.length"
            :tree-data="displayTree"
            :expanded-keys="expandedKeys"
            :selected-keys="selectedCategoryKeys"
            block-node
            @expand="onExpand"
            @select="onSelectCategory"
          />
          <a-empty v-else :image="false" description="无匹配类别" />
        </div>
      </div>

      <div class="main-panel">
        <div class="filter-card">
          <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
            <a-row :gutter="[12, 8]" style="width: 100%">
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="产品编号">
                  <a-input
                    v-model:value="filters.code"
                    allow-clear
                    size="small"
                    placeholder="请输入产品编号"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="产品名称">
                  <a-input
                    v-model:value="filters.name"
                    allow-clear
                    size="small"
                    placeholder="请输入产品名称"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="条码类型">
                  <a-select
                    v-model:value="filters.barcodeType"
                    allow-clear
                    size="small"
                    placeholder="请选择 条码类型"
                    :options="barcodeOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="类别">
                  <a-select
                    v-model:value="filters.categoryKey"
                    allow-clear
                    size="small"
                    placeholder="请选择 类别"
                    :options="categoryFilterOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="规格型号">
                  <a-input
                    v-model:value="filters.specModel"
                    allow-clear
                    size="small"
                    placeholder="请输入 规格型号"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
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
            <a-button size="small" @click="handleBatchDelete">
              <DeleteOutlined />
              删除
            </a-button>
            <a-button size="small" @click="handleSyncSpec">
              <SyncOutlined />
              同步规格属性
            </a-button>
            <a-dropdown>
              <a-button size="small">
                批量操作
                <DownOutlined />
              </a-button>
              <template #overlay>
                <a-menu @click="onBatchMenu">
                  <a-menu-item key="import">批量导入</a-menu-item>
                  <a-menu-item key="export">批量导出</a-menu-item>
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
            <TableColumnSettingButton @click="columnDrawerOpen = true" />
          </a-space>
        </div>

        <div class="table-card">
          <a-table
            :columns="displayColumns"
            :data-source="pagedList"
            row-key="id"
            size="small"
            bordered
            :scroll="{ x: tableScrollX }"
            :pagination="false"
            :row-selection="rowSelection"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ rowIndex(index) }}
              </template>
              <template v-else-if="column.key === 'productAttribute'">
                <span class="attr-ellipsis">{{ record.productAttribute }}</span>
              </template>
              <template v-else-if="column.key === 'weight'">
                {{ formatWeight(record.weight) }}
              </template>
              <template v-else-if="column.key === 'inventoryUnit'">
                <a-tag color="blue" class="unit-tag">{{ record.inventoryUnit || '—' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'unitPrice'">
                {{ formatPrice(record.unitPrice) }}
              </template>
              <template v-else-if="column.key === 'expiryAlert'">
                <a-tag :color="record.expiryAlertEnabled ? 'success' : 'error'">
                  {{ record.expiryAlertEnabled ? '是' : '否' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'defaultWorkCenter'">
                {{ record.production?.defaultWorkCenter || '—' }}
              </template>
              <template v-else-if="column.key === 'standardCycleDays'">
                {{ record.production?.standardCycleDays ?? '—' }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space :size="0" class="action-btns">
                  <a-button type="link" size="small" @click="openEdit(record)">
                    <EditOutlined />
                    编辑
                  </a-button>
                  <a-button type="link" size="small" danger @click="confirmDelete(record)">
                    <DeleteOutlined />
                    删除
                  </a-button>
                  <a-button type="link" size="small" @click="handleClone(record)">
                    <CopyOutlined />
                    克隆
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
      </div>
    </div>

    <ProductFormModal
      :key="modalSessionKey"
      v-model:open="formModalOpen"
      :edit-record="editRecord"
      :view-only="viewOnly"
      @saved="onSaved"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'ProductInfoView' }
</script>

<script setup>
import { computed, h, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  CopyOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue'
import {
  productCategoryTree,
  filterCategoryTree,
  flattenCategoryNodes,
} from '@/mock/productCategories'
import { filterProducts } from '@/mock/productInfo'
import { barcodeTypeOptions } from '@/mock/materialInfoOptions'
import {
  productInfoState,
  addProduct,
  updateProduct,
  deleteProduct,
  cloneProduct,
} from '@/store/productInfoStore'
import ProductFormModal from './components/ProductFormModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const categoryKeyword = ref('')
const selectedCategoryKey = ref('pcat-004')
const expandedKeys = ref(['pcat-004'])
const selectedCategoryKeys = computed(() =>
  selectedCategoryKey.value ? [selectedCategoryKey.value] : [],
)

const filters = reactive({
  code: '',
  name: '',
  barcodeType: undefined,
  categoryKey: undefined,
  specModel: '',
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const formModalOpen = ref(false)
const editRecord = ref(null)
const viewOnly = ref(false)
const modalSessionKey = ref(0)
watch(formModalOpen, (open) => {
  if (!open) viewOnly.value = false
})
const pagination = reactive({ current: 1, pageSize: 10 })

const flatCats = flattenCategoryNodes(productCategoryTree)
const leafCats = flatCats.filter((c) => !c.children?.length)

const barcodeOpts = barcodeTypeOptions.map((v) => ({ label: v, value: v }))
const categoryFilterOpts = leafCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))

function mapTreeNodes(nodes) {
  return nodes.map((node) => ({
    key: node.key,
    title: `(${node.code}) ${node.title}`,
    children: node.children?.length ? mapTreeNodes(node.children) : undefined,
  }))
}

const displayTree = computed(() =>
  mapTreeNodes(filterCategoryTree(productCategoryTree, categoryKeyword.value)),
)

const filteredList = computed(() =>
  filterProducts(productInfoState.products, appliedFilters.value, selectedCategoryKey.value),
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

function resolveProductRecord(record) {
  if (!record?.id) return record
  return productInfoState.products.find((p) => p.id === record.id) || record
}

function openFormModal({ record = null, readOnly = false } = {}) {
  viewOnly.value = readOnly
  editRecord.value = record ? resolveProductRecord(record) : null
  modalSessionKey.value += 1
  formModalOpen.value = true
}

function openCreate() {
  openFormModal()
}

function openEdit(record) {
  openFormModal({ record })
}

function openDetail(record) {
  openFormModal({ record, readOnly: true })
}

function renderProductCodeLink({ text, record }) {
  return h(
    'a',
    {
      class: 'link-code',
      onClick: (e) => {
        e.preventDefault()
        e.stopPropagation()
        openDetail(record)
      },
    },
    text ?? record?.code ?? '',
  )
}

const baseColumns = [
  { title: '#', key: 'index', width: 52, align: 'center', fixed: 'left' },
  {
    title: '产品编号',
    key: 'code',
    dataIndex: 'code',
    width: 128,
    fixed: 'left',
    ellipsis: true,
    customRender: renderProductCodeLink,
  },
  { title: '产品名称', dataIndex: 'name', width: 200, fixed: 'left', ellipsis: true },
  { title: '条码类型', dataIndex: 'barcodeType', width: 100, fixed: 'left' },
  { title: '产品属性', key: 'productAttribute', width: 110, ellipsis: true },
  { title: '类别', dataIndex: 'categoryName', width: 88 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '重量(kg)', key: 'weight', width: 88, align: 'right' },
  { title: '库存单位', key: 'inventoryUnit', width: 88, align: 'center' },
  { title: '标准规范', dataIndex: 'standardSpec', width: 90 },
  { title: '单价', key: 'unitPrice', width: 88, align: 'right' },
  { title: '过期预警', key: 'expiryAlert', width: 88, align: 'center' },
  { title: '备注', dataIndex: 'remark', width: 100, ellipsis: true },
  { title: '默认工作中心', key: 'defaultWorkCenter', width: 110 },
  { title: '标准制造周期(天)', key: 'standardCycleDays', width: 120, align: 'right' },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
  { title: '更新日期', dataIndex: 'updatedAt', width: 110 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('product-info-list', baseColumns, { minScrollX: 2200 })

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function formatPrice(val) {
  if (val === '' || val == null) return ''
  return Number(val).toFixed(2)
}

function formatWeight(val) {
  if (val === '' || val == null) return ''
  return Number(val).toFixed(2)
}

function onExpand(keys) {
  expandedKeys.value = keys
}

function onSelectCategory(keys) {
  selectedCategoryKey.value = keys[0] || null
  pagination.current = 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  filters.barcodeType = undefined
  filters.categoryKey = undefined
  filters.specModel = ''
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function onSaved({ isEdit, id, data }) {
  if (isEdit) updateProduct(id, data)
  else addProduct(data)
}

function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除产品「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      deleteProduct(record.id)
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      message.success('已删除')
    },
  })
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的产品')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除选中的 ${selectedRowKeys.value.length} 条产品吗？`,
    okType: 'danger',
    onOk: () => {
      selectedRowKeys.value.forEach((id) => deleteProduct(id))
      selectedRowKeys.value = []
      message.success('已删除')
    },
  })
}

function handleClone(record) {
  const cloned = cloneProduct(record.id)
  if (cloned) message.success('已克隆')
}

function handleSyncSpec() {
  message.info('同步规格属性功能开发中')
}

function onBatchMenu({ key }) {
  message.info(key === 'import' ? '批量导入功能开发中' : '批量导出功能开发中')
}

function onAddCategory() {
  message.info('新增类别功能开发中')
}
</script>

<style lang="less" scoped>
.product-info-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-layout {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.category-panel {
  flex: 0 0 200px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 8px;
  max-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;

  .category-tip {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 8px;
  }

  .category-search {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;

    .add-cat-btn {
      flex-shrink: 0;
      padding-inline: 8px;
    }
  }

  .category-tree-wrap {
    flex: 1;
    overflow: auto;

    :deep(.ant-tree-title) {
      font-size: 13px;
    }
  }
}

.main-panel {
  flex: 1;
  min-width: 0;
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

  .unit-tag {
    margin: 0;
    line-height: 20px;
    font-size: 12px;
  }

  .attr-ellipsis {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link-code {
    color: #1677ff;
    cursor: pointer;
  }

  .action-btns {
    flex-wrap: nowrap;
    white-space: nowrap;
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

@media (max-width: 992px) {
  .page-layout {
    flex-direction: column;
  }

  .category-panel {
    width: 100%;
    max-height: 220px;
  }
}
</style>
