<template>
  <div class="product-info-page master-item-info-page">
    <div class="page-layout">
      <div class="category-panel">
        <div class="category-tree-toggle">
          <a-radio-group v-model:value="categoryTreeMode" size="small" button-style="solid">
            <a-radio-button value="product">产品类别</a-radio-button>
            <a-radio-button value="material">物料类别</a-radio-button>
          </a-radio-group>
        </div>
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
                <a-form-item label="编号">
                  <a-input
                    v-model:value="filters.code"
                    allow-clear
                    size="small"
                    placeholder="请输入编号"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="名称">
                  <a-input
                    v-model:value="filters.name"
                    allow-clear
                    size="small"
                    placeholder="请输入名称"
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
                <a-form-item label="产品类型">
                  <a-select
                    v-model:value="filters.itemKind"
                    allow-clear
                    size="small"
                    placeholder="请选择 产品类型"
                    :options="itemKindFilterOpts"
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
                <a-form-item label="材质">
                  <a-input
                    v-model:value="filters.material"
                    allow-clear
                    size="small"
                    placeholder="请输入 材质"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="图号">
                  <a-input
                    v-model:value="filters.drawingNo"
                    allow-clear
                    size="small"
                    placeholder="请输入 图号"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="业务类型">
                  <a-select
                    v-model:value="filters.businessType"
                    allow-clear
                    size="small"
                    placeholder="请选择 业务类型"
                    :options="businessTypeFilterOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-form-item label="工作中心">
                  <a-select
                    v-model:value="filters.workCenter"
                    allow-clear
                    size="small"
                    placeholder="请选择 工作中心"
                    :options="workCenterFilterOpts"
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
                  <a-menu-item key="history">导入导出历史</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
          <a-space :size="8" class="toolbar-icons" align="center">
            <a-radio-group
              v-model:value="listViewMode"
              size="small"
              button-style="solid"
              @change="pagination.current = 1"
            >
              <a-radio-button value="sku">SKU 视图</a-radio-button>
              <a-radio-button value="template">模板视图</a-radio-button>
            </a-radio-group>
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
            v-if="listViewMode === 'sku'"
            :columns="tableColumns"
            :data-source="pagedList"
            row-key="id"
            size="small"
            bordered
            :scroll="{ x: tableScrollX }"
            :pagination="false"
            :row-selection="rowSelection"
            @change="onTableChange"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ rowIndex(index) }}
              </template>
              <template v-else-if="column.key === 'itemKind'">
                <a-tag>{{ record.itemKindLabel || '—' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'businessType'">
                <span class="attr-ellipsis">{{ formatProductBusinessType(record) }}</span>
              </template>
              <template v-else-if="column.key === 'bomInfo'">
                <span class="attr-ellipsis">{{ formatProductBomInfo(record) }}</span>
              </template>
              <template v-else-if="column.key === 'productAttribute'">
                <span class="attr-ellipsis">{{ record.productAttribute || '—' }}</span>
              </template>
              <template v-else-if="column.key === 'materialType'">
                {{ record.materialType || '—' }}
              </template>
              <template v-else-if="column.key === 'supplyForm'">
                {{ record.supplyForm || '—' }}
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
              <template v-else-if="column.key === 'matchingRequirements'">
                {{ record.matchingRequirements || record.remark || '—' }}
              </template>
              <template v-else-if="column.dataIndex === 'techParams'">
                {{ record.techParams || '—' }}
              </template>
              <template v-else-if="column.key === 'defaultWorkCenter'">
                {{ record.production?.defaultWorkCenter || '—' }}
              </template>
              <template v-else-if="column.key === 'defaultSupplier'">
                {{
                  formatPurchaseSuppliersSummary(
                    record.purchaseSuppliers || record.production?.purchaseSuppliers,
                  ) ||
                  record.production?.defaultSupplier ||
                  '—'
                }}
              </template>
              <template v-else-if="column.key === 'defaultOutsourceSupplier'">
                {{ record.production?.defaultOutsourceSupplier || '—' }}
              </template>
              <template v-else-if="column.key === 'isProductMaterial'">
                <a-tag :color="record.isProductMaterial ? 'success' : 'error'">
                  {{ record.isProductMaterial ? '是' : '否' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'creator'">
                {{ record.creator || '—' }}
              </template>
              <template v-else-if="column.key === 'action'">
                <MasterInfoRowActions
                  @edit="openEdit(record)"
                  @bom="openBomMaintenance(record)"
                  @delete="confirmDelete(record)"
                  @clone="handleClone(record)"
                />
              </template>
            </template>
          </a-table>

          <a-table
            v-else
            :columns="templateColumns"
            :data-source="pagedTemplateList"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'variantAxes'">
                {{ (record.variantAxes || []).map((a) => a.label).join(' + ') || '—' }}
              </template>
              <template v-else-if="column.key === 'bomStrategy'">
                {{ bomStrategyLabel(record.bomStrategy) }}
              </template>
              <template v-else-if="column.key === 'skuCount'">
                {{ listSkusForSpu(record.id).length }}
              </template>
              <template v-else-if="column.key === 'templateAction'">
                <a-space :size="4">
                  <a-button type="link" size="small" @click="openEditSpu(record)"
                    >编辑模板</a-button
                  >
                  <a-button type="link" size="small" @click="openMatrix(record)">变体矩阵</a-button>
                  <a-button type="link" size="small" @click="openTemplateBom(record)"
                    >模板 BOM</a-button
                  >
                </a-space>
              </template>
            </template>
          </a-table>

          <div class="table-pagination">
            <a-pagination
              v-model:current="pagination.current"
              v-model:page-size="pagination.pageSize"
              :total="listViewMode === 'sku' ? filteredList.length : filteredTemplateList.length"
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

    <MasterItemFormModal
      :key="modalSessionKey"
      v-model:open="formModalOpen"
      :edit-record="editRecord"
      :edit-spu="editSpu"
      :view-only="viewOnly"
      @saved="onSaved"
    />

    <a-modal
      v-model:open="matrixOpen"
      :title="`变体矩阵 — ${matrixSpu?.name || ''}`"
      width="920px"
      destroy-on-close
      @ok="generateMatrixSkus"
    >
      <VariantSkuMatrixPreview
        v-if="matrixSpu"
        ref="matrixPreviewRef"
        :spu="matrixSpu"
        :variant-axes="matrixSpu.variantAxes"
        :sku-code-pattern="matrixSpu.skuCodePattern"
        :enabled-keys="matrixSpu.enabledCombinations"
      />
      <template #footer>
        <a-button @click="matrixOpen = false">关闭</a-button>
        <a-button type="primary" @click="generateMatrixSkus">生成 SKU</a-button>
      </template>
    </a-modal>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <ImportExcelModal
      v-model:open="importOpen"
      :import-def="masterItemImportDef"
      @done="handleSearch"
    />
    <ImportExportHistoryModal v-model:open="historyOpen" />
  </div>
</template>

<script>
export default { name: 'MasterItemInfoView' }
</script>

<script setup>
import { computed, h, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  DownOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue'
import { productCategoryTree, filterCategoryTree } from '@/mock/productCategories'
import {
  materialCategoryTree,
  filterCategoryTree as filterMaterialCategoryTree,
} from '@/mock/materialCategories'
import { barcodeTypeOptions, workCenterOpts } from '@/mock/materialInfoOptions'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import MasterItemFormModal from './components/MasterItemFormModal.vue'
import MasterInfoRowActions from './components/MasterInfoRowActions.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { resolveItemBomNavigation } from '@/utils/itemBomNavigation'
import { formatPurchaseSuppliersSummary } from '@/utils/purchaseSuppliers'
import { formatBusinessTypeLabels, MASTER_BUSINESS_TYPE_OPTIONS } from '@/utils/businessTypeLabel'
import { productBomState, getBomInfoLabelForItem, getBomsForItem } from '@/store/productBomStore'
import { buildUnifiedListRows, filterUnifiedListRows } from '@/utils/masterItemList'
import {
  CATEGORY_TREE_MODE,
  ITEM_KIND,
  itemKindLabel,
  resolveBomItemTypeForKind,
} from '@/utils/masterItemKind'
import {
  saveMasterItem,
  deleteMasterItem,
  cloneMasterItem,
  resolveMasterItemEditRecord,
} from '@/utils/masterItemSave'
import { spuState, listSpus, updateSpu } from '@/store/spuStore'
import { listSkusForSpu, batchGenerateSkus } from '@/utils/spuSkuSave'
import { matrixRowsToSkuCombos } from '@/utils/spuMatrix'
import { SPU_BOM_STRATEGY_LABELS } from '@/constants/spu'
import VariantSkuMatrixPreview from '@/views/product-process/components/VariantSkuMatrixPreview.vue'
import ImportExcelModal from '@/components/ImportExcelModal.vue'
import ImportExportHistoryModal from '@/components/ImportExportHistoryModal.vue'
import { masterItemImportDef } from '@/utils/importDefs/masterItemImport'

const router = useRouter()
const { openTab } = useTabs()
const productCreatePage = findCreatePageByListPath('/product-process/products')

const categoryTreeMode = ref(CATEGORY_TREE_MODE.PRODUCT)
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
  material: '',
  drawingNo: '',
  businessType: undefined,
  workCenter: undefined,
  itemKind: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const formModalOpen = ref(false)
const editRecord = ref(null)
const editSpu = ref(null)
const viewOnly = ref(false)
const modalSessionKey = ref(0)
const listViewMode = ref('sku')
const matrixOpen = ref(false)
const matrixSpu = ref(null)
const matrixPreviewRef = ref(null)
watch(formModalOpen, (open) => {
  if (!open) viewOnly.value = false
})
const pagination = reactive({ current: 1, pageSize: 10 })

const barcodeOpts = barcodeTypeOptions.map((v) => ({ label: v, value: v }))
const businessTypeFilterOpts = MASTER_BUSINESS_TYPE_OPTIONS.map((o) => ({
  label: o.label,
  value: o.key,
}))
const itemKindFilterOpts = [
  { label: itemKindLabel(ITEM_KIND.PRODUCT), value: ITEM_KIND.PRODUCT },
  { label: itemKindLabel(ITEM_KIND.MATERIAL), value: ITEM_KIND.MATERIAL },
  { label: itemKindLabel(ITEM_KIND.PRODUCT_MATERIAL), value: ITEM_KIND.PRODUCT_MATERIAL },
]
const workCenterFilterOpts = workCenterOpts

const activeCategoryTree = computed(() =>
  categoryTreeMode.value === CATEGORY_TREE_MODE.MATERIAL
    ? materialCategoryTree
    : productCategoryTree,
)

watch(categoryTreeMode, (mode) => {
  selectedCategoryKey.value = mode === CATEGORY_TREE_MODE.MATERIAL ? 'cat-004' : 'pcat-004'
  expandedKeys.value = [selectedCategoryKey.value]
  filters.categoryKey = undefined
  pagination.current = 1
})

function mapTreeNodes(nodes) {
  return nodes.map((node) => ({
    key: node.key,
    title: `(${node.code}) ${node.title}`,
    children: node.children?.length ? mapTreeNodes(node.children) : undefined,
  }))
}

const displayTree = computed(() => {
  const tree = activeCategoryTree.value
  const filterFn =
    categoryTreeMode.value === CATEGORY_TREE_MODE.MATERIAL
      ? filterMaterialCategoryTree
      : filterCategoryTree
  return mapTreeNodes(filterFn(tree, categoryKeyword.value))
})

const unifiedList = computed(() => {
  void productInfoState.products
  void materialInfoState.materials
  return buildUnifiedListRows(productInfoState.products, materialInfoState.materials)
})

const filteredList = computed(() =>
  filterUnifiedListRows(
    unifiedList.value,
    appliedFilters.value,
    selectedCategoryKey.value,
    categoryTreeMode.value,
  ),
)

const filteredTemplateList = computed(() => {
  void spuState.spus
  return listSpus({ keyword: appliedFilters.value.name || appliedFilters.value.code })
})

const templateColumns = [
  { title: '模板编码', dataIndex: 'code', width: 110 },
  { title: '名称', dataIndex: 'name', width: 140 },
  { title: '分类', dataIndex: 'categoryName', width: 100 },
  { title: '变体维度', key: 'variantAxes', width: 140 },
  { title: 'BOM策略', key: 'bomStrategy', width: 100 },
  { title: 'SKU数', key: 'skuCount', width: 72 },
  { title: '操作', key: 'templateAction', width: 220, fixed: 'right' },
]

const pagedTemplateList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredTemplateList.value.slice(start, start + pagination.pageSize)
})

function bomStrategyLabel(v) {
  return SPU_BOM_STRATEGY_LABELS[v] || v || '—'
}

/** 编号排序：ascend / descend / undefined */
const codeSortOrder = ref()

const pagedList = computed(() => {
  const list = [...filteredList.value]
  if (codeSortOrder.value === 'ascend') {
    list.sort((a, b) =>
      String(a.code || '').localeCompare(String(b.code || ''), 'zh-CN', { numeric: true }),
    )
  } else if (codeSortOrder.value === 'descend') {
    list.sort((a, b) =>
      String(b.code || '').localeCompare(String(a.code || ''), 'zh-CN', { numeric: true }),
    )
  }
  const start = (pagination.current - 1) * pagination.pageSize
  return list.slice(start, start + pagination.pageSize)
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
  return resolveMasterItemEditRecord(record)
}

function openFormModal({ record = null, readOnly = false } = {}) {
  viewOnly.value = readOnly
  editRecord.value = record ? resolveProductRecord(record) : null
  editSpu.value = null
  modalSessionKey.value += 1
  formModalOpen.value = true
}

function openCreate() {
  openCreateTab(router, openTab, {
    path: productCreatePage.newPath,
    title: productCreatePage.title,
  })
}

function openEdit(record) {
  if (!record?.id) return
  openCreateTab(router, openTab, {
    path: `/product-process/products/${record.id}/edit`,
    title: `编辑产品 ${record.code || record.name || ''}`.trim(),
  })
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
    title: '编号',
    key: 'code',
    dataIndex: 'code',
    width: 148,
    fixed: 'left',
    // 不可与 sorter 同开 ellipsis：表头会 overflow:hidden，排序箭头被裁切
    sorter: true,
    sortDirections: ['ascend', 'descend'],
    showSorterTooltip: { title: '点击按编号排序' },
    customRender: renderProductCodeLink,
  },
  { title: '名称', dataIndex: 'name', width: 200, fixed: 'left', ellipsis: true },
  { title: '产品族', dataIndex: 'spuName', width: 100, ellipsis: true },
  { title: '产品类型', key: 'itemKind', width: 96, align: 'center' },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '业务类型', key: 'businessType', width: 140, ellipsis: true },
  { title: '类别', dataIndex: 'categoryName', width: 88 },
  { title: '产品属性', key: 'productAttribute', width: 110, ellipsis: true },
  { title: '标准规范', dataIndex: 'standardSpec', width: 100, ellipsis: true },
  { title: '物料类型', key: 'materialType', width: 90 },
  { title: '供应型态', key: 'supplyForm', width: 90 },
  { title: '技术参数', dataIndex: 'techParams', width: 120, ellipsis: true },
  { title: '配套要求', key: 'matchingRequirements', width: 120, ellipsis: true },
  { title: '重量', key: 'weight', width: 88, align: 'right' },
  { title: '库存单位', key: 'inventoryUnit', width: 88, align: 'center' },
  { title: '标准单价(不含税)', key: 'unitPrice', width: 120, align: 'right' },
  { title: 'BOM信息', key: 'bomInfo', width: 200, ellipsis: true },
  { title: '默认工作中心', key: 'defaultWorkCenter', width: 110 },
  { title: '默认采购供应商', key: 'defaultSupplier', width: 120, ellipsis: true },
  { title: '默认外协供应商', key: 'defaultOutsourceSupplier', width: 120, ellipsis: true },
  { title: '产品物料', key: 'isProductMaterial', width: 90, align: 'center' },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
  { title: '更新日期', dataIndex: 'updatedAt', width: 110 },
  { title: '创建人', key: 'creator', width: 88 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('master-item-list-v2', baseColumns, { minScrollX: 2780 })

const tableColumns = computed(() =>
  displayColumns.value.map((col) => {
    if (col.key !== 'code' && col.dataIndex !== 'code') return col
    return {
      ...col,
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      showSorterTooltip: { title: '点击按编号排序' },
      sortOrder: codeSortOrder.value || null,
    }
  }),
)

function onTableChange(_pagination, _filters, sorter) {
  const active = Array.isArray(sorter) ? sorter[0] : sorter
  if (active?.columnKey === 'code' || active?.field === 'code') {
    codeSortOrder.value = active.order || undefined
    pagination.current = 1
  }
}

function formatProductBusinessType(record) {
  return formatBusinessTypeLabels(record, MASTER_BUSINESS_TYPE_OPTIONS)
}

function formatProductBomInfo(record) {
  void productBomState.boms
  const itemType = resolveBomItemTypeForKind(record.itemKind)
  const label = getBomInfoLabelForItem(itemType, record.id)
  if (!label) return '—'
  if (record.spuId && !getBomsForItem(itemType, record.id).length) {
    return `${label}（继承模板）`
  }
  return label
}

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
  filters.material = ''
  filters.drawingNo = ''
  filters.businessType = undefined
  filters.workCenter = undefined
  filters.itemKind = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function onSaved(payload) {
  if (payload?.mode === 'multiVariant') {
    message.success('模板已保存')
    return
  }
  if (payload?.alreadySaved) return
  const { isEdit, id, productPayload, materialPayload } = payload
  saveMasterItem({ isEdit, id, productPayload, materialPayload })
}

function openEditSpu(record) {
  editRecord.value = null
  editSpu.value = { ...record }
  viewOnly.value = false
  modalSessionKey.value += 1
  formModalOpen.value = true
}

function openMatrix(record) {
  matrixSpu.value = { ...record }
  matrixOpen.value = true
}

function generateMatrixSkus() {
  if (!matrixSpu.value?.id) return
  const rows = matrixPreviewRef.value?.getEnabledRows?.() || []
  const combos = matrixRowsToSkuCombos(rows)
  if (!combos.length) {
    message.warning('请至少启用一个组合')
    return
  }
  const enabledKeys = rows.filter((r) => r.enabled).map((r) => r.rowKey)
  updateSpu(matrixSpu.value.id, { enabledCombinations: enabledKeys })
  const results = batchGenerateSkus(matrixSpu.value.id, combos)
  const created = results.filter((r) => r.created).length
  message.success(`已生成/更新 ${results.length} 个 SKU（新建 ${created}）`)
  matrixSpu.value = { ...matrixSpu.value, enabledCombinations: enabledKeys }
  matrixPreviewRef.value?.rebuildMatrix?.()
}

function openTemplateBom(record) {
  router.push({
    path: '/product-process/bom/new',
    query: { itemType: 'spu', itemId: record.id, itemName: record.name, bomType: '基准BOM' },
  })
}

function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      deleteMasterItem(record)
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      message.success('已删除')
    },
  })
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的记录')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除选中的 ${selectedRowKeys.value.length} 条记录吗？`,
    okType: 'danger',
    onOk: () => {
      const rows = unifiedList.value.filter((r) => selectedRowKeys.value.includes(r.id))
      rows.forEach((row) => deleteMasterItem(row))
      selectedRowKeys.value = []
      message.success('已删除')
    },
  })
}

function handleClone(record) {
  const cloned = cloneMasterItem(record)
  if (cloned) message.success('已克隆')
}

function openBomMaintenance(record) {
  const itemType = resolveBomItemTypeForKind(record.itemKind)
  const nav = resolveItemBomNavigation(itemType, record.id)
  openTab(nav.path, nav.title)
  router.push(nav.query ? { path: nav.path, query: nav.query } : nav.path)
}

function handleSyncSpec() {
  message.info('同步规格属性功能开发中')
}

const importOpen = ref(false)
const historyOpen = ref(false)

function onBatchMenu({ key }) {
  if (key === 'import') {
    importOpen.value = true
    return
  }
  if (key === 'history') {
    historyOpen.value = true
    return
  }
  message.info('批量导出功能开发中')
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

  .category-tree-toggle {
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

.toolbar-icons {
  margin-left: auto;
  flex-shrink: 0;
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 8px;
    font-size: 13px;
  }

  :deep(.ant-table-thead th.ant-table-column-has-sorters) {
    overflow: visible;
  }

  :deep(.ant-table-column-sorter) {
    color: #8c8c8c;
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
