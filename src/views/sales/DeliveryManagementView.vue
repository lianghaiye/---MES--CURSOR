<template>
  <div class="delivery-management-page">
    <DeliveryStatsPanel />

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="发货单号">
              <a-input
                v-model:value="filters.deliveryCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="源单号">
              <a-input
                v-model:value="filters.sourceOrderNo"
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
            <a-form-item label="业务员">
              <a-select
                v-model:value="filters.salesperson"
                allow-clear
                show-search
                placeholder="请选择"
                size="small"
                :options="salespersonOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="发货状态">
              <a-select
                v-model:value="filters.deliveryStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="deliveryStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="单据日期">
              <a-range-picker
                v-model:value="filters.documentDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="10">
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
      <a-space wrap>
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="stubAction('打印')">
          <PrinterOutlined />
          打印
        </a-button>
        <a-button size="small" :disabled="!canGenerateOutbound" @click="handleGenerateOutbound">
          生成出库单
        </a-button>
        <a-dropdown>
          <a-button size="small">
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onBatchMenu">
              <a-menu-item key="export">导出 Excel</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-button size="small" @click="handleRefresh">
          <ReloadOutlined />
          刷新
        </a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

    <a-alert
      v-if="selectedRowKeys.length"
      type="info"
      show-icon
      class="selection-bar"
      :message="`已选择 ${selectedRowKeys.length} 项`"
    >
      <template #action>
        <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
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
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'deliveryStatus'">
            <a-tag :color="deliveryStatusColor(record.deliveryStatus)">
              {{ record.deliveryStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'deliveryCode'">
            <a class="link-code" @click="openDetail(record)">{{ record.deliveryCode }}</a>
          </template>
          <template v-else-if="column.key === 'applyShipQty'">
            {{ formatOutboundQtyInt(record.applyShipQty) }}
          </template>
          <template v-else-if="column.key === 'actualOutboundQty'">
            {{ formatOutboundQtyInt(record.actualOutboundQty) }}
          </template>
          <template v-else-if="column.key === 'shipWeight'">
            {{ formatShipWeight(record.shipWeight) }}
          </template>
          <template v-else-if="column.key === 'totalAmountExTax'">
            {{ formatAmountExTax(record.totalAmountExTax) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="canEditDeliveryOrder(record)" :size="0">
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="confirmDelete(record)">
                删除
              </a-button>
            </a-space>
            <span v-else class="action-muted">—</span>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
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
export default { name: 'DeliveryManagementView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { customerOptions, salespersonOptions } from '@/mock/salesOrderOptions'
import {
  deliveryOrderState,
  syncFromSalesOrders,
  refreshOutboundQtyAll,
  deleteDeliveryOrder,
  generateOutboundForDelivery,
  canEditDeliveryOrder,
  canDeleteDeliveryOrder,
} from '@/store/deliveryOrderStore'
import { hasLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import {
  filterDeliveryOrders,
  deliveryStatusColor,
  formatOutboundQtyInt,
  formatShipWeight,
  formatAmountExTax,
  DELIVERY_STATUS_OPTIONS,
} from '@/utils/deliveryOrder'
import DeliveryStatsPanel from './components/DeliveryStatsPanel.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import { deliveryExportFields } from '@/utils/exportFields/deliveryExport'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'

const router = useRouter()
const { openTab } = useTabs()

const deliveryStatusOpts = DELIVERY_STATUS_OPTIONS.map((v) => ({ label: v, value: v }))

const filters = reactive({
  deliveryCode: '',
  sourceOrderNo: '',
  customerName: undefined,
  salesperson: undefined,
  deliveryStatus: undefined,
  documentDateRange: null,
})
const appliedFilters = ref({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const selectedRowKeys = ref([])

const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: '发货状态', key: 'deliveryStatus', width: 96, fixed: 'left' },
  { title: '发货单号', key: 'deliveryCode', dataIndex: 'deliveryCode', width: 140, fixed: 'left' },
  { title: '源单号', dataIndex: 'sourceOrderNo', width: 140, ellipsis: true },
  { title: '客户', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '申请发货数量', key: 'applyShipQty', width: 110, align: 'right' },
  { title: '实际出库数量', key: 'actualOutboundQty', width: 110, align: 'right' },
  { title: '发货重量', key: 'shipWeight', width: 96, align: 'right' },
  { title: '发货总金额（不含税）', key: 'totalAmountExTax', width: 140, align: 'right' },
  { title: '交货方式', dataIndex: 'shipmentMethod', width: 88 },
  { title: '物流单号', dataIndex: 'logisticsNo', width: 130, ellipsis: true },
  { title: '客户联系人', dataIndex: 'contactPerson', width: 100 },
  { title: '联系方式', dataIndex: 'contactPhone', width: 120 },
  { title: '交货地址', dataIndex: 'deliveryAddress', width: 180, ellipsis: true },
  { title: '司机姓名', dataIndex: 'driverName', width: 90 },
  { title: '司机联系方式', dataIndex: 'driverPhone', width: 120 },
  { title: '车牌号', dataIndex: 'plateNo', width: 100 },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('delivery-list', baseColumns)

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'delivery-list',
  fieldDefinitions: deliveryExportFields,
  getFilteredRows: () => filteredList.value,
  getSelectedRows: () =>
    deliveryOrderState.orders.filter((o) => selectedRowKeys.value.includes(o.id)),
  fileNamePrefix: '发货管理',
})

const filteredList = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.documentDateRange?.length === 2) {
    f.documentDateRange = [
      f.documentDateRange[0].format('YYYY-MM-DD'),
      f.documentDateRange[1].format('YYYY-MM-DD'),
    ]
  } else {
    f.documentDateRange = null
  }
  return filterDeliveryOrders(deliveryOrderState.orders, f)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const selectedRecords = computed(() =>
  deliveryOrderState.orders.filter((o) => selectedRowKeys.value.includes(o.id)),
)

const canGenerateOutbound = computed(() => {
  if (selectedRowKeys.value.length !== 1) return false
  const row = selectedRecords.value[0]
  return row?.deliveryStatus === '待发货' && !hasLinkedSalesOutbound(row)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

onMounted(() => {
  syncFromSalesOrders()
})

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.deliveryCode = ''
  filters.sourceOrderNo = ''
  filters.customerName = undefined
  filters.salesperson = undefined
  filters.deliveryStatus = undefined
  filters.documentDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleRefresh() {
  syncFromSalesOrders()
  refreshOutboundQtyAll()
  message.success('已刷新')
}

function openCreate() {
  const page = findCreatePageByListPath('/sales/delivery')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEdit(record) {
  if (!canEditDeliveryOrder(record)) {
    message.warning('当前状态不可编辑')
    return
  }
  if (!record?.id) return
  openCreateTab(router, openTab, {
    path: `/sales/delivery/${record.id}/edit`,
    title: `编辑发货单 ${record.deliveryCode || ''}`.trim(),
  })
}

function handleGenerateOutbound() {
  const id = selectedRowKeys.value[0]
  const res = generateOutboundForDelivery(id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已生成销售出库单')
  refreshOutboundQtyAll()
}

function confirmDelete(record) {
  if (!canDeleteDeliveryOrder(record)) {
    message.warning('仅待发货状态可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `删除发货单「${record.deliveryCode}」将同时删除关联的待出库出库单，是否继续？`,
    okType: 'danger',
    onOk: () => {
      deleteDeliveryOrder(record.id)
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      message.success('已删除')
    },
  })
}

function openDetail(record) {
  const path = `/sales/delivery/${record.id}`
  openTab(path, `发货单 ${record.deliveryCode}`)
  router.push({ name: 'sales-delivery-detail', params: { id: record.id } })
}

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function onBatchMenu({ key }) {
  if (key === 'export') {
    openExportModal()
    return
  }
  message.info('批量操作功能开发中')
}
</script>

<style lang="less" scoped>
.delivery-management-page {
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

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 8px;
}

.selection-bar {
  margin: 0 12px 8px;
}

.table-card {
  padding: 0 8px 8px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 4px 4px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.action-muted {
  color: rgba(0, 0, 0, 0.25);
}

.horizontal-form {
  width: 100%;
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }
}

.filter-actions-item {
  :deep(.ant-form-item-control) {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
