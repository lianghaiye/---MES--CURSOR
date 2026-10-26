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
        <span class="contract-no">{{ summary.contractNo }}</span>
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
          <span>合同回款进度</span>
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
          <template v-else-if="column.key === 'actions'">
            <a-space v-if="(Number(record.unpaid) || 0) > 0" :size="8">
              <a @click="openMaintain(record, 'startDate')">维护起算日</a>
              <a @click="openMaintain(record, 'register')">登记回款</a>
            </a-space>
            <span v-else class="muted-action">—</span>
          </template>
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
  </a-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDrawerWidth } from '@/composables/useDrawerWidth'
import { DRAWER_MASK_STYLE } from '@/utils/drawerWidth'
import { CONTRACT_PAYMENT_STATUS, contractPaymentStatusColor } from '@/constants/salesContract'
import { buildContractPaymentSummary, salesPaymentState } from '@/store/salesPaymentStore'
import { getSalesContractByNo, salesContractState } from '@/store/salesContractStore'
import PaymentNodeMaintainModal from './PaymentNodeMaintainModal.vue'

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
const tick = ref(0)

const summary = computed(() => {
  void salesPaymentState.payments
  void salesPaymentState.plans
  void salesContractState.contracts
  void tick.value
  const no = props.record?.contractNo
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
    { key: 'unpaid', label: '待收金额', value: formatCompactMoney(s.unpaidTotal) },
    { key: 'rate', label: '回款进度', value: `${Number(s.collectionRate || 0)}%` },
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
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

.muted-action {
  color: rgba(0, 0, 0, 0.25);
}
</style>
