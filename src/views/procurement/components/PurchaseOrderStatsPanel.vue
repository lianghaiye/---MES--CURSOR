<template>
  <ListPeriodStatsPanel v-model:period="period" :cards="cards" />
</template>

<script setup>
import { computed, ref } from 'vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'
import { calcPurchaseOrderDashboardStats } from '@/utils/purchaseOrderStats'
import { purchaseOrderState } from '@/store/purchaseOrderStore'

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
  void purchaseOrderState.orders
  const s = calcPurchaseOrderDashboardStats(period.value)
  const c = s.compare
  return [
    {
      key: 'orderCount',
      title: '采购订单数',
      value: String(s.orderCount),
      delta: c.orderCount,
      iconClass: 'icon-shop',
    },
    {
      key: 'inbound',
      title: '已入库量/采购总量',
      value: `${formatQty(s.inboundQty)}/${formatQty(s.purchaseQty)}`,
      delta: c.inboundQty,
      deltaSuffix: ` / ${formatDeltaPlain(c.pendingInboundQty)}`,
      iconClass: 'icon-screen',
    },
    {
      key: 'amount',
      title: '采购金额总计',
      value: `¥${Number(s.amountExTax || 0).toFixed(2)}`,
      delta: c.amountExTax,
      iconClass: 'icon-shop',
    },
    {
      key: 'overdue',
      title: '逾期未到货',
      value: String(s.overdueCount),
      delta: c.overdueCount,
      iconClass: 'icon-warn',
    },
  ]
})
</script>

<script>
export default { name: 'PurchaseOrderStatsPanel' }
</script>
