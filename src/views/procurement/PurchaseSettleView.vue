<template>
  <div class="purchase-settle-page">
    <section class="period-hero">
      <div class="period-hero__glow" aria-hidden="true" />
      <div class="period-hero__top">
        <div class="period-hero__title-block">
          <div class="period-hero__range-label">时间范围</div>
        </div>
        <div class="period-hero__controls">
          <a-radio-group
            v-model:value="rangePreset"
            class="period-preset"
            size="small"
            @change="onPresetChange"
          >
            <a-radio-button value="3m">最近三月</a-radio-button>
            <a-radio-button value="6m">最近半年</a-radio-button>
            <a-radio-button value="1y">最近一年</a-radio-button>
            <a-radio-button value="custom">自定义</a-radio-button>
          </a-radio-group>
          <a-range-picker
            v-model:value="rangeMonths"
            class="period-range-picker"
            picker="month"
            value-format="YYYY-MM"
            size="small"
            :disabled="rangePreset !== 'custom'"
            :placeholder="['开始月', '结束月']"
          />
          <div class="period-hero__actions">
            <a-button type="primary" size="small" class="period-btn-query" @click="applyRange">
              查询
            </a-button>
            <a-button size="small" @click="clearRange">清空</a-button>
          </div>
        </div>
      </div>

      <div class="period-hero__bottom">
        <div class="period-focus">
          <div v-if="viewMode === 'current'" class="period-focus__meta">
            <span class="period-focus__tag">当前账期</span>
            <div class="period-focus__pickers">
              <a-select
                v-model:value="focusYear"
                class="period-focus__select"
                size="middle"
                :options="yearOpts"
                :bordered="false"
                @change="syncFocusPeriod"
              />
              <span class="period-focus__divider" />
              <a-select
                v-model:value="focusMonth"
                class="period-focus__select period-focus__select--month"
                size="middle"
                :options="monthOpts"
                :bordered="false"
                @change="syncFocusPeriod"
              />
            </div>
            <span class="period-focus__hint">列表仅展示当前账期对账单</span>
          </div>
          <div v-else class="period-focus__meta">
            <span class="period-focus__tag">账期范围</span>
            <button type="button" class="period-range-pill" @click="onRangePillClick">
              <span class="period-range-pill__bar" aria-hidden="true" />
              <span class="period-range-pill__text">{{ appliedRangeLabel }}</span>
              <span class="period-range-pill__caret" aria-hidden="true" />
            </button>
            <span class="period-focus__hint">列表展示该范围内全部对账单</span>
          </div>
        </div>
        <div class="period-payable">
          <div class="period-payable__label">
            {{ viewMode === 'current' ? '本期应付总额' : '范围内应付总额' }}
          </div>
          <div class="period-payable__value">
            <span class="period-payable__currency">¥</span>
            <span class="period-payable__num">{{ formatMoney(periodPayableTotal) }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="供应商">
              <a-input
                v-model:value="filters.supplier"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="账单状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="对账单号">
              <a-input
                v-model:value="filters.settleNo"
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
            <a-form-item label="生成方式">
              <a-select
                v-model:value="filters.generateMode"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="generateModeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" size="small" @click="openPeriodCreate">按账期生成</a-button>
          <a-button size="small" @click="openCreate">从采购单生成对账</a-button>
          <a-dropdown>
            <a-button size="small"> 批量打印 </a-button>
            <template #overlay>
              <a-menu @click="onPrintMenuClick">
                <a-menu-item key="打印对账单">打印采购对账单</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-button size="small" @click="onBatchUnconfirm">反确认</a-button>
          <a-button size="small" @click="exportModalOpen = true">导出</a-button>
        </a-space>
      </div>
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        :pagination="false"
        :scroll="{ x: 3320 }"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag
              :color="
                record.status === '已确认'
                  ? 'green'
                  : record.status === '对账中'
                    ? 'processing'
                    : 'default'
              "
            >
              {{ record.status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'paymentStatus'">
            <a-tag
              :color="
                record.paymentStatus === '已付款'
                  ? 'green'
                  : record.paymentStatus === '部分付款'
                    ? 'orange'
                    : 'default'
              "
            >
              {{ record.paymentStatus || '未付款' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'invoiceStatus'">
            <a-tag
              :color="
                record.invoiceStatus === '已开票'
                  ? 'blue'
                  : record.invoiceStatus === '部分收票'
                    ? 'processing'
                    : 'default'
              "
            >
              {{ record.invoiceStatus || '未收票' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'settleNo'">
            <a @click="openDetail(record)">{{ record.settleNo }}</a>
          </template>
          <template v-else-if="column.key === 'periodWindow'">
            {{ displayPeriodWindow(record) }}
          </template>
          <template v-else-if="column.key === 'bookAmount'">
            {{ formatMoney(resolveBookAmount(record)) }}
          </template>
          <template v-else-if="column.key === 'openingBalance'">
            {{ formatMoney(resolveSettleFundOverview(record).openingBalance) }}
          </template>
          <template v-else-if="column.key === 'feeAdjustAmount'">
            {{ formatMoney(calcSettleFeeAdjustAmount(record)) }}
          </template>
          <template v-else-if="column.key === 'disputeAmount'">
            {{ formatMoney(Number(record.disputeAmount) || 0) }}
          </template>
          <template v-else-if="column.key === 'confirmedAmount'">
            {{ formatMoney(resolveConfirmedAmount(record)) }}
          </template>
          <template v-else-if="column.key === 'invoiceAmount'">
            {{ formatMoney(resolveInvoiceAmount(record)) }}
          </template>
          <template v-else-if="column.key === 'periodPaid'">
            {{ formatMoney(Number(record.paidAmount) || 0) }}
          </template>
          <template v-else-if="column.key === 'settleTarget'">
            {{ displaySettleTarget(record) }}
          </template>
          <template v-else-if="column.key === 'generateMode'">
            {{ record.generateMode === 'period' ? '按账期' : '从采购单' }}
          </template>
          <template v-else-if="column.key === 'paymentTermStart'">
            {{ record.paymentTermStart || '—' }}
          </template>
          <template v-else-if="column.key === 'paymentTermDays'">
            {{ displayPaymentTermDays(record) }}
          </template>
          <template v-else-if="column.key === 'plannedPaymentDate'">
            {{ record.plannedPaymentDate || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space v-if="isPreConfirmSettle(record)">
              <a @click="onConfirm(record)">确认</a>
              <a v-if="record.status === '草稿'" @click="onMarkReconciling(record)"> 标记对账中 </a>
              <a class="danger" @click="onDelete(record)">删除</a>
            </a-space>
            <a-space v-else-if="showConfirmedListActions(record)">
              <a v-if="canListInvoice(record)" @click="openDetailAction(record, 'invoice')">
                收票登记
              </a>
              <a v-if="canListPayment(record)" @click="openDetailAction(record, 'payment')">
                付款登记
              </a>
            </a-space>
            <span v-else class="actions-empty">—</span>
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
      <div class="pagination-wrap">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          :show-size-changer="false"
        />
      </div>
    </div>

    <GeneratePurchaseSettleModal v-model:open="createOpen" @confirmed="onCreated" />
    <GeneratePeriodSettleModal v-model:open="periodOpen" @confirmed="onCreated" />
    <PurchaseSettlePrintModal v-model:open="printModalOpen" :settles="printSettles" />
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
export default { name: 'PurchaseSettleView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import {
  purchaseSettleState,
  confirmPurchaseSettle,
  unconfirmPurchaseSettle,
  deletePurchaseSettle,
  markPurchaseSettleReconciling,
  resolveSettleFundOverview,
  calcSettleFeeAdjustAmount,
  settleInvoicedTotal,
} from '@/store/purchaseSettleStore'
import GeneratePurchaseSettleModal from './components/GeneratePurchaseSettleModal.vue'
import GeneratePeriodSettleModal from './components/GeneratePeriodSettleModal.vue'
import PurchaseSettlePrintModal from './components/PurchaseSettlePrintModal.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useListExport } from '@/composables/useListExport'
import { purchaseSettleExportFields } from '@/utils/exportFields/purchaseSettleExport'
import { formatNumber } from '@/utils/numberFormat'
const router = useRouter()
const { openTab } = useTabs()

function monthsBetween(startYm, endYm) {
  if (!startYm || !endYm) return []
  let cur = dayjs(`${startYm}-01`)
  const end = dayjs(`${endYm}-01`)
  if (!cur.isValid() || !end.isValid() || cur.isAfter(end, 'month')) return []
  const list = []
  while (!cur.isAfter(end, 'month')) {
    list.push(cur.format('YYYY-MM'))
    cur = cur.add(1, 'month')
  }
  return list
}

function buildPresetRange(preset) {
  const end = dayjs()
  const map = { '3m': 2, '6m': 5, '1y': 11 }
  const back = map[preset] ?? 2
  const start = end.subtract(back, 'month')
  return [start.format('YYYY-MM'), end.format('YYYY-MM')]
}

function currentYearMonth() {
  return dayjs().format('YYYY-MM')
}

/** 从对账单解析所属会计月 YYYY-MM */
function resolveSettleYearMonth(row) {
  const key = String(row?.periodKey || '')
  const m = key.match(/^(\d{4}-\d{2})/)
  if (m) return m[1]
  const start = String(row?.periodStart || '')
  if (/^\d{4}-\d{2}/.test(start)) return start.slice(0, 7)
  return ''
}

function formatZhYearMonth(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || '—'
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return `${y}年${m}月`
}

/** current：仅当前账期；range：按时间范围筛选 */
const viewMode = ref('current')
const rangePreset = ref(undefined)
const rangeMonths = ref([])
const appliedRange = ref([])

const nowYm = currentYearMonth()
const focusYear = ref(Number(nowYm.slice(0, 4)))
const focusMonth = ref(Number(nowYm.slice(5, 7)))
const focusYearMonth = computed(
  () => `${focusYear.value}-${String(focusMonth.value).padStart(2, '0')}`,
)

const appliedRangeLabel = computed(() => {
  const [start, end] = appliedRange.value || []
  if (!start || !end) return '未选择时间范围'
  if (start === end) return formatZhYearMonth(start)
  return `${formatZhYearMonth(start)}～${formatZhYearMonth(end)}`
})

const filters = reactive({
  settleNo: '',
  purchaseOrderNo: '',
  supplier: '',
  generateMode: undefined,
  status: undefined,
})
const applied = reactive({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const createOpen = ref(false)
const periodOpen = ref(false)

const statusOpts = [
  { label: '草稿', value: '草稿' },
  { label: '对账中', value: '对账中' },
  { label: '已确认', value: '已确认' },
]

const selectedRowKeys = ref([])
const printModalOpen = ref(false)
const printSettles = ref([])

const { exportModalOpen, exportFieldSettings, defaultExportFieldSettings, doExport } =
  useListExport({
    storageKey: 'purchase-settle-list',
    fieldDefinitions: purchaseSettleExportFields,
    getFilteredRows: () => filteredList.value,
    getSelectedRows: () =>
      purchaseSettleState.settles.filter((s) => selectedRowKeys.value.includes(s.id)),
    fileNamePrefix: '采购对账单',
    sheetName: '采购对账',
  })

function onSelectChange(keys) {
  selectedRowKeys.value = keys
}

function onPrintMenuClick({ key }) {
  if (key === '打印对账单') openBatchPrint()
}

function openBatchPrint() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要打印的对账单')
    return
  }
  printSettles.value = purchaseSettleState.settles.filter((s) =>
    selectedRowKeys.value.includes(s.id),
  )
  if (!printSettles.value.length) {
    message.warning('未找到可打印的对账单')
    return
  }
  printModalOpen.value = true
}

function onMarkReconciling(record) {
  const res = markPurchaseSettleReconciling(record.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
}

const generateModeOpts = [
  { label: '账期', value: 'period' },
  { label: '采购单', value: 'po' },
]

const yearOpts = computed(() => {
  const y = focusYear.value
  return [y - 1, y, y + 1].map((n) => ({ label: `${n}年`, value: n }))
})

const monthOpts = computed(() =>
  Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i + 1,
  })),
)

const columns = [
  { title: '序号', key: 'index', width: 60, fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '付款状态', key: 'paymentStatus', width: 100, fixed: 'left' },
  { title: '收票状态', key: 'invoiceStatus', width: 90, fixed: 'left' },
  { title: '对账单号', key: 'settleNo', width: 150, fixed: 'left' },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '账期', dataIndex: 'periodKey', key: 'periodKey', width: 100 },
  { title: '结算期间', key: 'periodWindow', width: 190 },
  { title: '账面金额', key: 'bookAmount', width: 110, align: 'right' },
  { title: '期初余额', key: 'openingBalance', width: 110, align: 'right' },
  { title: '追加/补差金额', key: 'feeAdjustAmount', width: 120, align: 'right' },
  { title: '争议金额', key: 'disputeAmount', width: 100, align: 'right' },
  { title: '确认金额', key: 'confirmedAmount', width: 110, align: 'right' },
  { title: '收票金额', key: 'invoiceAmount', width: 110, align: 'right' },
  { title: '本期已付', key: 'periodPaid', width: 110, align: 'right' },
  { title: '生成维度', key: 'settleTarget', width: 120 },
  { title: '生成方式', key: 'generateMode', width: 90 },
  { title: '结算周期', dataIndex: 'settlementCycle', key: 'settlementCycle', width: 90 },
  { title: '账期起算', key: 'paymentTermStart', width: 90 },
  { title: '账期天数', key: 'paymentTermDays', width: 90, align: 'right' },
  { title: '计划付款日', key: 'plannedPaymentDate', width: 120 },
  { title: '创建人', dataIndex: 'creator', key: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', key: 'confirmer', width: 90 },
  { title: '确认时间', dataIndex: 'confirmedAt', key: 'confirmedAt', width: 160 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

const rangeMonthSet = computed(
  () => new Set(monthsBetween(appliedRange.value[0], appliedRange.value[1])),
)

function matchPeriodScope(ym) {
  if (!ym) return false
  if (viewMode.value === 'current') return ym === focusYearMonth.value
  return rangeMonthSet.value.has(ym)
}

const filteredList = computed(() => {
  void purchaseSettleState.settles
  return purchaseSettleState.settles.filter((row) => {
    const ym = resolveSettleYearMonth(row)
    if (!matchPeriodScope(ym)) return false
    if (applied.settleNo && !String(row.settleNo || '').includes(applied.settleNo.trim())) {
      return false
    }
    if (applied.purchaseOrderNo) {
      const keyword = applied.purchaseOrderNo.trim()
      const nos = [
        row.purchaseOrderNo,
        ...(row.purchaseOrderNos || []),
        ...(row.lineItems || []).map((l) => l.purchaseOrderNo),
      ]
        .filter(Boolean)
        .join(' ')
      if (!nos.includes(keyword)) return false
    }
    if (applied.supplier && !String(row.supplier || '').includes(applied.supplier.trim())) {
      return false
    }
    if (applied.generateMode && (row.generateMode || 'po') !== applied.generateMode) return false
    if (applied.status && row.status !== applied.status) return false
    return true
  })
})

const periodPayableTotal = computed(() => {
  void purchaseSettleState.settles
  return purchaseSettleState.settles.reduce((sum, row) => {
    if (!matchPeriodScope(resolveSettleYearMonth(row))) return sum
    return sum + (Number(row.totalAmount) || 0)
  }, 0)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function resetToCurrentPeriod() {
  const ym = currentYearMonth()
  viewMode.value = 'current'
  rangePreset.value = undefined
  rangeMonths.value = []
  appliedRange.value = []
  focusYear.value = Number(ym.slice(0, 4))
  focusMonth.value = Number(ym.slice(5, 7))
  pagination.current = 1
}

function onPresetChange() {
  if (rangePreset.value === 'custom') return
  if (!rangePreset.value) return
  rangeMonths.value = buildPresetRange(rangePreset.value)
  applyRange()
}

function applyRange() {
  if (rangePreset.value && rangePreset.value !== 'custom') {
    rangeMonths.value = buildPresetRange(rangePreset.value)
  }
  const [start, end] = rangeMonths.value || []
  if (!start || !end) {
    message.warning('请选择时间范围')
    return
  }
  if (dayjs(`${start}-01`).isAfter(dayjs(`${end}-01`), 'month')) {
    message.warning('开始月份不能晚于结束月份')
    return
  }
  appliedRange.value = [start, end]
  viewMode.value = 'range'
  pagination.current = 1
}

function clearRange() {
  resetToCurrentPeriod()
}

function onRangePillClick() {
  rangePreset.value = 'custom'
  rangeMonths.value = [...appliedRange.value]
}

function syncFocusPeriod() {
  pagination.current = 1
}

function displayPeriodWindow(record) {
  if (record.periodStart && record.periodEnd) {
    return `${record.periodStart} ~ ${record.periodEnd}`
  }
  return '—'
}

function resolveBookAmount(record) {
  if (record.bookAmount != null && record.bookAmount !== '') return Number(record.bookAmount)
  return Number(record.totalAmount) || 0
}

function resolveConfirmedAmount(record) {
  if (record.confirmedAmount != null && record.confirmedAmount !== '') {
    return Number(record.confirmedAmount)
  }
  return Math.max(0, resolveBookAmount(record) - (Number(record.disputeAmount) || 0))
}

function resolveInvoiceAmount(record) {
  return settleInvoicedTotal(record)
}

function displayPaymentTermDays(record) {
  const days = Number(record.paymentTermDays)
  if (Number.isFinite(days) && days > 0) return `${days}天`
  return '—'
}

function displaySettleTarget(record) {
  if (record.settleTarget === 'purchase_order') return '按采购单（已完成）'
  if (record.settleTarget === 'inbound') return '按入库'
  return record.generateMode === 'po' ? '按采购单（已完成）' : '按入库'
}

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 2)
}

function handleSearch() {
  Object.assign(applied, filters)
  pagination.current = 1
}

function handleReset() {
  filters.settleNo = ''
  filters.purchaseOrderNo = ''
  filters.supplier = ''
  filters.generateMode = undefined
  filters.status = undefined
  handleSearch()
}

function openCreate() {
  createOpen.value = true
}

function openPeriodCreate() {
  periodOpen.value = true
}

function onCreated() {
  pagination.current = 1
}

function openDetail(record, query = {}) {
  if (!record?.id) return
  const path = `/settlement/purchase-settles/${record.id}`
  openTab(path, `采购对账 ${record.settleNo || ''}`)
  router.push({
    name: 'settlement-purchase-settles-detail',
    params: { id: record.id },
    query,
  })
}

function openDetailAction(record, action) {
  openDetail(record, { action })
}

/** 待确认：草稿 / 对账中 */
function isPreConfirmSettle(record) {
  return record?.status === '草稿' || record?.status === '对账中'
}

/** 已确认且票、款均已完成 → 操作列为空 */
function isConfirmedFullyDone(record) {
  return (
    record?.status === '已确认' &&
    record?.invoiceStatus === '已开票' &&
    record?.paymentStatus === '已付款'
  )
}

function canListInvoice(record) {
  return record?.status === '已确认' && record?.invoiceStatus !== '已开票'
}

function canListPayment(record) {
  return record?.status === '已确认' && record?.paymentStatus !== '已付款'
}

function showConfirmedListActions(record) {
  if (record?.status !== '已确认') return false
  if (isConfirmedFullyDone(record)) return false
  return canListInvoice(record) || canListPayment(record)
}

/** 未收票且未付款的已确认单可反确认 */
function canUnconfirmSettle(record) {
  if (!record || record.status !== '已确认') return false
  if (record.invoiceStatus === '已开票' || record.invoiceStatus === '部分收票') return false
  if ((record.invoiceRecords || []).length > 0) return false
  if (record.paymentStatus === '已付款') return false
  if ((Number(record.paidAmount) || 0) > 0) return false
  return true
}

function onBatchUnconfirm() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要对账单')
    return
  }
  const targets = purchaseSettleState.settles.filter(
    (s) => selectedRowKeys.value.includes(s.id) && canUnconfirmSettle(s),
  )
  if (!targets.length) {
    message.warning('勾选中没有可反确认的单据（需已确认且未收票、未付款）')
    return
  }
  Modal.confirm({
    title: `反确认 ${targets.length} 张对账单？`,
    content: '将退回草稿并释放入库/退货占量；仅未开票且未付款的已确认单可操作。',
    okText: '反确认',
    onOk() {
      let okCount = 0
      const fails = []
      const doneIds = []
      targets.forEach((row) => {
        const res = unconfirmPurchaseSettle(row.id)
        if (res.ok) {
          okCount += 1
          doneIds.push(row.id)
        } else {
          fails.push(`${row.settleNo}：${res.message}`)
        }
      })
      if (doneIds.length) {
        selectedRowKeys.value = selectedRowKeys.value.filter((id) => !doneIds.includes(id))
      }
      if (okCount) message.success(`已反确认 ${okCount} 张`)
      if (fails.length) message.warning(fails.slice(0, 3).join('；'))
    },
  })
}

function onConfirm(record) {
  Modal.confirm({
    title: `确认对账单 ${record.settleNo}？`,
    content: '确认后将占用入库行的结算数量；未开票未付款时可反确认。',
    okText: '确认',
    onOk() {
      const res = confirmPurchaseSettle(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function onDelete(record) {
  Modal.confirm({
    title: `删除对账单 ${record.settleNo}？`,
    okText: '删除',
    okType: 'danger',
    onOk() {
      const res = deletePurchaseSettle(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

resetToCurrentPeriod()
</script>

<style lang="less" scoped>
.purchase-settle-page {
  --ps-ink: #1c2b3a;
  --ps-muted: #5b6b7c;
  --ps-line: rgba(28, 43, 58, 0.08);
  --ps-accent: #1677ff;
  --ps-accent-soft: rgba(22, 119, 255, 0.12);
  --ps-warm: #c2410c;
  --ps-surface: #ffffff;
  --ps-panel: linear-gradient(135deg, #f5f8fc 0%, #eef3f9 48%, #f7f9fc 100%);
  padding: 0;
}

.period-hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 10px;
  border-radius: 14px;
  border: 1px solid var(--ps-line);
  background: var(--ps-panel);
  box-shadow: 0 10px 28px rgba(28, 43, 58, 0.06);
  padding: 16px 18px 14px;
}

.period-hero__glow {
  position: absolute;
  right: -40px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(22, 119, 255, 0.14) 0%, transparent 70%);
  pointer-events: none;
}

.period-hero__top {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 16px;
  padding-bottom: 14px;
  border-bottom: 1px dashed rgba(28, 43, 58, 0.1);
}

.period-hero__title-block {
  min-width: 88px;
}

.period-hero__range-label {
  font-size: 15px;
  font-weight: 650;
  color: var(--ps-ink);
  letter-spacing: 0.02em;
  line-height: 30px;
}

.period-hero__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  flex: 1;
  justify-content: flex-end;
}

.period-preset {
  :deep(.ant-radio-button-wrapper) {
    border-color: rgba(28, 43, 58, 0.12);
    background: rgba(255, 255, 255, 0.72);
    color: var(--ps-muted);
    height: 30px;
    line-height: 28px;
    padding-inline: 12px;
  }
  :deep(.ant-radio-button-wrapper:first-child) {
    border-radius: 999px 0 0 999px;
  }
  :deep(.ant-radio-button-wrapper:last-child) {
    border-radius: 0 999px 999px 0;
  }
  :deep(.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
    background: var(--ps-ink);
    border-color: var(--ps-ink);
    color: #fff;
    box-shadow: none;
  }
  :deep(.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before) {
    background: transparent;
  }
}

.period-range-picker {
  width: 220px;
  :deep(.ant-picker) {
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.85);
  }
}

.period-hero__actions {
  display: flex;
  gap: 8px;
}

.period-btn-query {
  border-radius: 999px;
  padding-inline: 16px;
  background: var(--ps-accent);
  border-color: var(--ps-accent);
  &:hover,
  &:focus {
    background: #4096ff !important;
    border-color: #4096ff !important;
  }
}

.period-hero__bottom {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 14px;
}

.period-focus__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.period-focus__tag {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ps-accent);
  background: var(--ps-accent-soft);
  border-radius: 999px;
  padding: 3px 10px;
  font-weight: 600;
}

.period-range-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  margin: 0;
  padding: 8px 14px 8px 10px;
  border: 1px solid rgba(28, 43, 58, 0.1);
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(28, 43, 58, 0.04);
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  &:hover {
    border-color: rgba(22, 119, 255, 0.35);
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.1);
  }
}

.period-range-pill__bar {
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: rgba(28, 43, 58, 0.18);
  flex-shrink: 0;
}

.period-range-pill__text {
  font-size: 15px;
  font-weight: 700;
  color: var(--ps-ink);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.period-range-pill__caret {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(28, 43, 58, 0.45);
  flex-shrink: 0;
}

.period-focus__pickers {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--ps-line);
  border-radius: 12px;
  padding: 2px 4px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.period-focus__select {
  min-width: 92px;
  :deep(.ant-select-selector) {
    background: transparent !important;
    box-shadow: none !important;
    padding-inline: 8px !important;
  }
  :deep(.ant-select-selection-item) {
    font-size: 16px;
    font-weight: 700;
    color: var(--ps-ink);
    font-variant-numeric: tabular-nums;
  }
}

.period-focus__select--month {
  min-width: 72px;
}

.period-focus__divider {
  width: 1px;
  height: 18px;
  background: rgba(28, 43, 58, 0.12);
}

.period-focus__hint {
  font-size: 12px;
  color: var(--ps-muted);
  letter-spacing: 0.01em;
}

.period-payable {
  text-align: right;
  min-width: 180px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(255, 247, 237, 0.9));
  border: 1px solid rgba(194, 65, 12, 0.12);
  animation: period-payable-in 0.35s ease-out;
}

.period-payable__label {
  font-size: 12px;
  color: var(--ps-muted);
  margin-bottom: 2px;
}

.period-payable__value {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 2px;
  color: var(--ps-warm);
  line-height: 1.1;
}

.period-payable__currency {
  font-size: 16px;
  font-weight: 650;
}

.period-payable__num {
  font-size: 28px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

@keyframes period-payable-in {
  from {
    opacity: 0.4;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-card,
.table-card {
  background: var(--ps-surface);
  border-radius: 10px;
  border: 1px solid var(--ps-line);
  padding: 8px 12px 12px;
  margin-bottom: 8px;
}
.table-toolbar {
  margin-bottom: 8px;
}
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.actions-empty {
  color: #bfbfbf;
}

.danger {
  color: #ff4d4f;
}

@media (max-width: 768px) {
  .period-hero__controls {
    justify-content: flex-start;
  }
  .period-payable {
    width: 100%;
    text-align: left;
  }
  .period-payable__value {
    justify-content: flex-start;
  }
}
</style>
