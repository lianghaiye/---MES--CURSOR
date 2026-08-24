<template>
  <div class="purchase-order-page">
    <PurchaseOrderStatsPanel />
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
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="逾期状态">
              <a-select
                v-model:value="filters.overdueStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="overdueOpts"
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
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="openToolbarApprove">
          <CheckOutlined />
          审核
        </a-button>
        <a-button size="small" @click="openToolbarPriceChangeApprove">审核价格变更</a-button>
        <a-button size="small" @click="openReceiptModal">
          <CheckCircleOutlined />
          生成收货单
        </a-button>
        <a-button size="small" @click="openInboundModal">
          <InboxOutlined />
          生成入库单
        </a-button>
        <a-button size="small" @click="openPurchaseReturnFromToolbar">采购退货</a-button>
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
              <a-menu-item key="打印采购单">打印采购订单明细</a-menu-item>
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
              <a-menu-item key="批量审核">批量审核</a-menu-item>
              <a-menu-item key="批量作废">批量作废</a-menu-item>
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
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.orderNo }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'inboundStatus'">
            <a-tag :color="inboundColor(record.inboundStatus)">{{ record.inboundStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'overdueStatus'">
            <a-tag :color="overdueColor(overdueStatusOf(record))">
              {{ overdueStatusOf(record) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'approverName'">
            {{ record.approverName || '—' }}
          </template>
          <template v-else-if="column.key === 'approvedAt'">
            {{ resolveApprovalTime(record) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDateTimeMinute(record.updatedAt) }}
          </template>
          <template v-else-if="column.key === 'updater'">
            {{ record.updater || '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button
                v-if="record.status === '草稿'"
                type="link"
                size="small"
                @click="continueDraft(record)"
              >
                继续编辑
              </a-button>
              <a-button
                v-if="canEditPurchaseOrder(record)"
                type="link"
                size="small"
                @click="openEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-if="canSubmitPurchaseOrder(record)"
                type="link"
                size="small"
                @click="handleSubmit(record)"
              >
                提交审核
              </a-button>
              <a-button
                v-if="canWithdrawPurchaseOrder(record)"
                type="link"
                size="small"
                @click="handleWithdraw(record)"
              >
                撤回
              </a-button>
              <a-button
                v-if="canResubmitPurchaseOrder(record)"
                type="link"
                size="small"
                @click="handleResubmit(record)"
              >
                重新提交
              </a-button>
              <a-button
                v-if="canVoidPurchaseOrder(record)"
                type="link"
                size="small"
                danger
                @click="handleVoid(record)"
              >
                作废
              </a-button>
              <template v-if="record.status === '进行中'">
                <a-button
                  v-if="canGenerateReceipt(record)"
                  type="link"
                  size="small"
                  @click="openReceiptForRow(record)"
                >
                  收货
                </a-button>
                <a-button
                  v-if="canGenerateInbound(record)"
                  type="link"
                  size="small"
                  @click="openInboundForRow(record)"
                >
                  入库
                </a-button>
              </template>
              <a-button
                v-if="canApplyPurchasePriceChange(record)"
                type="link"
                size="small"
                @click="openPriceChangeForOrder(record)"
              >
                {{ rowPriceChangeLabel(record) }}
              </a-button>
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

    <GenerateReceiptModal
      v-model:open="receiptModalOpen"
      :purchase-order="receiptOrder"
      @confirmed="onReceiptConfirmed"
    />

    <GenerateInboundOrderModal
      v-model:open="inboundModalOpen"
      :purchase-order="inboundOrder"
      @saved="onInboundSaved"
    />

    <PurchaseOrderPrintModal v-model:open="printModalOpen" :purchase-orders="printOrders" />

    <PurchasePriceChangeModal
      v-model:open="priceChangeOpen"
      :purchase-order="priceChangeOrder"
      :pending-change="priceChangePending"
      @done="onPriceChangeDone"
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons-vue'
import { filterPurchaseOrders, computePurchaseOrderOverdueStatus } from '@/mock/purchaseOrders'
import {
  purchaseOrderState,
  approvePurchaseOrder,
  voidPurchaseOrder,
  completePurchaseOrder,
  canEditPurchaseOrder,
  canApprovePurchaseOrder,
  canVoidPurchaseOrder,
  canSubmitPurchaseOrder,
  submitPurchaseOrderForApprove,
  canWithdrawPurchaseOrder,
  withdrawPurchaseOrder,
  canResubmitPurchaseOrder,
  resubmitPurchaseOrder,
  canGenerateReceipt,
  canGenerateInbound,
  canCompletePurchaseOrder,
  getPurchaseOrdersByIds,
  refreshPurchaseOrderOverdueStatusAll,
} from '@/store/purchaseOrderStore'
import {
  poStatusOptions,
  poSourceOptions,
  supplierOptions,
  overdueStatusOptions,
} from '@/mock/purchaseOrderOptions'
import GenerateReceiptModal from './components/GenerateReceiptModal.vue'
import GenerateInboundOrderModal from './components/GenerateInboundOrderModal.vue'
import PurchaseOrderPrintModal from './components/PurchaseOrderPrintModal.vue'
import PurchaseOrderStatsPanel from './components/PurchaseOrderStatsPanel.vue'
import PurchasePriceChangeModal from './components/PurchasePriceChangeModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import { formatDateTimeMinute, resolveApprovalTime } from '@/utils/dateTimeDisplay'
import {
  canApplyPurchasePriceChange,
  getPendingPurchasePriceChange,
  getPendingPurchasePriceChangeBlock,
} from '@/store/purchasePriceChangeStore'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  orderNo: '',
  supplier: undefined,
  reqNo: '',
  status: undefined,
  orderSource: undefined,
  overdueStatus: undefined,
  documentDateRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const receiptModalOpen = ref(false)
const inboundModalOpen = ref(false)
const printModalOpen = ref(false)
const receiptOrder = ref(null)
const inboundOrder = ref(null)
const printOrders = ref([])
const priceChangeOpen = ref(false)
const priceChangeOrder = ref(null)
const priceChangePending = computed(() => getPendingPurchasePriceChange(priceChangeOrder.value?.id))
const pagination = reactive({ current: 1, pageSize: 10 })

const supplierOpts = supplierOptions
const statusOpts = poStatusOptions.map((v) => ({ label: v, value: v }))
const sourceOpts = poSourceOptions.map((v) => ({ label: v, value: v }))
const overdueOpts = overdueStatusOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '采购单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 90 },
  { title: '逾期状态', key: 'overdueStatus', width: 90 },
  { title: '采购申请单号', dataIndex: 'reqNo', width: 150, ellipsis: true },
  { title: '采购类型', dataIndex: 'applyType', width: 100 },
  { title: '供应商', dataIndex: 'supplier', width: 130, ellipsis: true },
  { title: '合同编号', dataIndex: 'contractNo', width: 120, ellipsis: true },
  { title: '生产工单号', dataIndex: 'workOrderNo', width: 120, ellipsis: true },
  { title: '结算类型', dataIndex: 'settlementType', width: 110 },
  { title: '结算周期', dataIndex: 'settlementCycle', width: 90 },
  { title: '结算方式', dataIndex: 'settlementMethod', width: 100 },
  { title: '交货方式', dataIndex: 'deliveryMethod', width: 100 },
  { title: '供货期/天', dataIndex: 'leadTimeDays', width: 90, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '采购员', dataIndex: 'purchaser', width: 90 },
  { title: '订单来源', dataIndex: 'orderSource', width: 100 },
  { title: '审批人', key: 'approverName', dataIndex: 'approverName', width: 90 },
  { title: '审批时间', key: 'approvedAt', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 140 },
  { title: '更新人', key: 'updater', dataIndex: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 140 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-order-list-v8', baseColumns)

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
  const statusRank = {
    待提交: 0,
    已拒绝: 1,
    待审核: 2,
    进行中: 3,
    已完成: 4,
    已作废: 5,
  }
  return filterPurchaseOrders(purchaseOrderState.orders, f)
    .filter((o) => o.status !== '草稿')
    .sort((a, b) => {
      const ra = statusRank[a.status] ?? 99
      const rb = statusRank[b.status] ?? 99
      if (ra !== rb) return ra - rb
      const ta = dayjs(a.createdAt || a.documentDate).valueOf() || 0
      const tb = dayjs(b.createdAt || b.documentDate).valueOf() || 0
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
  const map = {
    草稿: 'processing',
    待提交: 'default',
    待审核: 'default',
    进行中: 'processing',
    已拒绝: 'error',
    已完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function inboundColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function overdueStatusOf(record) {
  return record?.overdueStatus || computePurchaseOrderOverdueStatus(record)
}

function overdueColor(status) {
  return status === '已逾期' ? 'error' : 'default'
}

function hasRowActions(record) {
  return (
    record.status === '草稿' ||
    record.status === '进行中' ||
    canEditPurchaseOrder(record) ||
    canSubmitPurchaseOrder(record) ||
    canWithdrawPurchaseOrder(record) ||
    canResubmitPurchaseOrder(record) ||
    canVoidPurchaseOrder(record) ||
    canGenerateReceipt(record) ||
    canGenerateInbound(record) ||
    canApplyPurchasePriceChange(record)
  )
}

function openDetail(record) {
  if (record.status === '草稿') {
    continueDraft(record)
    return
  }
  const path = `/procurement/purchase-orders/${record.id}`
  openTab(path, `采购订单 ${record.orderNo}`)
  router.push({ name: 'procurement-purchase-orders-detail', params: { id: record.id } })
}

function continueDraft(record) {
  const ids = (record.sourceReqIds || []).join(',')
  const path = `/procurement/purchase-req/generate-po?draftId=${record.id}${
    ids ? `&ids=${ids}` : ''
  }`
  openTab(path, '生成采购订单')
  router.push(path)
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.orderNo = ''
  filters.supplier = undefined
  filters.reqNo = ''
  filters.status = undefined
  filters.orderSource = undefined
  filters.overdueStatus = undefined
  filters.documentDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

onMounted(() => {
  refreshPurchaseOrderOverdueStatusAll()
})

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function onBatchMenuClick({ key }) {
  if (key === '批量审核') {
    handleBatchApprove()
    return
  }
  if (key === '批量作废') {
    handleBatchVoid()
    return
  }
  stubAction(key)
}

function openCreate() {
  const page = findCreatePageByListPath('/procurement/purchase-orders')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openToolbarApprove() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条待审核的采购单后再审核')
    return
  }
  const order = purchaseOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选采购单')
    return
  }
  if (!canApprovePurchaseOrder(order)) {
    message.warning('仅「待审核」状态的采购单可审核')
    return
  }
  const path = `/procurement/purchase-orders/${order.id}/approve`
  openTab(path, `审核采购单 ${order.orderNo || ''}`.trim())
  router.push({ name: 'procurement-purchase-orders-approve', params: { id: order.id } })
}

function openEdit(record) {
  if (!canEditPurchaseOrder(record)) {
    message.warning('仅待提交 / 已拒绝的采购单可编辑')
    return
  }
  openCreateTab(router, openTab, {
    path: `/procurement/purchase-orders/${record.id}/edit`,
    title: `编辑采购单 ${record.orderNo || ''}`.trim(),
  })
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
  const block = getPendingPurchasePriceChangeBlock(order.id, '生成收货单')
  if (block) {
    message.warning(block)
    return
  }
  if (!canGenerateReceipt(order)) {
    message.warning('仅进行中且仍有可收货/入库数量的采购单可生成收货单')
    return
  }
  receiptOrder.value = order
  receiptModalOpen.value = true
}

function openInboundModal() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条采购单后再生成入库单')
    return
  }
  const order = purchaseOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选采购单')
    return
  }
  const block = getPendingPurchasePriceChangeBlock(order.id, '生成入库单')
  if (block) {
    message.warning(block)
    return
  }
  if (!canGenerateInbound(order)) {
    message.warning('仅进行中且仍有可收货/入库数量的采购单可生成入库单')
    return
  }
  inboundOrder.value = order
  inboundModalOpen.value = true
}

function openReceiptForRow(record) {
  const block = getPendingPurchasePriceChangeBlock(record?.id, '生成收货单')
  if (block) {
    message.warning(block)
    return
  }
  if (!canGenerateReceipt(record)) {
    message.warning('仅进行中且仍有可收货/入库数量的采购单可生成收货单')
    return
  }
  receiptOrder.value = record
  receiptModalOpen.value = true
}

function openInboundForRow(record) {
  const block = getPendingPurchasePriceChangeBlock(record?.id, '生成入库单')
  if (block) {
    message.warning(block)
    return
  }
  if (!canGenerateInbound(record)) {
    message.warning('仅进行中且仍有可收货/入库数量的采购单可生成入库单')
    return
  }
  inboundOrder.value = record
  inboundModalOpen.value = true
}

function rowPriceChangeLabel(order) {
  return getPendingPurchasePriceChange(order?.id) ? '审核价格变更' : '价格变更'
}

function openPriceChangeForOrder(order) {
  if (!canApplyPurchasePriceChange(order)) {
    message.warning('仅「进行中 / 已完成」的采购订单可申请价格变更')
    return
  }
  priceChangeOrder.value = order
  priceChangeOpen.value = true
}

function openToolbarPriceChangeApprove() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条待审核价格变更的采购订单')
    return
  }
  const order = purchaseOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选采购单')
    return
  }
  if (!getPendingPurchasePriceChange(order.id)) {
    message.warning('所选采购单没有待审核的价格变更')
    return
  }
  priceChangeOrder.value = order
  priceChangeOpen.value = true
}

function onPriceChangeDone() {
  priceChangeOrder.value = null
}

function openPurchaseReturnCreate(order) {
  if (!order?.orderNo) return
  openCreateTab(router, openTab, {
    path: '/procurement/purchase-returns/new',
    title: '新增采购退货单',
    query: { purchaseOrderNo: order.orderNo },
  })
}

function openPurchaseReturnFromToolbar() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条进行中的采购单后再采购退货')
    return
  }
  const order = purchaseOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选采购单')
    return
  }
  if (order.status !== '进行中') {
    message.warning('仅进行中的采购单可采购退货')
    return
  }
  openPurchaseReturnCreate(order)
}

function handleSubmit(record) {
  Modal.confirm({
    title: '确认提交审核',
    content: `确定提交采购单「${record.orderNo}」审核吗？`,
    onOk: () => {
      const result = submitPurchaseOrderForApprove(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleWithdraw(record) {
  Modal.confirm({
    title: '确认撤回',
    content: `确定撤回采购单「${record.orderNo}」吗？撤回后可继续编辑。`,
    onOk: () => {
      const result = withdrawPurchaseOrder(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleResubmit(record) {
  Modal.confirm({
    title: '确认重新提交',
    content: `确定重新提交采购单「${record.orderNo}」审核吗？`,
    onOk: () => {
      const result = resubmitPurchaseOrder(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleVoid(record) {
  Modal.confirm({
    title: '确认作废',
    content: `确定作废采购单「${record.orderNo}」吗？作废后不可再编辑。`,
    okType: 'danger',
    onOk: () => {
      const result = voidPurchaseOrder(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleBatchApprove() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要审核的采购单')
    return
  }
  const targets = getPurchaseOrdersByIds(selectedRowKeys.value).filter(canApprovePurchaseOrder)
  if (!targets.length) {
    message.warning('所选采购单均不可审核')
    return
  }
  targets.forEach((o) => approvePurchaseOrder(o.id))
  message.success(`已审核通过 ${targets.length} 条采购单`)
  selectedRowKeys.value = []
}

function handleBatchVoid() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要作废的采购单')
    return
  }
  const targets = getPurchaseOrdersByIds(selectedRowKeys.value).filter(canVoidPurchaseOrder)
  if (!targets.length) {
    message.warning('所选采购单均不可作废')
    return
  }
  Modal.confirm({
    title: '批量作废',
    content: `确定作废选中的 ${targets.length} 条采购单吗？`,
    okType: 'danger',
    onOk: () => {
      targets.forEach((o) => voidPurchaseOrder(o.id))
      message.success(`已作废 ${targets.length} 条采购单`)
      selectedRowKeys.value = []
    },
  })
}

function onPrintMenuClick({ key }) {
  if (key === '打印采购单') {
    openBatchPrint()
  }
}

function openBatchPrint() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要打印的采购订单')
    return
  }
  printOrders.value = getPurchaseOrdersByIds(selectedRowKeys.value)
  printModalOpen.value = true
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

function onReceiptConfirmed() {
  selectedRowKeys.value = []
}

function onInboundSaved() {
  selectedRowKeys.value = []
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
