<template>
  <div class="ticket-fund-flow-page list-page">
    <a-alert
      type="info"
      show-icon
      class="logic-alert"
      message="票款流水为只读查询：回款/开票来自回款管理登记；付款/收票来自采购对账登记。登记请仍在原业务页操作。"
    />

    <div class="view-tabs-bar">
      <a-tabs v-model:activeKey="activeTab" class="view-tabs" :tab-bar-style="{ margin: 0 }">
        <a-tab-pane key="receipt" tab="回款记录" />
        <a-tab-pane key="salesInvoice" tab="开票记录" />
        <a-tab-pane key="payment" tab="付款记录" />
        <a-tab-pane key="purchaseInvoice" tab="收票记录" />
      </a-tabs>
    </div>

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%" align="middle">
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item :label="partnerLabel">
              <a-input
                v-model:value="filters.partner"
                allow-clear
                size="small"
                :placeholder="isArTab ? '客户名称' : '供应商名称'"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务日期">
              <a-range-picker
                v-model:value="filters.dateRange"
                size="small"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item :label="docLabel">
              <a-input
                v-model:value="filters.docNo"
                allow-clear
                size="small"
                :placeholder="docPlaceholder"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="4">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="applyFilters">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="resetFilters">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-title-row">
        <div class="table-title">{{ tabTitle }}</div>
        <span class="table-meta">{{ tableMetaText }}</span>
      </div>
      <a-table
        :columns="displayColumns"
        :data-source="displayRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: tableScrollX }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            <template v-if="activeTab === 'payment'">
              {{ record.batchIndex }}
            </template>
            <template v-else>
              {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
            </template>
          </template>
          <template v-else-if="column.key === 'amount' || column.key === 'batchAmount'">
            <span class="amt">¥ {{ formatMoney(record[column.key]) }}</span>
          </template>
          <template v-else-if="column.key === 'allocAmount'">
            <span class="amt">¥ {{ formatMoney(record.amount) }}</span>
          </template>
          <template v-else-if="column.key === 'taxAmount'">
            <span v-if="record.taxAmount != null">¥ {{ formatMoney(record.taxAmount) }}</span>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'taxRate'">
            <span v-if="record.taxRate != null && record.taxRate !== ''">
              {{ formatTaxRate(record.taxRate) }}
            </span>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'linkDocNo'">
            <a v-if="record.linkDocNo" @click="openSalesSource(record)">{{ record.linkDocNo }}</a>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'targetSettleNo'">
            <a
              v-if="record.targetSettleId"
              @click="openSettle(record.targetSettleId, record.targetSettleNo)"
            >
              {{ record.targetSettleNo || '—' }}
            </a>
            <span v-else>{{ record.targetSettleNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'entrySettleNo'">
            <a
              v-if="record.entrySettleId"
              @click="openSettle(record.entrySettleId, record.entrySettleNo)"
              :title="'在该对账单上点的「付款登记」'"
            >
              {{ record.entrySettleNo || '—' }}
            </a>
            <span v-else>{{ record.entrySettleNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'settleNo'">
            <a v-if="record.settleId" @click="openSettle(record.settleId, record.settleNo)">
              {{ record.settleNo || '—' }}
            </a>
            <span v-else>{{ record.settleNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'targetTypeLabel'">
            <a-tag
              :color="String(record.targetTypeLabel || '').includes('期初') ? 'orange' : 'blue'"
            >
              {{ record.targetTypeLabel || '本期' }}
            </a-tag>
          </template>
          <template v-else>
            {{ displayCell(record, column) }}
          </template>
        </template>
      </a-table>
      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:pageSize="pagination.pageSize"
          :total="listTotal"
          show-size-changer
          :show-total="paginationTotalText"
        />
      </div>
    </div>

    <PaymentDetailDrawer v-model:open="detailOpen" :record="detailRecord" />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SearchOutlined } from '@ant-design/icons-vue'
import PaymentDetailDrawer from '@/views/sales/components/PaymentDetailDrawer.vue'
import { listContractPaymentSummaries, salesPaymentState } from '@/store/salesPaymentStore'
import { purchaseSettleState } from '@/store/purchaseSettleStore'
import { PAYMENT_LINK_TYPE } from '@/constants/salesContract'
import {
  buildPaymentBatchRowSpans,
  listPurchaseInvoiceFlowRecords,
  listPurchasePaymentFlowRecords,
  listReceiptFlowRecords,
  listSalesInvoiceFlowRecords,
  PAYMENT_BATCH_MERGE_KEYS,
} from '@/utils/ticketFundFlow'
import { formatMoney as formatMoneyBase } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

defineOptions({ name: 'TicketFundFlowView' })

const router = useRouter()
const { openTab } = useTabs()

const activeTab = ref('receipt')
const filters = reactive({
  partner: '',
  docNo: '',
  dateRange: null,
})
const applied = reactive({
  partner: '',
  docNo: '',
  dateRange: null,
})
const pagination = reactive({ current: 1, pageSize: 20 })

const detailOpen = ref(false)
const detailRecord = ref(null)

const isArTab = computed(() => activeTab.value === 'receipt' || activeTab.value === 'salesInvoice')
const partnerLabel = computed(() => (isArTab.value ? '客户' : '供应商'))
const tabTitle = computed(() => {
  const map = {
    receipt: '回款记录',
    salesInvoice: '开票记录',
    payment: '付款记录',
    purchaseInvoice: '收票记录',
  }
  return map[activeTab.value] || '流水'
})
const docLabel = computed(() => {
  if (activeTab.value === 'receipt') return '单号/单据'
  if (activeTab.value === 'salesInvoice') return '发票/单据'
  if (activeTab.value === 'payment') return '对账单/账期'
  return '发票/对账单'
})
const docPlaceholder = computed(() => {
  if (activeTab.value === 'receipt') return '回款单号 / 合同或订单号'
  if (activeTab.value === 'salesInvoice') return '开票单号 / 发票号 / 合同'
  if (activeTab.value === 'payment') return '对账单号 / 账期'
  return '发票号 / 对账单号 / 账期'
})

const filterPayload = computed(() => ({
  partner: applied.partner,
  docNo: applied.docNo,
  dateRange: applied.dateRange,
}))

const paymentResult = computed(() => {
  void purchaseSettleState.settles
  return listPurchasePaymentFlowRecords(filterPayload.value)
})

const rows = computed(() => {
  void salesPaymentState.payments
  void salesPaymentState.invoices
  void purchaseSettleState.settles
  const f = filterPayload.value
  if (activeTab.value === 'receipt') return listReceiptFlowRecords(f)
  if (activeTab.value === 'salesInvoice') return listSalesInvoiceFlowRecords(f)
  if (activeTab.value === 'payment') return paymentResult.value.rows
  return listPurchaseInvoiceFlowRecords(f)
})

/** 付款按「一次登记」分页，避免同一批次被拆到两页 */
const displayRows = computed(() => {
  if (activeTab.value !== 'payment') {
    const start = (pagination.current - 1) * pagination.pageSize
    return rows.value.slice(start, start + pagination.pageSize)
  }
  const groups = paymentResult.value.groups || []
  const start = (pagination.current - 1) * pagination.pageSize
  return groups.slice(start, start + pagination.pageSize).flat()
})

const listTotal = computed(() => {
  if (activeTab.value === 'payment') return (paymentResult.value.groups || []).length
  return rows.value.length
})

const tableMetaText = computed(() => {
  if (activeTab.value === 'payment') {
    const batchN = listTotal.value
    const lineN = rows.value.length
    return `共 ${batchN} 笔付款（${lineN} 条入账分摊）`
  }
  return `共 ${listTotal.value} 条`
})

const paymentMergeKeySet = new Set(PAYMENT_BATCH_MERGE_KEYS)
const pagePaymentRowSpans = computed(() =>
  activeTab.value === 'payment' ? buildPaymentBatchRowSpans(displayRows.value) : [],
)

const indexCol = { title: '序号', key: 'index', width: 60, fixed: 'left' }

const receiptColumns = [
  indexCol,
  { title: '到账日', dataIndex: 'bizDate', key: 'bizDate', width: 110 },
  { title: '回款单号', dataIndex: 'recordNo', key: 'recordNo', width: 150 },
  { title: '客户', dataIndex: 'partnerName', key: 'partnerName', width: 140, ellipsis: true },
  { title: '关联单据', key: 'linkDocNo', width: 150 },
  { title: '回款节点', dataIndex: 'nodeName', key: 'nodeName', width: 110, ellipsis: true },
  { title: '金额', key: 'amount', width: 110, align: 'right' },
  { title: '方式', dataIndex: 'method', key: 'method', width: 100 },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 160, ellipsis: true },
  { title: '登记人', dataIndex: 'creator', key: 'creator', width: 90 },
  { title: '登记时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
]

const salesInvoiceColumns = [
  indexCol,
  { title: '开票日', dataIndex: 'bizDate', key: 'bizDate', width: 110 },
  { title: '开票单号', dataIndex: 'recordNo', key: 'recordNo', width: 150 },
  { title: '客户', dataIndex: 'partnerName', key: 'partnerName', width: 140, ellipsis: true },
  { title: '关联单据', key: 'linkDocNo', width: 150 },
  { title: '回款节点', dataIndex: 'nodeName', key: 'nodeName', width: 110, ellipsis: true },
  { title: '发票号码', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140 },
  { title: '票面金额', key: 'amount', width: 110, align: 'right' },
  { title: '税率', key: 'taxRate', width: 80, align: 'right' },
  { title: '税额', key: 'taxAmount', width: 100, align: 'right' },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 140, ellipsis: true },
  { title: '登记人', dataIndex: 'creator', key: 'creator', width: 90 },
  { title: '登记时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
]

const paymentColumns = [
  indexCol,
  { title: '登记时间', dataIndex: 'paidAt', key: 'paidAt', width: 150 },
  { title: '供应商', dataIndex: 'partnerName', key: 'partnerName', width: 140, ellipsis: true },
  { title: '账期', dataIndex: 'entryPeriodKey', key: 'entryPeriodKey', width: 90 },
  { title: '冲抵', key: 'targetTypeLabel', width: 90 },
  { title: '操作来源单', key: 'entrySettleNo', width: 150 },
  { title: '付款金额', key: 'batchAmount', width: 110, align: 'right' },
  { title: '入账对账单', key: 'targetSettleNo', width: 150 },
  { title: '入账金额', key: 'allocAmount', width: 110, align: 'right' },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 140, ellipsis: true },
  { title: '登记人', dataIndex: 'paidBy', key: 'paidBy', width: 90 },
]

const purchaseInvoiceColumns = [
  indexCol,
  { title: '开票日', dataIndex: 'bizDate', key: 'bizDate', width: 110 },
  { title: '供应商', dataIndex: 'partnerName', key: 'partnerName', width: 140, ellipsis: true },
  { title: '对账单', key: 'settleNo', width: 150 },
  { title: '账期', dataIndex: 'periodKey', key: 'periodKey', width: 90 },
  { title: '发票号码', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140 },
  { title: '票面金额', key: 'amount', width: 110, align: 'right' },
  { title: '税率', key: 'taxRate', width: 80, align: 'right' },
  { title: '税额', key: 'taxAmount', width: 100, align: 'right' },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 140, ellipsis: true },
  { title: '登记人', dataIndex: 'creator', key: 'creator', width: 90 },
  { title: '登记时间', dataIndex: 'createdAt', key: 'createdAt', width: 150 },
]

const columns = computed(() => {
  if (activeTab.value === 'receipt') return receiptColumns
  if (activeTab.value === 'salesInvoice') return salesInvoiceColumns
  if (activeTab.value === 'payment') return paymentColumns
  return purchaseInvoiceColumns
})

const displayColumns = computed(() => {
  const cols = columns.value
  if (activeTab.value !== 'payment') return cols
  const spans = pagePaymentRowSpans.value
  return cols.map((col) => {
    if (!paymentMergeKeySet.has(col.key)) return col
    return {
      ...col,
      customCell: (_record, index) => ({
        rowSpan: spans[index] ?? 1,
        style: { verticalAlign: 'middle' },
      }),
    }
  })
})

const tableScrollX = computed(() => {
  if (activeTab.value === 'payment') return 1280
  if (activeTab.value === 'salesInvoice') return 1460
  return 1340
})

function paginationTotalText(t) {
  return activeTab.value === 'payment' ? `共 ${t} 笔付款` : `共 ${t} 条`
}

function formatMoney(val) {
  return formatMoneyBase(val, 2)
}

function formatTaxRate(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  if (n > 0 && n <= 1) return `${formatMoneyBase(n * 100, 2)}%`
  return `${formatMoneyBase(n, 2)}%`
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const v = record[key]
  if (v == null || v === '') return '—'
  return v
}

function applyFilters() {
  applied.partner = filters.partner
  applied.docNo = filters.docNo
  applied.dateRange = filters.dateRange ? [...filters.dateRange] : null
  pagination.current = 1
}

function resetFilters() {
  filters.partner = ''
  filters.docNo = ''
  filters.dateRange = null
  applyFilters()
}

watch(activeTab, () => {
  pagination.current = 1
})

function openSettle(id, settleNo) {
  if (!id) return
  const path = `/settlement/purchase-settles/${id}`
  openTab(path, `采购对账 ${settleNo || ''}`.trim())
  router.push(path)
}

function resolveSalesSummary(record) {
  const list = listContractPaymentSummaries()
  if (record.contractNo) {
    const hit = list.find(
      (s) => s.linkType !== PAYMENT_LINK_TYPE.SALES_ORDER && s.contractNo === record.contractNo,
    )
    if (hit) return hit
  }
  if (record.salesOrderNo) {
    return (
      list.find(
        (s) =>
          s.linkType === PAYMENT_LINK_TYPE.SALES_ORDER && s.salesOrderNo === record.salesOrderNo,
      ) || null
    )
  }
  return null
}

function openSalesSource(record) {
  const summary = resolveSalesSummary(record)
  if (summary) {
    detailRecord.value = summary
    detailOpen.value = true
    return
  }
  const path = '/settlement/payments'
  openTab(path, '回款管理')
  router.push(path)
}
</script>

<style scoped>
.logic-alert {
  margin-bottom: 12px;
}

.view-tabs-bar {
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid var(--divider, #e5e6eb);
  border-bottom: none;
  border-radius: 6px;
  padding: 0 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.view-tabs-bar :deep(.view-tabs.ant-tabs) {
  margin: 0;
}

.view-tabs-bar :deep(.ant-tabs-nav) {
  margin: 0 !important;
}

.view-tabs-bar :deep(.ant-tabs-nav::before) {
  left: -16px !important;
  right: -16px !important;
  border-bottom: 1px solid var(--divider, #e5e6eb) !important;
}

.view-tabs-bar :deep(.ant-tabs-tab) {
  padding: 14px 0 !important;
}

.view-tabs-bar :deep(.ant-tabs-tab-btn) {
  font-size: 15px !important;
  font-weight: 600 !important;
  line-height: 22px !important;
}

.view-tabs-bar :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  font-weight: 700 !important;
}

.view-tabs-bar :deep(.ant-tabs-ink-bar) {
  height: 3px !important;
  bottom: 0 !important;
}

.view-tabs-bar :deep(.ant-tabs-content-holder) {
  display: none !important;
}

.filter-card {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.horizontal-form {
  width: 100%;
}

.horizontal-form :deep(.ant-form-item) {
  width: 100%;
  margin-bottom: 0;
}

.horizontal-form :deep(.ant-form-item-row) {
  align-items: center;
}

.table-card {
  background: #fff;
  padding: 12px 16px 16px;
  border-radius: 8px;
}

.table-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}

.table-title {
  font-weight: 600;
  font-size: 14px;
}

.table-meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.amt {
  font-variant-numeric: tabular-nums;
}

.muted {
  color: rgba(0, 0, 0, 0.35);
}
</style>
