<template>
  <div class="customer-ledger-page">
    <ListPeriodStatsPanel
      title="统计概览"
      :tip="`账期：${periodLabel}`"
      :show-period="false"
      :cards="statCards"
      one-row
      storage-key="i_doms_customer_ledger_stats_collapsed"
    />

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="年份">
              <a-select
                v-model:value="filters.year"
                size="small"
                style="width: 100%"
                :options="yearOpts"
                @change="onYearChange"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="账期">
              <a-select
                v-model:value="filters.month"
                size="small"
                style="width: 100%"
                :options="monthOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="客户">
              <a-input
                v-model:value="filters.customerKeyword"
                allow-clear
                size="small"
                placeholder="名称/编码"
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
      <a-space wrap>
        <a-button size="small" @click="handleSearch">
          <ReloadOutlined />
          刷新
        </a-button>
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredRows"
        row-key="key"
        size="small"
        bordered
        :pagination="listPagination"
        :scroll="{ x: 1680 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (listPagination.current - 1) * listPagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'customer'">
            <a class="link-code" @click="openDetail(record)">{{ record.customer }}</a>
            <div v-if="record.customerCode" class="sub-code">{{ record.customerCode }}</div>
          </template>
          <template v-else-if="moneyKeys.includes(column.key)">
            <span
              :class="{
                'is-neg': Number(record[column.key]) < 0,
                'is-invoice-debt':
                  column.key === 'openInvoiceDebt' && Number(record[column.key]) > 0,
              }"
            >
              ¥ {{ formatMoney(record[column.key]) }}
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button type="link" size="small" @click="openDetail(record)">往来明细</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="drawerOpen"
      :title="drawerTitle"
      :width="1080"
      root-class-name="customer-ledger-drawer"
      destroy-on-close
      @close="active = null"
    >
      <template v-if="active">
        <div class="drawer-body">
          <div class="drawer-metrics-toolbar">
            <span class="drawer-metrics-toolbar__label">指标概览</span>
            <a-button type="link" size="small" @click="toggleAllDrawerMetrics">
              {{ allDrawerMetricsCollapsed ? '全部展开' : '全部收起' }}
              <DownOutlined v-if="allDrawerMetricsCollapsed" />
              <UpOutlined v-else />
            </a-button>
          </div>

          <section
            class="metric-section"
            :class="{ 'is-collapsed': drawerMetricsCollapsed.period }"
          >
            <button
              type="button"
              class="metric-section__head"
              @click="drawerMetricsCollapsed.period = !drawerMetricsCollapsed.period"
            >
              <span class="metric-section__title">本期应收</span>
              <span class="metric-section__hint">{{ periodLabel }}</span>
              <span class="metric-section__toggle">
                {{ drawerMetricsCollapsed.period ? '展开' : '收起' }}
                <DownOutlined v-if="drawerMetricsCollapsed.period" />
                <UpOutlined v-else />
              </span>
            </button>
            <div v-show="!drawerMetricsCollapsed.period" class="metric-grid metric-grid--4">
              <div class="metric-card tone-slate">
                <div class="metric-card__label">期初应收</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.openingBalance) }}</div>
              </div>
              <div class="metric-card tone-blue">
                <div class="metric-card__label">本期增加</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.periodIncrease) }}</div>
              </div>
              <div class="metric-card tone-green">
                <div class="metric-card__label">本期实收</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.periodReceived) }}</div>
              </div>
              <div class="metric-card tone-red">
                <div class="metric-card__label">期末应收</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.endingBalance) }}</div>
              </div>
            </div>
          </section>

          <section
            class="metric-section"
            :class="{ 'is-collapsed': drawerMetricsCollapsed.invoice }"
          >
            <button
              type="button"
              class="metric-section__head"
              @click="drawerMetricsCollapsed.invoice = !drawerMetricsCollapsed.invoice"
            >
              <span class="metric-section__title">票务对照</span>
              <span class="metric-section__hint">不限制回款</span>
              <span class="metric-section__toggle">
                {{ drawerMetricsCollapsed.invoice ? '展开' : '收起' }}
                <DownOutlined v-if="drawerMetricsCollapsed.invoice" />
                <UpOutlined v-else />
              </span>
            </button>
            <div v-show="!drawerMetricsCollapsed.invoice" class="metric-grid metric-grid--3">
              <div class="metric-card tone-cyan">
                <div class="metric-card__label">累计开票</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.invoicedTotal) }}</div>
              </div>
              <div class="metric-card tone-orange">
                <div class="metric-card__label">欠票金额</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.openInvoiceDebt) }}</div>
              </div>
              <div class="metric-card tone-blue">
                <div class="metric-card__label">本年开票</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.yearInvoiced) }}</div>
              </div>
            </div>
          </section>

          <section class="metric-section" :class="{ 'is-collapsed': drawerMetricsCollapsed.year }">
            <button
              type="button"
              class="metric-section__head"
              @click="drawerMetricsCollapsed.year = !drawerMetricsCollapsed.year"
            >
              <span class="metric-section__title">本年汇总</span>
              <span class="metric-section__hint">当年累计</span>
              <span class="metric-section__toggle">
                {{ drawerMetricsCollapsed.year ? '展开' : '收起' }}
                <DownOutlined v-if="drawerMetricsCollapsed.year" />
                <UpOutlined v-else />
              </span>
            </button>
            <div v-show="!drawerMetricsCollapsed.year" class="metric-grid metric-grid--4">
              <div class="metric-card tone-purple">
                <div class="metric-card__label">本年应收</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.yearReceivable) }}</div>
              </div>
              <div class="metric-card tone-green">
                <div class="metric-card__label">本年实收</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.yearReceived) }}</div>
              </div>
              <div class="metric-card tone-indigo">
                <div class="metric-card__label">本年累计往来</div>
                <div class="metric-card__value">¥ {{ formatMoney(active.yearTurnover) }}</div>
              </div>
              <div class="metric-card tone-slate">
                <div class="metric-card__label">关联销售订单</div>
                <div class="metric-card__value">{{ active.orderCount }}</div>
              </div>
            </div>
          </section>

          <section class="entry-section">
            <div class="entry-title">
              <span>往来流水</span>
              <span class="entry-title__count">{{ entries.length }} 笔</span>
            </div>
            <a-table
              :columns="entryColumns"
              :data-source="entries"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 900 }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'type'">
                  <a-tag :color="entryTypeColor(row.type)">{{ row.type }}</a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  <a v-if="row.orderId" class="link-code" @click="goOrder(row)">{{ row.docNo }}</a>
                  <span v-else>{{ row.docNo || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'debit'">
                  {{ row.debit ? `¥ ${formatMoney(row.debit)}` : '—' }}
                </template>
                <template v-else-if="column.key === 'credit'">
                  {{ row.credit ? `¥ ${formatMoney(row.credit)}` : '—' }}
                </template>
                <template v-else-if="column.key === 'amount'">
                  <span v-if="row.amount != null" class="is-invoice">
                    ¥ {{ formatMoney(row.amount) }}
                  </span>
                  <span v-else>—</span>
                </template>
              </template>
            </a-table>
          </section>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script>
export default { name: 'CustomerLedgerView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { DownOutlined, ReloadOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons-vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'
import {
  listCustomerLedgerSummaries,
  listCustomerLedgerEntries,
  resolveCustomerLedgerPeriod,
} from '@/utils/customerLedger'
import { salesOrderState } from '@/store/salesOrderStore'
import { salesPaymentState } from '@/store/salesPaymentStore'
import { formatNumber } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  year: dayjs().year(),
  month: dayjs().month() + 1,
  customerKeyword: '',
})

const applied = ref({
  year: filters.year,
  month: filters.month,
  customerKeyword: '',
})

const yearOpts = computed(() => {
  const y = dayjs().year()
  return [y, y - 1, y - 2].map((v) => ({ label: `${v}年`, value: v }))
})

const monthOpts = [
  { label: '全年', value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i + 1,
  })),
]

const periodLabel = computed(
  () =>
    resolveCustomerLedgerPeriod({
      year: applied.value.year,
      month: applied.value.month || null,
    }).periodLabel,
)

const moneyKeys = [
  'openingBalance',
  'periodIncrease',
  'periodReceived',
  'endingBalance',
  'yearReceivable',
  'yearReceived',
  'invoicedTotal',
  'openInvoiceDebt',
  'yearInvoiced',
  'yearTurnover',
]

const listPagination = reactive({
  current: 1,
  pageSize: 20,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
  onChange(page, pageSize) {
    listPagination.current = page
    listPagination.pageSize = pageSize
  },
})

const columns = [
  { title: '序号', key: 'index', width: 64, fixed: 'left', align: 'center' },
  { title: '客户', key: 'customer', width: 180, fixed: 'left' },
  { title: '期初应收', key: 'openingBalance', width: 120, align: 'right' },
  { title: '本期增加', key: 'periodIncrease', width: 120, align: 'right' },
  { title: '本期实收', key: 'periodReceived', width: 120, align: 'right' },
  { title: '期末应收', key: 'endingBalance', width: 120, align: 'right' },
  { title: '累计开票', key: 'invoicedTotal', width: 120, align: 'right' },
  { title: '欠票金额', key: 'openInvoiceDebt', width: 120, align: 'right' },
  { title: '本年应收', key: 'yearReceivable', width: 120, align: 'right' },
  { title: '本年实收', key: 'yearReceived', width: 120, align: 'right' },
  { title: '本年开票', key: 'yearInvoiced', width: 120, align: 'right' },
  { title: '本年累计往来', key: 'yearTurnover', width: 120, align: 'right' },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

const entryColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '业务日期', dataIndex: 'bizDate', key: 'bizDate', width: 110 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '单号', key: 'docNo', width: 150 },
  { title: '应收增加', key: 'debit', width: 110, align: 'right' },
  { title: '实收', key: 'credit', width: 110, align: 'right' },
  { title: '开票金额', key: 'amount', width: 110, align: 'right' },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
]

function entryTypeColor(type) {
  if (type === '回款') return 'green'
  if (type === '开票') return 'blue'
  if (type === '销售订单') return 'orange'
  return 'default'
}

const queryParams = computed(() => ({
  year: applied.value.year,
  month: applied.value.month || null,
}))

const rows = computed(() => {
  void salesOrderState.orders
  void salesPaymentState.payments
  void salesPaymentState.plans
  return listCustomerLedgerSummaries(queryParams.value)
})

const filteredRows = computed(() => {
  const kw = String(applied.value.customerKeyword || '').trim()
  if (!kw) return rows.value
  return rows.value.filter(
    (r) => String(r.customer || '').includes(kw) || String(r.customerCode || '').includes(kw),
  )
})

const kpi = computed(() => {
  const list = filteredRows.value
  const sum = (key) => list.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)
  return {
    endingBalance: sum('endingBalance'),
    periodIncrease: sum('periodIncrease'),
    periodReceived: sum('periodReceived'),
    invoicedTotal: sum('invoicedTotal'),
    openInvoiceDebt: sum('openInvoiceDebt'),
    yearTurnover: sum('yearTurnover'),
  }
})

const statCards = computed(() => {
  const k = kpi.value
  return [
    {
      key: 'ending',
      title: '期末应收合计',
      value: `¥${formatMoney(k.endingBalance)}`,
      iconClass: 'icon-red',
    },
    {
      key: 'increase',
      title: '本期增加',
      value: `¥${formatMoney(k.periodIncrease)}`,
      iconClass: 'icon-blue',
    },
    {
      key: 'received',
      title: '本期实收',
      value: `¥${formatMoney(k.periodReceived)}`,
      iconClass: 'icon-green',
    },
    {
      key: 'invoiced',
      title: '累计开票',
      value: `¥${formatMoney(k.invoicedTotal)}`,
      iconClass: 'icon-blue',
    },
    {
      key: 'invoiceDebt',
      title: '欠票合计',
      value: `¥${formatMoney(k.openInvoiceDebt)}`,
      iconClass: 'icon-orange',
    },
    {
      key: 'turnover',
      title: '本年累计往来',
      value: `¥${formatMoney(k.yearTurnover)}`,
      iconClass: 'icon-purple',
    },
  ]
})

const drawerOpen = ref(false)
const active = ref(null)
const drawerMetricsCollapsed = reactive({
  period: false,
  invoice: false,
  year: false,
})

const allDrawerMetricsCollapsed = computed(
  () =>
    drawerMetricsCollapsed.period && drawerMetricsCollapsed.invoice && drawerMetricsCollapsed.year,
)

function toggleAllDrawerMetrics() {
  const next = !allDrawerMetricsCollapsed.value
  drawerMetricsCollapsed.period = next
  drawerMetricsCollapsed.invoice = next
  drawerMetricsCollapsed.year = next
}

const drawerTitle = computed(() =>
  active.value ? `客户往来 · ${active.value.customer}（${periodLabel.value}）` : '客户往来',
)

const entries = computed(() => {
  if (!active.value) return []
  void salesOrderState.orders
  void salesPaymentState.payments
  void salesPaymentState.plans
  return listCustomerLedgerEntries(active.value.customer, queryParams.value)
})

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 2)
}

function handleSearch() {
  applied.value = {
    year: filters.year,
    month: filters.month,
    customerKeyword: filters.customerKeyword,
  }
  listPagination.current = 1
}

function handleReset() {
  filters.year = dayjs().year()
  filters.month = dayjs().month() + 1
  filters.customerKeyword = ''
  handleSearch()
}

function onYearChange() {
  if (filters.year !== dayjs().year()) {
    filters.month = 0
  } else if (!filters.month) {
    filters.month = dayjs().month() + 1
  }
}

function openDetail(record) {
  active.value = record
  drawerOpen.value = true
}

function goOrder(row) {
  if (!row.orderId) return
  const path = `/sales/orders/${row.orderId}`
  openTab(path, `销售订单 ${row.docNo || ''}`)
  router.push(path)
}
</script>

<style lang="less" scoped>
.customer-ledger-page {
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 12px 16px;
  margin-bottom: 8px;
}

.toolbar-row {
  margin-bottom: 8px;
}

.table-card {
  padding: 12px;
  border: 1px solid #e5e6eb;
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

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.sub-code {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.is-neg,
.is-invoice-debt {
  color: #cf1322;
}

.is-invoice {
  color: #1677ff;
}

.is-end {
  color: #cf1322;
  font-weight: 700;
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drawer-metrics-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.drawer-metrics-toolbar__label {
  font-size: 13px;
  font-weight: 600;
  color: #1c2b3a;
}

.metric-section {
  background: #f7f9fc;
  border: 1px solid #e8eef5;
  border-radius: 10px;
  padding: 10px 14px 12px;
}

.metric-section.is-collapsed {
  padding-bottom: 10px;
}

.metric-section__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 2px 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.metric-section:not(.is-collapsed) .metric-section__head {
  margin-bottom: 10px;
}

.metric-section__title {
  font-size: 13px;
  font-weight: 600;
  color: #1c2b3a;
}

.metric-section__hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.metric-section__toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #1677ff;
}

.metric-grid {
  display: grid;
  gap: 10px;
}

.metric-grid--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card {
  border-radius: 8px;
  padding: 12px 14px;
  min-height: 72px;
  border: 1px solid transparent;
}

.metric-card__label {
  font-size: 12px;
  margin-bottom: 6px;
  opacity: 0.78;
}

.metric-card__value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.tone-slate {
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  border-color: #d9e2ec;
  .metric-card__label,
  .metric-card__value {
    color: #334155;
  }
}

.tone-blue {
  background: linear-gradient(180deg, #f0f7ff 0%, #e6f0ff 100%);
  border-color: #bfd7ff;
  .metric-card__label,
  .metric-card__value {
    color: #1d4ed8;
  }
}

.tone-cyan {
  background: linear-gradient(180deg, #edfcff 0%, #e0f7fa 100%);
  border-color: #a5e4ef;
  .metric-card__label,
  .metric-card__value {
    color: #0e7490;
  }
}

.tone-green {
  background: linear-gradient(180deg, #f0fdf6 0%, #e6f8ee 100%);
  border-color: #b7e4c7;
  .metric-card__label,
  .metric-card__value {
    color: #15803d;
  }
}

.tone-orange {
  background: linear-gradient(180deg, #fff8f0 0%, #ffefdf 100%);
  border-color: #ffd0a8;
  .metric-card__label,
  .metric-card__value {
    color: #c2410c;
  }
}

.tone-red {
  background: linear-gradient(180deg, #fff5f5 0%, #ffe8e8 100%);
  border-color: #ffc9c9;
  .metric-card__label,
  .metric-card__value {
    color: #c92a2a;
  }
}

.tone-purple {
  background: linear-gradient(180deg, #f8f1ff 0%, #f0e7ff 100%);
  border-color: #d0bfff;
  .metric-card__label,
  .metric-card__value {
    color: #7e22ce;
  }
}

.tone-indigo {
  background: linear-gradient(180deg, #f2f4ff 0%, #e8ecff 100%);
  border-color: #c5cdf8;
  .metric-card__label,
  .metric-card__value {
    color: #4338ca;
  }
}

.entry-section {
  background: #fff;
  border: 1px solid #e8eef5;
  border-radius: 10px;
  padding: 12px 14px;
}

.entry-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 10px;
  color: #1c2b3a;
}

.entry-title__count {
  font-size: 12px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}
</style>

<style lang="less">
.customer-ledger-drawer {
  .ant-drawer-header {
    border-bottom: 1px solid #eef2f6;
  }

  .ant-drawer-body {
    padding: 16px 20px 24px;
    background: #fafbfc;
  }
}
</style>
