<template>
  <ListPeriodStatsPanel
    title="回款概览"
    tip="汇总口径受功能参数「回款挂接对象」影响：按合同、按订单，或合同与订单均可"
    :show-period="false"
    :cards="cards"
    dense
    one-row
    storage-key="i_doms_payment_stats_collapsed"
  />
</template>

<script setup>
import { computed } from 'vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'
import {
  calcPaymentDashboardStats,
  listContractPaymentSummaries,
  salesPaymentState,
} from '@/store/salesPaymentStore'
import { salesContractState } from '@/store/salesContractStore'
import { salesOrderState } from '@/store/salesOrderStore'

const stats = computed(() => {
  void salesPaymentState.payments
  void salesPaymentState.plans
  void salesContractState.contracts
  void salesOrderState.orders
  return calcPaymentDashboardStats(listContractPaymentSummaries())
})

const cards = computed(() => {
  const s = stats.value
  return [
    {
      key: 'activeCount',
      title: '生效合同数',
      value: String(s.activeContractCount ?? 0),
      iconClass: 'icon-blue',
      hideArrow: true,
    },
    {
      key: 'planTotal',
      title: '合同总额',
      value: formatCompactMoney(s.planTotal),
      iconClass: 'icon-cyan',
      hideArrow: true,
    },
    {
      key: 'monthPaid',
      title: '本月已收款项',
      value: formatCompactMoney(s.monthPaidTotal),
      iconClass: 'icon-green',
      hideArrow: true,
    },
    {
      key: 'monthUnpaid',
      title: '本月待收款项',
      value: formatCompactMoney(s.monthUnpaidTotal),
      iconClass: 'icon-orange',
      hideArrow: true,
    },
    {
      key: 'unpaid',
      title: '总待收款项',
      value: formatCompactMoney(s.unpaidTotal),
      iconClass: 'icon-orange',
      hideArrow: true,
    },
    {
      key: 'overdue',
      title: '逾期款项',
      value: formatCompactMoney(s.overdueAmount),
      iconClass: 'icon-red',
      hideArrow: true,
    },
    {
      key: 'rate',
      title: '回款率',
      value: `${Number(s.collectionRate || 0).toFixed(2)}%`,
      iconClass: 'icon-purple',
      hideArrow: true,
    },
  ]
})

/** 大金额用「万」缩短展示，避免卡片高度被撑乱 */
function formatCompactMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '¥0.00'
  if (Math.abs(n) >= 10000) {
    const wan = n / 10000
    const text =
      Math.abs(wan) >= 100
        ? wan.toLocaleString(undefined, { maximumFractionDigits: 1 })
        : wan.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    return `¥${text}万`
  }
  return `¥${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
</script>

<script>
export default { name: 'PaymentStatsPanel' }
</script>
