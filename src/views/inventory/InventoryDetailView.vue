<template>
  <div class="inventory-detail-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="所属仓库">
              <a-select
                v-model:value="filters.warehouse"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                placeholder="编码 / SKU / 产品族"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品类型">
              <a-select
                v-model:value="filters.itemType"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="itemTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="规格型号">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="材质">
              <a-input
                v-model:value="filters.material"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="图号">
              <a-input
                v-model:value="filters.drawingNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="库存数量">
              <a-space :size="4">
                <a-input-number
                  v-model:value="filters.stockQtyMin"
                  size="small"
                  placeholder="最小值"
                  :min="0"
                  style="width: 100px"
                />
                <span>—</span>
                <a-input-number
                  v-model:value="filters.stockQtyMax"
                  size="small"
                  placeholder="最大值"
                  :min="0"
                  style="width: 100px"
                />
              </a-space>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
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
      <a-dropdown>
        <a-button size="small" @click.prevent>
          批量操作
          <DownOutlined />
        </a-button>
        <template #overlay>
          <a-menu @click="onBatchMenu">
            <a-menu-item key="export">导出</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
        </span>
      </template>
    </a-alert>

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
          <template v-else-if="column.key === 'itemType'">
            <a-tag :color="record.itemType === '产品' ? 'blue' : 'green'">{{
              record.itemType
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'weight'">
            {{ formatInventoryWeight(record.weight) }}
          </template>
          <template v-else-if="column.key === 'stockQty'">
            {{ formatInventoryQty(record.stockQty) }}
          </template>
          <template v-else-if="column.key === 'unitPrice'">
            {{ formatInventoryMoney(record.unitPrice) }}
          </template>
          <template v-else-if="column.key === 'totalAmount'">
            {{ formatInventoryMoney(record.totalAmount) }}
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

    <div class="table-card batch-card">
      <div class="batch-title">双物料单位批次（管号 / 当前长度）</div>
      <a-table
        :columns="batchColumns"
        :data-source="batchList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10 }"
      />
    </div>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <ExportExcelModal
      v-model:open="exportModalOpen"
      v-model:settings="exportFieldSettings"
      :default-settings="defaultExportFieldSettings"
      :filtered-count="filteredList.length"
      :selected-count="selectedRowKeys.length"
      @export="doExport"
    />
  </div>
</template>

<script>
export default { name: 'InventoryDetailView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { stockState } from '@/store/stockStore'
import { stockBatchState } from '@/store/stockBatchStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import { inventoryDetailExportFields } from '@/utils/exportFields/inventoryDetailExport'
import {
  buildInventoryDetailLines,
  filterInventoryDetailLines,
  formatInventoryMoney,
  formatInventoryQty,
  formatInventoryWeight,
  inventoryItemTypeOptions,
} from '@/utils/inventoryDetailLines'

const filters = reactive({
  warehouse: undefined,
  itemCode: '',
  itemName: '',
  itemType: undefined,
  specModel: '',
  material: '',
  drawingNo: '',
  stockQtyMin: undefined,
  stockQtyMax: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const warehouseOpts = warehouseOptions.map((w) => ({ label: w.label, value: w.value }))
const itemTypeOpts = inventoryItemTypeOptions

const allLines = computed(() =>
  buildInventoryDetailLines({
    stockRecords: stockState.records,
    products: productInfoState.products,
    materials: materialInfoState.materials,
    spus: [],
    warehouses: warehouseOptions.map((w) => w.value),
  }),
)

const filteredList = computed(() =>
  filterInventoryDetailLines(allLines.value, appliedFilters.value),
)

const batchList = computed(() => stockBatchState.batches)
const batchColumns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '仓库', dataIndex: 'warehouse', key: 'warehouse', width: 100 },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 140 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 160 },
  { title: '当前长度(米)', dataIndex: 'currentLength', key: 'currentLength', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '来源单号', dataIndex: 'sourceDocNo', key: 'sourceDocNo', width: 140 },
]

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'inventory-detail-list',
  fieldDefinitions: inventoryDetailExportFields,
  getFilteredRows: () => filteredList.value,
  getSelectedRows: () =>
    filteredList.value.filter((item) => selectedRowKeys.value.includes(item.id)),
  fileNamePrefix: '库存明细',
})

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

const baseColumns = [
  { title: '序号', key: 'index', width: 60, align: 'center', fixed: 'left' },
  { title: '所属仓库', dataIndex: 'warehouse', width: 100, fixed: 'left' },
  { title: '产品名称', dataIndex: 'itemName', width: 160, ellipsis: true },
  { title: '产品编码', dataIndex: 'itemCode', width: 130, ellipsis: true },
  { title: '产品类型', key: 'itemType', width: 88, align: 'center' },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88 },
  { title: '图号', dataIndex: 'drawingNo', width: 110, ellipsis: true },
  { title: '重量', key: 'weight', width: 88, align: 'right' },
  { title: '库存数量', key: 'stockQty', width: 96, align: 'right' },
  { title: '库位', dataIndex: 'locationNo', width: 110 },
  { title: '单价', key: 'unitPrice', width: 100, align: 'right' },
  { title: '库存总金额', key: 'totalAmount', width: 110, align: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('inventory-detail-list-v1', baseColumns, { minScrollX: 1600 })

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    warehouse: undefined,
    itemCode: '',
    itemName: '',
    itemType: undefined,
    specModel: '',
    material: '',
    drawingNo: '',
    stockQtyMin: undefined,
    stockQtyMax: undefined,
  })
  appliedFilters.value = { ...filters }
  pagination.current = 1
  selectedRowKeys.value = []
}

function onBatchMenu({ key }) {
  if (key === 'export') openExportModal()
}
</script>

<style scoped>
.inventory-detail-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100%;
}

.filter-card {
  background: #fff;
  padding: 12px 12px 4px;
  border-radius: 4px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.summary-bar {
  margin: 0;
}

.table-card {
  background: #fff;
  padding: 8px 12px 12px;
  border-radius: 4px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.batch-card {
  margin-top: 0;
}

.batch-title {
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
