<template>
  <div class="in-out-detail-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务类型">
              <a-select
                v-model:value="filters.businessType"
                allow-clear
                size="small"
                placeholder="请选择业务类型"
                :options="businessTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="单据类型">
              <a-select
                v-model:value="filters.docType"
                allow-clear
                size="small"
                placeholder="请选择单据类型"
                :options="docTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                size="small"
                placeholder="请输入物品名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="条码编号/批次号">
              <a-input
                v-model:value="filters.barcodeBatchNo"
                allow-clear
                size="small"
                placeholder="请输入条码编号/批次号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出入库单号">
              <a-input
                v-model:value="filters.docNo"
                allow-clear
                size="small"
                placeholder="请输入出入库单号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品类型">
              <a-select
                v-model:value="filters.itemType"
                allow-clear
                size="small"
                placeholder="请选择物品类型"
                :options="itemTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="单据状态">
              <a-select
                v-model:value="filters.docStatus"
                allow-clear
                size="small"
                placeholder="请选择单据状态"
                :options="docStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出入库状态">
              <a-select
                v-model:value="filters.ioStatus"
                allow-clear
                size="small"
                placeholder="请选择出入库状态"
                :options="ioStatusOpts"
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
                <a-button size="small" @click="handleReset">
                  <DeleteOutlined />
                  清空
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="list-panel">
      <div class="toolbar-row">
        <a-dropdown>
          <a-button size="small" @click.prevent>
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="({ key }) => stubAction(key)">
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
            <template v-else-if="column.key === 'docNo'">
              <a class="link-code" @click="navigateOrderDetail(record)">{{ record.docNo }}</a>
            </template>
            <template v-else-if="column.key === 'docStatus'">
              <a-tag :color="inOutDocStatusColor(record.docStatus)">{{
                record.docStatus || '—'
              }}</a-tag>
            </template>
            <template v-else-if="column.key === 'ioStatus'">
              <a-tag v-if="record.ioStatus" :color="ioStatusColor(record.ioStatus)">
                {{ record.ioStatus }}
              </a-tag>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'qty'">
              <span :class="{ 'qty-negative': Number(record.qty) < 0 }">{{ record.qty }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <template v-if="record.businessType === '入库单'">
                <a-button
                  v-if="canEditInboundLine(record)"
                  type="link"
                  size="small"
                  @click="openEdit(record)"
                >
                  编辑
                </a-button>
                <a-button
                  v-else-if="record.ioStatus === '全部入库'"
                  type="link"
                  size="small"
                  @click="navigateOrderDetail(record)"
                >
                  详情
                </a-button>
              </template>
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

    <InboundOrderFormModal
      v-model:open="inboundFormOpen"
      :edit-record="inboundEditRecord"
      @saved="handleSearch"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'InOutDetailView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SearchOutlined, DeleteOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { mockInOutDetails, filterInOutDetails } from '@/mock/inOutDetails'
import {
  inOutBusinessTypeOptions,
  inOutDocTypeOptions,
  inOutItemTypeOptions,
  inOutDocStatusOptions,
  inOutIoStatusOptions,
} from '@/mock/inOutDetailOptions'
import { enrichInOutDetailRow, inOutDocStatusColor } from '@/utils/inOutDetailHelpers'
import { getInboundOrderById } from '@/store/inboundOrderStore'
import InboundOrderFormModal from './components/InboundOrderFormModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const detailList = ref([...mockInOutDetails])

const filters = reactive({
  businessType: undefined,
  docType: undefined,
  itemName: '',
  barcodeBatchNo: '',
  docNo: '',
  itemType: undefined,
  docStatus: undefined,
  ioStatus: undefined,
})
const appliedFilters = ref(emptyAppliedFilters())
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const inboundFormOpen = ref(false)
const inboundEditRecord = ref(null)

const businessTypeOpts = inOutBusinessTypeOptions.map((v) => ({ label: v, value: v }))
const docTypeOpts = inOutDocTypeOptions.map((v) => ({ label: v, value: v }))
const itemTypeOpts = inOutItemTypeOptions.map((v) => ({ label: v, value: v }))
const docStatusOpts = inOutDocStatusOptions.map((v) => ({ label: v, value: v }))
const ioStatusOpts = inOutIoStatusOptions.map((v) => ({ label: v, value: v }))

function emptyAppliedFilters() {
  return {
    businessType: undefined,
    docType: undefined,
    itemName: '',
    barcodeBatchNo: '',
    docNo: '',
    itemType: undefined,
    docStatus: undefined,
    ioStatus: undefined,
  }
}

const baseColumns = [
  { title: '#', key: 'index', width: 52, align: 'center', fixed: 'left' },
  {
    title: '出入库单号',
    key: 'docNo',
    dataIndex: 'docNo',
    width: 140,
    fixed: 'left',
    ellipsis: true,
  },
  { title: '业务类型', dataIndex: 'businessType', width: 90 },
  { title: '单据类型', dataIndex: 'docType', width: 100, ellipsis: true },
  { title: '单据状态', key: 'docStatus', width: 90 },
  { title: '出入库状态', key: 'ioStatus', width: 100 },
  { title: '物品类型', dataIndex: 'itemType', width: 90 },
  { title: '物品名称', dataIndex: 'itemName', width: 160, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 100, ellipsis: true },
  { title: '数量', key: 'qty', dataIndex: 'qty', width: 80, align: 'right' },
  { title: '变动后库存数', dataIndex: 'stockAfter', width: 110, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
  { title: '条码编号/批次号', dataIndex: 'barcodeBatchNo', width: 140, ellipsis: true },
  { title: '生产日期', dataIndex: 'productionDate', width: 110 },
  { title: '过账日期', dataIndex: 'postingDate', width: 110 },
  { title: '过期日期', dataIndex: 'expiryDate', width: 110 },
  { title: '操作人', dataIndex: 'operator', width: 90, ellipsis: true },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
  { title: '操作', key: 'action', width: 90, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('inventory-in-out-detail-list', baseColumns, { minScrollX: 2200 })

const enrichedList = computed(() => detailList.value.map(enrichInOutDetailRow))

const filteredList = computed(() => filterInOutDetails(enrichedList.value, appliedFilters.value))

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

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function ioStatusColor(status) {
  const map = { 待入库: 'warning', 部分入库: 'processing', 全部入库: 'success' }
  return map[status] || 'default'
}

function canEditInboundLine(record) {
  return (
    record.businessType === '入库单' &&
    (record.ioStatus === '待入库' || record.ioStatus === '部分入库')
  )
}

function handleSearch() {
  appliedFilters.value = {
    businessType: filters.businessType,
    docType: filters.docType,
    itemName: (filters.itemName || '').trim(),
    barcodeBatchNo: (filters.barcodeBatchNo || '').trim(),
    docNo: (filters.docNo || '').trim(),
    itemType: filters.itemType,
    docStatus: filters.docStatus,
    ioStatus: filters.ioStatus,
  }
  pagination.current = 1
}

function handleReset() {
  filters.businessType = undefined
  filters.docType = undefined
  filters.itemName = ''
  filters.barcodeBatchNo = ''
  filters.docNo = ''
  filters.itemType = undefined
  filters.docStatus = undefined
  filters.ioStatus = undefined
  appliedFilters.value = emptyAppliedFilters()
  pagination.current = 1
}

function navigateOrderDetail(record) {
  if (!record.headerId) {
    message.warning(`未找到关联${record.businessType === '出库单' ? '出库' : '入库'}单`)
    return
  }
  const isOutbound = record.businessType === '出库单'
  const path = isOutbound
    ? `/inventory/outbound/${record.headerId}`
    : `/inventory/inbound/${record.headerId}`
  const title = record.docNo || (isOutbound ? '出库单详情' : '入库单详情')
  openTab(path, title)
  router.push(path)
}

function openEdit(record) {
  const order = getInboundOrderById(record.headerId)
  if (!order) {
    message.warning('未找到关联入库单，无法编辑')
    return
  }
  inboundEditRecord.value = { ...order }
  inboundFormOpen.value = true
}

function stubAction(key) {
  message.info(`功能开发中：${key}`)
}
</script>

<style lang="less" scoped>
.in-out-detail-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.list-panel,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
}

.list-panel {
  padding: 10px 12px 12px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.summary-bar {
  margin-bottom: 8px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
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

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.qty-negative {
  color: #cf1322;
}
</style>
