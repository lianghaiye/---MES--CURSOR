<template>
  <div class="purchase-detail-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="采购单号">
              <a-input
                v-model:value="filters.orderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="供应商">
              <a-select
                v-model:value="filters.supplier"
                allow-clear
                show-search
                option-filter-prop="label"
                placeholder="请选择"
                size="small"
                :options="supplierOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品名称">
              <a-input
                v-model:value="filters.productName"
                allow-clear
                placeholder="请输入"
                size="small"
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
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="收货仓库">
              <a-select
                v-model:value="filters.receivingWarehouse"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="采购日期">
              <a-range-picker
                v-model:value="filters.documentDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="采购员">
              <a-select
                v-model:value="filters.purchaser"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="purchaserOpts"
              />
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
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'orderNo'">
            <a class="link-code" @click="openPurchaseOrderDetail(record)">{{ record.orderNo }}</a>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'purchaseQty'">
            {{ formatPurchaseDetailQty(record.purchaseQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            {{ formatPurchaseDetailMoney(record.unitPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'taxRate'">
            {{
              record.taxRate != null && record.taxRate !== ''
                ? `${formatPurchaseDetailQty(record.taxRate)}%`
                : '—'
            }}
          </template>
          <template v-else-if="column.key === 'unitPriceInTax'">
            {{ formatPurchaseDetailMoney(record.unitPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'totalPriceInTax'">
            {{ formatPurchaseDetailMoney(record.totalPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'totalPriceExTax'">
            {{ formatPurchaseDetailMoney(record.totalPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'receivedQty'">
            {{ formatPurchaseDetailQty(record.receivedQty) }}
          </template>
          <template v-else-if="column.key === 'deliveryDate'">
            {{ formatPurchaseDetailDate(record.deliveryDate) }}
          </template>
          <template v-else-if="column.key === 'inboundDate'">
            {{ record.inboundDate || '—' }}
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
export default { name: 'PurchaseDetailView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { purchaserOptions, warehouseOptions, supplierOptions } from '@/mock/purchaseOrderOptions'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import { purchaseDetailExportFields } from '@/utils/exportFields/purchaseDetailExport'
import {
  buildPurchaseDetailLines,
  filterPurchaseDetailLines,
  formatPurchaseDetailDate,
  formatPurchaseDetailMoney,
  formatPurchaseDetailQty,
} from '@/utils/purchaseDetailLines'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  orderNo: '',
  supplier: undefined,
  productName: '',
  specModel: '',
  material: '',
  drawingNo: '',
  receivingWarehouse: undefined,
  documentDateRange: null,
  purchaser: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const warehouseOpts = warehouseOptions.map((w) => ({ label: w.label, value: w.value }))
const purchaserOpts = purchaserOptions.map((v) => ({ label: v, value: v }))
const supplierOpts = supplierOptions

const allLines = computed(() =>
  buildPurchaseDetailLines(purchaseOrderState.orders, inboundOrderState.orders),
)

const filteredList = computed(() => filterPurchaseDetailLines(allLines.value, appliedFilters.value))

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'purchase-detail-list',
  fieldDefinitions: purchaseDetailExportFields,
  getFilteredRows: () => filteredList.value,
  getSelectedRows: () =>
    filteredList.value.filter((item) => selectedRowKeys.value.includes(item.id)),
  fileNamePrefix: '采购明细',
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
  { title: '#', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '单据状态', key: 'status', dataIndex: 'status', width: 90, fixed: 'left' },
  { title: '采购单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  {
    title: '供应商',
    key: 'supplier',
    dataIndex: 'supplier',
    width: 140,
    ellipsis: true,
    fixed: 'left',
  },
  {
    title: '入库进度',
    key: 'inboundProgress',
    dataIndex: 'inboundProgress',
    width: 180,
    ellipsis: true,
  },
  { title: '产品名称', dataIndex: 'productName', width: 160, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88 },
  { title: '图号', dataIndex: 'drawingNo', width: 110, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 96, align: 'right' },
  { title: '采购单价（不含税）', key: 'unitPriceExTax', width: 130, align: 'right' },
  { title: '税率', key: 'taxRate', width: 72, align: 'right' },
  { title: '采购单价（含税）', key: 'unitPriceInTax', width: 120, align: 'right' },
  { title: '总价（含税）', key: 'totalPriceInTax', width: 110, align: 'right' },
  { title: '总价（不含税）', key: 'totalPriceExTax', width: 120, align: 'right' },
  { title: '收货仓库', dataIndex: 'receivingWarehouse', width: 100 },
  {
    title: '入库质检要求',
    key: 'inboundQcRequirement',
    dataIndex: 'inboundQcRequirement',
    width: 110,
  },
  { title: '入库数量', key: 'receivedQty', width: 96, align: 'right' },
  { title: '交货日期', key: 'deliveryDate', width: 110 },
  { title: '入库日期', key: 'inboundDate', width: 110 },
  { title: '关联工单号', dataIndex: 'workOrderNo', width: 130, ellipsis: true },
  { title: '关联销售单号', dataIndex: 'salesOrderNo', width: 130, ellipsis: true },
  { title: '采购员', dataIndex: 'purchaser', width: 88 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 140 },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-detail-list-v5', baseColumns, { minScrollX: 3000 })

function statusColor(status) {
  const map = {
    待提交: 'default',
    待审核: 'processing',
    进行中: 'processing',
    已完成: 'success',
    已拒绝: 'error',
    已作废: 'default',
    草稿: 'default',
  }
  return map[status] || 'default'
}

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    orderNo: '',
    supplier: undefined,
    productName: '',
    specModel: '',
    material: '',
    drawingNo: '',
    receivingWarehouse: undefined,
    documentDateRange: null,
    purchaser: undefined,
  })
  appliedFilters.value = { ...filters }
  pagination.current = 1
  selectedRowKeys.value = []
}

function onBatchMenu({ key }) {
  if (key === 'export') openExportModal()
}

function openPurchaseOrderDetail(record) {
  if (!record?.orderId) return
  const path = `/procurement/purchase-orders/${record.orderId}`
  openTab({ path, title: '采购订单详情' })
  router.push(path)
}
</script>

<style scoped>
.purchase-detail-page {
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

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.link-code:hover {
  text-decoration: underline;
}
</style>
