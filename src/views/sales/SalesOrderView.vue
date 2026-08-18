<template>
  <div class="sales-order-page">
    <!-- 筛选区 -->
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
            <a-form-item label="合同编号">
              <a-input
                v-model:value="filters.contractNo"
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
            <a-form-item label="订单来源">
              <a-select
                v-model:value="filters.orderSource"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="orderSourceOpts"
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
            <a-form-item label="状态">
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
                <a-button size="small" @click="handleReset"> 清空 </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <!-- 操作栏 -->
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
        <a-button size="small" @click="handleRevokeApprove">
          <RollbackOutlined />
          反审
        </a-button>
        <a-button size="small" @click="openToolbarPriceChangeApprove">审核价格变更</a-button>
        <a-button size="small" @click="openDeliveryModal">
          <FileTextOutlined />
          申请发货
        </a-button>
        <a-button size="small" @click="openChangeDeliveryModeModal">变更交付方式</a-button>
        <a-dropdown>
          <a-button size="small">
            批量打印
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onPrintMenuClick">
              <a-menu-item key="打印销售单">打印销售订单明细</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-dropdown>
          <a-button size="small">
            更多
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onMoreMenuClick">
              <a-menu-item key="完成">完成</a-menu-item>
              <a-menu-item key="终止">终止</a-menu-item>
              <a-menu-item key="需求计算">需求计算</a-menu-item>
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

    <!-- 汇总条 -->
    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredOrders.length }} 条数据，总计销售数量：{{
            summary.totalQty
          }}，总计销售金额含税：￥{{ summary.amountInTax.toFixed(2) }}元，不含税：￥{{
            summary.amountExTax.toFixed(2)
          }}元。
        </span>
      </template>
    </a-alert>

    <!-- 表格 -->
    <div class="table-card">
      <a-table
        :columns="displayColumns"
        :data-source="pagedOrders"
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
            <a class="link-code" @click="openDetail(record)">{{ record.orderNo }}</a>
          </template>
          <template v-else-if="column.key === 'progressStatus'">
            <a-tag :color="salesOrderStatusColor(record.progressStatus)">{{
              record.progressStatus
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'deliveryStatus'">
            <a-tag :color="salesDeliveryStatusColor(record.deliveryStatus)">{{
              record.deliveryStatus || '未发货'
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'totalQty'">
            {{ formatQty(record.totalQty) }}
          </template>
          <template v-else-if="column.key === 'totalIssuedQty'">
            {{ formatQty(record.totalIssuedQty) }}
          </template>
          <template v-else-if="column.key === 'downPaymentAmount'">
            {{ formatMoney(record.downPaymentAmount) }}
          </template>
          <template v-else-if="column.key === 'lineAmountInTax'">
            ￥{{ formatOrderMoney(resolveOrderAmounts(record).lineAmountInTax) }}
          </template>
          <template v-else-if="column.key === 'lineAmountExTax'">
            ￥{{ formatOrderMoney(resolveOrderAmounts(record).lineAmountExTax) }}
          </template>
          <template v-else-if="column.key === 'discountStrategy'">
            {{ formatDiscountStrategy(record.discountStrategy) }}
          </template>
          <template v-else-if="column.key === 'totalDiscountAmount'">
            <span
              v-if="Number(resolveOrderAmounts(record).totalDiscountAmount) > 0"
              class="discount-amount"
            >
              -￥{{ formatOrderMoney(resolveOrderAmounts(record).totalDiscountAmount) }}
            </span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'amountInTax'">
            ￥{{ formatOrderMoney(resolveOrderAmounts(record).amountInTax) }}
          </template>
          <template v-else-if="column.key === 'amountExTax'">
            ￥{{ formatOrderMoney(resolveOrderAmounts(record).amountExTax) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'approvedAt'">
            {{ formatDateTime(record.approvedAt) }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDateTime(record.updatedAt || record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'updater'">
            {{ record.updater || record.creator || '—' }}
          </template>
          <template v-else-if="column.key === 'urgency'">
            {{ record.urgency }}
          </template>
          <template v-else-if="column.key === 'inventoryStatus'">
            <a-tag :color="inventoryStatusColor(resolveInventoryStatus(record))">
              {{ resolveInventoryStatus(record) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="hasRowActions(record)" :size="0" wrap>
              <template v-if="canSubmitSalesOrder(record)">
                <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
                <a-button type="link" size="small" @click="handleRowSubmit(record)"
                  >提交审核</a-button
                >
                <a-button type="link" size="small" danger @click="confirmDelete(record)"
                  >删除</a-button
                >
              </template>
              <template v-else-if="canWithdrawSalesOrder(record)">
                <a-button type="link" size="small" @click="handleRowWithdraw(record)"
                  >撤回</a-button
                >
              </template>
              <template v-else-if="canResubmitSalesOrder(record)">
                <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
                <a-button type="link" size="small" @click="handleRowResubmit(record)"
                  >再次提交</a-button
                >
              </template>
              <template v-else-if="isInProgressSalesOrder(record)">
                <a-button type="link" size="small" @click="openDeliveryForOrder(record)"
                  >发货</a-button
                >
                <a-button type="link" size="small" @click="openPriceChangeForOrder(record)">{{
                  rowPriceChangeLabel(record)
                }}</a-button>
                <a-button type="link" size="small" @click="openChangeDeliveryModeForOrder(record)"
                  >变更交付方式</a-button
                >
              </template>
            </a-space>
            <span v-else class="action-disabled">-</span>
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredOrders.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <ChangeDeliveryModeModal
      v-model:open="changeDeliveryModeOpen"
      :sales-order="changeDeliveryModeOrder"
      @saved="onChangeDeliveryModeSaved"
    />
    <SalesPriceChangeModal
      v-model:open="priceChangeOpen"
      :sales-order="priceChangeOrder"
      :pending-change="priceChangePending"
      @done="onPriceChangeDone"
    />

    <SalesOrderPrintModal v-model:open="printModalOpen" :sales-orders="printOrders" />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <ExportExcelModal
      v-model:open="exportModalOpen"
      v-model:settings="exportFieldSettings"
      :default-settings="defaultExportFieldSettings"
      :filtered-count="filteredOrders.length"
      :selected-count="selectedRowKeys.length"
      @export="doExport"
    />
  </div>
</template>

<script>
import { formatQty } from '@/utils/numberFormat'
export default { name: 'SalesOrderView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  CheckOutlined,
  FileTextOutlined,
  RollbackOutlined,
} from '@ant-design/icons-vue'
import { filterSalesOrders } from '@/mock/salesOrders'
import {
  buildOrderInventoryStatus,
  salesStockAllocationState,
} from '@/store/salesStockAllocationStore'
import {
  salesOrderState,
  deleteSalesOrder,
  revokeSalesOrderApproval,
  canEditSalesOrder,
  canChangeDeliveryMode,
  canApproveSalesOrder,
  canRevokeSalesOrderApproval,
  canSubmitSalesOrder,
  canWithdrawSalesOrder,
  canResubmitSalesOrder,
  submitSalesOrderForApprove,
  withdrawSalesOrder,
  resubmitSalesOrder,
} from '@/store/salesOrderStore'
import {
  customerOptions,
  orderSourceOptions,
  deliveryStatusOptions,
  salespersonOptions,
  progressStatusOptions,
} from '@/mock/salesOrderOptions'
import ChangeDeliveryModeModal from './components/ChangeDeliveryModeModal.vue'
import SalesPriceChangeModal from './components/SalesPriceChangeModal.vue'
import SalesOrderPrintModal from './components/SalesOrderPrintModal.vue'
import { buildEligibleDeliveryModeLines } from '@/utils/changeDeliveryMode'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import { salesOrderExportFields } from '@/utils/exportFields/salesOrderExport'
import { DISCOUNT_STRATEGY_LABELS, calcOrderAmounts } from '@/utils/salesOrderPricing'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import {
  SALES_ORDER_REVOKE_BLOCKED_MESSAGE,
  hasSalesOrderRevokeBlockers,
} from '@/utils/salesOrderRevokeApproval'
import {
  canApplySalesPriceChange,
  getPendingPriceChange,
  getPendingPriceChangeDeliveryBlock,
} from '@/store/salesPriceChangeStore'
import {
  normalizeSalesOrderProgressStatus,
  salesDeliveryStatusColor,
  salesOrderStatusColor,
  SALES_ORDER_STATUS,
} from '@/utils/salesOrderStatus'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  orderNo: '',
  contractNo: '',
  customerName: undefined,
  orderSource: undefined,
  salesperson: undefined,
  progressStatus: undefined,
  deliveryStatus: undefined,
  documentDateRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const printModalOpen = ref(false)
const printOrders = ref([])
const changeDeliveryModeOpen = ref(false)
const changeDeliveryModeOrder = ref(null)
const priceChangeOpen = ref(false)
const priceChangeOrder = ref(null)
const priceChangePending = computed(() => getPendingPriceChange(priceChangeOrder.value?.id))
const pagination = reactive({ current: 1, pageSize: 10 })

const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))
const orderSourceOpts = orderSourceOptions.map((v) => ({ label: v, value: v }))
const deliveryStatusOpts = deliveryStatusOptions.map((v) => ({ label: v, value: v }))
const progressStatusOpts = progressStatusOptions.map((v) => ({ label: v, value: v }))
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'progressStatus', dataIndex: 'progressStatus', width: 90, fixed: 'left' },
  { title: '销售单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '发货状态', key: 'deliveryStatus', dataIndex: 'deliveryStatus', width: 90 },
  {
    title: '销售数量',
    key: 'totalQty',
    dataIndex: 'totalQty',
    width: 90,
    align: 'right',
  },
  {
    title: '发货数量',
    key: 'totalIssuedQty',
    dataIndex: 'totalIssuedQty',
    width: 90,
    align: 'right',
  },
  {
    title: '销售总额（含税）',
    key: 'lineAmountInTax',
    dataIndex: 'lineAmountInTax',
    width: 130,
    align: 'right',
  },
  {
    title: '销售总额（不含税）',
    key: 'lineAmountExTax',
    dataIndex: 'lineAmountExTax',
    width: 140,
    align: 'right',
  },
  { title: '合同编号', dataIndex: 'contractNo', width: 130, ellipsis: true },
  { title: '交货方式', dataIndex: 'deliveryMethod', width: 90 },
  {
    title: '优惠策略',
    key: 'discountStrategy',
    dataIndex: 'discountStrategy',
    width: 100,
  },
  {
    title: '优惠总额',
    key: 'totalDiscountAmount',
    dataIndex: 'totalDiscountAmount',
    width: 100,
    align: 'right',
  },
  {
    title: '最终成交额（含税）',
    key: 'amountInTax',
    dataIndex: 'amountInTax',
    width: 140,
    align: 'right',
  },
  {
    title: '最终成交额（不含税）',
    key: 'amountExTax',
    dataIndex: 'amountExTax',
    width: 140,
    align: 'right',
  },
  { title: '紧急度', key: 'urgency', dataIndex: 'urgency', width: 80 },
  { title: '业务员', dataIndex: 'salesperson', width: 90 },
  { title: '库存状态', key: 'inventoryStatus', dataIndex: 'inventoryStatus', width: 90 },
  { title: '结算类型', dataIndex: 'settlementType', width: 90 },
  { title: '付款比例', dataIndex: 'paymentRatio', width: 90 },
  {
    title: '首付金额',
    key: 'downPaymentAmount',
    dataIndex: 'downPaymentAmount',
    width: 110,
    align: 'right',
  },
  { title: '销售渠道', dataIndex: 'salesChannel', width: 90 },
  { title: '所属区域', dataIndex: 'region', width: 90 },
  { title: '订单来源', dataIndex: 'orderSource', width: 100 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '审核时间', key: 'approvedAt', dataIndex: 'approvedAt', width: 140 },
  { title: '审核人', dataIndex: 'approver', width: 90 },
  { title: '最近更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 140 },
  { title: '更新人', key: 'updater', dataIndex: 'updater', width: 90 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('sales-order-list-v2', baseColumns, { minScrollX: 3200 })

const { exportModalOpen, exportFieldSettings, defaultExportFieldSettings, doExport } =
  useListExport({
    storageKey: 'sales-order-list',
    fieldDefinitions: salesOrderExportFields,
    getFilteredRows: () => filteredOrders.value,
    getSelectedRows: () =>
      salesOrderState.orders.filter((o) => selectedRowKeys.value.includes(o.id)),
    fileNamePrefix: '销售订单',
  })

const filteredOrders = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.documentDateRange?.length === 2) {
    f.documentDateRange = [
      f.documentDateRange[0].format('YYYY-MM-DD'),
      f.documentDateRange[1].format('YYYY-MM-DD'),
    ]
  } else {
    f.documentDateRange = null
  }
  return filterSalesOrders(salesOrderState.orders, f)
})

const pagedOrders = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredOrders.value.slice(start, start + pagination.pageSize)
})

const summary = computed(() => {
  const list = filteredOrders.value
  return {
    totalQty: list.reduce((s, o) => s + (Number(o.totalQty) || 0), 0),
    amountInTax: list.reduce((s, o) => s + (Number(o.amountInTax) || 0), 0),
    amountExTax: list.reduce((s, o) => s + (Number(o.amountExTax) || 0), 0),
  }
})

function resolveInventoryStatus(order) {
  void salesStockAllocationState.allocations
  return buildOrderInventoryStatus(order)
}

function inventoryStatusColor(status) {
  if (status === '缺货') return 'error'
  if (status === '部分缺货') return 'warning'
  return 'success'
}

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function formatMoney(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatOrderMoney(val) {
  return formatMoney(val)
}

function resolveOrderAmounts(record) {
  if (!record) return calcOrderAmounts({})
  if (record.lineAmountExTax != null && record.amountExTax != null) {
    return {
      lineListAmountExTax:
        record.lineListAmountExTax ??
        Number(record.lineAmountExTax) + Number(record.lineDiscountTotal || 0),
      lineAmountInTax: record.lineAmountInTax ?? record.orderAmount ?? 0,
      lineAmountExTax: record.lineAmountExTax ?? 0,
      totalDiscountAmount: record.totalDiscountAmount ?? 0,
      amountInTax: record.amountInTax ?? record.orderAmount ?? 0,
      amountExTax: record.amountExTax ?? 0,
    }
  }
  return calcOrderAmounts(record)
}

function formatDiscountStrategy(strategy) {
  return DISCOUNT_STRATEGY_LABELS[strategy] || DISCOUNT_STRATEGY_LABELS.line || '—'
}

function formatDateTime(val) {
  if (!val) return '—'
  return String(val)
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.orderNo = ''
  filters.contractNo = ''
  filters.customerName = undefined
  filters.orderSource = undefined
  filters.salesperson = undefined
  filters.progressStatus = undefined
  filters.deliveryStatus = undefined
  filters.documentDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function onPrintMenuClick({ key }) {
  if (key === '打印销售单') {
    openBatchPrint()
  }
}

function openBatchPrint() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要打印的销售订单')
    return
  }
  printOrders.value = salesOrderState.orders.filter((o) => selectedRowKeys.value.includes(o.id))
  if (!printOrders.value.length) {
    message.warning('未找到可打印的销售订单')
    return
  }
  printModalOpen.value = true
}

function onMoreMenuClick({ key }) {
  stubAction(key)
}

function openToolbarApprove() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条待审核的销售订单')
    return
  }
  const order = salesOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选订单')
    return
  }
  if (!canApproveSalesOrder(order)) {
    message.warning('仅「待审核」状态的销售订单可审核')
    return
  }
  const path = `/sales/orders/${order.id}/approve`
  openTab(path, `审核销售订单 ${order.orderNo || ''}`.trim())
  router.push({ name: 'sales-orders-approve', params: { id: order.id } })
}

function handleRevokeApprove() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要反审的销售订单')
    return
  }

  const targets = salesOrderState.orders.filter((o) => selectedRowKeys.value.includes(o.id))
  const approved = targets.filter((o) => canRevokeSalesOrderApproval(o))
  if (!approved.length) {
    message.warning('所选订单均不可反审（需为进行中）')
    return
  }

  const blockedOrders = approved.filter((o) => hasSalesOrderRevokeBlockers(o))
  const revokableOrders = approved.filter((o) => !hasSalesOrderRevokeBlockers(o))

  if (blockedOrders.length) {
    const orderNos = blockedOrders.map((o) => o.orderNo).join('、')
    Modal.warning({
      title: '无法反审',
      content: `${SALES_ORDER_REVOKE_BLOCKED_MESSAGE}${orderNos ? `\n\n涉及订单：${orderNos}` : ''}`,
      okText: '知道了',
    })
    if (!revokableOrders.length) return
  }

  if (!revokableOrders.length) return

  const count = revokableOrders.length
  Modal.confirm({
    title: count > 1 ? `已选择 ${count} 条可反审订单` : undefined,
    content: blockedOrders.length
      ? `部分订单因已下达关联单据无法反审。确认对其余 ${count} 条订单执行反审？`
      : '确认反审所选销售订单？反审后订单将恢复为待审核状态。',
    okText: '确认反审',
    cancelText: '取消',
    onOk: () => {
      revokableOrders.forEach((order) => {
        const result = revokeSalesOrderApproval(order.id)
        if (result.ok) {
          message.success(result.message)
        } else if (!result.blocked) {
          message.warning(result.message)
        }
      })
      selectedRowKeys.value = []
    },
  })
}

function isInProgressSalesOrder(order) {
  return normalizeSalesOrderProgressStatus(order?.progressStatus) === SALES_ORDER_STATUS.IN_PROGRESS
}

function hasRowActions(order) {
  return (
    canSubmitSalesOrder(order) ||
    canWithdrawSalesOrder(order) ||
    canResubmitSalesOrder(order) ||
    isInProgressSalesOrder(order)
  )
}

function openCreate() {
  const page = findCreatePageByListPath('/sales/orders')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEditModal(record) {
  if (!canEditSalesOrder(record)) {
    message.warning('当前状态不可编辑')
    return
  }
  const path = `/sales/orders/${record.id}/edit`
  openCreateTab(router, openTab, {
    path,
    title: `编辑销售订单 ${record.orderNo || ''}`.trim(),
  })
}

function handleRowSubmit(record) {
  const res = submitSalesOrderForApprove(record.id)
  if (res.ok) message.success(res.message)
  else message.warning(res.message)
}

function handleRowWithdraw(record) {
  Modal.confirm({
    content: `确认撤回销售订单「${record.orderNo}」？撤回后将回到待提交。`,
    okText: '确认撤回',
    cancelText: '取消',
    onOk: () => {
      const res = withdrawSalesOrder(record.id)
      if (res.ok) message.success(res.message)
      else message.warning(res.message)
    },
  })
}

function handleRowResubmit(record) {
  const res = resubmitSalesOrder(record.id)
  if (res.ok) message.success(res.message)
  else message.warning(res.message)
}

function openDeliveryForOrder(order) {
  if (!isInProgressSalesOrder(order)) {
    message.warning('仅「进行中」的销售订单可申请发货')
    return
  }
  const block = getPendingPriceChangeDeliveryBlock(order.id)
  if (block) {
    message.warning(block)
    return
  }
  openCreateTab(router, openTab, {
    path: '/sales/delivery/new',
    title: `新增发货单 ${order.orderNo || ''}`.trim(),
    query: { salesOrderId: order.id },
  })
}

function rowPriceChangeLabel(order) {
  return getPendingPriceChange(order?.id) ? '审核价格变更' : '价格变更'
}

function openPriceChangeForOrder(order) {
  if (!canApplySalesPriceChange(order)) {
    message.warning('仅「进行中」的销售订单可申请价格变更')
    return
  }
  priceChangeOrder.value = order
  priceChangeOpen.value = true
}

function openToolbarPriceChangeApprove() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条待审核价格变更的销售订单')
    return
  }
  const order = salesOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选订单')
    return
  }
  if (!getPendingPriceChange(order.id)) {
    message.warning('当前订单没有待审核的价格变更')
    return
  }
  priceChangeOrder.value = order
  priceChangeOpen.value = true
}

function onPriceChangeDone() {
  priceChangeOrder.value = null
}

function openChangeDeliveryModeForOrder(order) {
  if (!canChangeDeliveryMode(order)) {
    message.warning('仅「进行中」的自产销售订单可变更交付方式')
    return
  }
  if (!buildEligibleDeliveryModeLines(order).length) {
    message.warning('当前订单没有可变更的产品（均已发完或未发货数量为 0）')
    return
  }
  changeDeliveryModeOrder.value = order
  changeDeliveryModeOpen.value = true
}

function openDeliveryModal() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条销售订单后再申请发货')
    return
  }
  const order = salesOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选订单')
    return
  }
  openDeliveryForOrder(order)
}

function openChangeDeliveryModeModal() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条销售订单后再变更交付方式')
    return
  }
  const order = salesOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!order) {
    message.warning('未找到所选订单')
    return
  }
  openChangeDeliveryModeForOrder(order)
}

function onChangeDeliveryModeSaved() {
  changeDeliveryModeOrder.value = null
}

function openDetail(record) {
  const path = `/sales/orders/${record.id}`
  openTab(path, `销售订单 ${record.orderNo}`)
  router.push({ name: 'sales-orders-detail', params: { id: record.id } })
}

function confirmDelete(record) {
  if (!canSubmitSalesOrder(record)) {
    message.warning('仅「待提交」状态可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除销售订单「${record.orderNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      deleteSalesOrder(record.id)
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.sales-order-page {
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

.discount-amount {
  color: #cf1322;
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
