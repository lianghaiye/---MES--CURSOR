<template>
  <div class="spu-manage-page">
    <div class="page-header">
      <a-space>
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新建产品族
        </a-button>
        <a-button size="small" @click="router.push('/product-process/spu/migration')">
          归族工作台
        </a-button>
        <a-button size="small" @click="router.push('/product-process/products')">
          SKU 列表
        </a-button>
      </a-space>
    </div>

    <div class="page-layout">
      <div class="category-panel">
        <div class="category-tree-toggle">
          <a-radio-group v-model:value="categoryTreeMode" size="small" button-style="solid">
            <a-radio-button value="material">物料类别</a-radio-button>
            <a-radio-button value="product">产品类别</a-radio-button>
          </a-radio-group>
        </div>
        <div class="category-search">
          <a-input
            v-model:value="categoryKeyword"
            allow-clear
            size="small"
            placeholder="搜索类别"
          />
        </div>
        <a-tree
          v-if="displayTree.length"
          :tree-data="displayTree"
          :selected-keys="selectedCategoryKeys"
          block-node
          @select="onSelectCategory"
        />
      </div>

      <div class="main-panel">
        <div class="filter-card">
          <a-form layout="inline">
            <a-form-item label="族名称">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="搜索"
              />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" size="small" @click="reload">查询</a-button>
            </a-form-item>
          </a-form>
        </div>

        <div class="table-card">
          <a-table
            :columns="columns"
            :data-source="tableRows"
            :pagination="pagination"
            row-key="id"
            size="small"
            :scroll="{ x: 1100 }"
            @change="onTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'bomStrategy'">
                {{ SPU_BOM_STRATEGY_LABELS[record.bomStrategy] || record.bomStrategy }}
              </template>
              <template v-else-if="column.key === 'variantAxes'">
                {{ (record.variantAxes || []).map((a) => a.label).join(' + ') || '—' }}
              </template>
              <template v-else-if="column.key === 'skuCount'">
                {{ countSkusForSpu(record.id) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space :size="4">
                  <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" @click="openMatrix(record)">变体矩阵</a-button>
                  <a-button type="link" size="small" danger @click="handleDelete(record)"
                    >删除</a-button
                  >
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </div>
    </div>

    <SpuFormModal v-model:open="formOpen" :record="editRecord" @saved="reload" />
    <SpuVariantMatrixModal v-model:open="matrixOpen" :spu="matrixSpu" @saved="reload" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { materialCategoryTree, filterCategoryTree } from '@/mock/materialCategories'
import { productCategoryTree } from '@/mock/productCategories'
import { filterCategoryTree as filterProdTree } from '@/mock/materialCategories'
import { spuState, listSpus, deleteSpu, countSkusForSpu } from '@/store/spuStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { SPU_BOM_STRATEGY_LABELS } from '@/constants/spu'
import SpuFormModal from './components/SpuFormModal.vue'
import SpuVariantMatrixModal from './components/SpuVariantMatrixModal.vue'

const router = useRouter()
const categoryTreeMode = ref('material')
const categoryKeyword = ref('')
const selectedCategoryKeys = ref([])
const filters = reactive({ keyword: '' })
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const formOpen = ref(false)
const editRecord = ref(null)
const matrixOpen = ref(false)
const matrixSpu = ref(null)
const listVersion = ref(0)

const columns = [
  { title: '族编码', dataIndex: 'code', key: 'code', width: 110 },
  { title: '族名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 100 },
  { title: '变体维度', key: 'variantAxes', width: 140 },
  { title: 'BOM策略', key: 'bomStrategy', width: 120 },
  { title: 'SKU数', key: 'skuCount', width: 72 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const displayTree = computed(() => {
  const tree = categoryTreeMode.value === 'product' ? productCategoryTree : materialCategoryTree
  const kw = categoryKeyword.value
  if (categoryTreeMode.value === 'product') {
    return filterProdTree(tree, kw)
  }
  return filterCategoryTree(tree, kw)
})

const tableRows = computed(() => {
  void listVersion.value
  void spuState.spus
  const categoryKeys = selectedCategoryKeys.value[0] ? [selectedCategoryKeys.value[0]] : undefined
  return listSpus({
    keyword: filters.keyword,
    categoryKey: categoryKeys?.[0],
  })
})

function reload() {
  listVersion.value += 1
  pagination.total = tableRows.value.length
}

function onSelectCategory(keys) {
  selectedCategoryKeys.value = keys
  reload()
}

function onTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
}

function openCreate() {
  editRecord.value = null
  formOpen.value = true
}

function openEdit(record) {
  editRecord.value = { ...record }
  formOpen.value = true
}

function openMatrix(record) {
  matrixSpu.value = { ...record }
  matrixOpen.value = true
}

function handleDelete(record) {
  const skuCount = countSkusForSpu(
    record.id,
    productInfoState.products,
    materialInfoState.materials,
  )
  Modal.confirm({
    title: '删除产品族',
    content:
      skuCount > 0
        ? `该族下仍有 ${skuCount} 个 SKU，删除后 SKU 将变为独立主数据。确认删除？`
        : '确认删除该产品族？',
    onOk: () => {
      deleteSpu(record.id)
      message.success('已删除')
      reload()
    },
  })
}

reload()
</script>

<style scoped lang="less">
.spu-manage-page {
  padding: 12px;
}
.page-layout {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.category-panel {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 6px;
  padding: 10px;
}
.main-panel {
  flex: 1;
  min-width: 0;
}
.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.category-search {
  margin: 8px 0;
}
</style>
