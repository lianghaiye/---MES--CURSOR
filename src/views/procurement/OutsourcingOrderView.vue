<template>
  <div class="outsourcing-order-page">
    <OutsourcingOrderStatsPanel />
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="单据状态">
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
            <a-form-item label="发料状态">
              <a-select
                v-model:value="filters.issueStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="issueStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="回货状态">
              <a-select
                v-model:value="filters.returnStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="returnStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="逾期状态">
              <a-select
                v-model:value="filters.overdueStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="overdueStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="创建日期">
              <a-range-picker
                v-model:value="filters.createdAtRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="操作人">
              <a-select
                v-model:value="filters.operator"
                allow-clear
                placeholder="请选择"
                size="small"
                show-search
                :options="operatorOpts"
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
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="openToolbarApprove">
          <CheckOutlined />
          审核
        </a-button>
        <a-button size="small" @click="handleBatchSubmit">批量提交</a-button>
        <a-button size="small" @click="handleGenerateIssue">
          <ExportOutlined />
          生成发料出库单
        </a-button>
        <a-button size="small" @click="openReceiptModal">
          <CheckCircleOutlined />
          生成收货单
        </a-button>
        <a-button size="small" @click="openInboundModal">
          <InboxOutlined />
          生成入库单
        </a-button>
        <a-button size="small" @click="openExceptionFromToolbar">异常处理</a-button>
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
          共计 {{ filteredList.length }} 条数据，总计外协数量：{{
            summary.totalQty.toLocaleString()
          }}，加工总价含税：￥{{ summary.amountInTax.toFixed(2) }}元。
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
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.orderNo }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'issueStatus'">
            <a-tag :color="issueColor(record.issueStatus)">{{ record.issueStatus || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'returnStatus'">
            <a-tag :color="returnColor(record.returnStatus)">{{
              record.returnStatus || '—'
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'overdueStatus'">
            <a-tag :color="record.overdueStatus === '已逾期' ? 'error' : 'default'">
              {{ record.overdueStatus || '未逾期' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'qtySummary'">
            {{ formatOutsourcingQtySummary(record) }}
          </template>
          <template v-else-if="column.key === 'planDate'">
            {{ formatOutsourcingPlanDateDisplay(record) || '—' }}
          </template>
          <template v-else-if="column.key === 'amountInTax'">
            {{ formatMoney(record.amountInTax) }}
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
                v-if="canEditOutsourcingOrder(record)"
                type="link"
                size="small"
                @click="openEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-if="canSubmitOutsourcingOrder(record)"
                type="link"
                size="small"
                @click="handleSubmit(record)"
              >
                提交审核
              </a-button>
              <a-button
                v-if="canResubmitOutsourcingOrder(record)"
                type="link"
                size="small"
                @click="handleResubmit(record)"
              >
                重新提交
              </a-button>
              <a-button
                v-if="canWithdrawOutsourcingOrder(record)"
                type="link"
                size="small"
                @click="handleWithdraw(record)"
              >
                撤回
              </a-button>
              <a-button
                v-if="canVoidOutsourcingOrder(record)"
                type="link"
                size="small"
                danger
                @click="handleVoid(record)"
              >
                作废
              </a-button>
              <template v-if="record.status === '进行中'">
                <a-button type="link" size="small" @click="openIssueForRow(record)">
                  发料
                </a-button>
                <a-button
                  v-if="canGenerateOutsourcingReceipt(record)"
                  type="link"
                  size="small"
                  @click="openReceiptForRow(record)"
                >
                  收货
                </a-button>
                <a-button
                  v-if="canGenerateOutsourcingInbound(record)"
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

    <OutsourcingGenerateReceiptModal
      v-model:open="receiptModalOpen"
      :outsourcing-orders="receiptOrders"
      @confirmed="onReceiptConfirmed"
    />

    <OutsourcingGenerateIssueModal
      v-model:open="issueModalOpen"
      :outsourcing-order="issueOrder"
      @confirmed="onIssueConfirmed"
    />

    <OutsourcingGenerateInboundModal
      v-model:open="inboundModalOpen"
      :outsourcing-orders="inboundOrders"
      @saved="onInboundSaved"
    />

    <OutsourcingOrderPrintModal
      v-model:open="printModalOpen"
      :template-type="printTemplateType"
      :outsourcing-orders="printOrders"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'OutsourcingOrderView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  ExportOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import {
  filterOutsourcingOrders,
  formatOutsourcingQtySummary,
  formatOutsourcingPlanDateDisplay,
  outsourcingStatusOptions,
  outsourcingIssueStatusOptions,
  outsourcingReturnStatusOptions,
  outsourcingOverdueStatusOptions,
} from '@/mock/outsourcingOrders'
import { supplierOptions } from '@/mock/purchaseOrderOptions'
import {
  outsourcingOrderState,
  listOutsourcingOperators,
  canEditOutsourcingOrder,
  canSubmitOutsourcingOrder,
  canWithdrawOutsourcingOrder,
  canResubmitOutsourcingOrder,
  canApproveOutsourcingOrder,
  canGenerateOutsourcingReceipt,
  canGenerateOutsourcingInbound,
  canCompleteOutsourcingOrder,
  canVoidOutsourcingOrder,
  submitOutsourcingOrderForApprove,
  withdrawOutsourcingOrder,
  resubmitOutsourcingOrder,
  voidOutsourcingOrder,
  completeOutsourcingOrder,
  getOutsourcingOrdersByIds,
  batchSubmitOutsourcingOrders,
} from '@/store/outsourcingOrderStore'
import OutsourcingGenerateReceiptModal from './components/OutsourcingGenerateReceiptModal.vue'
import OutsourcingGenerateIssueModal from './components/OutsourcingGenerateIssueModal.vue'
import OutsourcingGenerateInboundModal from './components/OutsourcingGenerateInboundModal.vue'
import OutsourcingOrderPrintModal from './components/OutsourcingOrderPrintModal.vue'
import OutsourcingOrderStatsPanel from './components/OutsourcingOrderStatsPanel.vue'
import { OUTSOURCING_PRINT_TEMPLATE } from '@/utils/outsourcingOrderPrintPreview'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  status: undefined,
  orderNo: '',
  salesOrderNo: '',
  supplier: undefined,
  issueStatus: undefined,
  returnStatus: undefined,
  overdueStatus: undefined,
  createdAtRange: null,
  operator: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const receiptModalOpen = ref(false)
const issueModalOpen = ref(false)
const inboundModalOpen = ref(false)
const issueOrder = ref(null)
const printModalOpen = ref(false)
const printTemplateType = ref(OUTSOURCING_PRINT_TEMPLATE.DISPATCH)
const printOrders = ref([])
const receiptOrders = ref([])
const inboundOrders = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const supplierOpts = supplierOptions
const statusOpts = outsourcingStatusOptions.map((v) => ({ label: v, value: v }))
const issueStatusOpts = outsourcingIssueStatusOptions.map((v) => ({ label: v, value: v }))
const returnStatusOpts = outsourcingReturnStatusOptions.map((v) => ({ label: v, value: v }))
const overdueStatusOpts = outsourcingOverdueStatusOptions.map((v) => ({ label: v, value: v }))
const operatorOpts = computed(() => listOutsourcingOperators())

const baseColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '外协单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '发料状态', key: 'issueStatus', width: 90 },
  { title: '回货状态', key: 'returnStatus', width: 90 },
  { title: '逾期状态', key: 'overdueStatus', width: 90 },
  { title: '供应商', dataIndex: 'supplier', width: 130, ellipsis: true },
  { title: '外协数量', key: 'qtySummary', width: 110 },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '计划日期', key: 'planDate', width: 180 },
  { title: '加工总价', key: 'amountInTax', width: 110, align: 'right' },
  { title: '结算类型', dataIndex: 'settlementType', width: 110 },
  { title: '结算周期', dataIndex: 'settlementCycle', width: 90 },
  { title: '结算方式', dataIndex: 'settlementMethod', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '更新人', dataIndex: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('outsourcing-order-list-v5', baseColumns)

const filteredList = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.createdAtRange?.length === 2) {
    f.createdAtRange = [
      f.createdAtRange[0].format('YYYY-MM-DD'),
      f.createdAtRange[1].format('YYYY-MM-DD'),
    ]
  } else {
    f.createdAtRange = null
  }
  const statusRank = {
    待提交: 0,
    已拒绝: 1,
    待审核: 2,
    进行中: 3,
    已完成: 4,
    已作废: 5,
  }
  return filterOutsourcingOrders(outsourcingOrderState.orders, f).sort((a, b) => {
    const ra = statusRank[a.status] ?? 99
    const rb = statusRank[b.status] ?? 99
    if (ra !== rb) return ra - rb
    const ta = dayjs(a.createdAt).valueOf() || 0
    const tb = dayjs(b.createdAt).valueOf() || 0
    return tb - ta
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const summary = computed(() => ({
  totalQty: filteredList.value.reduce((s, o) => s + (Number(o.totalQty) || 0), 0),
  amountInTax: filteredList.value.reduce((s, o) => s + (Number(o.amountInTax) || 0), 0),
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

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function statusColor(status) {
  const map = {
    待提交: 'default',
    待审核: 'default',
    进行中: 'processing',
    已拒绝: 'error',
    已完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function issueColor(status) {
  const map = { 待出库: 'default', 部分出库: 'warning', 已出库: 'success' }
  return map[status] || 'default'
}

function returnColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function hasRowActions(record) {
  return (
    record.status === '进行中' ||
    canEditOutsourcingOrder(record) ||
    canSubmitOutsourcingOrder(record) ||
    canWithdrawOutsourcingOrder(record) ||
    canResubmitOutsourcingOrder(record) ||
    canVoidOutsourcingOrder(record) ||
    canGenerateOutsourcingReceipt(record) ||
    canGenerateOutsourcingInbound(record)
  )
}

function openDetail(record) {
  const path = `/procurement/outsourcing-orders/${record.id}`
  openTab(path, `外协订单 ${record.orderNo}`)
  router.push({ name: 'procurement-outsourcing-orders-detail', params: { id: record.id } })
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.orderNo = ''
  filters.salesOrderNo = ''
  filters.supplier = undefined
  filters.issueStatus = undefined
  filters.returnStatus = undefined
  filters.overdueStatus = undefined
  filters.createdAtRange = null
  filters.operator = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function openCreate() {
  const page = findCreatePageByListPath('/procurement/outsourcing-orders')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openToolbarApprove() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条待审核的外协订单后再审核')
    return
  }
  const order = outsourcingOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选外协订单')
    return
  }
  if (!canApproveOutsourcingOrder(order)) {
    message.warning('仅「待审核」状态的外协订单可审核')
    return
  }
  const path = `/procurement/outsourcing-orders/${order.id}/approve`
  openTab(path, `审核外协订单 ${order.orderNo || ''}`.trim())
  router.push({ name: 'procurement-outsourcing-orders-approve', params: { id: order.id } })
}

function openEdit(record) {
  if (!canEditOutsourcingOrder(record)) {
    message.warning('仅待提交 / 已拒绝的外协订单可编辑')
    return
  }
  openCreateTab(router, openTab, {
    path: `/procurement/outsourcing-orders/${record.id}/edit`,
    title: `编辑外协订单 ${record.orderNo || ''}`.trim(),
  })
}

function openReceiptModal() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选外协订单后再生成收货单')
    return
  }
  const selected = getOutsourcingOrdersByIds(selectedRowKeys.value)
  const targets = selected.filter(canGenerateOutsourcingReceipt)
  if (!targets.length) {
    message.warning('所选外协订单均不可生成收货单（需进行中且仍有可回货数量）')
    return
  }
  if (targets.length < selected.length) {
    message.info(`已过滤 ${selected.length - targets.length} 条不可收货的外协订单`)
  }
  receiptOrders.value = targets
  receiptModalOpen.value = true
}

function openInboundModal() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选外协订单后再生成入库单')
    return
  }
  const selected = getOutsourcingOrdersByIds(selectedRowKeys.value)
  const targets = selected.filter(canGenerateOutsourcingInbound)
  if (!targets.length) {
    message.warning('所选外协订单均不可生成入库单（需进行中且仍有可回货数量）')
    return
  }
  if (targets.length < selected.length) {
    message.info(`已过滤 ${selected.length - targets.length} 条不可入库的外协订单`)
  }
  inboundOrders.value = targets
  inboundModalOpen.value = true
}

function openReceiptForRow(record) {
  if (!canGenerateOutsourcingReceipt(record)) {
    message.warning('仅进行中且仍有可回货数量的外协订单可生成收货单')
    return
  }
  receiptOrders.value = [record]
  receiptModalOpen.value = true
}

function openInboundForRow(record) {
  if (!canGenerateOutsourcingInbound(record)) {
    message.warning('仅进行中且仍有可回货数量的外协订单可生成入库单')
    return
  }
  inboundOrders.value = [record]
  inboundModalOpen.value = true
}

function openExceptionCreate(order) {
  if (!order?.orderNo) return
  openCreateTab(router, openTab, {
    path: '/procurement/outsourcing-returns/new',
    title: '新增外协异常处理单',
    query: { outsourcingOrderNo: order.orderNo },
  })
}

function openExceptionFromToolbar() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条进行中的外协订单后再异常处理')
    return
  }
  const order = outsourcingOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选外协订单')
    return
  }
  if (order.status !== '进行中') {
    message.warning('仅进行中的外协订单可异常处理')
    return
  }
  openExceptionCreate(order)
}

function openIssueForRow(record) {
  if (!record || record.status !== '进行中') {
    message.warning('仅进行中的外协订单可发料出库')
    return
  }
  issueOrder.value = record
  issueModalOpen.value = true
}

function handleGenerateIssue() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条进行中的外协订单后再生成发料出库单')
    return
  }
  const record = getOutsourcingOrdersByIds(selectedRowKeys.value)[0]
  openIssueForRow(record)
}

function onIssueConfirmed() {
  selectedRowKeys.value = []
}

function reportBatchResult({ ok, errors }, successLabel) {
  if (ok) message.success(`${successLabel} ${ok} 条`)
  if (errors?.length) {
    const preview = errors.slice(0, 3).join('；')
    message.warning(errors.length > 3 ? `${preview}…等 ${errors.length} 条失败` : preview)
  }
}

function handleBatchSubmit() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要提交的外协订单')
    return
  }
  const targets = getOutsourcingOrdersByIds(selectedRowKeys.value).filter(
    (o) => canSubmitOutsourcingOrder(o) || canResubmitOutsourcingOrder(o),
  )
  if (!targets.length) {
    message.warning('所选外协订单均不可提交（仅待提交/已拒绝）')
    return
  }
  Modal.confirm({
    title: '批量提交',
    content: `确定提交选中的 ${targets.length} 条外协订单审核吗？`,
    onOk: () => {
      const result = batchSubmitOutsourcingOrders(targets.map((o) => o.id))
      reportBatchResult(result, '已提交审核')
      selectedRowKeys.value = []
    },
  })
}

function handleSubmit(record) {
  Modal.confirm({
    title: '确认提交审核',
    content: `确定提交外协订单「${record.orderNo}」审核吗？`,
    onOk: () => {
      const result = submitOutsourcingOrderForApprove(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleWithdraw(record) {
  Modal.confirm({
    title: '确认撤回',
    content: `确定撤回外协订单「${record.orderNo}」吗？撤回后可继续编辑。`,
    onOk: () => {
      const result = withdrawOutsourcingOrder(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleResubmit(record) {
  Modal.confirm({
    title: '确认重新提交',
    content: `确定重新提交外协订单「${record.orderNo}」审核吗？`,
    onOk: () => {
      const result = resubmitOutsourcingOrder(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleVoid(record) {
  Modal.confirm({
    title: '确认作废',
    content: `确定作废外协订单「${record.orderNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const result = voidOutsourcingOrder(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleComplete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要完成的外协订单')
    return
  }
  const targets = getOutsourcingOrdersByIds(selectedRowKeys.value).filter(
    canCompleteOutsourcingOrder,
  )
  if (!targets.length) {
    message.warning('仅进行中且回货已入库的外协订单可完成')
    return
  }
  targets.forEach((o) => completeOutsourcingOrder(o.id))
  message.success(`已完成 ${targets.length} 条外协订单`)
  selectedRowKeys.value = []
}

function onPrintMenuClick({ key }) {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要打印的外协订单')
    return
  }
  printOrders.value = selectedRowKeys.value
    .map((id) => outsourcingOrderState.orders.find((o) => o.id === id))
    .filter(Boolean)
  if (!printOrders.value.length) {
    message.warning('未找到可打印的外协订单')
    return
  }
  printTemplateType.value =
    key === OUTSOURCING_PRINT_TEMPLATE.ISSUE
      ? OUTSOURCING_PRINT_TEMPLATE.ISSUE
      : OUTSOURCING_PRINT_TEMPLATE.DISPATCH
  printModalOpen.value = true
}

function onReceiptConfirmed() {
  selectedRowKeys.value = []
}

function onInboundSaved() {
  selectedRowKeys.value = []
}
</script>

<style lang="less" scoped>
.outsourcing-order-page {
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
