<template>
  <div class="sales-line-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="销售单号">
              <a-input
                v-model:value="filters.orderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="客户名称">
              <a-select
                v-model:value="filters.customerName"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="customerOpts"
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
            <a-form-item label="产品编码">
              <a-input
                v-model:value="filters.productCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务员">
              <a-select
                v-model:value="filters.salesperson"
                allow-clear
                placeholder="请选择"
                size="small"
                show-search
                :options="salespersonOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="订单状态">
              <a-select
                v-model:value="filters.progressStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="progressStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="行发货状态">
              <a-select
                v-model:value="filters.lineDeliveryStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="lineDeliveryStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务类型">
              <a-select
                v-model:value="filters.businessType"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="businessTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="交付方式">
              <a-select
                v-model:value="filters.deliveryMode"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="deliveryModeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="交货日期">
              <a-range-picker
                v-model:value="filters.deliveryDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item" label=" ">
              <a-space :size="8">
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">
                  <ReloadOutlined />
                  重置
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space :size="8">
        <a-button size="small" @click="exportModalOpen = true">导出</a-button>
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

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredRows.length }} 条明细，销售数量合计：{{
            formatQty(summary.salesQty)
          }}，已发数量合计：{{ formatQty(summary.shippedQty) }}，含税总价合计：￥{{
            formatMoney(summary.totalPriceInTax)
          }}。
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="displayColumns"
        :data-source="pagedRows"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'orderNo'">
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.orderNo }}</a>
          </template>
          <template v-else-if="column.key === 'progressStatus'">
            <a-tag :color="salesOrderStatusColor(record.progressStatus)">{{
              record.progressStatus
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'lineDeliveryStatus'">
            <a-tag :color="salesDeliveryStatusColor(record.lineDeliveryStatus)">{{
              record.lineDeliveryStatus || '未发货'
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'salesQty'">
            {{ formatQty(record.salesQty) }}
          </template>
          <template v-else-if="column.key === 'shippedQty'">
            {{ formatQty(record.shippedQty) }}
          </template>
          <template v-else-if="column.key === 'unshippedQty'">
            {{ formatQty(record.unshippedQty) }}
          </template>
          <template v-else-if="column.key === 'stockTakeQty'">
            {{ formatQty(record.stockTakeQty) }}
          </template>
          <template v-else-if="column.key === 'planProduceQty'">
            {{ formatQty(record.planProduceQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceInTax'">
            {{ formatMoney(record.unitPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'totalPriceInTax'">
            {{ formatMoney(record.totalPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            {{ formatMoney(record.unitPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'totalPriceExTax'">
            {{ formatMoney(record.totalPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'lineDiscountAmount'">
            {{ formatMoney(record.lineDiscountAmount) }}
          </template>
          <template v-else-if="column.key === 'lineDiscountRate'">
            {{ formatDiscountRate(record.lineDiscountRate) }}
          </template>
          <template v-else-if="column.key === 'stockFulfillmentMode'">
            {{ record.stockFulfillmentModeLabel || '—' }}
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:pageSize="pagination.pageSize"
          :total="filteredRows.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
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
      :filtered-count="filteredRows.length"
      :selected-count="selectedRowKeys.length"
      @export="doExport"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { salesOrderState } from '@/store/salesOrderStore'
import {
  businessTypeOptions,
  customerOptions,
  deliveryModeOptions,
  progressStatusOptions,
  salespersonOptions,
} from '@/mock/salesOrderOptions'
import {
  compareSalesOrderLinesDefault,
  filterSalesOrderLines,
  flattenSalesOrderLines,
  SALES_LINE_DELIVERY_STATUS_OPTIONS,
} from '@/utils/salesOrderLineList'
import { salesOrderLineExportFields } from '@/utils/exportFields/salesOrderLineExport'
import { salesDeliveryStatusColor, salesOrderStatusColor } from '@/utils/salesOrderStatus'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  orderNo: '',
  customerName: undefined,
  productName: '',
  productCode: '',
  salesperson: undefined,
  progressStatus: undefined,
  lineDeliveryStatus: undefined,
  businessType: undefined,
  deliveryMode: undefined,
  deliveryDateRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))
const progressStatusOpts = progressStatusOptions.map((v) => ({ label: v, value: v }))
const lineDeliveryStatusOpts = SALES_LINE_DELIVERY_STATUS_OPTIONS.map((v) => ({
  label: v,
  value: v,
}))
const businessTypeOpts = businessTypeOptions.map((v) => ({ label: v, value: v }))
const deliveryModeOpts = deliveryModeOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '销售单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  {
    title: '订单状态',
    key: 'progressStatus',
    dataIndex: 'progressStatus',
    width: 90,
    fixed: 'left',
  },
  {
    title: '客户名称',
    key: 'customerName',
    dataIndex: 'customerName',
    width: 140,
    ellipsis: true,
    fixed: 'left',
  },
  {
    title: '产品名称',
    key: 'productName',
    dataIndex: 'productName',
    width: 140,
    ellipsis: true,
  },
  {
    title: '产品编码',
    key: 'productCode',
    dataIndex: 'productCode',
    width: 130,
    ellipsis: true,
  },
  { title: '业务类型', key: 'businessType', dataIndex: 'businessType', width: 110 },
  { title: '产品属性', key: 'productAttr', dataIndex: 'productAttr', width: 90 },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    key: 'variantAttr',
    dataIndex: 'variantSummary',
    width: 160,
    ellipsis: true,
  },
  { title: '图号', key: 'drawingNo', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '技术参数', key: 'techParams', dataIndex: 'techParams', width: 120, ellipsis: true },
  {
    title: '配套要求',
    key: 'matchingRequirements',
    dataIndex: 'matchingRequirements',
    width: 120,
    ellipsis: true,
  },
  { title: '销售数量', key: 'salesQty', dataIndex: 'salesQty', width: 90, align: 'right' },
  { title: '已发数量', key: 'shippedQty', dataIndex: 'shippedQty', width: 90, align: 'right' },
  { title: '未发数量', key: 'unshippedQty', dataIndex: 'unshippedQty', width: 90, align: 'right' },
  {
    title: '行发货状态',
    key: 'lineDeliveryStatus',
    dataIndex: 'lineDeliveryStatus',
    width: 100,
  },
  { title: '交付方式', key: 'deliveryMode', dataIndex: 'deliveryMode', width: 100 },
  {
    title: '库存履约',
    key: 'stockFulfillmentMode',
    dataIndex: 'stockFulfillmentModeLabel',
    width: 120,
  },
  {
    title: '现货占用',
    key: 'stockTakeQty',
    dataIndex: 'stockTakeQty',
    width: 88,
    align: 'right',
  },
  {
    title: '排产数量',
    key: 'planProduceQty',
    dataIndex: 'planProduceQty',
    width: 88,
    align: 'right',
  },
  { title: '交货日期', key: 'deliveryDate', dataIndex: 'deliveryDate', width: 110 },
  { title: '单位', key: 'unit', dataIndex: 'unit', width: 70 },
  { title: 'Bom名称', key: 'bomName', dataIndex: 'bomName', width: 110, ellipsis: true },
  { title: 'Bom版本', key: 'bomVersion', dataIndex: 'bomVersion', width: 90 },
  {
    title: '单价（不含税）',
    key: 'unitPriceExTax',
    dataIndex: 'unitPriceExTax',
    width: 120,
    align: 'right',
  },
  {
    title: '单价（含税）',
    key: 'unitPriceInTax',
    dataIndex: 'unitPriceInTax',
    width: 110,
    align: 'right',
  },
  { title: '税率(%)', key: 'taxRate', dataIndex: 'taxRate', width: 80, align: 'right' },
  {
    title: '总价（不含税）',
    key: 'totalPriceExTax',
    dataIndex: 'totalPriceExTax',
    width: 110,
    align: 'right',
  },
  {
    title: '总价（含税）',
    key: 'totalPriceInTax',
    dataIndex: 'totalPriceInTax',
    width: 100,
    align: 'right',
  },
  {
    title: '行折扣(%)',
    key: 'lineDiscountRate',
    dataIndex: 'lineDiscountRate',
    width: 90,
    align: 'right',
  },
  {
    title: '行优惠金额',
    key: 'lineDiscountAmount',
    dataIndex: 'lineDiscountAmount',
    width: 100,
    align: 'right',
  },
  { title: '包装形式', key: 'packagingForm', dataIndex: 'packagingForm', width: 90 },
  {
    title: '补充说明',
    key: 'supplementDesc',
    dataIndex: 'supplementDesc',
    width: 100,
    ellipsis: true,
  },
  { title: '业务员', key: 'salesperson', dataIndex: 'salesperson', width: 90 },
  { title: '合同编号', key: 'contractNo', dataIndex: 'contractNo', width: 130, ellipsis: true },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 140 },
  { title: '创建人', key: 'creator', dataIndex: 'creator', width: 90 },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('sales-order-line-list-v2', baseColumns, {
    minScrollX: 3600,
  })

const allLineRows = computed(() => flattenSalesOrderLines(salesOrderState.orders))

const filteredRows = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.deliveryDateRange?.length === 2) {
    f.deliveryDateRange = [
      f.deliveryDateRange[0].format('YYYY-MM-DD'),
      f.deliveryDateRange[1].format('YYYY-MM-DD'),
    ]
  } else {
    f.deliveryDateRange = null
  }
  return [...filterSalesOrderLines(allLineRows.value, f)].sort(compareSalesOrderLinesDefault)
})

const pagedRows = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const summary = computed(() => {
  const list = filteredRows.value
  return {
    salesQty: list.reduce((s, r) => s + (Number(r.salesQty) || 0), 0),
    shippedQty: list.reduce((s, r) => s + (Number(r.shippedQty) || 0), 0),
    totalPriceInTax: list.reduce((s, r) => s + (Number(r.totalPriceInTax) || 0), 0),
  }
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

const { exportModalOpen, exportFieldSettings, defaultExportFieldSettings, doExport } =
  useListExport({
    storageKey: 'sales-order-line-list',
    fieldDefinitions: salesOrderLineExportFields,
    getFilteredRows: () => filteredRows.value,
    getSelectedRows: () => filteredRows.value.filter((r) => selectedRowKeys.value.includes(r.id)),
    fileNamePrefix: '销售明细',
  })

function formatQty(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return String(n)
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

/** 行折扣存 0~1 小数，展示为百分比 */
function formatDiscountRate(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed((n * 100) % 1 === 0 ? 0 : 2)}`
  return String(n)
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
  selectedRowKeys.value = []
}

function handleReset() {
  filters.orderNo = ''
  filters.customerName = undefined
  filters.productName = ''
  filters.productCode = ''
  filters.salesperson = undefined
  filters.progressStatus = undefined
  filters.lineDeliveryStatus = undefined
  filters.businessType = undefined
  filters.deliveryMode = undefined
  filters.deliveryDateRange = null
  handleSearch()
}

function openDetail(record) {
  if (!record?.orderId) return
  const path = `/sales/orders/${record.orderId}`
  openTab(path, `销售订单 ${record.orderNo || ''}`)
  router.push({ name: 'sales-orders-detail', params: { id: record.orderId } })
}
</script>

<style lang="less" scoped>
.sales-line-page {
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

  .toolbar-icons {
    color: rgba(0, 0, 0, 0.45);
  }
}

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.table-card {
  padding: 8px 12px 12px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}
</style>
