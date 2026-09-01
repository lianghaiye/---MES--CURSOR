<template>
  <div class="outsourcing-detail-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="外协单号">
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
            <a-form-item label="计划交期">
              <a-range-picker
                v-model:value="filters.documentDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="联系人">
              <a-select
                v-model:value="filters.contactPerson"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="contactPersonOpts"
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
      <a-space :size="8">
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
        <a-dropdown>
          <a-button size="small">
            打印
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onPrintMenuClick">
              <a-menu-item key="派单工">打印派单工</a-menu-item>
              <a-menu-item key="发料出库单">打印发料出库单</a-menu-item>
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
            <a class="link-code" @click="openOutsourcingOrderDetail(record)">{{
              record.orderNo
            }}</a>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'planQty'">
            {{ formatOutsourcingDetailQty(record.planQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            {{ formatOutsourcingDetailMoney(record.unitPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'taxRate'">
            {{
              record.taxRate != null && record.taxRate !== ''
                ? `${formatOutsourcingDetailQty(record.taxRate)}%`
                : '—'
            }}
          </template>
          <template v-else-if="column.key === 'unitPriceInTax'">
            {{ formatOutsourcingDetailMoney(record.unitPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'totalPriceInTax'">
            {{ formatOutsourcingDetailMoney(record.totalPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'totalPriceExTax'">
            {{ formatOutsourcingDetailMoney(record.totalPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'receivedQty'">
            {{ formatOutsourcingDetailQty(record.receivedQty) }}
          </template>
          <template v-else-if="column.key === 'deliveryDate'">
            {{ formatOutsourcingDetailDate(record.deliveryDate) }}
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

    <OutsourcingOrderPrintModal
      v-model:open="printModalOpen"
      :template-type="printTemplateType"
      :outsourcing-orders="printOrders"
    />
  </div>
</template>

<script>
export default { name: 'OutsourcingDetailView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import {
  outsourcingOrderState,
  listOutsourcingOperators,
  getOutsourcingOrderById,
} from '@/store/outsourcingOrderStore'
import { OUTSOURCING_PRINT_TEMPLATE } from '@/utils/outsourcingOrderPrintPreview'
import OutsourcingOrderPrintModal from './components/OutsourcingOrderPrintModal.vue'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { warehouseOptions, supplierOptions } from '@/mock/purchaseOrderOptions'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import { outsourcingDetailExportFields } from '@/utils/exportFields/outsourcingDetailExport'
import {
  buildOutsourcingDetailLines,
  filterOutsourcingDetailLines,
  formatOutsourcingDetailDate,
  formatOutsourcingDetailMoney,
  formatOutsourcingDetailQty,
} from '@/utils/outsourcingDetailLines'
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
  contactPerson: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const printModalOpen = ref(false)
const printTemplateType = ref(OUTSOURCING_PRINT_TEMPLATE.DISPATCH)
const printOrders = ref([])

const warehouseOpts = warehouseOptions.map((w) => ({ label: w.label, value: w.value }))
const contactPersonOpts = listOutsourcingOperators()
const supplierOpts = supplierOptions

const allLines = computed(() =>
  buildOutsourcingDetailLines(outsourcingOrderState.orders, inboundOrderState.orders),
)

const filteredList = computed(() =>
  filterOutsourcingDetailLines(allLines.value, appliedFilters.value),
)

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'outsourcing-detail-list',
  fieldDefinitions: outsourcingDetailExportFields,
  getFilteredRows: () => filteredList.value,
  getSelectedRows: () =>
    filteredList.value.filter((item) => selectedRowKeys.value.includes(item.id)),
  fileNamePrefix: '外协明细',
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
  { title: '外协单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
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
  { title: '计划数量', key: 'planQty', width: 96, align: 'right' },
  { title: '单价（不含税）', key: 'unitPriceExTax', width: 130, align: 'right' },
  { title: '税率', key: 'taxRate', width: 72, align: 'right' },
  { title: '单价（含税）', key: 'unitPriceInTax', width: 120, align: 'right' },
  { title: '总价（含税）', key: 'totalPriceInTax', width: 110, align: 'right' },
  { title: '总价（不含税）', key: 'totalPriceExTax', width: 120, align: 'right' },
  { title: '收货仓库', dataIndex: 'receivingWarehouse', width: 100 },
  { title: '入库数量', key: 'receivedQty', width: 96, align: 'right' },
  { title: '计划交期', key: 'deliveryDate', width: 110 },
  { title: '入库日期', key: 'inboundDate', width: 110 },
  { title: '关联工单', dataIndex: 'workOrderName', width: 130, ellipsis: true },
  { title: '关联销售单号', dataIndex: 'salesOrderNo', width: 130, ellipsis: true },
  { title: '联系人', dataIndex: 'contactPerson', width: 88 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 140 },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('outsourcing-detail-list-v5', baseColumns, { minScrollX: 3000 })

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
    contactPerson: undefined,
  })
  appliedFilters.value = { ...filters }
  pagination.current = 1
  selectedRowKeys.value = []
}

function onBatchMenu({ key }) {
  if (key === 'export') openExportModal()
}

function onPrintMenuClick({ key }) {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要打印的外协明细')
    return
  }
  const orderIdSet = new Set()
  const orders = []
  filteredList.value.forEach((line) => {
    if (!selectedRowKeys.value.includes(line.id) || !line.orderId) return
    if (orderIdSet.has(line.orderId)) return
    orderIdSet.add(line.orderId)
    const order = getOutsourcingOrderById(line.orderId)
    if (order) orders.push(order)
  })
  if (!orders.length) {
    message.warning('未找到可打印的外协订单')
    return
  }
  printOrders.value = orders
  printTemplateType.value =
    key === OUTSOURCING_PRINT_TEMPLATE.ISSUE
      ? OUTSOURCING_PRINT_TEMPLATE.ISSUE
      : OUTSOURCING_PRINT_TEMPLATE.DISPATCH
  printModalOpen.value = true
}

function openOutsourcingOrderDetail(record) {
  if (!record?.orderId) return
  const path = `/procurement/outsourcing-orders/${record.orderId}`
  openTab({ path, title: '外协订单详情' })
  router.push(path)
}
</script>

<style scoped>
.outsourcing-detail-page {
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
