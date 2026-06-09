<template>
  <a-modal
    :open="open"
    title="选择物品"
    width="1200px"
    :mask-closable="false"
    destroy-on-close
    class="select-warehouse-item-modal"
    @cancel="handleCancel"
  >
    <div class="picker-layout">
      <div class="category-panel">
        <div class="category-tip">*下方可搜索物品分类</div>
        <a-input
          v-model:value="categoryKeyword"
          allow-clear
          size="small"
          placeholder="搜索物品分类"
          class="category-search"
        />
        <div class="category-tree-wrap">
          <a-tree
            v-if="displayTree.length"
            :tree-data="displayTree"
            :expanded-keys="expandedKeys"
            :selected-keys="selectedCategoryKeys"
            block-node
            @expand="(keys) => (expandedKeys = keys)"
            @select="onSelectCategory"
          />
          <a-empty v-else :image="false" description="无匹配分类" />
        </div>
      </div>

      <div class="main-panel">
        <a-form :model="search" class="search-form horizontal-form">
          <a-row :gutter="[8, 0]" align="middle" class="search-row">
            <a-col flex="200px">
              <a-form-item label="物品编码">
                <a-input
                  v-model:value="search.code"
                  allow-clear
                  size="small"
                  placeholder="请输入"
                />
              </a-form-item>
            </a-col>
            <a-col flex="200px">
              <a-form-item label="物品名称">
                <a-input
                  v-model:value="search.name"
                  allow-clear
                  size="small"
                  placeholder="请输入"
                />
              </a-form-item>
            </a-col>
            <a-col flex="200px">
              <a-form-item label="规格型号">
                <a-input
                  v-model:value="search.specModel"
                  allow-clear
                  size="small"
                  placeholder="请输入"
                />
              </a-form-item>
            </a-col>
            <a-col flex="none">
              <a-form-item class="search-actions-item">
                <a-space :size="8">
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

        <a-alert type="info" show-icon class="selection-bar" :banner="false">
          <template #message>
            <span>
              当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
              <a-button type="link" size="small" @click="clearSelection">清空</a-button>
            </span>
          </template>
        </a-alert>

        <a-table
          :row-selection="rowSelection"
          :columns="columns"
          :data-source="pagedList"
          row-key="rowKey"
          size="small"
          bordered
          :scroll="{ x: 1100, y: 360 }"
          :pagination="pagination"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ (page - 1) * pageSize + index + 1 }}
            </template>
            <template v-else-if="column.key === 'name'">
              <a class="link-name">{{ record.name }}</a>
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { filterCategoryTree } from '@/mock/materialCategories'
import { productCategoryTree } from '@/mock/productCategories'
import { materialCategoryTree } from '@/mock/materialCategories'
import {
  buildWarehouseItemCategoryTree,
  buildWarehousePickableItems,
  filterWarehousePickableItems,
} from '@/utils/warehouseItemPicker'

const props = defineProps({
  open: { type: Boolean, default: false },
  selectedItems: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const categoryKeyword = ref('')
const selectedCategoryKey = ref('')
const expandedKeys = ref(['root-material', 'root-product', 'cat-004', 'pcat-004'])
const search = reactive({ code: '', name: '', specModel: '' })
const applied = reactive({ code: '', name: '', specModel: '' })
const selectedRowKeys = ref([])
const selectedRows = ref([])
const page = ref(1)
const pageSize = ref(10)

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '物品编码', dataIndex: 'code', width: 110 },
  { title: '物品名称', key: 'name', dataIndex: 'name', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '类别', dataIndex: 'categoryName', width: 90 },
  { title: '材质', dataIndex: 'material', width: 70 },
  { title: '单价', dataIndex: 'unitPrice', width: 80 },
  { title: '条码类型', dataIndex: 'barcodeType', width: 90 },
  { title: '库存单位', dataIndex: 'inventoryUnit', width: 80 },
]

const allItems = computed(() => buildWarehousePickableItems())

const displayTree = computed(() => {
  const kw = categoryKeyword.value.trim().toLowerCase()
  const tree = buildWarehouseItemCategoryTree()
  if (!kw) return tree
  const filterMat = filterCategoryTree(materialCategoryTree, kw)
  const filterProd = filterCategoryTree(productCategoryTree, kw)
  return [
    { key: 'root-material', title: '物料', selectable: false, children: filterMat },
    { key: 'root-product', title: '产品', selectable: false, children: filterProd },
  ].filter((n) => n.children?.length)
})

const selectedCategoryKeys = computed(() =>
  selectedCategoryKey.value ? [selectedCategoryKey.value] : [],
)

const filteredList = computed(() =>
  filterWarehousePickableItems(allItems.value, applied, selectedCategoryKey.value),
)

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredList.value.length,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t) => `共 ${t} 条`,
  size: 'small',
}))

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  },
}))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    categoryKeyword.value = ''
    selectedCategoryKey.value = ''
    search.code = ''
    search.name = ''
    search.specModel = ''
    applied.code = ''
    applied.name = ''
    applied.specModel = ''
    page.value = 1
    const preset = props.selectedItems || []
    selectedRowKeys.value = preset.map((it) => `${it.itemType}-${it.itemId}`)
    selectedRows.value = preset.map((it) => ({
      rowKey: `${it.itemType}-${it.itemId}`,
      ...it,
    }))
  },
)

function onSelectCategory(keys) {
  selectedCategoryKey.value = keys[0] || ''
  page.value = 1
}

function handleSearch() {
  applied.code = search.code.trim()
  applied.name = search.name.trim()
  applied.specModel = search.specModel.trim()
  page.value = 1
}

function handleReset() {
  search.code = ''
  search.name = ''
  search.specModel = ''
  selectedCategoryKey.value = ''
  handleSearch()
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedRows.value = []
}

function onTableChange(pag) {
  page.value = pag.current
  pageSize.value = pag.pageSize
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRows.value.length) {
    message.warning('请至少选择一项物品')
    return
  }
  emit(
    'confirm',
    selectedRows.value.map((r) => ({
      itemType: r.itemType,
      itemId: r.itemId,
      code: r.code,
      name: r.name,
      specModel: r.specModel,
      categoryName: r.categoryName,
      material: r.material,
      inventoryUnit: r.inventoryUnit,
      unitPrice: r.unitPrice,
      barcodeType: r.barcodeType,
    })),
  )
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.picker-layout {
  display: flex;
  gap: 12px;
  min-height: 480px;
}

.category-panel {
  width: 200px;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.category-tip {
  font-size: 12px;
  color: #ff4d4f;
  margin-bottom: 8px;
}

.category-search {
  margin-bottom: 8px;
}

.category-tree-wrap {
  flex: 1;
  overflow: auto;
}

.main-panel {
  flex: 1;
  min-width: 0;
}

.search-form {
  margin-bottom: 8px;
}

.search-row {
  flex-wrap: nowrap;
}

.search-actions-item {
  :deep(.ant-form-item-control-input-content) {
    white-space: nowrap;
  }
}

.selection-bar {
  margin-bottom: 8px;
}

.link-name {
  color: #1677ff;
}
</style>
