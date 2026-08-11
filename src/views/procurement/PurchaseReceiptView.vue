<template>
  <div class="purchase-receipt-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="收货单号">
              <a-input
                v-model:value="filters.receiptNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="采购单号">
              <a-input
                v-model:value="filters.purchaseOrderNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="供应商">
              <a-select
                v-model:value="filters.supplier"
                allow-clear
                size="small"
                placeholder="请选择"
                show-search
                :options="supplierOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="质检状态">
              <a-select
                v-model:value="filters.qcStatus"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="qcStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库状态">
              <a-select
                v-model:value="filters.inboundStatus"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="inboundStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="单据状态">
              <a-select
                v-model:value="filters.receiptStatus"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="docStatusOpts"
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
        <a-button size="small" @click="message.info('生成质检单功能开发中')">生成质检单</a-button>
        <a-button size="small" @click="openInboundModal">生成入库单</a-button>
        <a-button size="small" type="primary" @click="handleComplete">完成</a-button>
        <a-dropdown>
          <a-button size="small">
            批量打印
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onPrintMenuClick">
              <a-menu-item key="打印收货明细">打印收货明细</a-menu-item>
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
          共计 {{ filteredList.length }} 条数据。
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
        :pagination="false"
        :scroll="{ x: tableScrollX }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'receiptNo'">
            <a class="link-code" @click.prevent="openDetail(record)">
              {{ record.receiptNo }}
            </a>
          </template>
          <template v-else-if="column.key === 'purchaseOrderNo'">
            <a
              v-if="record.purchaseOrderId"
              class="link-code"
              @click.prevent="openPurchaseOrder(record)"
            >
              {{ record.purchaseOrderNo || '—' }}
            </a>
            <span v-else>{{ record.purchaseOrderNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'qcStatus'">
            <a-tag :color="qcStatusColor(record.qcStatus)">{{ record.qcStatus || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'inboundStatus'">
            <a-tag :color="inboundStatusColor(record.inboundStatus)">
              {{ record.inboundStatus || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'receiptStatus'">
            <a-tag :color="docStatusColor(record.receiptStatus)">
              {{ record.receiptStatus || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'qtySummary'">
            {{ formatReceiptQtySummary(record) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDateTimeMinute(record.updatedAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button
                v-if="canEditPurchaseReceipt(record)"
                type="link"
                size="small"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-if="canVoidPurchaseReceipt(record)"
                type="link"
                size="small"
                danger
                @click="handleVoid(record)"
              >
                作废
              </a-button>
              <template v-if="record.receiptStatus === '进行中'">
                <a-button
                  v-if="canShowReceiptQcAction(record)"
                  type="link"
                  size="small"
                  @click="handleQc(record)"
                >
                  质检
                </a-button>
                <a-button
                  v-if="canShowReceiptInboundAction(record)"
                  type="link"
                  size="small"
                  @click="openInboundForRow(record)"
                >
                  入库
                </a-button>
              </template>
              <span v-if="!hasRowActions(record)" class="action-disabled">-</span>
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

    <PurchaseReceiptPrintModal v-model:open="printModalOpen" :receipts="printReceipts" />

    <GenerateInboundOrderModal
      v-model:open="inboundModalOpen"
      :purchase-order="inboundOrder"
      :purchase-receipt="inboundReceipt"
      @saved="onInboundSaved"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'PurchaseReceiptView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import {
  filterPurchaseReceipts,
  formatReceiptQtySummary,
  receiptQcStatusOptions,
  receiptInboundStatusOptions,
  receiptDocStatusOptions,
} from '@/mock/purchaseReceipts'
import {
  purchaseReceiptState,
  canEditPurchaseReceipt,
  canVoidPurchaseReceipt,
  canCompletePurchaseReceipt,
  voidPurchaseReceipt,
  completePurchaseReceipt,
} from '@/store/purchaseReceiptStore'
import { canGenerateInbound, getPurchaseOrderById } from '@/store/purchaseOrderStore'
import { supplierOptions } from '@/mock/purchaseOrderOptions'
import PurchaseReceiptPrintModal from './components/PurchaseReceiptPrintModal.vue'
import GenerateInboundOrderModal from './components/GenerateInboundOrderModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  receiptNo: '',
  purchaseOrderNo: '',
  supplier: undefined,
  qcStatus: undefined,
  inboundStatus: undefined,
  receiptStatus: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const printModalOpen = ref(false)
const printReceipts = ref([])
const inboundModalOpen = ref(false)
const inboundOrder = ref(null)
const inboundReceipt = ref(null)
const pagination = reactive({ current: 1, pageSize: 10 })

const supplierOpts = supplierOptions
const qcStatusOpts = receiptQcStatusOptions.map((v) => ({ label: v, value: v }))
const inboundStatusOpts = receiptInboundStatusOptions.map((v) => ({ label: v, value: v }))
const docStatusOpts = receiptDocStatusOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '单据状态', key: 'receiptStatus', width: 90, fixed: 'left' },
  { title: '收货单号', key: 'receiptNo', dataIndex: 'receiptNo', width: 150, fixed: 'left' },
  { title: '采购单号', key: 'purchaseOrderNo', dataIndex: 'purchaseOrderNo', width: 140 },
  { title: '供应商', dataIndex: 'supplier', width: 160, ellipsis: true },
  { title: '质检状态', key: 'qcStatus', width: 100 },
  { title: '入库状态', key: 'inboundStatus', width: 100 },
  { title: '数量', key: 'qtySummary', width: 120 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '更新人', dataIndex: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-receipt-list-v5', baseColumns)

const filteredList = computed(() =>
  filterPurchaseReceipts(purchaseReceiptState.receipts, appliedFilters.value),
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  fixed: true,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function qcStatusColor(status) {
  const map = {
    未质检: 'default',
    质检中: 'processing',
    质检通过: 'success',
    部分通过: 'warning',
    质检不通过: 'error',
    已终止: 'default',
  }
  return map[status] || 'default'
}

function inboundStatusColor(status) {
  const map = {
    待入库: 'default',
    入库中: 'processing',
    部分入库: 'warning',
    已入库: 'success',
  }
  return map[status] || 'default'
}

function docStatusColor(status) {
  const map = {
    新建: 'default',
    进行中: 'processing',
    已完成: 'success',
    作废: 'default',
  }
  return map[status] || 'default'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.receiptNo = ''
  filters.purchaseOrderNo = ''
  filters.supplier = undefined
  filters.qcStatus = undefined
  filters.inboundStatus = undefined
  filters.receiptStatus = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function openDetail(record) {
  if (!record?.id) return
  const path = `/procurement/purchase-receipts/${record.id}`
  openTab(path, `采购收货 ${record.receiptNo || ''}`)
  router.push({ name: 'procurement-purchase-receipts-detail', params: { id: record.id } })
}

function openPurchaseOrder(record) {
  if (!record?.purchaseOrderId) return
  const path = `/procurement/purchase-orders/${record.purchaseOrderId}`
  openTab(path, `采购订单 ${record.purchaseOrderNo || ''}`)
  router.push({
    name: 'procurement-purchase-orders-detail',
    params: { id: record.purchaseOrderId },
  })
}

/** 进行中且质检未完成 → 展示「质检」 */
function canShowReceiptQcAction(record) {
  if (record?.receiptStatus !== '进行中') return false
  return ['未质检', '质检中'].includes(record.qcStatus || '未质检')
}

/** 进行中且入库未完成、关联采购单仍可入库 → 展示「入库」 */
function canShowReceiptInboundAction(record) {
  if (record?.receiptStatus !== '进行中') return false
  if (record.inboundStatus === '已入库') return false
  const po = getPurchaseOrderById(record.purchaseOrderId)
  return Boolean(po && canGenerateInbound(po))
}

function hasRowActions(record) {
  return (
    canEditPurchaseReceipt(record) ||
    canVoidPurchaseReceipt(record) ||
    canShowReceiptQcAction(record) ||
    canShowReceiptInboundAction(record)
  )
}

function handleQc(record) {
  if (!canShowReceiptQcAction(record)) {
    message.warning('当前收货单不可质检')
    return
  }
  message.info(`收货单「${record.receiptNo}」生成质检单功能开发中`)
}

function openInboundForRow(receipt) {
  if (!receipt) {
    message.warning('未找到所选收货单')
    return
  }
  if (receipt.receiptStatus === '作废' || receipt.receiptStatus === '已完成') {
    message.warning('已完成或作废的收货单不可生成入库单')
    return
  }
  if (receipt.inboundStatus === '已入库') {
    message.warning('该收货单已入库完成')
    return
  }
  const po = getPurchaseOrderById(receipt.purchaseOrderId)
  if (!po || !canGenerateInbound(po)) {
    message.warning('关联采购单不可生成入库单（需进行中且仍有可入库数量）')
    return
  }
  inboundReceipt.value = receipt
  inboundOrder.value = po
  inboundModalOpen.value = true
}

function openInboundModal() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条收货单后再生成入库单')
    return
  }
  const receipt = purchaseReceiptState.receipts.find((r) => r.id === selectedRowKeys.value[0])
  openInboundForRow(receipt)
}

function onInboundSaved() {
  inboundReceipt.value = null
  inboundOrder.value = null
  selectedRowKeys.value = []
}

function handleEdit(record) {
  if (!canEditPurchaseReceipt(record)) {
    message.warning('仅「新建」状态的收货单可编辑')
    return
  }
  message.info(`编辑收货单「${record.receiptNo}」功能开发中`)
}

function handleVoid(record) {
  if (!canVoidPurchaseReceipt(record)) {
    message.warning('已生成质检单或入库单的收货单不可作废')
    return
  }
  Modal.confirm({
    title: '确认作废',
    content: `确定作废收货单「${record.receiptNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const result = voidPurchaseReceipt(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleComplete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择收货单')
    return
  }
  const targets = selectedRowKeys.value
    .map((id) => purchaseReceiptState.receipts.find((r) => r.id === id))
    .filter(Boolean)
  const completable = targets.filter(canCompletePurchaseReceipt)
  if (!completable.length) {
    message.warning('所选收货单均不可完成（需无未完成的来料质检单、采购入库单）')
    return
  }
  Modal.confirm({
    title: '确认完成',
    content: `确定完成选中的 ${completable.length} 条收货单吗？`,
    onOk: () => {
      let okCount = 0
      completable.forEach((row) => {
        const result = completePurchaseReceipt(row.id)
        if (result.ok) okCount += 1
      })
      message.success(`已完成 ${okCount} 条收货单`)
      selectedRowKeys.value = []
    },
  })
}

function onPrintMenuClick({ key }) {
  if (key === '打印收货明细') {
    openBatchPrint()
  }
}

function openBatchPrint() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要打印的收货单')
    return
  }
  printReceipts.value = selectedRowKeys.value
    .map((id) => purchaseReceiptState.receipts.find((r) => r.id === id))
    .filter(Boolean)
  if (!printReceipts.value.length) {
    message.warning('未找到可打印的收货单')
    return
  }
  printModalOpen.value = true
}
</script>

<style lang="less" scoped>
.purchase-receipt-page {
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
  cursor: pointer;
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
