<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="panelWidth"
    :mask-style="maskStyle"
    destroy-on-close
    class="payment-detail-drawer"
    @close="emit('update:open', false)"
  >
    <template #title>
      <div v-if="summary" class="header-main">
        <span class="contract-no">{{
          summary.displayNo || summary.contractNo || summary.salesOrderNo
        }}</span>
        <a-tag v-if="summary.linkType === '销售订单'">订单</a-tag>
        <a-tag :color="contractPaymentStatusColor(summary.paymentStatus)">
          {{ summary.paymentStatus }}
        </a-tag>
        <a-tag>{{ summary.clearedNodeText }}</a-tag>
      </div>
      <span v-else>回款信息</span>
    </template>

    <template v-if="summary">
      <div class="mini-stats">
        <div v-for="card in miniCards" :key="card.key" class="mini-card">
          <div class="mini-value">{{ card.value }}</div>
          <div class="mini-label">{{ card.label }}</div>
        </div>
      </div>

      <div class="progress-block">
        <div class="progress-head">
          <span>{{ summary.linkType === '销售订单' ? '订单回款进度' : '合同回款进度' }}</span>
          <span class="progress-pct">{{ summary.collectionRate }}%</span>
        </div>
        <a-progress
          :percent="Number(summary.collectionRate) || 0"
          :show-info="false"
          :stroke-color="progressColor"
          size="small"
        />
      </div>

      <div class="section-title">
        <span class="bar" />
        <span>回款节点明细</span>
        <a-badge :count="summary.planRows?.length || 0" :number-style="badgeStyle" />
        <span class="section-tip">起算日可后补；登记回款后实时更新</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="summary.planRows || []"
        :pagination="false"
        :row-key="(r) => r.id || r.name"
        size="small"
        bordered
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            {{ record.name || '—' }}
          </template>
          <template v-else-if="column.key === 'ratioText'">
            {{ record.ratioText || '—' }}
          </template>
          <template v-else-if="column.key === 'planAmount'">
            ¥ {{ formatMoney(record.planAmount) }}
          </template>
          <template v-else-if="column.key === 'termStartType'">
            {{ record.termStartType || '—' }}
          </template>
          <template v-else-if="column.key === 'startDate'">
            <span :class="{ 'muted-empty': !record.startDate }">
              {{ record.startDate || '待补写' }}
            </span>
          </template>
          <template v-else-if="column.key === 'dueDate'">
            {{ record.dueDate || '—' }}
          </template>
          <template v-else-if="column.key === 'invoiceAmount'">
            {{ Number(record.invoiceAmount) > 0 ? `¥ ${formatMoney(record.invoiceAmount)}` : '—' }}
          </template>
          <template v-else-if="column.key === 'paid'">
            {{ record.paid > 0 ? `¥ ${formatMoney(record.paid)}` : '—' }}
          </template>
          <template v-else-if="column.key === 'paymentMethod'">
            {{ record.paymentMethod || '—' }}
          </template>
          <template v-else-if="column.key === 'invoiceNo'">
            {{ record.invoiceNo || '—' }}
          </template>
          <template v-else-if="column.key === 'invoiceDate'">
            {{ record.invoiceDate || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openMaintain(record, 'startDate')">维护起算日</a>
              <a @click="openMaintain(record, 'register')">登记回款</a>
              <a @click="openInvoice(record)">登记开票</a>
            </a-space>
          </template>
        </template>
      </a-table>

      <div class="section-title ledger-title">
        <span class="bar" />
        <span>回款流水</span>
        <a-badge :count="paymentLedger.length" :number-style="badgeStyle" />
        <span class="section-tip">每次登记回款的明细</span>
      </div>
      <a-table
        :columns="ledgerColumns"
        :data-source="paymentLedger"
        :pagination="false"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'amount'"> ¥ {{ formatMoney(record.amount) }} </template>
          <template v-else-if="column.key === 'salesOrderNos'">
            {{ formatSalesOrderNos(record) }}
          </template>
          <template v-else-if="column.key === 'receivedAt'">
            {{ record.receivedAt || '—' }}
          </template>
          <template v-else-if="column.key === 'nodeName'">
            {{ record.nodeName || '—' }}
          </template>
          <template v-else-if="column.key === 'paymentMethod'">
            {{ record.paymentMethod || '—' }}
          </template>
          <template v-else-if="column.key === 'creator'">
            {{ record.creator || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ record.createdAt || '—' }}
          </template>
          <template v-else-if="column.key === 'remark'">
            {{ record.remark || '—' }}
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="暂无回款流水" />
        </template>
      </a-table>

      <div class="section-title ledger-title">
        <span class="bar" />
        <span>开票流水</span>
        <a-badge :count="invoiceLedger.length" :number-style="badgeStyle" />
        <span class="section-tip">每次登记开票的明细</span>
      </div>
      <a-table
        :columns="invoiceColumns"
        :data-source="invoiceLedger"
        :pagination="false"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 1400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'amount'"> ¥ {{ formatMoney(record.amount) }} </template>
          <template v-else-if="column.key === 'nodeName'">
            {{ record.nodeName || '—' }}
          </template>
          <template v-else-if="column.key === 'salesOrderNo'">
            {{ record.salesOrderNo || '—' }}
          </template>
          <template v-else-if="column.dataIndex === 'taxRate'">
            {{ record.taxRate != null && record.taxRate !== '' ? `${record.taxRate}%` : '—' }}
          </template>
          <template v-else-if="column.dataIndex === 'taxAmount'">
            {{
              record.taxAmount != null && record.taxAmount !== ''
                ? `¥ ${formatMoney(record.taxAmount)}`
                : '—'
            }}
          </template>
          <template v-else-if="column.key === 'invoiceNo'">
            {{ record.invoiceNo || '—' }}
          </template>
          <template v-else-if="column.key === 'invoiceDate'">
            {{ record.invoiceDate || '—' }}
          </template>
          <template v-else-if="column.key === 'creator'">
            {{ record.creator || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ record.createdAt || '—' }}
          </template>
          <template v-else-if="column.key === 'remark'">
            {{ record.remark || '—' }}
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="暂无开票流水" />
        </template>
      </a-table>
    </template>
    <a-empty v-else description="暂无回款信息" />

    <PaymentNodeMaintainModal
      v-model:open="maintainOpen"
      :summary="summary"
      :node="maintainNode"
      :mode="maintainMode"
      @saved="onMaintained"
    />
    <PaymentInvoiceRegisterModal
      v-model:open="invoiceOpen"
      :summary="summary"
      :node="invoiceNode"
      @saved="onMaintained"
    />
  </a-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDrawerWidth } from '@/composables/useDrawerWidth'
import { DRAWER_MASK_STYLE } from '@/utils/drawerWidth'
import {
  CONTRACT_PAYMENT_STATUS,
  PAYMENT_LINK_TYPE,
  contractPaymentStatusColor,
} from '@/constants/salesContract'
import {
  buildContractPaymentSummary,
  buildSalesOrderPaymentSummary,
  listInvoicesForSummary,
  listPaymentsForSummary,
  salesPaymentState,
} from '@/store/salesPaymentStore'
import { getSalesContractByNo, salesContractState } from '@/store/salesContractStore'
import { findSalesOrderByOrderNo, salesOrderState } from '@/store/salesOrderStore'
import PaymentNodeMaintainModal from './PaymentNodeMaintainModal.vue'
import PaymentInvoiceRegisterModal from './PaymentInvoiceRegisterModal.vue'

defineOptions({ name: 'PaymentDetailDrawer' })

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'register', 'saved'])

const { isNarrowViewport } = useDrawerWidth('l')
const panelWidth = computed(() => (isNarrowViewport.value ? '100%' : '75vw'))
const maskStyle = DRAWER_MASK_STYLE

const badgeStyle = {
  backgroundColor: '#f0f0f0',
  color: 'rgba(0,0,0,0.65)',
  boxShadow: 'none',
}

const maintainOpen = ref(false)
const maintainNode = ref(null)
const maintainMode = ref('startDate')
const invoiceOpen = ref(false)
const invoiceNode = ref(null)
const tick = ref(0)

const summary = computed(() => {
  void salesPaymentState.payments
  void salesPaymentState.plans
  void salesPaymentState.invoices
  void salesContractState.contracts
  void salesOrderState.orders
  void tick.value
  const rec = props.record
  if (!rec) return null
  if (rec.linkType === PAYMENT_LINK_TYPE.SALES_ORDER || rec.salesOrderNo) {
    const order = findSalesOrderByOrderNo(rec.salesOrderNo)
    if (order) return buildSalesOrderPaymentSummary(order)
  }
  const no = rec.contractNo
  if (!no) return null
  const c = getSalesContractByNo(no)
  return c ? buildContractPaymentSummary(c) : null
})

const miniCards = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { key: 'plan', label: '计划总额', value: formatCompactMoney(s.planTotal) },
    { key: 'paid', label: '已收金额', value: formatCompactMoney(s.paidTotal) },
    { key: 'invoice', label: '已开票', value: formatCompactMoney(s.invoiceTotal) },
    { key: 'unpaid', label: '待收金额', value: formatCompactMoney(s.unpaidTotal) },
  ]
})

const progressColor = computed(() => {
  const rate = Number(summary.value?.collectionRate) || 0
  if (summary.value?.paymentStatus === CONTRACT_PAYMENT_STATUS.OVERDUE) return '#ff4d4f'
  if (rate >= 100) return '#52c41a'
  if (rate > 0) return '#1677ff'
  return '#d9d9d9'
})

const columns = [
  { title: '计划节点', key: 'name', width: 90, fixed: 'left' },
  { title: '比例', key: 'ratioText', width: 64, align: 'center' },
  { title: '计划金额', key: 'planAmount', width: 120, align: 'right' },
  { title: '起算类型', key: 'termStartType', width: 90 },
  { title: '起算日', key: 'startDate', width: 110 },
  { title: '到期日', key: 'dueDate', width: 110 },
  { title: '开票金额', key: 'invoiceAmount', width: 110, align: 'right' },
  { title: '实际回款', key: 'paid', width: 110, align: 'right' },
  { title: '回款方式', key: 'paymentMethod', width: 90 },
  { title: '发票号码', key: 'invoiceNo', width: 120, ellipsis: true },
  { title: '开票日期', key: 'invoiceDate', width: 110 },
  { title: '操作', key: 'actions', width: 240, fixed: 'right' },
]

const ledgerColumns = [
  { title: '回款单号', dataIndex: 'paymentNo', width: 150 },
  { title: '回款节点', key: 'nodeName', width: 100 },
  { title: '销售订单号', key: 'salesOrderNos', width: 160 },
  { title: '回款金额', key: 'amount', width: 120, align: 'right' },
  { title: '回款方式', key: 'paymentMethod', width: 100 },
  { title: '到账日期', key: 'receivedAt', width: 110 },
  { title: '登记人', key: 'creator', width: 90 },
  { title: '登记时间', key: 'createdAt', width: 140 },
  { title: '备注', key: 'remark', ellipsis: true },
]

const invoiceColumns = [
  { title: '开票单号', dataIndex: 'invoiceRecordNo', width: 150 },
  { title: '开票节点', key: 'nodeName', width: 100 },
  { title: '销售订单号', key: 'salesOrderNo', width: 150 },
  { title: '开票金额', key: 'amount', width: 120, align: 'right' },
  { title: '税率', dataIndex: 'taxRate', width: 80, align: 'right' },
  { title: '税额', dataIndex: 'taxAmount', width: 100, align: 'right' },
  { title: '发票号码', key: 'invoiceNo', width: 140 },
  { title: '开票日期', key: 'invoiceDate', width: 110 },
  { title: '登记人', key: 'creator', width: 90 },
  { title: '登记时间', key: 'createdAt', width: 140 },
  { title: '备注', key: 'remark', ellipsis: true },
]

const paymentLedger = computed(() => {
  void salesPaymentState.payments
  void tick.value
  return listPaymentsForSummary(summary.value)
})

const invoiceLedger = computed(() => {
  void salesPaymentState.invoices
  void tick.value
  return listInvoicesForSummary(summary.value)
})

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatSalesOrderNos(row) {
  const nos = Array.isArray(row?.salesOrderNos)
    ? row.salesOrderNos.map((n) => String(n || '').trim()).filter(Boolean)
    : []
  if (nos.length) return nos.join('、')
  return row?.salesOrderNo || '—'
}

function formatCompactMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '¥ 0'
  if (Math.abs(n) >= 10000) {
    const wan = n / 10000
    const text =
      Math.abs(wan) >= 100
        ? wan.toLocaleString(undefined, { maximumFractionDigits: 1 })
        : wan.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    return `¥ ${text}万`
  }
  return `¥ ${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function openMaintain(node, mode = 'startDate') {
  maintainNode.value = node
  maintainMode.value = mode
  maintainOpen.value = true
}

function openInvoice(node) {
  invoiceNode.value = node
  invoiceOpen.value = true
}

function onMaintained() {
  tick.value += 1
  emit('saved')
}
</script>

<style lang="less" scoped>
.header-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
}

.contract-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.mini-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.mini-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 10px;
  text-align: center;
  min-width: 0;
}

.mini-value {
  font-size: 18px;
  font-weight: 600;
  color: #1677ff;
  line-height: 1.3;
  word-break: break-all;
}

.mini-label {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.progress-block {
  margin-bottom: 20px;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.progress-pct {
  color: rgba(0, 0, 0, 0.45);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);

  .bar {
    width: 3px;
    height: 14px;
    background: #1677ff;
    border-radius: 2px;
  }

  .section-tip {
    margin-left: auto;
    font-size: 12px;
    font-weight: 400;
    color: rgba(0, 0, 0, 0.45);
  }
}

.muted-empty {
  color: #fa8c16;
}

.ledger-title {
  margin-top: 24px;
}
</style>
