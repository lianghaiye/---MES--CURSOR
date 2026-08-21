<template>
  <div class="inventory-detail-page">
    <a-tabs v-model:activeKey="viewTab" size="small" class="view-tabs">
      <a-tab-pane key="ledger" tab="库存台账" />
      <a-tab-pane key="batches" tab="按批次查询" />
    </a-tabs>

    <template v-if="viewTab === 'ledger'">
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
            · 查销售单挂批请用「按批次查询」
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
            <template v-else-if="column.key === 'softAllocated'">
              {{ formatInventoryQty(record.softAllocated) }}
            </template>
            <template v-else-if="column.key === 'availableQty'">
              {{ formatInventoryQty(record.availableQty) }}
            </template>
            <template v-else-if="column.key === 'dedicatedQty'">
              {{ formatInventoryQty(record.dedicatedQty) }}
            </template>
            <template v-else-if="column.key === 'unitPrice'">
              {{ formatInventoryMoney(record.unitPrice) }}
            </template>
            <template v-else-if="column.key === 'totalAmount'">
              {{ formatInventoryMoney(record.totalAmount) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a @click="openBatchDrawer(record)">查看批次</a>
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
    </template>

    <template v-else>
      <div class="filter-card">
        <a-form :model="batchFilters" layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="销售订单号">
                <a-input
                  v-model:value="batchFilters.salesOrderNo"
                  allow-clear
                  placeholder="按销售单号筛选"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="批次号">
                <a-input
                  v-model:value="batchFilters.batchNo"
                  allow-clear
                  placeholder="批次号"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="物料编码">
                <a-input
                  v-model:value="batchFilters.itemCode"
                  allow-clear
                  placeholder="物料编码"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="仓库">
                <a-select
                  v-model:value="batchFilters.warehouse"
                  allow-clear
                  placeholder="请选择"
                  size="small"
                  :options="warehouseOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="归属">
                <a-select
                  v-model:value="batchFilters.ownership"
                  allow-clear
                  placeholder="全部"
                  size="small"
                  :options="ownershipOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item>
                <a-space>
                  <a-button type="primary" size="small" @click="handleBatchSearch">搜索</a-button>
                  <a-button size="small" @click="handleBatchReset">清空</a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>
      <div class="table-card">
        <a-table
          :columns="batchQueryColumns"
          :data-source="filteredBatchRows"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1200 }"
          :pagination="{ pageSize: 15 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'ownership'">
              <a-tag :color="record.salesOrderNo ? 'blue' : 'default'">
                {{ record.salesOrderNo ? '按单' : '自由备货' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'currentLength'">
              {{ formatInventoryQty(record.currentLength) }}
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <a-drawer
      v-model:open="batchDrawerOpen"
      :title="batchDrawerTitle"
      width="1100"
      destroy-on-close
    >
      <div v-if="batchDrawerRow" class="batch-soft-summary">
        <span
          >在库合计 <b>{{ formatInventoryQty(drawerBatchStockTotal) }}</b></span
        >
        <span class="soft-sep">|</span>
        <span>
          软占用（物料级）
          <a v-if="drawerItemSoftAllocated > 0" class="soft-link" @click="openSoftAllocDetail">
            {{ formatInventoryQty(drawerItemSoftAllocated) }}
          </a>
          <b v-else>{{ formatInventoryQty(0) }}</b>
          <a-button
            v-if="drawerItemSoftAllocated > 0"
            type="link"
            size="small"
            class="soft-detail-btn"
            @click="openSoftAllocDetail"
          >
            查看占用明细
          </a-button>
        </span>
        <span class="soft-sep">|</span>
        <span
          >可用约 <b>{{ formatInventoryQty(drawerItemAvailableApprox) }}</b></span
        >
      </div>
      <a-alert
        type="info"
        show-icon
        class="batch-soft-tip"
        message="软占用按物料汇总，不落到具体批次；批次行「软占用」列展示本物料合计，点击可查看占用订单。"
      />
      <a-table
        :columns="drawerBatchColumns"
        :data-source="drawerBatches"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ownership'">
            <a-tag :color="record.salesOrderNo ? 'blue' : 'default'">
              {{ record.salesOrderNo ? '按单' : '自由备货' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'currentLength'">
            {{ formatInventoryQty(record.currentLength) }}
          </template>
          <template v-else-if="column.key === 'softAllocated'">
            <a-tooltip title="本物料软占用合计（非本批独占）">
              <a v-if="drawerItemSoftAllocated > 0" class="soft-link" @click="openSoftAllocDetail">
                {{ formatInventoryQty(drawerItemSoftAllocated) }}
              </a>
              <span v-else>{{ formatInventoryQty(0) }}</span>
            </a-tooltip>
          </template>
        </template>
      </a-table>
    </a-drawer>

    <a-modal
      v-model:open="softAllocDetailOpen"
      :title="softAllocDetailTitle"
      :footer="null"
      width="860px"
      destroy-on-close
    >
      <a-table
        :columns="softAllocDetailColumns"
        :data-source="softAllocDetailRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'salesOrderNo'">
            <a v-if="record.salesOrderId" @click="goSalesOrderDetail(record.salesOrderId)">
              {{ record.salesOrderNo || record.salesOrderId }}
            </a>
            <span v-else>{{ record.salesOrderNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'qty'">
            {{ formatInventoryQty(record.qty) }}
          </template>
        </template>
      </a-table>
      <a-empty v-if="!softAllocDetailRows.length" description="暂无软占用记录" />
    </a-modal>

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
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { stockState } from '@/store/stockStore'
import { listBatches, stockBatchState, BATCH_STATUS } from '@/store/stockBatchStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  getSoftAllocatedQtyByItemCode,
  listSoftAllocationsByItemCode,
  salesStockAllocationState,
} from '@/store/salesStockAllocationStore'
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

const route = useRoute()
const router = useRouter()
const viewTab = ref('ledger')
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

const batchFilters = reactive({
  salesOrderNo: '',
  batchNo: '',
  itemCode: '',
  warehouse: undefined,
  ownership: undefined,
})
const appliedBatchFilters = ref({ ...batchFilters })

const batchDrawerOpen = ref(false)
const batchDrawerRow = ref(null)

const warehouseOpts = warehouseOptions.map((w) => ({ label: w.label, value: w.value }))
const itemTypeOpts = inventoryItemTypeOptions
const ownershipOpts = [
  { label: '按单', value: 'dedicated' },
  { label: '自由备货', value: 'free' },
]

function sumDedicatedOnHand(warehouse, itemCode) {
  return listBatches({ warehouse, itemCode, inStockOnly: true }).reduce((s, b) => {
    if (!b.salesOrderId && !b.salesOrderNo) return s
    return s + (Number(b.currentLength) || 0)
  }, 0)
}

const allLines = computed(() => {
  void stockBatchState.batches
  const base = buildInventoryDetailLines({
    stockRecords: stockState.records,
    products: productInfoState.products,
    materials: materialInfoState.materials,
    spus: [],
    warehouses: warehouseOptions.map((w) => w.value),
  })
  return base.map((row) => {
    const softAllocated = getSoftAllocatedQtyByItemCode(row.itemCode)
    const stockQty = Number(row.stockQty) || 0
    const dedicatedQty = sumDedicatedOnHand(row.warehouse, row.itemCode)
    return {
      ...row,
      softAllocated,
      availableQty: Math.max(0, stockQty - softAllocated),
      dedicatedQty,
    }
  })
})

const filteredList = computed(() =>
  filterInventoryDetailLines(allLines.value, appliedFilters.value),
)

const filteredBatchRows = computed(() => {
  void stockBatchState.batches
  const f = appliedBatchFilters.value
  return listBatches({ inStockOnly: false }).filter((b) => {
    if (b.status !== BATCH_STATUS.IN_STOCK) return false
    if (f.salesOrderNo && !String(b.salesOrderNo || '').includes(String(f.salesOrderNo).trim())) {
      return false
    }
    if (f.batchNo && !String(b.batchNo || '').includes(String(f.batchNo).trim())) return false
    if (f.itemCode && !String(b.itemCode || '').includes(String(f.itemCode).trim())) return false
    if (f.warehouse && b.warehouse !== f.warehouse) return false
    if (f.ownership === 'dedicated' && !(b.salesOrderId || b.salesOrderNo)) return false
    if (f.ownership === 'free' && (b.salesOrderId || b.salesOrderNo)) return false
    return true
  })
})

const batchQueryColumns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '归属', key: 'ownership', width: 96 },
  { title: '销售订单号', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 130 },
  { title: '仓库', dataIndex: 'warehouse', key: 'warehouse', width: 100 },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 130 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
  { title: '在库数量', key: 'currentLength', width: 100, align: 'right' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '来源单号', dataIndex: 'sourceDocNo', key: 'sourceDocNo', width: 140 },
]

const drawerBatchColumns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '归属', key: 'ownership', width: 88 },
  { title: '销售订单号', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 140 },
  { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '来源单号', dataIndex: 'sourceDocNo', key: 'sourceDocNo', width: 140 },
  { title: '在库数量', key: 'currentLength', width: 100, align: 'right' },
  { title: '软占用', key: 'softAllocated', width: 100, align: 'right' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
]

const softAllocDetailColumns = [
  { title: '销售订单号', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 150 },
  { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 140, ellipsis: true },
  { title: '销售行', dataIndex: 'salesLineId', key: 'salesLineId', width: 160, ellipsis: true },
  { title: '占用数量', key: 'qty', width: 100, align: 'right' },
  { title: '交期', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 120 },
  { title: '占用时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150 },
]

const batchDrawerTitle = computed(() => {
  const r = batchDrawerRow.value
  if (!r) return '批次明细'
  return `批次 · ${r.warehouse || ''} / ${r.itemCode || ''}`
})

const drawerBatches = computed(() => {
  const r = batchDrawerRow.value
  if (!r) return []
  void stockBatchState.batches
  return listBatches({
    warehouse: r.warehouse,
    itemCode: r.itemCode,
    inStockOnly: true,
  })
})

const drawerBatchStockTotal = computed(() =>
  drawerBatches.value.reduce((s, b) => s + (Number(b.currentLength) || 0), 0),
)

const drawerItemSoftAllocated = computed(() => {
  const code = batchDrawerRow.value?.itemCode
  if (!code) return 0
  void salesStockAllocationState.allocations
  return getSoftAllocatedQtyByItemCode(code)
})

const drawerItemAvailableApprox = computed(() =>
  Math.max(0, drawerBatchStockTotal.value - drawerItemSoftAllocated.value),
)

const softAllocDetailTitle = computed(() => {
  const code = batchDrawerRow.value?.itemCode || ''
  return `软占用明细 · ${code}`
})

const softAllocDetailOpen = ref(false)

const softAllocDetailRows = computed(() => {
  const code = batchDrawerRow.value?.itemCode
  if (!code || !softAllocDetailOpen.value) return []
  void salesStockAllocationState.allocations
  return listSoftAllocationsByItemCode(code)
})

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
  { title: '现存量', key: 'stockQty', width: 88, align: 'right' },
  { title: '软占用', key: 'softAllocated', width: 88, align: 'right' },
  { title: '可用', key: 'availableQty', width: 88, align: 'right' },
  { title: '按单在库', key: 'dedicatedQty', width: 96, align: 'right' },
  { title: '库位', dataIndex: 'locationNo', width: 110 },
  { title: '单价', key: 'unitPrice', width: 100, align: 'right' },
  { title: '库存总金额', key: 'totalAmount', width: 110, align: 'right' },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('inventory-detail-list-v2', baseColumns, { minScrollX: 1800 })

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

function handleBatchSearch() {
  appliedBatchFilters.value = { ...batchFilters }
}

function handleBatchReset() {
  Object.assign(batchFilters, {
    salesOrderNo: '',
    batchNo: '',
    itemCode: '',
    warehouse: undefined,
    ownership: undefined,
  })
  appliedBatchFilters.value = { ...batchFilters }
}

function openBatchDrawer(record) {
  batchDrawerRow.value = record
  batchDrawerOpen.value = true
  softAllocDetailOpen.value = false
}

function openSoftAllocDetail() {
  if (!(drawerItemSoftAllocated.value > 0)) return
  softAllocDetailOpen.value = true
}

function goSalesOrderDetail(id) {
  if (!id) return
  softAllocDetailOpen.value = false
  router.push(`/sales/orders/${id}`)
}

function onBatchMenu({ key }) {
  if (key === 'export') openExportModal()
}

watch(
  () => route.query.salesOrderNo,
  (no) => {
    if (!no) return
    viewTab.value = 'batches'
    batchFilters.salesOrderNo = String(no)
    appliedBatchFilters.value = { ...batchFilters }
  },
  { immediate: true },
)
</script>

<style scoped>
.inventory-detail-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100%;
}

.view-tabs {
  background: #fff;
  padding: 0 12px;
  border-radius: 4px;
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

.batch-soft-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  font-size: 13px;
  color: #595959;
}

.batch-soft-summary b {
  color: #262626;
  font-weight: 600;
  margin-left: 4px;
}

.soft-sep {
  color: #d9d9d9;
  margin: 0 4px;
}

.soft-link {
  margin-left: 4px;
  font-weight: 600;
}

.soft-detail-btn {
  padding-inline: 4px;
  height: auto;
}

.batch-soft-tip {
  margin-bottom: 12px;
}
</style>
