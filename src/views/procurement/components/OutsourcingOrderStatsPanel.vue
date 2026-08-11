<template>
  <ListPeriodStatsPanel v-model:period="period" :cards="cards" />
</template>

<script setup>
import { computed, ref } from 'vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'
import { calcOutsourcingOrderDashboardStats } from '@/utils/outsourcingOrderStats'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

const period = ref('本周')

function formatQty(n) {
  const v = Number(n) || 0
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v))
  return String(Number(v.toFixed(4)))
}

function formatDeltaPlain(n) {
  const v = Number(n) || 0
  return v > 0 ? `+${formatQty(v)}` : formatQty(v)
}

const cards = computed(() => {
  void outsourcingOrderState.orders
  const s = calcOutsourcingOrderDashboardStats(period.value)
  const c = s.compare
  return [
    {
      key: 'orderCount',
      title: '外协订单数',
      value: String(s.orderCount),
      delta: c.orderCount,
      iconClass: 'icon-shop',
    },
    {
      key: 'return',
      title: '已回货量/外协总量',
      value: `${formatQty(s.returnedQty)}/${formatQty(s.planQty)}`,
      delta: c.returnedQty,
      deltaSuffix: ` / ${formatDeltaPlain(c.pendingReturnQty)}`,
      iconClass: 'icon-screen',
    },
    {
      key: 'amount',
      title: '外协费用总计',
      value: `¥${Number(s.amountExTax || 0).toFixed(2)}`,
      delta: c.amountExTax,
      iconClass: 'icon-shop',
    },
    {
      key: 'overdue',
      title: '逾期未回货',
      value: String(s.overdueCount),
      delta: c.overdueCount,
      iconClass: 'icon-warn',
    },
  ]
})
</script>

<script>
export default { name: 'OutsourcingOrderStatsPanel' }
</script>
