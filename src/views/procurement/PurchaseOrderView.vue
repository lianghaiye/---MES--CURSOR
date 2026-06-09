<template>
  <div class="purchase-order-page">
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
                placeholder="请选择"
                size="small"
                show-search
                :options="supplierOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="申请单号">
              <a-input
                v-model:value="filters.reqNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="销售单号">
              <a-input
                v-model:value="filters.salesOrderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="订单来源">
              <a-select
                v-model:value="filters.orderSource"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="sourceOpts"
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
          <a-col :xs="24" :sm="12" :md="8">
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
        <a-button type="primary" size="small" @click="openCreateModal">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="openReceiptModal">
          <CheckCircleOutlined />
          生成收货单
        </a-button>
        <a-button size="small" @click="handleComplete">
          <CheckOutlined />
          完成
        </a-button>
        <a-dropdown>
          <a-button size="small">
            批量打印
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="({ key }) => stubAction(key)">
              <a-menu-item key="打印采购单">打印采购单</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-dropdown>
          <a-button size="small">
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onBatchMenuClick">
              <a-menu-item key="批量审批">批量审批</a-menu-item>
              <a-menu-item key="批量删除">批量删除</a-menu-item>
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
          共计 {{ filteredList.length }} 条数据，总计采购数量：{{
            summary.totalQty.toLocaleString()
          }}，总计采购金额含税：￥{{ summary.amountInTax.toFixed(2) }}元，不含税：￥{{
            summary.amountExTax.toFixed(2)
          }}元。
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
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'orderNo'">
            <a class="link-code">{{ record.orderNo }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'inboundStatus'">
            <a-tag :color="inboundColor(record.inboundStatus)">{{ record.inboundStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button
                v-if="canEditPurchaseOrder(record)"
                type="link"
                size="small"
                @click="openEditModal(record)"
              >
                编辑
              </a-button>
              <a-button
                v-if="canEditPurchaseOrder(record)"
                type="link"
                size="small"
                danger
                @click="confirmDelete(record)"
              >
                删除
              </a-button>
              <a-button
                v-if="canApprovePurchaseOrder(record)"
                type="link"
                size="small"
                @click="handleApprove(record)"
              >
                <CheckCircleOutlined />
                审批
              </a-button>
              <span
                v-if="!canEditPurchaseOrder(record) && !canApprovePurchaseOrder(record)"
                class="action-disabled"
              >
                -
              </span>
            </a-space>
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

    <CreatePurchaseOrderModal
      v-model:open="createModalOpen"
      :edit-record="editRecord"
      @saved="onSaved"
    />

    <GenerateReceiptModal
      v-model:open="receiptModalOpen"
      :purchase-order="receiptOrder"
      @confirmed="onReceiptConfirmed"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'PurchaseOrderView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  CheckOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue'
import { filterPurchaseOrders } from '@/mock/purchaseOrders'
import {
  purchaseOrderState,
  addPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  approvePurchaseOrder,
  completePurchaseOrder,
  canEditPurchaseOrder,
  canApprovePurchaseOrder,
  canGenerateReceipt,
  canCompletePurchaseOrder,
  getPurchaseOrdersByIds,
} from '@/store/purchaseOrderStore'
import { poStatusOptions, poSourceOptions, supplierOptions } from '@/mock/purchaseOrderOptions'
import CreatePurchaseOrderModal from './components/CreatePurchaseOrderModal.vue'
import GenerateReceiptModal from './components/GenerateReceiptModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const filters = reactive({
  orderNo: '',
  supplier: undefined,
  reqNo: '',
  salesOrderNo: '',
  status: undefined,
  orderSource: undefined,
  documentDateRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const createModalOpen = ref(false)
const receiptModalOpen = ref(false)
const editRecord = ref(null)
const receiptOrder = ref(null)
const pagination = reactive({ current: 1, pageSize: 10 })

const supplierOpts = supplierOptions
const statusOpts = poStatusOptions.map((v) => ({ label: v, value: v }))
const sourceOpts = poSourceOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '采购单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '采购申请单号', dataIndex: 'reqNo', width: 150, ellipsis: true },
  { title: '申请类型', dataIndex: 'applyType', width: 120 },
  { title: '供应商', dataIndex: 'supplier', width: 130, ellipsis: true },
  { title: '合同编号', dataIndex: 'contractNo', width: 120, ellipsis: true },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '生产工单号', dataIndex: 'workOrderNo', width: 120, ellipsis: true },
  { title: '结算类型', dataIndex: 'settlementType', width: 110 },
  { title: '结算周期', dataIndex: 'settlementCycle', width: 90 },
  { title: '结算方式', dataIndex: 'settlementMethod', width: 100 },
  { title: '交货方式', dataIndex: 'deliveryMethod', width: 100 },
  { title: '供货期/天', dataIndex: 'leadTimeDays', width: 90, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '采购员', dataIndex: 'purchaser', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '订单来源', dataIndex: 'orderSource', width: 100 },
  { title: '送货日期', dataIndex: 'shippingDate', width: 110 },
  { title: '入库状态', key: 'inboundStatus', width: 90 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建日期', dataIndex: 'documentDate', width: 110 },
  { title: '审批结果', dataIndex: 'approvalResult', width: 100 },
  { title: '审批人姓名', dataIndex: 'approverName', width: 100 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-order-list', baseColumns)

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
  return filterPurchaseOrders(purchaseOrderState.orders, f)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const summary = computed(() => ({
  totalQty: filteredList.value.reduce((s, o) => s + (Number(o.totalQty) || 0), 0),
  amountInTax: filteredList.value.reduce((s, o) => s + (Number(o.amountInTax) || 0), 0),
  amountExTax: filteredList.value.reduce((s, o) => s + (Number(o.amountExTax) || 0), 0),
}))

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function statusColor(status) {
  const map = { 待审批: 'default', 进行中: 'processing', 已完成: 'success' }
  return map[status] || 'default'
}

function inboundColor(status) {
  const map = { 未入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.orderNo = ''
  filters.supplier = undefined
  filters.reqNo = ''
  filters.salesOrderNo = ''
  filters.status = undefined
  filters.orderSource = undefined
  filters.documentDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function onBatchMenuClick({ key }) {
  if (key === '批量审批') {
    handleBatchApprove()
    return
  }
  if (key === '批量删除') {
    handleBatchDelete()
    return
  }
  stubAction(key)
}

function openCreateModal() {
  editRecord.value = null
  createModalOpen.value = true
}

function openEditModal(record) {
  if (!canEditPurchaseOrder(record)) {
    message.warning('仅待审批的采购单可编辑')
    return
  }
  editRecord.value = record
  createModalOpen.value = true
}

function openReceiptModal() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条进行中的采购单后再生成收货单')
    return
  }
  const order = purchaseOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选采购单')
    return
  }
  if (!canGenerateReceipt(order)) {
    message.warning('仅进行中且未完全入库的采购单可生成收货单')
    return
  }
  receiptOrder.value = order
  receiptModalOpen.value = true
}

function handleApprove(record) {
  Modal.confirm({
    title: '确认审批',
    content: `确定审批采购单「${record.orderNo}」吗？`,
    onOk: () => {
      const result = approvePurchaseOrder(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleBatchApprove() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要审批的采购单')
    return
  }
  const targets = getPurchaseOrdersByIds(selectedRowKeys.value).filter(canApprovePurchaseOrder)
  if (!targets.length) {
    message.warning('所选采购单均不可审批')
    return
  }
  targets.forEach((o) => approvePurchaseOrder(o.id))
  message.success(`已审批 ${targets.length} 条采购单`)
  selectedRowKeys.value = []
}

function handleComplete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要完成的采购单')
    return
  }
  const targets = getPurchaseOrdersByIds(selectedRowKeys.value).filter(canCompletePurchaseOrder)
  if (!targets.length) {
    message.warning('仅进行中的采购单可完成')
    return
  }
  targets.forEach((o) => completePurchaseOrder(o.id))
  message.success(`已完成 ${targets.length} 条采购单`)
  selectedRowKeys.value = []
}

function onSaved({ isEdit, id, data }) {
  if (isEdit) {
    updatePurchaseOrder(id, data)
  } else {
    addPurchaseOrder({ ...data, id: `po-${Date.now()}` })
  }
}

function onReceiptConfirmed() {
  selectedRowKeys.value = []
}

function confirmDelete(record) {
  if (!canEditPurchaseOrder(record)) {
    message.warning('仅待审批的采购单可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除采购单「${record.orderNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      deletePurchaseOrder(record.id)
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      message.success('已删除')
    },
  })
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的采购单')
    return
  }
  const targets = getPurchaseOrdersByIds(selectedRowKeys.value).filter(canEditPurchaseOrder)
  if (!targets.length) {
    message.warning('所选采购单均不可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除选中的 ${targets.length} 条采购单吗？`,
    okType: 'danger',
    onOk: () => {
      targets.forEach((o) => deletePurchaseOrder(o.id))
      selectedRowKeys.value = []
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.purchase-order-page {
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

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 8px;
    font-size: 13px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 13px;
  }
}

.link-code {
  color: #1677ff;
}

.action-disabled {
  color: rgba(0, 0, 0, 0.25);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
